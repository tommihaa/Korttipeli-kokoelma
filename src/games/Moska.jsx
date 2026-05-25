import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, kortin, shuffle, SUITS, RANKS, VAL, isRed, aiShouldFumble } from '../shared/helpers.js';
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
function shuffledAINames(pool) {
  const a = [...(pool || AI_NAMES)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Alustus ───────────────────────────────────────────────────
function initGame(nP, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const raw = mkDeck();
  const trumpCard = raw.pop();
  const ts = trumpCard.s;
  const deck = [...raw];

  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0, hand: [], rank: null,
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
  return g.players[playerIdx].hand.filter(c => tableRanks.has(c.r));
}

function getMaxAdd(g) {
  const def = g.players[g.defender];
  const unbeaten = g.table.filter(t => !t.def).length;
  return Math.min(def.hand.length - unbeaten, 6 - g.table.length);
}

// Super Natural -hyökkäys: suosii arvoja joista moni kopio on jo poissa pelistä
// → vähemmän riskiä että vastustajalla on sama arvo sivustalyöntiin
function aiPickAttackSN(p, ts, removed) {
  const byRank = {};
  p.hand.forEach(c => { (byRank[c.r] = byRank[c.r] || []).push(c); });
  const groups = Object.values(byRank).map(cards => {
    const r = cards[0].r;
    const goneCount = SUITS.filter(s => removed.has(`${r}${s}`)).length;
    return { cards, isTrump: cards[0].s === ts, goneCount };
  }).sort((a, b) => {
    if (a.isTrump !== b.isTrump) return a.isTrump ? 1 : -1;
    if (b.goneCount !== a.goneCount) return b.goneCount - a.goneCount;
    return MV(a.cards[0]) - MV(b.cards[0]);
  });
  if (!groups.length) return [];
  return [groups[0].cards[0]];
}

// Pienin pariton ei-valtti ensin — kaatuu eniten "roskakortin" logiikkaan
function aiPickAddCard(addable, hand, ts) {
  const sorted = [...addable].sort((a, b) => {
    const aT = a.s === ts, bT = b.s === ts;
    if (aT !== bT) return aT ? 1 : -1;
    return MV(a) - MV(b);
  });
  const rankCount = {};
  hand.forEach(c => { rankCount[c.r] = (rankCount[c.r] || 0) + 1; });
  const unpaired = sorted.filter(c => rankCount[c.r] === 1);
  return unpaired.length ? unpaired[0] : sorted[0];
}

// ── Komponentti ───────────────────────────────────────────────
export default function Moska({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showPlayHints = true, teachMode = true, showLastPlay = true, showNextBtn = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', onAiLevelChange }) {
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(playerCount);
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
  const [awaitingPlayerContinue, setAwaitingPlayerContinue] = useState(false); // odottaa seuraavaa kierrosta
  const [pendingDraw, setPendingDraw] = useState(null); // odottaa nostojen tekemistä

  // Momentti-palaute
  const [currentMoment, setCurrentMoment] = useState(null);
  const [lastPlay, setLastPlay] = useState(null);
  const [allBots, setAllBots]             = useState(false);
  const [paused, setPaused]               = useState(false);
  const [aiDelayMs, setAiDelayMs]         = useState(2000);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [pendingResult, setPendingResult] = useState(null);
  const momentsRef = useRef([]);

  const removedRef = useRef(new Set()); // korttien rs-avaimet ("A♠") jotka ovat poistuneet pelistä

  const gRef    = useRef(null);
  const aiTmr   = useRef(null);
  const logRef  = useRef([]);
  const sndRef         = useRef(false);
  const teachRef       = useRef(teachMode);
  const aiLevelRef     = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  const prevDeckRef    = useRef(null);
  const tmrs           = useRef(new Set());
  const lastPlayTmr    = useRef(null);
  const showNextBtnRef = useRef(showNextBtn);
  const allBotsRef = useRef(false);
  const pausedRef  = useRef(false);
  const aiDelayRef = useRef(2000);
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };
  function schedAI(fn, base) {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    aiTmr.current = tm(() => {
      if (pausedRef.current) { const w = () => { if (!pausedRef.current) fn(); else tm(w, 300); }; w(); return; }
      fn();
    }, d + Math.random() * 400);
  }

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { showNextBtnRef.current = showNextBtn; }, [showNextBtn]);
  // Auto-advance kun showNextBtn=false ja kierros odottaa jatkoa
  useEffect(() => {
    if (awaitingPlayerContinue && !showNextBtnRef.current) {
      const id = tm(() => continueToNextRound(), 600);
      return () => clearTimeout(id);
    }
  }, [awaitingPlayerContinue]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); clearTimeout(lastPlayTmr.current); }, []);

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
    gameStart:      (trump, att, def) => `Moska alkaa! Valttimaa: ${trump}. ${att}, ${def}.`,
    defenderWon:    (player, table) => `${player} onnistuneesti! Pöydällä: ${table}`,
    defenderTook:   (player, count, table) => `${player} ${count}. Pöydällä oli: ${table}`,
    playerDrew:     (player, count) => `${player} ${count}.`,
    won:            player => `${player} voiton! 🏆🎉`,
    out:            player => `${player} pelistä pois.`,
    lost:           player => `${player} jäi Moskaksi.`,
    nextRound:      (att, def) => `${att} → ${def}.`,
    attack:         (player, cards) => `${player}: ${cards}.`,
    beat:           (defName, defCard, atkCard, status) => `${defName}: ${defCard} kaataa ${atkCard}. ${status}`,
    cannotPass:     'Ei voi siirtää enempää.',
    pass:           (def, cards, nextDef) => `${def} (${cards}) → ${nextDef}.`,
    add:            (player, cards) => `${player}: ${cards}.`,
    defendHuman:    (unbeaten, cards, beaten) => unbeaten > 0
      ? `On vuorosi puolustautua. Pöydällä: ${cards} (${beaten}🛡️/${unbeaten}⚔️).`
      : 'On vuorosi puolustautua.',
    defendAI:       (name, unbeaten, cards) => unbeaten > 0
      ? `${name} puolustaa... (pöydällä: ${cards})`
      : `${name} puolustaa...`,
    addPhase:       cards => `═══ SIVUSTALYÖNTIVAIHE ═══ Pöydällä: ${cards}`,
    canAdd:         (name, cards) => `${name}: Voit lyödä sivusta: ${cards} — tai Ohita.`,
    aiCanAdd:       (name, cards) => `${name} voi lyödä sivusta: ${cards}`,
    aiSkips:        name => `${name} ohittaa.`,
    badSameRank:    'Hyökkäykseen vain saman vahvuisia kortteja.',
    tooManyCards:   'Kerralla enintään 6 korttia.',
    tooManyVsDef:   count => `Liikaa — puolustajalla vain ${count}.`,
    cantBeat:       (card, target) => `${card} ei kaada ${target}.`,
    noPassAfterBeat:'Ei voi siirtää — olet jo kaanut kortteja.',
    badPassCard:    card => `${card} ei sovi siirtoon.`,
    tipAttackSmall: (name, card) => `💡 ${name} hyökkää ${card}:lla — pienin kortti testaa puolustusta`,
    tipDefendMin:   (name, def, atk) => `💡 ${name} käyttää ${def} kaataakseen ${atk} — säästää isot kortit jatkoon`,
    tipDefendTrump: (name, def, atk) => `💡 ${name} pakko käyttää valttia ${def} — ei muuta vaihtoehtoa`,
    tipPass:        (name, card) => `💡 ${name} siirtää hyökkäyksen ${card}:lla — samaa arvoa kädessä`,
    tipTakeAll:     name => `💡 ${name} ei pysty kaatamaan kaikkia — ottaa kortit`,
  };


  // ── Pelin aloitus ─────────────────────────────────────────
  function flashLastPlay(name, cards, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: Array.isArray(cards) ? cards : [cards], isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function startGame(forcedCount, allBotsMode = false) {
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    pausedRef.current = false; setPaused(false);
    setPendingResult(null);
    clearTimeout(aiTmr.current);
    const count = forcedCount ?? nP;
    removedRef.current = new Set();
    const g = initGame(count, playerNames, allBotsMode);
    logRef.current = []; setLog([]);
    setSelAtk([]); setSelDefTarget(null); setSelPass([]); setSelAdd([]); setPakaAnim(false);
    setAwaitingPlayerContinue(false); setPendingDraw(null);
    setGS(g);
    if (g.exchangeMsg) addLog(g.exchangeMsg);
    const attMsg = act(g.players[g.primaryAtk], 'hyökkäät', 'hyökkää');
    const defMsg = act(g.players[g.defender], 'puolustat', 'puolustaa');
    const trumpSpan = `<span style="color:${SUIT_COLOR[g.ts]}">${g.ts}</span>`;
    addLog(M.gameStart(trumpSpan, attMsg, defMsg));
    setScreen('game');
    setShuffling(true);
    if (!g.players[g.primaryAtk].isHuman) {
      schedAI(() => runAI(gRef.current), 3300);
    }
  }

  function startBotBattle() {
    allBotsRef.current = true; setAllBots(true);
    aiLevelRef.current = 'supernatural';
    onAiLevelChange?.('supernatural');
    aiDelayRef.current = 2000; setAiDelayMs(2000);
    startGame(nP, true);
  }

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next; setPaused(next);
  }

  // ── Kierroksen ratkaisu ───────────────────────────────────
  function resolveRound(g, defWon) {
    const defPlayer = g.players[g.defender];
    let players = g.players.map(p => ({ ...p }));

    // Kuvaa pöydän tilanne kun kierros päättyi
    const tableDesc = g.table.map(t =>
      t.def ? `${lblColored(t.atk)}→${lblColored(t.def)}` : `${lblColored(t.atk)}❌`
    ).join(', ');

    if (defWon) {
      // Kaadetut kortit poistuvat pelistä — Super Natural muistaa ne
      g.table.forEach(t => {
        removedRef.current.add(`${t.atk.r}${t.atk.s}`);
        if (t.def) removedRef.current.add(`${t.def.r}${t.def.s}`);
      });
      addLog(M.defenderWon(act(defPlayer, 'puolustit', 'puolusti'), tableDesc));
      if (sndRef.current) SFX.capture();
    } else {
      const taken = g.table.flatMap(t => [t.atk, t.def].filter(Boolean));
      players[g.defender] = { ...players[g.defender], hand: [...players[g.defender].hand, ...taken] };
      addLog(M.defenderTook(act(defPlayer, 'otit', 'otti'), kortin(taken.length), tableDesc));
      if (sndRef.current) SFX.leave();
    }

    // Nosto: hyökkääjät ensin, puolustaja viimeisenä (vain jos voitti)
    // Mutta älä tee sitä heti, jos ihminen on osallisena - anna hänen katsoa kierroksen tulosta ensin
    const drawOrder = defWon
      ? [...g.attackers, g.defender]
      : [...g.attackers];
    let deck = [...g.deck], tc = g.trumpCard;

    const playerWasInvolved = !allBotsRef.current && (g.attackers.includes(0) || g.defender === 0 || (g.addQueue && g.addQueue.includes(0)));

    // Jos ihminen ei ollut osallisena, tee nosto heti
    if (!playerWasInvolved) {
      for (const idx of drawOrder) {
        if (players[idx].rank !== null) continue;
        const need = Math.max(0, 6 - players[idx].hand.length);
        if (need > 0) {
          const { drawn, deck: d2, trumpCard: t2 } = drawFrom(deck, tc, need);
          if (drawn.length) {
            players[idx] = { ...players[idx], hand: [...players[idx].hand, ...drawn] };
            addLog(M.playerDrew(act(players[idx], 'nostit', 'nosti'), kortin(drawn.length)));
          }
          deck = d2; tc = t2;
        }
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
        // Eri viesti riippuen sijoituksesta
        if (rank === 1) {
          addLog(M.won(act(p, 'Veit', 'Vei')));
        } else {
          addLog(M.out(act(p, 'Pääsit', 'Pääsi')));
        }
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
          addLog(M.lost(act(p, 'Kärsit', 'Kärsi')));
        }
      });
      const ranking = rankings.map((id, pos) => ({
        name: players[id].name, place: pos + 1, isHuman: players[id].isHuman,
      }));
      if (allBotsRef.current) { setPendingResult({ ranking }); }
      else { onResult?.({ ranking }); }
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

    if (playerWasInvolved) {
      // Odota ihmisen jatkamista ennen seuraavaa kierrosta ja nosto
      // Päivitä pelaajat ja ranking, mutta pidä pöytä näkyvissä
      // Tyhjennä addQueue ja passChain jotta myTurn tulee falseksi (ei näytetä interaktio-elementtejä)
      const gShowResults = { ...g, players, rankings, addQueue: [], passChain: [] };
      setGS(gShowResults);

      // Jos ihminen puolusti, näytä puolustuksen tulos Viesti-kentässä (älä näytä vielä seuraavan kierroksen tietoja)
      if (g.defender === 0) {
        if (defWon) {
          setMsg_('✅ Puolustus onnistui!');
        } else {
          setMsg_('❌ Puolustus epäonnistui!');
        }
      } else {
        // Ihminen hyökkäsi — näytä kierroksen tulos ennen seuraavaa kierrosta
        const defName = players[g.defender].name;
        if (defWon) {
          setMsg_(`🛡️ ${defName} kaatoi kaikki!`);
        } else {
          setMsg_(`⚔️ Hyökkäys onnistui! ${defName} otti kortit.`);
        }
      }

      setPendingDraw({ drawOrder, deck, tc, players, nextAtk, nextDef, g2 });
      setAwaitingPlayerContinue(true);
    } else {
      // Ihminen ei ollut osallisena - päivitä pelitilanteen ja jatka
      addLog(M.nextRound(act(players[nextAtk], 'hyökkäät', 'hyökkää'), act(players[nextDef], 'puolustat', 'puolustaa')));
      setGS(g2);
      if (!players[nextAtk].isHuman) {
        // AI hyökkää seuraavaksi
        schedAI(() => runAI(gRef.current), 1600);
      }
    }
  }

  // ── Ydinsiirrot ───────────────────────────────────────────
  function doAttack(g, atkIdx, cards) {
    const p = g.players[atkIdx];
    const newHand = p.hand.filter(c => !cards.find(a => a.id === c.id));
    const newTable = cards.map(c => ({ atk: c, def: null, atkBy: atkIdx }));
    const players = g.players.map((pl, i) => i === atkIdx ? { ...pl, hand: newHand } : pl);
    addLog(M.attack(act(p, 'hyökkäsit', 'hyökkäsi'), cards.map(lblColored).join(', ')));
    flashLastPlay(p.isHuman ? 'Sinä' : p.name, cards, p.isHuman);
    if (sndRef.current) SFX.leave();
    const ids = new Set(cards.map(c => c.id));
    setJustPlaced(ids);
    tm(() => setJustPlaced(new Set()), 1800);
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

    // Laske pöydän tila: kaadetut/kaatamatta jääneet
    const unbeaten = newTable.filter(t => !t.def).length;
    const beaten = newTable.filter(t => t.def).length;
    const statusMsg = unbeaten > 0 ? `(${beaten}🛡️/${unbeaten}⚔️ pöydällä)` : '(kaikki kaadettu)';

    addLog(M.beat(def.name, lblColored(defCard), lblColored(atkCard), statusMsg));
    flashLastPlay(def.isHuman ? 'Sinä' : def.name, defCard, def.isHuman);
    if (sndRef.current) SFX.beat();
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
      addLog(M.cannotPass);
      return;
    }
    const newHand = def.hand.filter(c => !passCards.find(pc => pc.id === c.id));
    const newTable = [...g.table, ...passCards.map(c => ({ atk: c, def: null, atkBy: g.defender }))];
    const players = g.players.map((p, i) => i === g.defender ? { ...p, hand: newHand } : p);
    addLog(M.pass(act(def, 'siirrit', 'siirsi'), passCards.map(lblColored).join(','), act(g.players[nextDef], 'puolustat', 'puolustaa')));
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
    addLog(M.add(act(p, 'löit sivusta', 'löi sivusta'), cards.map(lblColored).join(', ')));
    const ids = new Set(cards.map(c => c.id));
    setJustPlaced(ids);
    tm(() => setJustPlaced(new Set()), 1800);
    const rest = (g.addQueue || []).slice(1);
    const g2 = {
      ...g, players, table: newTable,
      attackers: [...new Set([...g.attackers, playerIdx])],
      addQueue: rest, phase: 'add',
    };
    setGS(g2);
    // Jatka lisäysvaiheen jonoa seuraavalle pelaajalle (phase pysyy 'add')
    aiTmr.current = tm(() => processAddQueue(gRef.current), 600);
  }

  // ── Puolustuskierros ──────────────────────────────────────
  function goDefend(g) {
    const def = g.players[g.defender];
    const unbeaten = g.table.filter(t => !t.def).length;
    const unbeatenCards = g.table.filter(t => !t.def).map(t => lblColored(t.atk));
    const beaten = g.table.filter(t => t.def).length;

    if (def.isHuman) {
      addLog(M.defendHuman(unbeaten, unbeatenCards.join(', '), beaten));
    } else {
      addLog(M.defendAI(def.name, unbeaten, unbeatenCards.join(', ')));
      schedAI(() => runAI(gRef.current), 1400);
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
    // Jos ei ole ketään joka voi lisätä (tai lisää ei-sallittu)
    if (!queue.length) {
      const unbeaten = g.table.filter(t => !t.def).length;
      // Jos puolustajalla on vielä lyömättömiä kortteja, anna hänelle vuoro kaataa ne
      if (unbeaten > 0) {
        const g2 = { ...g, phase: 'defend' };
        setGS(g2);
        goDefend(g2);
        return;
      }
      // Kaikki kaadettu - kierros onnistui
      resolveRound(g, true);
      return;
    }

    // Näytä lisäysvaiheen alku
    const tableCards = g.table.map(t => lblColored(t.atk)).join(', ');
    addLog(M.addPhase(tableCards));

    const g2 = { ...g, phase: 'add', addQueue: queue };
    setGS(g2);
    processAddQueue(g2);
  }

  function processAddQueue(g) {
    // Kun lisäysvaiheen jono on tyhjä, tarkista onko kaikki pöydän kortit kaadettu
    if (!g.addQueue?.length) {
      const unbeaten = g.table.filter(t => !t.def).length;
      // Jos puolustajalla on vielä lyömättömiä kortteja, anna hänelle vuoro kaataa ne
      if (unbeaten > 0) {
        const g2 = { ...g, phase: 'defend' };
        setGS(g2);
        goDefend(g2);
        return;
      }
      // Kaikki kaadettu - kierros onnistui
      resolveRound(g, true);
      return;
    }
    const next = g.addQueue[0];
    const p = g.players[next];
    const addable = getAddable(g, next);
    if (!addable.length) {
      const rest = g.addQueue.slice(1);
      const g2 = { ...g, addQueue: rest };
      setGS(g2);
      aiTmr.current = tm(() => processAddQueue(g2), 200);
      return;
    }
    if (p.isHuman) {
      addLog(M.canAdd(p.name, addable.map(lblColored).join(', ')));
      setSelAdd([]);
    } else {
      // AI lisää sivusta — aggressiivisuus riippuu tasosta, korttivalinta suosii pieniä parittomia
      const def = g.players[g.defender];
      const lvl = aiLevelRef.current;
      const shouldAdd = lvl === 'beginner'
        ? g.table.length <= 1 && def.hand.length >= 5
        : lvl === 'hard' || lvl === 'supernatural'
          ? def.hand.length >= 2 && g.table.length < 5
          : def.hand.length >= 3 || g.table.length <= 2;
      if (shouldAdd) {
        const card = aiPickAddCard(addable, p.hand, g.ts);
        addLog(M.aiCanAdd(p.name, addable.map(lblColored).join(', ')));
        if (initShowIntention) {
          const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
          setIntention({ playerIdx: next, cards: [card] });
          aiTmr.current = tm(() => { setIntention(null); doAdd(gRef.current, next, [card]); }, intentionMs);
        } else {
          aiTmr.current = tm(() => { doAdd(gRef.current, next, [card]); }, 900 + Math.random() * 300);
        }
      } else {
        addLog(M.aiSkips(p.name));
        const rest = g.addQueue.slice(1);
        const g2 = { ...g, addQueue: rest };
        setGS(g2);
        aiTmr.current = tm(() => processAddQueue(g2), 600);
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
      const lvlA = aiLevelRef.current;
      let cards;
      if (lvlA === 'supernatural') {
        cards = aiPickAttackSN(p, ts, removedRef.current);
      } else {
        cards = aiPickAttack(p, players[defender].hand.length, ts);
        // Aloittelija-virhe: hyökkää suurimmalla kortilla eikä pienimmällä
        if (cards.length && aiShouldFumble(lvlA)) {
          const nonTrumps = p.hand.filter(c => c.s !== ts);
          const pool = nonTrumps.length ? nonTrumps : p.hand;
          cards = [[...pool].sort((a, b) => MV(b) - MV(a))[0]];
        }
      }
      if (!cards.length) { resolveRound(g, true); return; }
      if (initShowIntention) {
        const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
        setIntention({ playerIdx: primaryAtk, cards });
        aiTmr.current = tm(() => { setIntention(null); doAttack(gRef.current, primaryAtk, cards); }, intentionMs);
        return;
      }
      doAttack(g, primaryAtk, cards);
    }

    if (phase === 'defend') {
      const p = players[defender];
      if (p.isHuman) return;

      // Kokeile siirtoa ensin (jos ei vielä kaatanut mitään) — Aloittelija ei siirrä
      const noBeats = !table.some(t => t.def);
      const lvl = aiLevelRef.current;
      if (lvl !== 'beginner' && noBeats && g.passChain.length < players.filter(pl => pl.rank === null).length - 2) {
        const atkRanks = new Set(table.map(t => t.atk.r));
        const passCards = p.hand.filter(c => atkRanks.has(c.r) && c.s !== ts);
        // Pienin sopiva ei-valttikortti — säästää isot kortit
        const passCard = passCards.sort((a, b) => MV(a) - MV(b))[0];
        if (passCard && players.filter(pl => pl.rank === null).length > 2) {
          aiTmr.current = tm(() => {
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
      const shouldFumbleDefense = aiShouldFumble(aiLevelRef.current);
      for (const slot of unbeaten) {
        let dc = aiPickDefense(slot.atk, hand, ts);
        if (!dc) { canBeatAll = false; break; }
        // Aloittelija-virhe: käyttää valttia kun ei-valtilla tulisi toimeen
        if (shouldFumbleDefense && dc.s !== ts) {
          const trumpBeaters = hand.filter(c => c.s === ts && canBeat(slot.atk, c, ts));
          if (trumpBeaters.length) dc = trumpBeaters.sort((a, b) => MV(a) - MV(b))[0];
        }
        beats.push({ atkId: slot.atk.id, defCard: dc });
        hand = hand.filter(c => c.id !== dc.id);
      }

      const isSN = aiLevelRef.current === 'supernatural';
      if (canBeatAll) {
        aiTmr.current = tm(() => {
          let cur = gRef.current;
          for (const { atkId, defCard } of beats) {
            cur = doBeat(cur, atkId, defCard);
          }
          setGS(cur);
          aiTmr.current = tm(() => startAddPhase(cur), isSN ? 400 : 700);
        }, isSN ? 450 : 900);
      } else {
        // Ei pysty täydelliseen puolustukseen — ottaa heti ilman osittaisia paljastuksia
        aiTmr.current = tm(() => {
          resolveRound(gRef.current, false);
        }, isSN ? 300 : 900 + Math.random() * 300);
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
        addLog(M.badSameRank);
        return prev;
      }
      return [...prev, card];
    });
  }

  function humanConfirmAttack() {
    if (!selAtk.length) return;
    const g = gRef.current;
    if (selAtk.length > 6) {
      addLog(M.tooManyCards);
      return;
    }
    if (selAtk.length > g.players[g.defender].hand.length) {
      addLog(M.tooManyVsDef(korttia(g.players[g.defender].hand.length)));
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
      addLog(M.cantBeat(lblColored(card), lblColored(selDefTarget.atk)));
      return;
    }
    const g = gRef.current;
    let g2 = doBeat(g, selDefTarget.atk.id, card);
    setSelDefTarget(null);
    const stillUnbeaten = g2.table.filter(t => !t.def).length;
    if (stillUnbeaten === 0) {
      setGS(g2);
      aiTmr.current = tm(() => startAddPhase(gRef.current), 500);
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
    if (G.table.some(t => t.def)) { addLog(M.noPassAfterBeat); return; }
    const atkRanks = new Set(G.table.map(t => t.atk.r));
    if (!atkRanks.has(card.r)) { addLog(M.badPassCard(lblColored(card))); return; }
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
    const g = gRef.current;
    const addable = getAddable(g, 0);
    if (!addable.find(c => c.id === card.id)) return;
    const maxAdd = getMaxAdd(g);
    setSelAdd(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length >= maxAdd) return prev;
      return [...prev, card];
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

  function continueToNextRound() {
    setAwaitingPlayerContinue(false);

    if (pendingDraw) {
      // Tee nostojen jäljelle jääneet logiikka
      const { drawOrder, deck: initialDeck, tc: initialTc, players, nextAtk, g2 } = pendingDraw;
      let deck = initialDeck, tc = initialTc;

      // Tee nosto
      for (const idx of drawOrder) {
        if (players[idx].rank !== null) continue;
        const need = Math.max(0, 6 - players[idx].hand.length);
        if (need > 0) {
          const { drawn, deck: d2, trumpCard: t2 } = drawFrom(deck, tc, need);
          if (drawn.length) {
            players[idx] = { ...players[idx], hand: [...players[idx].hand, ...drawn] };
            addLog(M.playerDrew(act(players[idx], 'nostit', 'nosti'), kortin(drawn.length)));
          }
          deck = d2; tc = t2;
        }
      }

      // Päivitä g2:n deck ja tc
      const g2Updated = { ...g2, deck, trumpCard: tc };
      setGS(g2Updated);
      setPendingDraw(null);

      // Näytä seuraavan kierroksen viesti
      const { nextDef } = pendingDraw;
      addLog(M.nextRound(act(players[nextAtk], 'hyökkäät', 'hyökkää'), act(players[nextDef], 'puolustat', 'puolustaa')));

      // Aloita seuraava kierros
      if (!g2Updated.players[g2Updated.primaryAtk].isHuman) {
        schedAI(() => runAI(gRef.current), 1600);
      }
    } else {
      const g = gRef.current;
      if (!g || g.phase !== 'attack') return;
      // Aloita seuraava kierros
      if (!g.players[g.primaryAtk].isHuman) {
        schedAI(() => runAI(gRef.current), 1600);
      }
    }
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => { if (G?.phase === 'gameover') window.scrollTo(0, 0); }, [G?.phase]);

  // ── Näkymät ───────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MOSKA</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>PELAAJIA</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
        <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          🔮 Bottien Taistelu
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>4 bottia · yliluonnollinen taso</span>
        </button>
      </div>
    </div>
  );

  if (screen === 'game' && G?.phase === 'gameover') {
    const sorted = [...G.players].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: i === sorted.length - 1 ? 'rgba(224,92,59,0.1)' : i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === sorted.length - 1 ? '#e05c3b55' : i === 0 ? C.gold + '55' : C.panelBorder}` }}>
              <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : i === sorted.length - 1 ? '🐟' : '🎯'}</span>
              <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : i === sorted.length - 1 ? C.red : C.text }}>{p.name}</span>
              <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: i === sorted.length - 1 ? C.red : C.dim }}>{i === sorted.length - 1 ? 'Moska' : `Sija ${p.rank}`}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {allBots ? (<>
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1f8a)', border: 'none', borderRadius: 12, padding: '12px 32px', color: '#f0d0ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi katselutila</button>
            {pendingResult && <button onClick={() => { onResult?.(pendingResult); setPendingResult(null); }} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Tulokset →</button>}
          </>) : (<>
            <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
            <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
          </>)}
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
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <MomentFeedback
        moment={currentMoment}
        onClose={() => setCurrentMoment(null)}
        onRate={saveMomentFeedback}
      />

      {/* Viestikupla */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚔️</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Yläpalkki: valtti */}
      <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 4 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.trump}55`, background: `${C.trump}0d` }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>VALTTI</span>
          <span style={{ fontSize: 18, color: SUIT_COLOR[G.ts], fontWeight: 700 }}>{G.ts}</span>
          {G.trumpCard && <Card card={G.trumpCard} small backStyle={BACKS[cardBack]} />}
        </div>
      </div>

      {/* AI-pelaajien kädet */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 10 }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => {
                const isAttacking = G.phase === 'attack' && p.id === G.primaryAtk && p.rank === null;
                const isDefending = G.phase === 'defend' && p.id === G.defender && p.rank === null;
                const isAdding    = G.phase === 'add' && G.addQueue?.[0] === p.id && p.rank === null;
                const isActive    = isAttacking || isDefending || isAdding;
                let playableSet = null;
                if (isActive) {
                  if (isAttacking) {
                    const tableRanks = new Set(G.table.flatMap(t => [t.atk.r, t.def?.r].filter(Boolean)));
                    playableSet = new Set(G.table.length === 0
                      ? p.hand.map(c => c.id)
                      : p.hand.filter(c => tableRanks.has(c.r)).map(c => c.id));
                  } else if (isDefending) {
                    const unbeaten = G.table.filter(t => !t.def);
                    playableSet = new Set(p.hand.filter(c => unbeaten.some(s => canBeat(s.atk, c, G.ts))).map(c => c.id));
                  } else if (isAdding) {
                    playableSet = new Set(getAddable(G, p.id).map(c => c.id));
                  }
                }
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.id === G.defender ? C.blue + '55' : p.id === G.primaryAtk ? '#e05c3b55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px', opacity: p.rank !== null ? 0.35 : 1 }}>
                    <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: p.id === G.primaryAtk ? C.red : p.id === G.defender ? C.blue : C.dim }}>
                      {p.id === G.primaryAtk ? '⚔' : p.id === G.defender ? '🛡' : '🤖'} {p.name.slice(0, 8)}{p.rank !== null ? ` ${p.rank}.` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                      {sortHand(p.hand).map(c => {
                        const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                        const isPlayable = playableSet?.has(c.id);
                        return <Card key={c.id} card={c} small backStyle={BACKS[cardBack]}
                          selected={isIntended}
                          highlight={!isIntended && isActive && !!isPlayable}
                          dim={!isIntended && isActive && !isPlayable}
                        />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          : (
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => (
                <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.id === G.defender ? C.blue + '55' : p.id === G.primaryAtk ? '#e05c3b55' : C.panelBorder}`, borderRadius: 10, padding: isMobile ? '5px 8px' : '7px 10px', textAlign: 'center', opacity: p.rank !== null ? 0.35 : 1 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: p.id === G.primaryAtk ? C.red : p.id === G.defender ? C.blue : C.dim, marginBottom: 4 }}>
                    {p.id === G.primaryAtk ? '⚔' : p.id === G.defender ? '🛡' : '🤖'} {p.name}
                    {p.rank !== null ? ` — sija ${p.rank}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {debugOpen
                      ? p.hand.map(c => {
                          const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                          return <Card key={c.id} card={c} small backStyle={BACKS[cardBack]} selected={isIntended} />;
                        })
                      : p.hand.map((_, ci) => <div key={ci} style={{ width: 22, height: 33, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                    }
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* Pöytä */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${G.table.length > 0 ? '#e05c3b33' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, minHeight: isMobile ? 130 : 200 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 8, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>PÖYTÄ — {G.table.length === 0 ? 'tyhjä' : `${G.table.length} paria`}
            {defBeaten > 0 && <span style={{ color: C.tikki, marginLeft: 8 }}>✓ {defBeaten} kaadettu</span>}
            {unbeatenSlots.length > 0 && <span style={{ color: C.red, marginLeft: 8 }}>! {unbeatenSlots.length} lyömättä</span>}
          </span>
          <span style={{ color: G.deck.length === 0 ? C.red : C.dim, fontWeight: G.deck.length === 0 ? 700 : 400, animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
            PAKKA — {G.deck.length === 0 ? 'TYHJÄ!' : `${G.deck.length} korttia`}
          </span>
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
                  ? <Card card={slot.def} small backStyle={BACKS[cardBack]} />
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
          {isMyDef && selDefTarget && <span dangerouslySetInnerHTML={{ __html: `${lblColored(selDefTarget.atk)} kohteena — valitse nyt käsikortti, jolla haluat kaataa.` }} />}
          {isMyDef && selPass.length > 0 && `Siirto: ${selPass.map(lbl).join(',')} — klikkaa Siirrä tai peruuta.`}
        </div>
      )}

      {/* Viimeisin siirto */}
      <div style={{ height: 28, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
        {lastPlay && (
          <div key={lastPlay.cards[0].id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,22,18,0.95)', border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`, borderRadius: 12, padding: '4px 12px', animation: 'lastPlayFade 1.9s ease forwards', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>{lastPlay.name}</span>
            {lastPlay.cards.map(c => (
              <span key={c.id} style={{ background: '#f8f2e6', borderRadius: 4, padding: '1px 5px', fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif', color: SUIT_COLOR[c.s] }}>{c.r}{c.s}</span>
            ))}
          </div>
        )}
      </div>

      {!allBots && (<>
      {/* Pelaaja 0 (ihminen tai botti katselutilassa) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${myTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: myTurn ? C.gold : C.dim, marginBottom: 8 }}>
          {allBots ? '🤖' : '👤'} {human.name} {G.primaryAtk === 0 ? '⚔' : G.defender === 0 ? '🛡' : ''}
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
              <Card key={c.id} card={c} large={!isMobile} small={isMobile}                 selected={!!(isAtkSel || isPassSel || isAddSel)}
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
      </>)}

      {/* Bottien taistelu -ohjauspaneeli */}
      {allBots && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'rgba(123,47,190,0.12)', border: '1px solid rgba(123,47,190,0.4)', borderRadius: 12, padding: '8px 14px', marginBottom: isMobile ? 4 : 10 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#c084fc', fontWeight: 700 }}>🤖 KATSELUTILA</span>
          <button onClick={togglePause} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 10, border: '1px solid rgba(123,47,190,0.5)', background: paused ? 'rgba(123,47,190,0.35)' : 'transparent', color: '#c084fc', cursor: 'pointer', fontFamily: 'sans-serif' }}>{paused ? '▶ Jatka' : '⏸ Tauko'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#9b6dc4' }}>Nopeus</span>
            <input type="range" min={500} max={4000} step={250} value={aiDelayMs} onChange={e => { const v = Number(e.target.value); setAiDelayMs(v); aiDelayRef.current = v; }} style={{ width: 80, accentColor: '#7B2FBE', cursor: 'pointer' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#9b6dc4' }}>{(aiDelayMs / 1000).toFixed(1)}s</span>
          </div>
          <button onClick={startBotBattle} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(123,47,190,0.4)', background: 'transparent', color: '#9b6dc4', cursor: 'pointer', fontFamily: 'sans-serif', marginLeft: 'auto' }}>↺ Uusi</button>
        </div>
      )}

      {/* Katselutila: pending result overlay */}
      {allBots && pendingResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 300 }}>
          <div style={{ background: '#1a0a2e', border: '2px solid rgba(123,47,190,0.7)', borderRadius: 20, padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 360 }}>
            <span style={{ fontSize: 32 }}>⚔️</span>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: '#c084fc', letterSpacing: 4 }}>KATSELUTILA PÄÄTTYI</span>
            {pendingResult.ranking.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: 16 }}>{i === 0 ? '🏆' : i === pendingResult.ranking.length - 1 ? '🐟' : '🎯'}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: i === 0 ? '#c084fc' : '#9b6dc4', flex: 1 }}>{p.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: i === 0 ? '#c084fc' : '#6b4a9a' }}>{p.place}. sija</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1f8a)', border: 'none', borderRadius: 12, padding: '11px 24px', color: '#f0d0ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi</button>
              <button onClick={() => { onResult?.(pendingResult); setPendingResult(null); }} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '11px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Tulokset →</button>
            </div>
          </div>
        </div>
      )}

      {/* Toimintopainikkeet */}
      <div style={{ minHeight: allBots ? 0 : (isMobile ? 36 : 52), display: 'flex', gap: 8, marginBottom: isMobile ? 6 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!allBots && isMyAtk && (
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
        {!allBots && isMyDef && (
          <>
            {selPass.length > 0 && (
              <button onClick={humanConfirmPass}
                style={{ background: `rgba(201,168,76,0.12)`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: '10px 18px', color: C.gold, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Siirrä ({selPass.map(lbl).join(',')}) →
              </button>
            )}
            {!awaitingPlayerContinue && (
              <button onClick={humanTake}
                style={{ background: 'rgba(224,92,59,0.1)', border: `1px solid #e05c3b55`, borderRadius: 10, padding: '10px 18px', color: C.red, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Ota kortit ({G.table.length})
              </button>
            )}
            {(selDefTarget || selPass.length > 0) && (
              <button onClick={() => { setSelDefTarget(null); setSelPass([]); }}
                style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {!allBots && isMyAdd && (
          <>
            <button onClick={humanConfirmAdd} disabled={!selAdd.length}
              style={{ background: selAdd.length ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selAdd.length ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 18px', color: selAdd.length ? '#0d2118' : C.dim, fontSize: 13, cursor: selAdd.length ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              Lyö sivusta {selAdd.length > 0 ? `(${selAdd.map(lbl).join(',')})` : ''}
            </button>
            <button onClick={humanSkipAdd}
              style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 14px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
              Ohita
            </button>
          </>
        )}

        {/* Seuraavaan kierrokseen -nappi */}
        {awaitingPlayerContinue && showNextBtn && (
          <button onClick={continueToNextRound}
            style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '12px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', alignSelf: 'stretch', marginTop: 8 }}>
            Seuraava kierros →
          </button>
        )}
      </div>

      {/* Tilarivi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}><span style={{ color: C.gold, fontWeight: 700 }}>Tavoite:</span> pääse korteistasi eroon — jäljimmäinen on Moska</span>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {soundOn ? '🔊' : '🔇'} Ääni
        </button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {debugOpen ? '🙈' : '🔍'} Cheat Mode
        </button>
      </div>

      {/* Loki */}
      <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>TAPAHTUMALOKI</span>
          <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div>
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
        @keyframes lastPlayFade{0%{opacity:0;transform:translateY(-4px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}
      `}</style>
    </div>
  );
}
