import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, kortin, shuffle, SUITS, RANKS, VAL, isRed } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';

// ── Moska (Durak) ─────────────────────────────────────────────
// A=14 kaikissa taisteluvertailuissa
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';
const MV = c => c.r === 'A' ? 14 : c.v;

function canBeat(atk, def, ts) {
  if (def.s === atk.s) return MV(def) > MV(atk);
  return def.s === ts && atk.s !== ts;
}

function mkDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({
    s, r, v: VAL[r], id: `${r}${s}_${Math.random()}`,
  }))));
}

function drawFrom(deck, tc, n) {
  const drawn = []; let d = [...deck], t = tc;
  for (let i = 0; i < n; i++) {
    if (d.length > 0) drawn.push(d.shift());
    else if (t) { drawn.push(t); t = null; }
    else break;
  }
  return { drawn, deck: d, trumpCard: t };
}

function nextActive(players, from) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (players[idx].rank === null) return idx;
  }
  return from;
}

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames() {
  const a = [...AI_NAMES];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Alustus ───────────────────────────────────────────────────
function initGame(nP) {
  const aiNames = shuffledAINames();
  const raw = mkDeck();
  const trumpCard = raw.pop();
  const ts = trumpCard.s;
  const deck = [...raw];

  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? 'Hero' : aiNames[i - 1],
    isHuman: i === 0, hand: [], rank: null,
  }));
  players.forEach(p => { p.hand = deck.splice(0, 6); });

  // Valttikakkosen automaattinen vaihto
  let tc = { ...trumpCard };
  let exchangeMsg = null;
  if (tc.r !== '2') {
    const own = players.find(p => p.hand.some(c => c.r === '2' && c.s === ts));
    if (own) {
      const t2 = own.hand.find(c => c.r === '2' && c.s === ts);
      own.hand = [...own.hand.filter(c => c.id !== t2.id), { ...trumpCard }];
      tc = { ...t2 };
      exchangeMsg = `💫 ${own.name}: 2${ts} ↔ ${lblColored(trumpCard)} (valttivaihto)`;
    }
  }

  // Ensimmäinen hyökkääjä: pienin valttikortti
  let lowestV = Infinity, firstAtk = 0;
  players.forEach((p, i) => p.hand.forEach(c => {
    if (c.s === ts && MV(c) < lowestV) { lowestV = MV(c); firstAtk = i; }
  }));
  const def = nextActive(players, firstAtk);

  return {
    players, deck, trumpCard: tc, ts,
    table: [],          // [{atk, def:null|card, atkBy:idx}]
    primaryAtk: firstAtk,
    defender: def,
    attackers: [firstAtk],
    phase: 'attack',
    rankings: [],
    passChain: [],      // puolustajat jotka ovat siirtäneet
    addQueue: [],       // pelaajat jotka voivat lisätä
    exchangeMsg,
  };
}

const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
    return sd !== 0 ? sd : MV(a) - MV(b);
  });
}

// ── AI-logiikka ───────────────────────────────────────────────
function aiPickAttack(p, defenderHandSize, ts) {
  const byRank = {};
  p.hand.forEach(c => { (byRank[c.r] = byRank[c.r] || []).push(c); });
  const groups = Object.values(byRank).sort((a, b) => {
    const aT = a[0].s === ts, bT = b[0].s === ts;
    if (aT !== bT) return aT ? 1 : -1;
    return MV(a[0]) - MV(b[0]);
  });
  if (!groups.length) return [];
  return [groups[0][0]]; // yksi kortti per hyökkäys
}

function aiPickDefense(atk, hand, ts) {
  const valid = hand.filter(c => canBeat(atk, c, ts));
  if (!valid.length) return null;
  return valid.sort((a, b) => {
    const aT = a.s === ts, bT = b.s === ts;
    if (aT !== bT) return aT ? 1 : -1;
    return MV(a) - MV(b);
  })[0];
}

function getAddable(g, playerIdx) {
  const def = g.players[g.defender];
  const tableRanks = new Set(g.table.flatMap(t => [t.atk.r, t.def?.r].filter(Boolean)));
  const unbeaten = g.table.filter(t => !t.def).length;
  const byDefHand = def.hand.length - unbeaten;
  const byLimit   = 6 - g.table.length;           // hyökkäyskortteja enintään 6 yhteensä
  const maxAdd = Math.min(byDefHand, byLimit);
  if (maxAdd <= 0 || !tableRanks.size) return [];
  return g.players[playerIdx].hand.filter(c => tableRanks.has(c.r)).slice(0, maxAdd);
}

// ── Komponentti ───────────────────────────────────────────────
export default function Moska({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, teachMode = true }) {
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(2);
  const [soundOn, setSnd] = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G, setG] = useState(null);
  const [msg, setMsg_] = useState('');
  const [log, setLog] = useState([]);
  const [logOpen, setLO] = useState(hints);
  const [debugOpen, setDebug] = useState(initSeeAll);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);

  const [justPlacedIds, setJustPlaced] = useState(new Set());

  // Ihmispelaajan valintatila
  const [selAtk, setSelAtk] = useState([]);        // hyökkäysvalinta
  const [selDefTarget, setSelDefTarget] = useState(null); // pöytäkortti jota kaataa
  const [selPass, setSelPass] = useState([]);      // siirtokortti
  const [selAdd, setSelAdd] = useState([]);        // lisäyskortti

  // Momentti-palaute
  const [currentMoment, setCurrentMoment] = useState(null);
  const momentsRef = useRef([]);

  const gRef    = useRef(null);
  const aiTmr   = useRef(null);
  const logRef  = useRef([]);
  const sndRef  = useRef(false);
  const prevDeckRef = useRef(null);

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => clearTimeout(aiTmr.current), []);

  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const total = G.deck.length + (G.trumpCard ? 1 : 0);
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && total === 0) setPakaAnim(true);
    prevDeckRef.current = total;
  }, [G?.deck?.length, G?.trumpCard]);

  // Kielioppiapuri: Hero = 2. persoona, AI = nimi + 3. persoona
  const act = (p, v2, v3) => p.isHuman ? `Sinä ${v2}` : `${p.name} ${v3}`;

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function setGS(g) { setG(g); gRef.current = g; }

  // Momenttien havaitseminen — onko tämä erikoinen hetkki?
  function detectMoment(eventType, context, deckGone) {
    if (eventType === 'defender_won') {
      const difficulty = context.unbeatenCount || 0;
      let momentType = 'defense_success';
      let title = '🛡️ Onnistunut puolustus';
      let description = `Puolustaja onnistui kaatamaan ${difficulty} hyökkäyskortin.`;
      let rarity = 'uncommon'; // Uncommon by default

      // Epic: Vaikea tilanne (4+ korttia lyötävänä)
      if (difficulty >= 4) {
        momentType = 'difficult_defense';
        title = '⚔️ Epic Puolustus!';
        description = `Puolustaja kaatoi ${difficulty} hyökkäyskortin isoilla valteilla. Herkulline pelastus!`;
        rarity = 'epic';
      }

      // Legendary: Pakka ehtyi juuri kun puolustaja voitti! (~0.3% todennäköisyys)
      if (deckGone && Math.random() < 0.003) {
        momentType = 'legendary_defense';
        title = '🟠 LEGENDARY! Pakka loppui juuri oikeaan aikaan!';
        description = `Pakka ehtyi juuri kun puolustaja kaatoi kaikki kortit. Täydellinen ajoitus!`;
        rarity = 'legendary';
      }

      const moment = {
        type: momentType,
        game: 'Moska',
        title,
        description,
        context,
        timestamp: new Date().toISOString(),
        rarity,
      };

      // Vain Legendary-momentit näyttävät popupin, muut tallennetaan silenceerilla
      if (rarity === 'legendary') {
        setCurrentMoment(moment);
      } else {
        saveMomentSilently(moment);
      }

      return moment;
    }
  }

  function saveMomentSilently(moment) {
    const feedback = {
      momentType: moment.type,
      game: moment.game,
      rarity: moment.rarity,
      comment: '',
      timestamp: moment.timestamp,
      context: moment.context,
    };

    const stored = JSON.parse(localStorage.getItem('_JAKO_MOMENTS_') || '[]');
    stored.push(feedback);
    localStorage.setItem('_JAKO_MOMENTS_', JSON.stringify(stored));

    if (hints) {
      addLog(`💾 Momentti tallennettu: ${feedback.rarity}`);
    }
  }

  function saveMomentFeedback(feedback) {
    momentsRef.current.push(feedback);
    if (hints) {
      addLog(`💾 Momentti tallennettu: ${feedback.rarity}`);
    }
  }

  const M = {
    gameStart: (primaryAtk, defender, trump) => `Moska alkaa! Valtti: ${trump}. ${primaryAtk}, ${defender}.`,
    defenderWon: (defender) => `${defender} onnistuneesti!`,
    defenderTook: (defender, count) => `${defender} ${kortin(count)}.`,
    playerDrew: (player, count) => `${player} ${kortin(count)}.`,
    playerFinished: (player, rank) => `${player} kortista! Sija ${rank}.`,
    moska: (name) => `${name} on Moska! 🐟`,
    nextRound: (nextAtk, nextDef) => `${nextAtk} → ${nextDef}.`,
    attack: (player, cards) => `${player}: ${cards}.`,
    beat: (defName, defCard, atkCard) => `${defName}: ${defCard} kaataa ${atkCard}.`,
    cannotPass: 'Ei voi siirtää enempää.',
    pass: (defender, cards, nextDef) => `${defender} (${cards}) → ${nextDef}.`,
    add: (player, cards) => `${player}: ${cards}.`,
    defendHuman: (count) => `On vuorosi puolustautua.`,
    defendAI: (name) => `${name} puolustaa...`,
  };


  // ── Pelin aloitus ─────────────────────────────────────────
  function startGame() {
    clearTimeout(aiTmr.current);
    const g = initGame(nP);
    logRef.current = []; setLog([]);
    setSelAtk([]); setSelDefTarget(null); setSelPass([]); setSelAdd([]); setPakaAnim(false);
    setGS(g);
    if (g.exchangeMsg) addLog(g.exchangeMsg);
    const attMsg = act(g.players[g.primaryAtk], 'hyökkäät', 'hyökkää');
    const defMsg = act(g.players[g.defender], 'puolustat', 'puolustaa');
    const trumpSpan = `<span style="color:${SUIT_COLOR[g.ts]}">${g.ts}</span>`;
    addLog(`Moska alkaa! Valtti: ${trumpSpan}. ${attMsg}, ${defMsg}.`);
    setScreen('game');
    setShuffling(true);
    if (!g.players[g.primaryAtk].isHuman) {
      aiTmr.current = setTimeout(() => runAI(g), 3300);
    }
  }

  // ── Kierroksen ratkaisu ───────────────────────────────────
  function resolveRound(g, defWon) {
    const defPlayer = g.players[g.defender];
    let players = g.players.map(p => ({ ...p }));

    if (defWon) {
      addLog(`${act(defPlayer, 'puolustit', 'puolusti')} onnistuneesti!`);
      if (sndRef.current) SFX.capture();
    } else {
      const taken = g.table.flatMap(t => [t.atk, t.def].filter(Boolean));
      players[g.defender] = { ...players[g.defender], hand: [...players[g.defender].hand, ...taken] };
      addLog(`${act(defPlayer, 'otit', 'otti')} ${kortin(taken.length)}.`);
      if (sndRef.current) SFX.leave();
    }

    // Nosto: hyökkääjät ensin, puolustaja viimeisenä (vain jos voitti)
    const drawOrder = defWon
      ? [...g.attackers, g.defender]
      : [...g.attackers];
    let deck = [...g.deck], tc = g.trumpCard;

    for (const idx of drawOrder) {
      if (players[idx].rank !== null) continue;
      const need = Math.max(0, 6 - players[idx].hand.length);
      if (need > 0) {
        const { drawn, deck: d2, trumpCard: t2 } = drawFrom(deck, tc, need);
        if (drawn.length) {
          players[idx] = { ...players[idx], hand: [...players[idx].hand, ...drawn] };
          addLog(`${act(players[idx], 'nostit', 'nosti')} ${kortin(drawn.length)}.`);
        }
        deck = d2; tc = t2;
      }
    }

    // Havaitse erikoismoment JOS puolustaja voitti
    if (defWon) {
      const unbeatenCount = g.table.length; // Montako korttia oli pöydällä
      // Tarkista onko pakka ehtyä JUURI NYTÄ
      const willDeckGone = deck.length === 0 && tc === null;
      detectMoment('defender_won', {
        defender: defPlayer.name,
        unbeatenCount,
        attackerCount: g.attackers.length,
      }, willDeckGone);
    }

    // Tarkista valmistuneet (pakkaa ei enää, käsi tyhjä)
    const deckGone = deck.length === 0 && tc === null;
    let rankings = [...g.rankings];
    players.forEach((p, i) => {
      if (p.rank === null && p.hand.length === 0 && deckGone) {
        const rank = rankings.length + 1;
        players[i] = { ...p, rank };
        rankings = [...rankings, i];
        addLog(`${act(p, 'Veit', 'Vei')} voiton! 🏆🎉`);
      }
    });

    // Tarkista pelin loppu (≤1 aktiivia)
    const active = players.filter(p => p.rank === null);
    if (active.length <= 1) {
      active.forEach(p => {
        if (p.rank === null) {
          const rank = rankings.length + 1;
          players[p.id] = { ...p, rank };
          rankings = [...rankings, p.id];
          addLog(`${p.name} on Moska! 🐟`);
        }
      });
      onResult?.(rankings[0] === 0);
      const g2 = { ...g, players, deck, trumpCard: tc, rankings, table: [], phase: 'gameover' };
      setGS(g2);
      return;
    }

    // Seuraava hyökkääjä & puolustaja
    let nextAtk;
    if (defWon) {
      nextAtk = g.defender;
      while (players[nextAtk].rank !== null) nextAtk = nextActive(players, nextAtk);
    } else {
      nextAtk = nextActive(players, g.defender);
    }
    const nextDef = nextActive(players, nextAtk);

    const g2 = {
      ...g, players, deck, trumpCard: tc, rankings, table: [],
      primaryAtk: nextAtk, defender: nextDef, attackers: [nextAtk],
      phase: 'attack', passChain: [], addQueue: [],
    };
    setGS(g2);
    addLog(`${act(players[nextAtk], 'hyökkäät', 'hyökkää')} → ${act(players[nextDef], 'puolustat', 'puolustaa')}.`);

    if (!players[nextAtk].isHuman) {
      aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 600);
    }
  }

  // ── Ydinsiirrot ───────────────────────────────────────────
  function doAttack(g, atkIdx, cards) {
    const p = g.players[atkIdx];
    const newHand = p.hand.filter(c => !cards.find(a => a.id === c.id));
    const newTable = cards.map(c => ({ atk: c, def: null, atkBy: atkIdx }));
    const players = g.players.map((pl, i) => i === atkIdx ? { ...pl, hand: newHand } : pl);
    addLog(`${act(p, 'hyökkäsit', 'hyökkäsi')}: ${cards.map(lbl).join(', ')}.`);
    if (sndRef.current) SFX.leave();
    const ids = new Set(cards.map(c => c.id));
    setJustPlaced(ids);
    setTimeout(() => setJustPlaced(new Set()), 1800);
    const g2 = { ...g, players, table: newTable, attackers: [atkIdx], phase: 'defend' };
    setGS(g2);
    goDefend(g2);
  }

  function doBeat(g, atkId, defCard) {
    const def = g.players[g.defender];
    const newHand = def.hand.filter(c => c.id !== defCard.id);
    const atkCard = g.table.find(t => t.atk.id === atkId)?.atk;
    const newTable = g.table.map(t => t.atk.id === atkId ? { ...t, def: defCard } : t);
    const players = g.players.map((p, i) => i === g.defender ? { ...p, hand: newHand } : p);
    addLog(`${def.name}: ${lblColored(defCard)} kaataa ${lblColored(atkCard)}.`);
    if (sndRef.current) SFX.capture();
    return { ...g, players, table: newTable };
  }

  function doPass(g, passCards) {
    const def = g.players[g.defender];
    // Seuraava aktiiviinen pelaaja joka ei ole hyökkääjä
    let nextDef = nextActive(g.players, g.defender);
    while (g.attackers.includes(nextDef) && nextDef !== g.defender) {
      nextDef = nextActive(g.players, nextDef);
    }
    if (nextDef === g.primaryAtk || g.passChain.includes(nextDef)) {
      addLog('Ei voi siirtää enempää.');
      return;
    }
    const newHand = def.hand.filter(c => !passCards.find(pc => pc.id === c.id));
    const newTable = [...g.table, ...passCards.map(c => ({ atk: c, def: null, atkBy: g.defender }))];
    const players = g.players.map((p, i) => i === g.defender ? { ...p, hand: newHand } : p);
    addLog(`${act(def, 'siirrit', 'siirsi')} (${passCards.map(lbl).join(',')}) → ${act(g.players[nextDef], 'puolustat', 'puolustaa')}.`);
    const g2 = {
      ...g, players, table: newTable, defender: nextDef,
      passChain: [...g.passChain, g.defender],
      attackers: [...new Set([...g.attackers, g.defender])],
      phase: 'defend',
    };
    setGS(g2);
    goDefend(g2);
  }

  function doAdd(g, playerIdx, cards) {
    const p = g.players[playerIdx];
    const newHand = p.hand.filter(c => !cards.find(a => a.id === c.id));
    const newTable = [...g.table, ...cards.map(c => ({ atk: c, def: null, atkBy: playerIdx }))];
    const players = g.players.map((pl, i) => i === playerIdx ? { ...pl, hand: newHand } : pl);
    addLog(`${act(p, 'lisäsit', 'lisäsi')}: ${cards.map(lbl).join(', ')}.`);
    const ids = new Set(cards.map(c => c.id));
    setJustPlaced(ids);
    setTimeout(() => setJustPlaced(new Set()), 1800);
    const rest = (g.addQueue || []).slice(1);
    const g2 = {
      ...g, players, table: newTable,
      attackers: [...new Set([...g.attackers, playerIdx])],
      addQueue: rest, phase: 'defend',
    };
    setGS(g2);
    goDefend(g2);
  }

  // ── Puolustuskierros ──────────────────────────────────────
  function goDefend(g) {
    const def = g.players[g.defender];
    const unbeaten = g.table.filter(t => !t.def).length;
    if (def.isHuman) {
      addLog('On vuorosi puolustautua.');
    } else {
      addLog(`${def.name} puolustaa...`);
      aiTmr.current = setTimeout(() => runAI(g), 1400 + Math.random() * 500);
    }
  }

  // ── Lisäysvaihe ───────────────────────────────────────────
  function startAddPhase(g) {
    const queue = [];
    const nPl = g.players.length;
    for (let i = 0; i < nPl; i++) {
      const idx = (g.primaryAtk + i) % nPl;
      if (idx === g.defender) continue;
      if (g.players[idx].rank !== null) continue;
      if (getAddable(g, idx).length > 0) queue.push(idx);
    }
    if (!queue.length) { resolveRound(g, true); return; }
    const g2 = { ...g, phase: 'add', addQueue: queue };
    setGS(g2);
    processAddQueue(g2);
  }

  function processAddQueue(g) {
    if (!g.addQueue?.length) { resolveRound(g, true); return; }
    const next = g.addQueue[0];
    const p = g.players[next];
    const addable = getAddable(g, next);
    if (!addable.length) {
      const rest = g.addQueue.slice(1);
      const g2 = { ...g, addQueue: rest };
      setGS(g2);
      aiTmr.current = setTimeout(() => processAddQueue(g2), 200);
      return;
    }
    if (p.isHuman) {
      addLog(`Voit lisätä: ${addable.map(lbl).join(', ')} — tai Ohita.`);
      setSelAdd([]);
    } else {
      // AI lisää jos puolustajalla paljon kortteja jäljellä, muuten ohittaa
      const def = g.players[g.defender];
      const shouldAdd = def.hand.length >= 3 || g.table.length <= 2;
      if (shouldAdd) {
        const toAdd = addable.slice(0, 1);
        aiTmr.current = setTimeout(() => {
          doAdd(gRef.current, next, toAdd);
        }, 900 + Math.random() * 300);
      } else {
        const rest = g.addQueue.slice(1);
        const g2 = { ...g, addQueue: rest };
        setGS(g2);
        aiTmr.current = setTimeout(() => processAddQueue(g2), 600);
      }
    }
  }

  // ── AI-pääsilmukka ────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const { phase, primaryAtk, defender, players, ts, table } = g;

    if (phase === 'attack') {
      const p = players[primaryAtk];
      if (p.isHuman) return;
      const cards = aiPickAttack(p, players[defender].hand.length, ts);
      if (!cards.length) { resolveRound(g, true); return; }
      doAttack(g, primaryAtk, cards);
    }

    if (phase === 'defend') {
      const p = players[defender];
      if (p.isHuman) return;

      // Kokeile siirtoa ensin (jos ei vielä kaatanut mitään)
      const noBeats = !table.some(t => t.def);
      if (noBeats && g.passChain.length < players.filter(pl => pl.rank === null).length - 2) {
        const atkRanks = new Set(table.map(t => t.atk.r));
        const passCard = p.hand.find(c => atkRanks.has(c.r) && c.s !== ts);
        if (passCard && players.filter(pl => pl.rank === null).length > 2) {
          aiTmr.current = setTimeout(() => {
            doPass(gRef.current, [passCard]);
          }, 1000);
          return;
        }
      }

      // Kokeile kaataa kaikki
      const unbeaten = table.filter(t => !t.def);
      let hand = [...p.hand];
      const beats = [];
      let canBeatAll = true;
      for (const slot of unbeaten) {
        const dc = aiPickDefense(slot.atk, hand, ts);
        if (!dc) { canBeatAll = false; break; }
        beats.push({ atkId: slot.atk.id, defCard: dc });
        hand = hand.filter(c => c.id !== dc.id);
      }

      if (canBeatAll) {
        aiTmr.current = setTimeout(() => {
          let cur = gRef.current;
          for (const { atkId, defCard } of beats) {
            cur = doBeat(cur, atkId, defCard);
          }
          setGS(cur);
          aiTmr.current = setTimeout(() => startAddPhase(cur), 700);
        }, 900);
      } else {
        aiTmr.current = setTimeout(() => {
          resolveRound(gRef.current, false);
        }, 900 + Math.random() * 300);
      }
    }
  }

  // ── Ihmispelaajan toiminnot ───────────────────────────────
  function humanToggleAtk(card) {
    if (!G || G.phase !== 'attack' || G.primaryAtk !== 0) return;
    setSelAtk(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].r !== card.r) {
        addLog('Hyökkäykseen vain saman vahvuisia kortteja.');
        return prev;
      }
      return [...prev, card];
    });
  }

  function humanConfirmAttack() {
    if (!selAtk.length) return;
    const g = gRef.current;
    if (selAtk.length > 6) {
      addLog('Kerralla enintään 6 korttia.');
      return;
    }
    if (selAtk.length > g.players[g.defender].hand.length) {
      addLog(`Liikaa — puolustajalla vain ${korttia(g.players[g.defender].hand.length)}.`);
      return;
    }
    const cards = [...selAtk];
    setSelAtk([]);
    doAttack(g, 0, cards);
  }

  function humanSelectTarget(slot) {
    if (!G || G.phase !== 'defend' || G.defender !== 0) return;
    setSelDefTarget(prev => prev?.atk.id === slot.atk.id ? null : slot);
    setSelPass([]);
  }

  function humanBeatWithCard(card) {
    if (!G || G.phase !== 'defend' || G.defender !== 0 || !selDefTarget) return;
    if (!canBeat(selDefTarget.atk, card, G.ts)) {
      addLog(`${lblColored(card)} ei kaada ${lblColored(selDefTarget.atk)}.`);
      return;
    }
    const g = gRef.current;
    let g2 = doBeat(g, selDefTarget.atk.id, card);
    setSelDefTarget(null);
    const stillUnbeaten = g2.table.filter(t => !t.def).length;
    if (stillUnbeaten === 0) {
      setGS(g2);
      aiTmr.current = setTimeout(() => startAddPhase(gRef.current), 500);
    } else {
      setGS(g2);
    }
  }

  function humanTake() {
    if (!G || G.phase !== 'defend' || G.defender !== 0) return;
    setSelDefTarget(null); setSelPass([]);
    resolveRound(gRef.current, false);
  }

  function humanTogglePass(card) {
    if (!G || G.phase !== 'defend' || G.defender !== 0) return;
    if (G.table.some(t => t.def)) { addLog('Ei voi siirtää — olet jo kaanut kortteja.'); return; }
    const atkRanks = new Set(G.table.map(t => t.atk.r));
    if (!atkRanks.has(card.r)) { addLog(`${lblColored(card)} ei sovi siirtoon.`); return; }
    setSelPass(prev => {
      const has = prev.find(c => c.id === card.id);
      return has ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
    setSelDefTarget(null);
  }

  function humanConfirmPass() {
    if (!selPass.length) return;
    const cards = [...selPass];
    setSelPass([]);
    doPass(G, cards);
  }

  function humanToggleAdd(card) {
    if (!G || G.phase !== 'add' || G.addQueue?.[0] !== 0) return;
    const addable = getAddable(gRef.current, 0);
    if (!addable.find(c => c.id === card.id)) return;
    setSelAdd(prev => {
      const has = prev.find(c => c.id === card.id);
      return has ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
  }

  function humanConfirmAdd() {
    if (!selAdd.length) { humanSkipAdd(); return; }
    const cards = [...selAdd];
    setSelAdd([]);
    doAdd(gRef.current, 0, cards);
  }

  function humanSkipAdd() {
    const g = gRef.current;
    const rest = (g.addQueue || []).slice(1);
    const g2 = { ...g, addQueue: rest };
    setGS(g2);
    processAddQueue(g2);
  }

  // ── Näkymät ───────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MOSKA</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8, marginBottom: 6 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>PELAAJIA</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt lyhyesti</span><br />
        Hyökkää samanarvoisilla · Puolusta isommalla tai valtilla<br />
        Pääse kortista ensimmäisenä · Viimeinen on Moska
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
      </div>
    </div>
  );

  if (screen === 'game' && G?.phase === 'gameover') {
    const sorted = [...G.players].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: i === sorted.length - 1 ? 'rgba(224,92,59,0.1)' : i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === sorted.length - 1 ? '#e05c3b55' : i === 0 ? C.gold + '55' : C.panelBorder}` }}>
              <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : i === sorted.length - 1 ? '🐟' : '🎯'}</span>
              <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : i === sorted.length - 1 ? C.red : C.text }}>{p.name}</span>
              <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim }}>Sija {p.rank}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
          <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
        </div>
      </div>
    );
  }

  if (!G) return null;

  const human = G.players[0];
  const isMyAtk  = G.phase === 'attack'  && G.primaryAtk === 0;
  const isMyDef  = G.phase === 'defend'  && G.defender === 0;
  const isMyAdd  = G.phase === 'add'     && G.addQueue?.[0] === 0;
  const myTurn   = isMyAtk || isMyDef || isMyAdd;

  const unbeatenSlots = G.table.filter(t => !t.def);
  const defBeaten     = G.table.filter(t => t.def).length;

  // Voiko siirtää: ei yhtään kaadettua, kaikki pöydässä samanarvoisia, hänellä vähintään yksi samanarvoinen
  const passableRanks = new Set(G.table.map(t => t.atk.r));
  const allSameRank   = G.table.length > 0 && passableRanks.size === 1;
  const canPassNow = isMyDef
    && !G.table.some(t => t.def)
    && allSameRank
    && human.hand.some(c => passableRanks.has(c.r))
    && !G.passChain.includes(G.defender)
    && G.players.filter(p => p.rank === null).length > 2;

  const humanAddable = isMyAdd ? getAddable(G, 0) : [];

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: 32 }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <MomentFeedback
        moment={currentMoment}
        onClose={() => setCurrentMoment(null)}
        onRate={saveMomentFeedback}
      />

      {/* Viestikupla */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 12, minHeight: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>♠</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Yläpalkki: valtti + pakkatiedot */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.trump}55`, background: `${C.trump}0d` }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>VALTTI</span>
          <span style={{ fontSize: 18, color: SUIT_COLOR[G.ts], fontWeight: 700 }}>{G.ts}</span>
          {G.trumpCard && <Card card={G.trumpCard} small backStyle={BACKS[cardBack]} />}
        </div>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: `1px solid ${G.deck.length === 0 ? C.red + '55' : C.panelBorder}`, fontFamily: 'sans-serif', fontSize: 12, color: G.deck.length === 0 ? C.red : C.dim, fontWeight: G.deck.length === 0 ? 700 : 400, animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
          {G.deck.length === 0 ? 'PAKKA TYHJÄ' : `Pakassa kortteja jäljellä ${G.deck.length} kpl`}
        </div>
      </div>

      {/* AI-pelaajien kädet */}
      {G.players.filter((_, i) => i !== 0).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {G.players.filter((_, i) => i !== 0).map(p => (
            <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.id === G.defender ? C.blue + '55' : p.id === G.primaryAtk ? '#e05c3b55' : C.panelBorder}`, borderRadius: 10, padding: '7px 10px', textAlign: 'center', opacity: p.rank !== null ? 0.35 : 1 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: p.id === G.primaryAtk ? C.red : p.id === G.defender ? C.blue : C.dim, marginBottom: 4 }}>
                {p.id === G.primaryAtk ? '⚔' : p.id === G.defender ? '🛡' : '🤖'} {p.name}
                {p.rank !== null ? ` — sija ${p.rank}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {debugOpen
                  ? p.hand.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} />)
                  : p.hand.map((_, ci) => <div key={ci} style={{ width: 22, height: 33, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pöytä */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${G.table.length > 0 ? '#e05c3b33' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10, minHeight: 200 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 8, letterSpacing: 1.5 }}>
          PÖYTÄ — {G.table.length === 0 ? 'tyhjä' : `${G.table.length} paria`}
          {defBeaten > 0 && <span style={{ color: C.tikki, marginLeft: 8 }}>✓ {defBeaten} kaadettu</span>}
          {unbeatenSlots.length > 0 && <span style={{ color: C.red, marginLeft: 8 }}>! {unbeatenSlots.length} lyömättä</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {G.table.map((slot, si) => {
            const isTargeted = selDefTarget?.atk.id === slot.atk.id;
            const cantTarget  = isMyDef && !!selDefTarget && !isTargeted && !slot.def;
            return (
              <div key={si} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Card card={slot.atk} small                   justPlaced={justPlacedIds.has(slot.atk.id)}
                  highlight={isMyDef && !slot.def && !isTargeted}
                  selected={isTargeted}
                  dim={cantTarget}
                  onClick={isMyDef && !slot.def ? () => humanSelectTarget(slot) : undefined}
                  backStyle={BACKS[cardBack]}
                />
                {slot.def
                  ? <Card card={slot.def} small showBadges backStyle={BACKS[cardBack]} />
                  : <div style={{ width: 50, height: 68, borderRadius: 7, border: '1.5px dashed #1a3a22', opacity: 0.25 }} />
                }
              </div>
            );
          })}
          {G.table.length === 0 && (
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, opacity: 0.5, padding: '24px 0' }}>Pöytä tyhjä</div>
          )}
        </div>
      </div>

      {/* Ohje */}
      {myTurn && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, marginBottom: 8, fontStyle: 'italic' }}>
          {isMyAtk && 'Valitse saman-arvoiset hyökkäyskortit ja klikkaa Hyökkää.'}
          {isMyDef && !selDefTarget && !selPass.length && (canPassNow
            ? 'Valitse ensin pöytäkortti jonka haluat kaataa — tai klikkaa saman-arvoista korttiasi siirtääksesi hyökkäyksen eteenpäin.'
            : 'Valitse ensin pöytäkortti, jonka haluat kaataa, ja seuraavaksi käsikorttisi.')}
          {isMyDef && selDefTarget && `${lblColored(selDefTarget.atk)} kohteena — valitse nyt käsikortti, jolla haluat kaataa.`}
          {isMyDef && selPass.length > 0 && `Siirto: ${selPass.map(lbl).join(',')} — klikkaa Siirrä tai peruuta.`}
          {isMyAdd && `Voit lisätä kortit (${humanAddable.map(lbl).join(', ')}) tai Ohita.`}
        </div>
      )}

      {/* Ihmispelaajan käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${myTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: myTurn ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero {G.primaryAtk === 0 ? '⚔' : G.defender === 0 ? '🛡' : ''}
          {human.rank !== null ? <span style={{ color: C.gold, marginLeft: 6 }}>Sija {human.rank}</span> : ` — ${korttia(human.hand.length)} kädessä`}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const isAtkSel      = !!selAtk.find(s => s.id === c.id);
            const isPassSel     = !!selPass.find(s => s.id === c.id);
            const isAddSel      = !!selAdd.find(s => s.id === c.id);
            const canPassCard   = isMyDef && canPassNow && passableRanks.has(c.r);
            const isAddable     = isMyAdd && !!humanAddable.find(a => a.id === c.id);
            const canBeatTarget = isMyDef && !!selDefTarget && canBeat(selDefTarget.atk, c, G.ts);
            const canDef        = isMyDef && !selDefTarget && unbeatenSlots.some(s => canBeat(s.atk, c, G.ts));
            const hlght = !isAtkSel && !isPassSel && !isAddSel && (
              selDefTarget ? canBeatTarget : (canDef || isMyAtk || isAddable || canPassCard)
            );
            const dimmed = (isMyAdd && !isAddable && !isAddSel)
              || (isMyDef && !!selDefTarget && !canBeatTarget && !isPassSel)
              || (isMyAtk && selAtk.length > 0 && selAtk[0].r !== c.r);
            return (
              <Card key={c.id} card={c} large                 selected={!!(isAtkSel || isPassSel || isAddSel)}
                highlight={!!hlght}
                dim={!!dimmed}
                onClick={
                  isMyAtk ? () => humanToggleAtk(c)
                  : isMyDef ? () => (selDefTarget ? humanBeatWithCard(c) : canPassCard ? humanTogglePass(c) : undefined)
                  : isMyAdd ? () => humanToggleAdd(c)
                  : undefined
                }
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>

      {/* Toimintopainikkeet */}
      <div style={{ minHeight: 52, display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {isMyAtk && (
          <>
            <button onClick={humanConfirmAttack} disabled={!selAtk.length}
              style={{ background: selAtk.length ? `linear-gradient(135deg,${C.red},#b83020)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selAtk.length ? C.red : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selAtk.length ? '#fff' : C.dim, fontSize: 13, cursor: selAtk.length ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              Hyökkää {selAtk.length > 0 ? `(${selAtk.map(lbl).join(',')})` : ''}
            </button>
            {selAtk.length > 0 && (
              <button onClick={() => setSelAtk([])} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {isMyDef && (
          <>
            {selPass.length > 0 && (
              <button onClick={humanConfirmPass}
                style={{ background: `rgba(201,168,76,0.12)`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: '10px 18px', color: C.gold, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Siirrä ({selPass.map(lbl).join(',')}) →
              </button>
            )}
            <button onClick={humanTake}
              style={{ background: 'rgba(224,92,59,0.1)', border: `1px solid #e05c3b55`, borderRadius: 10, padding: '10px 18px', color: C.red, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
              Ota kortit ({G.table.length})
            </button>
            {(selDefTarget || selPass.length > 0) && (
              <button onClick={() => { setSelDefTarget(null); setSelPass([]); }}
                style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {isMyAdd && (
          <>
            <button onClick={humanConfirmAdd} disabled={!selAdd.length}
              style={{ background: selAdd.length ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selAdd.length ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 18px', color: selAdd.length ? '#0d2118' : C.dim, fontSize: 13, cursor: selAdd.length ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              Lisää {selAdd.length > 0 ? `(${selAdd.map(lbl).join(',')})` : ''}
            </button>
            <button onClick={humanSkipAdd}
              style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 14px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
              Ohita
            </button>
          </>
        )}
      </div>

      {/* Tilarivi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        {G.players.map((p, i) => (
          <div key={p.id} style={{ fontFamily: 'sans-serif', fontSize: 11, padding: '4px 10px', borderRadius: 16, border: `1px solid ${G.primaryAtk === i ? C.red + '55' : G.defender === i ? C.blue + '55' : C.panelBorder}`, color: G.primaryAtk === i ? C.red : G.defender === i ? C.blue : C.dim, background: G.primaryAtk === i ? C.red + '08' : G.defender === i ? C.blue + '08' : 'transparent' }}>
            {p.name} {G.primaryAtk === i ? '⚔' : G.defender === i ? '🛡' : ''}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: '1px solid #2a4a32', background: 'transparent', color: C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {debugOpen ? '🙈' : '🔍'}
          </button>
        </div>
      </div>

      {/* Loki */}
      <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>TAPAHTUMALOKI</span>
          <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {log.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 14px', borderTop: '1px solid rgba(42,74,50,0.4)', background: i === 0 ? 'rgba(224,92,59,0.04)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
                <span style={{ fontSize: 12, color: i === 0 ? '#e8d0c8' : '#8aaa90', fontFamily: 'sans-serif', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: e.m }}></span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        button:active{transform:scale(0.97)}
        @keyframes slotFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9),0 0 20px rgba(201,168,76,0.6)}60%{box-shadow:0 0 0 2px rgba(201,168,76,0.5),0 0 10px rgba(201,168,76,0.3)}100%{box-shadow:0 2px 6px rgba(0,0,0,0.3)}}
        @keyframes pakaFlash{0%{color:inherit}20%{color:#e05555;font-weight:700;transform:scale(1.15)}60%{color:#e05555;font-weight:700}100%{color:#e05555;font-weight:700}}
      `}</style>
    </div>
  );
}
