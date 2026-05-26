import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, aiShouldFumble, truncName } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import FanStack from '../shared/FanStack.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames(pool) {
  const a = [...(pool || AI_NAMES)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Paskahousu (Wikipedia-versio) ────────────────────────────────────────────
// Arvot: ♥2/♦2 = 2 (pienin) · 3=3 … A=14 · ♠2/♣2 = 15 (suurin)
// Maa ei merkitse — pelaa yhtä suuri tai suurempi arvo
// Tyhjälle pöydälle: kaikki kortit käyvät
// ♠2/♣2 päälle käy vain ♠2/♣2 (arvo 15 ≥ 15)
// Kuvakorttia (J/Q/K) ei saa laittaa seiskaa (7) pienemmän kortin päälle
// 10 kaataa (päällä 3–9), A kaataa (päällä J/Q/K), 4 samaa kaataa (päällä 3–9 tai J/Q/K)
// Kaataja saa jatkaa (uusi vuoro)
// 10/A tyhjälle → seuraava nostaa ja menettää vuoronsa
// Voit pelata 1–4 samanarvoista korttia kerralla (ei pakkoa)

const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

const SUITS      = ['♠','♥','♦','♣'];
const BASE_RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A'];
const BASE_VAL   = Object.fromEntries(BASE_RANKS.map((r, i) => [r, i + 3])); // 3=3 … A=14
const HAND_SZ    = 6;
const LOW        = new Set(['3','4','5','6','7','8','9']);
const FACES      = new Set(['J','Q','K']);
// Kaikki kortit käyvät tyhjälle pöydälle (STARTERS-rajoitus poistettu)

function cardVal(card) {
  if (card.r !== '2') return BASE_VAL[card.r];
  return (card.s === '♠' || card.s === '♣') ? 15 : 2; // musta=korkein, punainen=pienin
}

function mkDeck() {
  return shuffle(SUITS.flatMap(s =>
    [...BASE_RANKS, '2'].map(r => {
      const card = { s, r, id: `${r}${s}_${Math.random()}` };
      card.v = cardVal(card);
      return card;
    })
  ));
}

function sortHand(hand) {
  return [...hand].sort((a, b) => b.v - a.v);
}

function canPlay(card, top) {
  if (!top) return true;
  if (card.r === '10') return top.v <= 9;          // 10 vain alle-10 päälle (kaataa tai rangaistus)
  if (card.r === 'A')  return FACES.has(top.r);    // A vain kuvakortin päälle
  if (FACES.has(card.r) && top.v < 7) return false;
  return card.v >= top.v;
}

// cards = kaikki saman vuoron aikana pelatut kortit (sama arvo)
// pile = koko kasa PELAUKSEN JÄLKEEN (valinnainen) — tarvitaan eri vuoroilla kertyneen 4x:n tarkistukseen
function pileClears(cards, top, pile) {
  const r = cards[0].r;
  // 4 samaa → kaato (myös eri pelaajilta eri vuoroina kertynyt) — toimii myös tyhjällä pöydällä
  if (LOW.has(r) || FACES.has(r)) {
    if (pile) {
      let cnt = 0;
      for (let i = pile.length - 1; i >= 0 && pile[i].r === r; i--) cnt++;
      if (cnt >= 4) return true;
    } else if (cards.length === 4) {
      return true; // fallback ilman kasatietoa — toimii tyhjälläkin pöydällä
    }
  }
  if (!top) return false;
  if (r === '10' && top.v <= 9)        return true; // 10 → arvo ≤ 9 (3-9 + punainen 2)
  if (r === 'A'  && FACES.has(top.r)) return true; // A → J/Q/K
  return false;
}

function emptyPenalty(card) { return card.r === '10' || card.r === 'A'; }

function mkGame(nP, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const deck    = mkDeck();
  const allCards = [...deck]; // kaikki 52 korttia ennen jakoa — AI-inferenssiä varten
  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0, hand: deck.splice(0, HAND_SZ),
  }));
  const starter = players.reduce((best, p, i) => {
    const m = Math.min(...p.hand.map(c => c.v));
    return m < best.val ? { idx: i, val: m } : best;
  }, { idx: 0, val: Infinity }).idx;
  return {
    players, draw: deck, pile: [], top: null,
    turn: starter, skipNext: -1, finished: [], phase: 'play',
    allCards, clearedCards: [],
  };
}

function nextActive(players, from, finished) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!finished.includes(idx)) return idx;
  }
  return -1;
}

function fillHand(hand, draw) {
  const h = [...hand];
  const drawn = [];
  while (h.length < HAND_SZ && draw.length) {
    const c = draw.shift();
    h.push(c);
    drawn.push(c);
  }
  return { hand: h, drawn };
}

// AI: valitse paras kortti tai kortit
// pile = nykyinen kasa (ennen pelaamista) — tarvitaan 4x-kaatolaskennan tarkistukseen
// drawLength = nostopakan koko — 0 = pakka loppu, siirry endgame-strategiaan
// level = 'beginner'|'normal'|'hard'|'supernatural'
// allCards = kaikki 52 korttia pelin alussa (inferenssiä varten)
// clearedCards = kasatut/poistetut kortit (inferenssiä varten)
// activePlayers = aktiivisten (ei finished) pelaajien määrä
function aiCards(hand, top, pile, drawLength, level = 'normal', allCards = null, clearedCards = null, activePlayers = 4) {
  const opts = hand.filter(c => canPlay(c, top));
  if (!opts.length) return null;

  const isHard  = level === 'hard' || level === 'supernatural';
  const isSuper = level === 'supernatural';
  const isKova  = c => c.r === '2' && (c.s === '♠' || c.s === '♣');

  // Täydelliset tiedot: yliluonnollinen + kaksinpeli + pakka tyhjä
  // Vastustajan käsi = kaikki kortit − oma käsi − kasa − kasatut kortit
  let knownOpponentHand = null;
  if (isSuper && activePlayers === 2 && drawLength === 0 && allCards && clearedCards) {
    const ownIds     = new Set(hand.map(c => c.id));
    const pileIds    = new Set(pile.map(c => c.id));
    const clearedIds = new Set(clearedCards.map(c => c.id));
    knownOpponentHand = allCards.filter(c =>
      !ownIds.has(c.id) && !pileIds.has(c.id) && !clearedIds.has(c.id)
    );
  }

  // 1. Täydennä 4 samaa → välitön kaato (korkein prioriteetti)
  if (top && (LOW.has(top.r) || FACES.has(top.r))) {
    const byRank = {};
    opts.forEach(c => { (byRank[c.r] = byRank[c.r] || []).push(c); });
    const topCount = {};
    if (pile) {
      for (let i = pile.length - 1; i >= 0 && pile[i].r === top.r; i--)
        topCount[top.r] = (topCount[top.r] || 0) + 1;
    }
    const quad = Object.values(byRank).find(g => {
      const already = topCount[g[0].r] || 0;
      return (already + g.length) >= 4;
    });
    if (quad) return quad;
  }

  // 1b. Hard/Super: proaktiivinen kaato käden rakenteen perusteella (pakka ei tyhjä)
  if (isHard && top && drawLength > 0 && pile) {
    const distinctInPile = new Set(pile.map(c => c.r)).size;
    if (distinctInPile > 2) {
      const lowThreshold = isSuper ? 1 : 2;
      const lowInHand   = hand.filter(c => c.v <= 6 && !isKova(c)).length;
      const facesInHand = hand.filter(c => FACES.has(c.r)).length;

      // 10-kaato: top ≤ 9, kädessä pieniä + kuvia
      const tens = opts.filter(c => c.r === '10');
      if (tens.length > 0 && top.v <= 9 && lowInHand >= lowThreshold && facesInHand >= 1) {
        return [tens[0]];
      }

      // A-kaato: top on kuvakortti, kädessä pieniä
      const aces = opts.filter(c => c.r === 'A');
      if (aces.length > 0 && FACES.has(top.r) && lowInHand >= lowThreshold) {
        return [aces[0]];
      }
    }
  }

  // Endgame: pakka loppu — tähtää hyviin kortteihin, aiheuta hankaluuksia
  if (drawLength === 0) {
    // Tyhjä pöytä: punainen 2 (♥/♦2, arvo 2) käy vain tyhjälle pöydälle — pelaa se nyt pois
    if (!top) {
      const redTwos = opts.filter(c => c.r === '2' && (c.s === '♥' || c.s === '♦'));
      if (redTwos.length > 0) return redTwos;
    }

    // Yliluonnollinen + täydelliset tiedot: valitse kortti taktisesti
    if (knownOpponentHand !== null) {
      const canOpponentBeat = myCard => knownOpponentHand.some(oc => canPlay(oc, myCard));
      // Prioriteetti 1: kortti jota vastustaja ei voi lyödä → pakottaa nostamaan kasan
      const unbeatable = opts.filter(c => !canOpponentBeat(c));
      if (unbeatable.length > 0) {
        return [unbeatable.reduce((a, b) => a.v < b.v ? a : b)];
      }
      // Prioriteetti 2: kaikki voidaan lyödä — pelaa se joka vaatii vastustajalta korkeimman kortin
      const costOf = c => knownOpponentHand
        .filter(oc => canPlay(oc, c))
        .reduce((mn, oc) => oc.v < mn ? oc.v : mn, Infinity);
      const best = opts.reduce((a, b) => costOf(b) > costOf(a) ? b : a);
      return [best];
    }

    // Säästä: kova kakkonen (suurin), 10 (tyhjentää), A (kaataa kuvakortit), 9 (varmuus)
    const save = new Set(['10', 'A', '9']);
    const notSaved = opts.filter(c => !save.has(c.r) && !isKova(c));

    // Pelaa ensin pienin kuvakortti (J < Q < K) — K on joustavampi myöhemmin, käy korkeammille
    const faces = notSaved.filter(c => FACES.has(c.r));
    if (faces.length > 0) {
      const best = faces.reduce((a, b) => a.v < b.v ? a : b);
      return opts.filter(c => c.r === best.r);
    }

    // Muut ei-säästettävät kortit pienimmästä suurimpaan — korkea on joustavampi myöhemmin
    if (notSaved.length > 0) {
      const best = notSaved.reduce((a, b) => a.v < b.v ? a : b);
      return opts.filter(c => c.r === best.r && c.v === best.v);
    }

    // Vain säästettäviä jäljellä — pelaa 9 ensin, sitten 10/A, viimeisenä kova kakkonen
    const nine = opts.find(c => c.r === '9');
    if (nine) return opts.filter(c => c.r === '9');
    const nonKova = opts.filter(c => !isKova(c));
    if (nonKova.length > 0) return [nonKova.reduce((a, b) => a.v < b.v ? a : b)];
    return [opts[0]];
  }

  // Normaali peli: pakka ei loppu
  // 2. Suosi normaaleja kortteja — käytä 10/A vain kun ei muuta vaihtoehtoa
  const normal = opts.filter(c => c.r !== '10' && c.r !== 'A');
  const pool   = normal.length > 0 ? normal : opts;

  // 3. Valitse pienin arvo ja pelaa KAIKKI saman arvoiset kerralla
  const best = pool.reduce((a, b) => a.v < b.v ? a : b);
  const cards = opts.filter(c => c.r === best.r && c.v === best.v);

  // T ja A pelataan vain yksi kerralla (ne tyhjentävät kasan)
  if (cards.length > 0 && (cards[0].r === '10' || cards[0].r === 'A')) {
    return [cards[0]];
  }

  return cards;
}

// ── Komponentti ───────────────────────────────────────────────────────────────

export default function Paskahousu({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showPlayHints = true, teachMode = true, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', onAiLevelChange }) {
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(playerCount);
  const [soundOn,  setSnd]     = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G,        setG]       = useState(null);
  const [msg,      setMsg_]    = useState('');
  const [log,      setLog]     = useState([]);
  const [logOpen,  setLO]      = useState(hints);
  const [jpIds,    setJP]      = useState(new Set());
  const [lastPlay, setLP]      = useState(null);
  const [selected, setSel]     = useState([]);
  const [debugOpen,setDebug]   = useState(initSeeAll);
  const [swapCountdown, setSCD] = useState(0);
  const [kasaAnim, setKasaAnim] = useState(null); // 'clear' | 'quad' | 'take' | null
  const [pakaAnim, setPakaAnim] = useState(false); // pakka ehtyi -animaatio
  const [shuffling, setShuffling] = useState(false);
  const [currentMoment, setCurrentMoment] = useState(null);
  const [allBots, setAllBots]             = useState(false);
  const [paused, setPaused]               = useState(false);
  const [aiDelayMs, setAiDelayMs]         = useState(2000);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [pendingResult, setPendingResult] = useState(null);
  const [timerLeft,    setTimerLeft]     = useState(null); // yhtäkkinen kuolema -laskuri (sekunteina)

  const gRef    = useRef(null);
  const aiTmr   = useRef(null);
  const swapTmr = useRef(null);
  const logRef  = useRef([]);
  const sndRef     = useRef(true);
  const teachRef   = useRef(teachMode);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  const tmrs    = useRef(new Set());
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };
  const allBotsRef = useRef(false);
  const pausedRef  = useRef(false);
  const aiDelayRef = useRef(2000);
  const suddenDeathTmr     = useRef(null);
  const suddenDeathStarted = useRef(false);

  useEffect(() => { gRef.current = G; },         [G]);
  useEffect(() => { sndRef.current = soundOn; },  [soundOn]);
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); clearInterval(swapTmr.current); clearInterval(suddenDeathTmr.current); }, []);

  // Yhtäkkinen kuolema: käynnistä laskuri kun pakka tyhjä + 2 aktiivista + yliluonnollinen
  useEffect(() => {
    if (!G || G.phase === 'gameover' || suddenDeathStarted.current) return;
    if (aiLevelRef.current !== 'supernatural') return;
    const activeCount = G.players.filter((_, i) => !G.finished.includes(i)).length;
    if (G.draw.length === 0 && activeCount === 2) {
      suddenDeathStarted.current = true;
      setTimerLeft(150);
      addLog('⏱ Pakka tyhjä — <b>Yhtäkkinen kuolema!</b> 2:30 laskuri käy. Vähemmän kortteja voittaa!');
      const id = setInterval(() => {
        if (gRef.current?.phase === 'gameover') { clearInterval(id); setTimerLeft(null); return; }
        setTimerLeft(prev => {
          if (prev === null) { clearInterval(id); return null; }
          if (prev <= 1) { clearInterval(id); tm(() => handleSuddenDeathEnd(), 50); return 0; }
          return prev - 1;
        });
      }, 1000);
      suddenDeathTmr.current = id;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G?.draw?.length, G?.finished?.length, G?.phase]);

  function addLog(m) {
    setMsg_(m);
    const e = {
      t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      m,
    };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function setGS(g) { setG(g); gRef.current = g; }

  const M = {
    gameStart:    (isH, name, lowest) => `Paskahousu alkaa! ${isH
      ? `Kellään ei ole pienempää kuin ${lowest}, joten sinä aloitat. Voit lyödä useammankin samanarvoisen kerralla.`
      : `${name} aloittaa (pienin kortti).`}`,
    played:       (isH, name, cards) => `${isH ? 'Sinä' : name}: ${cards}`,
    won:          (isH, name) => `${isH ? 'Veit voiton' : `${name} vei voiton`}! 🏆🎉`,
    loser:        (isH, name) => `${isH ? 'Sinä jäit' : `${name} jäi`} Paskahousuksi.`,
    swept:        (isH, name, count) => `${isH ? 'Sinä kaadat' : `${name} kaataa`} ${count} kortin kasan! Jatkaa.`,
    turnOf:       name => `Vuorossa ${name}.`,
    yourTurnCont: 'Sinä jatkat vuoroasi.',
    emptyPenalty: (card, nextName) => `${card} tyhjälle — ${nextName} nostaa ja menettää vuoronsa!`,
    emptyPenalty2:(card, nextName) => `${card} tyhjälle — ${nextName} menettää vuoronsa!`,
    blindSwept:   (isH, name, card, count) => `${isH ? 'Sinä vedät sokkona' : `${name} veti sokkona`} ${card} pakasta — kaatoi ${count} kortin kasan! ${isH ? 'Jatkat.' : 'Jatkaa.'}`,
    blindGood:    (isH, name, card) => `${isH ? 'Sinä vedät sokkona' : `${name} veti sokkona`} ${card} pakasta — kortti kävi!`,
    blindBad:     (isH, name, card) => `${isH ? 'Sinä vedät sokkona' : `${name} veti sokkona`} ${card} pakasta — ei käynyt, nosta kasa!`,
    tookPile:     (isH, name, count) => `${isH ? `Sinä nostat ${count} kortin kasan.` : `${name} nostaa ${count} kortin kasan.`}`,
    skipCard:     (isH, name, card) => `${isH ? 'Sinä nostat' : `${name} nostaa`} (${card}) ja ${isH ? 'menetät' : 'menettää'} vuoronsa.`,
    skipNoCard:   (isH, name) => `${isH ? 'Sinä menetät' : `${name} menettää`} vuoronsa.`,
    swapped:      (isH, name, cards) => `${isH ? 'Sinä vaihdat' : `${name} vaihtaa`}! ${cards} kasaan.`,
    swapSwept:    (isH, name, count, cards) => `${isH ? `Sinä kaadat ${count} kortin kasan vaihdossa saamallasi ${cards}! Jatkat.` : `${name} kaataa ${count} kortin kasan vaihdossa saamallaan ${cards}! Jatkaa.`}`,
    aiSwaps:      name => `${name} vaihtaa!`,
    aiStuck:      name => `${name}: ei pysty tekemään mitään.`,
    badCard:      'Kortti ei kelpaa tähän.',
    tipQuad:      (name, rank) => `💡 ${name} täydentää nelosen (${rank}) — kaataa kasan!`,
    tipSaveSpecial:(name, card) => `💡 ${name} säästää ${card} — erityiskortti hätävaraus`,
    tipPlaySmall: (name, cards) => `💡 ${name} lyö pienimmät kortit — pois hankalimmista`,
    tipSwap:      name => `💡 ${name} vaihtaa poistopakasta — sai edullisemman kortin`,
  };

  function triggerKasaAnim(type) {
    setKasaAnim(type);
    tm(() => setKasaAnim(null), type === 'quad' ? 2000 : type === 'clear' ? 1400 : 850);
  }

  function handleSuddenDeathEnd() {
    const g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const active = g.players.filter((_, i) => !g.finished.includes(i));
    if (active.length < 2) return;
    // Voittaa se jolla vähemmän kortteja
    const sorted  = [...active].sort((a, b) => a.hand.length - b.hand.length);
    const winner  = sorted[0];
    const loser   = sorted[sorted.length - 1];
    addLog(`⏱ Aika loppui! <b>${winner.name}</b> voittaa (${winner.hand.length}k &lt; ${loser.hand.length}k).`);
    if (sndRef.current) SFX.capture();
    const newFinished = [...g.finished, winner.id, loser.id];
    const ranking = newFinished.map((idx, pos) => ({
      name: g.players[idx].name, place: pos + 1, isHuman: g.players[idx].isHuman && !allBotsRef.current,
    }));
    setTimerLeft(null);
    setGS({ ...g, finished: newFinished, phase: 'gameover' });
    if (allBotsRef.current) { tm(() => setPendingResult({ ranking }), 800); }
    else { onResult?.({ ranking }); }
  }

  function startGame(forcedCount, allBotsMode = false) {
    suddenDeathStarted.current = false;
    clearInterval(suddenDeathTmr.current);
    setTimerLeft(null);
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    pausedRef.current = false; setPaused(false);
    setPendingResult(null);
    clearTimeout(aiTmr.current);
    setSel([]); setPakaAnim(false);
    const count = forcedCount ?? nP;
    const g = mkGame(count, playerNames, allBotsMode);
    logRef.current = []; setLog([]);
    setGS(g);
    const s = g.players[g.turn];
    const lowestCard = s.hand.reduce((a, b) => a.v <= b.v ? a : b);
    addLog(M.gameStart(s.isHuman, s.name, lblColored(lowestCard)));
    setScreen('game');
    setShuffling(true);
    if (!s.isHuman) schedAI(() => runAI(gRef.current), 3100);
  }

  function startBotBattle() {
    aiLevelRef.current = 'supernatural';
    onAiLevelChange?.('supernatural');
    aiDelayRef.current = 2000; setAiDelayMs(2000);
    setDebug(true);
    setNP(4);
    startGame(4, true);
  }
  function togglePause() { pausedRef.current = !pausedRef.current; setPaused(p => !p); }
  function schedAI(fn, base) {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    aiTmr.current = tm(() => {
      if (pausedRef.current) { const w = () => { if (!pausedRef.current) fn(); else tm(w, 300); }; w(); return; }
      fn();
    }, d + Math.random() * 300);
  }

  // ── applyPlay ─────────────────────────────────────────────────────────────
  function applyPlay(g, pidx, cards) {
    let players    = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    let draw       = [...g.draw];
    let pile       = [...g.pile];
    const p        = players[pidx];
    const topBefore = g.top;
    const isH      = p.isHuman;
    const ids      = new Set(cards.map(c => c.id));

    p.hand = p.hand.filter(c => !ids.has(c.id));
    addLog(M.played(isH, p.name, cards.map(lblColored).join(', ')));
    if (sndRef.current) SFX.play();
    setJP(ids);
    setLP({ name: isH ? 'Sinä' : p.name, cards, isHuman: isH });
    tm(() => setJP(new Set()), 1900);
    tm(() => setLP(null), 1900);

    const prevPile = [...g.pile]; // kasa ennen tätä pelausta (vaihto-logiikkaa varten)
    pile = [...pile, ...cards];
    const newTop = cards[cards.length - 1];

    const filled = fillHand(p.hand, draw);
    p.hand = filled.hand;
    const newlyDrawn = filled.drawn;
    if (g.draw.length > 0 && draw.length === 0) {
      setPakaAnim(true); // pakka on tyhjä
      const activeNow = g.players.length - g.finished.length;
      if (!(aiLevelRef.current === 'supernatural' && activeNow === 2))
        addLog('📦 Pakka on tyhjä — peli jatkuu käsikortein.');
    }

    let finished = [...g.finished];
    if (p.hand.length === 0 && !finished.includes(pidx)) {
      finished = [...finished, pidx];
      addLog(M.won(isH, p.name));
      if (sndRef.current) SFX.capture();
      if (isH && sndRef.current) tm(() => SFX.fanfare(), 300);
    }

    // Peli ohi?
    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      const f = [...finished];
      remaining.forEach(pl => { if (!f.includes(pl.id)) f.push(pl.id); });
      const loser = players[f[f.length - 1]];
      addLog(M.loser(loser.isHuman, loser.name));
      const ranking = f.map((idx, pos) => ({
        name: players[idx].name, place: pos + 1, isHuman: players[idx].isHuman && !allBotsRef.current,
      }));
      setGS({ ...g, players, draw, pile, top: newTop, finished: f, phase: 'gameover' });
      if (allBotsRef.current) { tm(() => setPendingResult({ ranking }), 800); } else { onResult?.({ ranking }); }
      return;
    }

    // Kaato? → kaataja jatkaa (uusi vuoro)
    if (pileClears(cards, topBefore, pile)) {
      addLog(M.swept(isH, p.name, pile.length));
      if (sndRef.current) SFX.capture();
      const isQuad = cards[0].r !== '10' && cards[0].r !== 'A';
      triggerKasaAnim(isQuad ? 'quad' : 'clear');
      const contP = finished.includes(pidx) ? nextActive(players, pidx, finished) : pidx;
      const g2 = { ...g, players, draw, pile: [], top: null, finished, turn: contP, skipNext: -1, phase: 'play',
        clearedCards: [...(g.clearedCards || []), ...pile] };
      setGS(g2);
      if (players[contP] && !players[contP].isHuman)
        schedAI(() => runAI(gRef.current), 1400);
      else addLog(M.yourTurnCont);
      return;
    }

    // Tyhjän pöydän rangaistus?
    let skipNext = g.skipNext;
    if (!topBefore && emptyPenalty(cards[0])) {
      const nextP = nextActive(players, pidx, finished);
      if (nextP !== -1) {
        skipNext = nextP;
        addLog(M.emptyPenalty(lblColored(cards[0]), players[nextP].name));
      }
    }

    // ── Vaihto-mahdollisuus ───────────────────────────────────────────────────
    // Ehto: nostit pienemmän (tai erityiskortin) kuin lyöit → saat 3s vaihtaa
    if (!finished.includes(pidx) && newlyDrawn.length > 0) {
      const minPlayed = Math.min(...cards.map(c => c.v));
      const baseEligible = newlyDrawn.filter(c =>
        canPlay(c, topBefore) &&
        (c.v < minPlayed || pileClears([c], topBefore) || (c.r === '2' && (c.s === '♠' || c.s === '♣')))
      );
      // Lisää käden samanarvoisia — jos vedät 8:n ja sinulla on toinen 8, voit lyödä molemmat
      const eligibleRanks  = new Set(baseEligible.map(c => c.r));
      const newlyDrawnIds  = new Set(newlyDrawn.map(c => c.id));
      const handExtras     = p.hand.filter(c => !newlyDrawnIds.has(c.id) && eligibleRanks.has(c.r));
      const eligible       = [...baseEligible, ...handExtras];
      if (eligible.length > 0) {
        const g2 = { ...g, players, draw, pile, top: newTop, finished, turn: pidx,
          skipNext, phase: 'swap_offer',
          swapData: { prevPile, prevTop: topBefore, playedCards: cards, eligible, pidx },
        };
        setGS(g2); setSel([]);
        if (players[pidx].isHuman) startSwapCountdown(g2);
        else aiTmr.current = tm(() => doAISwap(g2, pidx), 900);
        return;
      }
    }

    const advTurn = nextActive(players, pidx, finished);
    const g2 = { ...g, players, draw, pile, top: newTop, finished, turn: advTurn, skipNext, phase: 'play' };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      schedAI(() => runAI(gRef.current), 1400);
    else addLog(M.turnOf('Hero'));
  }

  // ── applyKnock ────────────────────────────────────────────────────────────
  function applyKnock(g, pidx) {
    if (!g.draw.length) return;
    let players    = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    let draw       = [...g.draw];
    let pile       = [...g.pile];
    const p        = players[pidx];
    const topBefore = g.top;
    const isH      = p.isHuman;

    const knocked = draw.shift();

    if (canPlay(knocked, topBefore)) {
      if (sndRef.current) SFX.flip();
      pile = [...pile, knocked];
      setJP(new Set([knocked.id]));
      tm(() => setJP(new Set()), 2000);

      p.hand = fillHand(p.hand, draw).hand;
      if (draw.length === 0) {
        setPakaAnim(true); // pakka on tyhjä
        const activeNow = g.players.length - g.finished.length;
        if (!(aiLevelRef.current === 'supernatural' && activeNow === 2))
          addLog('📦 Pakka on tyhjä — peli jatkuu käsikortein.');
      }

      let finished = [...g.finished];
      if (p.hand.length === 0 && !finished.includes(pidx)) {
        finished = [...finished, pidx];
        addLog(M.won(isH, p.name));
        if (sndRef.current) SFX.capture();
      }

      const remaining = players.filter((_, i) => !finished.includes(i));
      if (remaining.length <= 1) {
        const f = [...finished];
        remaining.forEach(pl => { if (!f.includes(pl.id)) f.push(pl.id); });
        const loserK = players[f[f.length - 1]];
        addLog(M.loser(loserK.isHuman, loserK.name));
        const ranking = f.map((idx, pos) => ({
          name: players[idx].name, place: pos + 1, isHuman: players[idx].isHuman && !allBotsRef.current,
        }));
        setGS({ ...g, players, draw, pile, top: knocked, finished: f, phase: 'gameover' });
        if (allBotsRef.current) { tm(() => setPendingResult({ ranking }), 800); } else { onResult?.({ ranking }); }
        return;
      }

      if (pileClears([knocked], topBefore, pile)) {
        addLog(M.blindSwept(isH, p.name, lblColored(knocked), pile.length));
        if (sndRef.current) SFX.capture();
        triggerKasaAnim('clear');
        const contP = finished.includes(pidx) ? nextActive(players, pidx, finished) : pidx;
        const g2 = { ...g, players, draw, pile: [], top: null, finished, turn: contP, skipNext: -1, phase: 'play',
          clearedCards: [...(g.clearedCards || []), ...pile] };
        setGS(g2);
        if (players[contP] && !players[contP].isHuman)
          schedAI(() => runAI(gRef.current), 1400);
        else addLog(M.yourTurnCont);
        return;
      }

      addLog(M.blindGood(isH, p.name, lblColored(knocked)));

      let skipNext = g.skipNext;
      if (!topBefore && emptyPenalty(knocked)) {
        const nextP = nextActive(players, pidx, finished);
        if (nextP !== -1) {
          skipNext = nextP;
          addLog(M.emptyPenalty2(lblColored(knocked), players[nextP].name));
        }
      }

      const advTurn = nextActive(players, pidx, finished);
      const g2 = { ...g, players, draw, pile, top: knocked, finished, turn: advTurn, skipNext, phase: 'play' };
      setGS(g2);
      if (players[advTurn] && !players[advTurn].isHuman)
        schedAI(() => runAI(gRef.current), 1400);
      else addLog(M.turnOf('Hero'));
    } else {
      addLog(M.blindBad(isH, p.name, lblColored(knocked)));
      triggerKasaAnim('take');
      p.hand = [...p.hand, knocked, ...pile];
      const advTurn = nextActive(players, pidx, g.finished);
      const g2 = { ...g, players, draw, pile: [], top: null, finished: g.finished, turn: advTurn, skipNext: g.skipNext, phase: 'play' };
      setGS(g2);
      if (players[advTurn] && !players[advTurn].isHuman)
        schedAI(() => runAI(gRef.current), 1400);
      else addLog(M.turnOf('Hero'));
    }
  }

  // ── applyTakePile ─────────────────────────────────────────────────────────
  function applyTakePile(g, pidx) {
    if (!g.pile.length) return;
    let players = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    const isH = players[pidx].isHuman;
    addLog(M.tookPile(isH, players[pidx].name, g.pile.length));
    triggerKasaAnim('take');
    players[pidx].hand = [...players[pidx].hand, ...g.pile];
    const advTurn = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, pile: [], top: null, finished: g.finished, turn: advTurn, skipNext: g.skipNext, phase: 'play' };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = tm(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog(M.turnOf('Hero'));
  }

  // ── applySkip ─────────────────────────────────────────────────────────────
  function applySkip(g, pidx) {
    let players = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    let draw    = [...g.draw];
    const isH   = players[pidx].isHuman;
    const pname = players[pidx].name;

    let pile = [...g.pile];
    let newTop = g.top;

    if (pile.length > 0) {
      // Rangaistuskortti on kasasta (juuri lyöty 10 tai A tyhjälle)
      const penaltyCard = pile.pop();
      newTop = pile.length > 0 ? pile[pile.length - 1] : null;
      players[pidx].hand.push(penaltyCard);
      addLog(M.skipCard(isH, pname, lblColored(penaltyCard)));
    } else if (draw.length) {
      const drawn = draw.shift();
      players[pidx].hand.push(drawn);
      addLog(M.skipCard(isH, pname, lblColored(drawn)));
    } else {
      addLog(M.skipNoCard(isH, pname));
    }

    const nextP = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, draw, pile, top: newTop, skipNext: -1, turn: nextP, phase: 'play' };
    setGS(g2);
    if (nextP !== -1) {
      if (!players[nextP]?.isHuman) aiTmr.current = tm(() => runAI(g2), 1600 + Math.random() * 300);
      else addLog(M.turnOf('Hero'));
    }
  }

  // ── Vaihto-funktiot ───────────────────────────────────────────────────────
  function startSwapCountdown(g) {
    let remaining = 3;
    setSCD(remaining);
    clearInterval(swapTmr.current);
    swapTmr.current = setInterval(() => {
      remaining--;
      setSCD(remaining);
      if (remaining <= 0) { clearInterval(swapTmr.current); skipSwap(gRef.current); }
    }, 1000);
  }

  function skipSwap(g) {
    if (!g) g = gRef.current;
    clearInterval(swapTmr.current); setSCD(0);
    if (!g || g.phase !== 'swap_offer') return;
    const { pidx } = g.swapData;
    const advTurn = nextActive(g.players, pidx, g.finished);
    const g2 = { ...g, phase: 'play', swapData: null, turn: advTurn };
    setGS(g2); setSel([]);
    if (advTurn !== -1 && !g.players[advTurn]?.isHuman)
      aiTmr.current = tm(() => runAI(g2), 1600 + Math.random() * 300);
    else if (advTurn !== -1) addLog(M.turnOf('Hero'));
  }

  function applySwap(g, swapCards) {
    if (!g) g = gRef.current;
    clearInterval(swapTmr.current); setSCD(0);
    if (!g || g.phase !== 'swap_offer') return;
    const { prevPile, prevTop, playedCards, pidx } = g.swapData;
    let players = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    const p = players[pidx];
    const swapIds = new Set(swapCards.map(c => c.id));
    p.hand = p.hand.filter(c => !swapIds.has(c.id));
    p.hand = [...p.hand, ...playedCards];
    addLog(M.swapped(p.isHuman, p.name, swapCards.map(lblColored).join(', ')));
    if (sndRef.current) SFX.swap();
    setJP(new Set(swapCards.map(c => c.id)));
    tm(() => setJP(new Set()), 2000);
    const newPile = [...prevPile, ...swapCards];
    const newTop  = swapCards[swapCards.length - 1];
    setSel([]);
    if (pileClears(swapCards, prevTop, newPile)) {
      addLog(M.swapSwept(p.isHuman, p.name, newPile.length, swapCards.map(lblColored).join(', ')));
      if (sndRef.current) SFX.capture();
      triggerKasaAnim('clear');
      const contP = g.finished.includes(pidx) ? nextActive(players, pidx, g.finished) : pidx;
      const g2 = { ...g, players, pile: [], top: null, turn: contP, phase: 'play', swapData: null,
        clearedCards: [...(g.clearedCards || []), ...newPile] };
      setGS(g2);
      if (players[contP] && !players[contP].isHuman)
        schedAI(() => runAI(gRef.current), 1400);
      else addLog(M.yourTurnCont);
      return;
    }
    const advTurn = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, pile: newPile, top: newTop, turn: advTurn, skipNext: g.skipNext, phase: 'play', swapData: null };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = tm(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog(M.turnOf('Hero'));
  }

  function doAISwap(g, pidx) {
    if (!g) g = gRef.current;
    if (!g || g.phase !== 'swap_offer') return;
    const { playedCards, eligible } = g.swapData;
    const minPlayed = Math.min(...playedCards.map(c => c.v));
    const beneficial = eligible.filter(c => c.v < minPlayed);
    if (beneficial.length > 0) {
      const ranked = {};
      beneficial.forEach(c => { (ranked[c.r] = ranked[c.r] || []).push(c); });
      const bestGroup = Object.values(ranked).reduce((a, b) => a[0].v <= b[0].v ? a : b);
      addLog(M.aiSwaps(g.players[pidx].name));
      applySwap(g, bestGroup);
    } else {
      skipSwap(g);
    }
  }

  // ── runAI ─────────────────────────────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    if (g.phase === 'swap_offer') {
      const { pidx } = g.swapData;
      if (g.players[pidx] && !g.players[pidx].isHuman) doAISwap(g, pidx);
      return;
    }
    const { turn, players, top, draw, finished } = g;
    const p = players[turn];
    if (!p || p.isHuman) return;

    if (g.skipNext === turn) { applySkip(gRef.current, turn); return; }

    addLog(M.turnOf(p.name));
    const activePlayers = g.players.length - g.finished.length;
    let cards = aiCards(p.hand, top, g.pile, draw.length, aiLevelRef.current, g.allCards, g.clearedCards, activePlayers);
    if (cards) {
      if (cards.every(c => c.r !== '10' && c.r !== 'A') && aiShouldFumble(aiLevelRef.current)) {
        // Aloittelija-virhe: pelaa 10 tai A turhaan — erikoiskortti kun normaali kävisi
        const specials = p.hand.filter(c => (c.r === '10' || c.r === 'A') && canPlay(c, top));
        if (specials.length > 0) cards = [specials[0]];
      } else if (cards.length > 1 && aiShouldFumble(aiLevelRef.current)) {
        // Aloittelija-virhe: pelaa vain yhden samanarvoisen kerralla
        cards = [cards[0]];
      }
      if (initShowIntention) {
        const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
        setIntention({ playerIdx: turn, cards });
        aiTmr.current = tm(() => { setIntention(null); applyPlay(gRef.current, turn, cards); }, intentionMs);
        return;
      }
      applyPlay(gRef.current, turn, cards); return;
    }
    if (draw.length)     { applyKnock(gRef.current, turn);       return; }
    if (g.pile.length)   { applyTakePile(gRef.current, turn);    return; }

    addLog(M.aiStuck(p.name));
    const nextP = nextActive(players, turn, finished);
    const g2 = { ...g, turn: nextP };
    setGS(g2);
    if (nextP !== -1 && !players[nextP]?.isHuman)
      aiTmr.current = tm(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog(M.turnOf('Hero'));
  }

  // ── Ihmispelaajan kortinvalinta ───────────────────────────────────────────
  function toggleCard(card) {
    if (!G || G.turn !== 0) return;
    if (G.phase === 'swap_offer') {
      if (G.swapData?.pidx !== 0) return;
      if (!G.swapData.eligible.find(c => c.id === card.id)) return;
      setSel(prev => {
        const has = prev.find(c => c.id === card.id);
        if (has) return prev.filter(c => c.id !== card.id);
        if (prev.length > 0 && prev[0].r !== card.r) return [card];
        return [...prev, card];
      });
      return;
    }
    if (G.phase !== 'play') return;
    if (G.skipNext === 0) return;
    setSel(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].r !== card.r) return [card];
      return [...prev, card];
    });
  }

  function humanPlay() {
    if (!selected.length || !G) return;
    const top = G.top;
    if (!canPlay(selected[0], top)) {
      addLog(M.badCard);
      return;
    }
    const cards = [...selected];
    setSel([]);
    applyPlay(gRef.current, 0, cards);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => { if (G?.phase === 'gameover') window.scrollTo(0, 0); }, [G?.phase]);

  // ── select-näkymä ─────────────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🃏</div>
        <h1 style={{ fontSize: isMobile ? 28 : 40, letterSpacing: isMobile ? 4 : 8, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PASKAHOUSU</h1>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
        <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          🔮 Bottien Taistelu
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>4 bottia · yliluonnollinen taso</span>
        </button>
      </div>
    </div>
  );

  // ── gameover-näkymä ───────────────────────────────────────────────────────
  if (screen === 'game' && G?.phase === 'gameover') {
    const { finished, players } = G;
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {finished.map((pid, i) => {
            const p      = players[pid];
            const isLast = i === finished.length - 1;
            return (
              <div key={pid} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: isLast ? 'rgba(224,92,59,0.1)' : i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${isLast ? '#e05c3b55' : i === 0 ? C.gold + '55' : C.panelBorder}` }}>
                <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : isLast ? '💩' : '🎯'}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : isLast ? C.red : C.text }}>{p.name}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: isLast ? C.red : C.dim }}>{isLast ? 'Paskahousu' : `Sija ${i + 1}`}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
          <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
        </div>
      </div>
    );
  }

  if (!G) return null;

  // ── peli-näkymä ───────────────────────────────────────────────────────────
  const human      = G.players[0];
  const isMyTurn   = G.phase === 'play' && G.turn === 0 && !allBots;
  const mustSkip   = isMyTurn && G.skipNext === 0;
  const myPlayable = human.hand.filter(c => canPlay(c, G.top));
  const canKnock   = isMyTurn && !mustSkip && G.draw.length > 0;
  const canTake    = isMyTurn && !mustSkip && G.pile.length > 0;
  const selValid   = selected.length > 0 && canPlay(selected[0], G.top);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 40 : 56, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🃏</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* AI-kädet — viuhka */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 8 }}>
          {G.players.filter((_, i) => allBots || i !== 0).map(p => {
            const isActive = G.turn === p.id && (G.phase === 'play' || G.phase === 'swap_offer');
            const isDone   = G.finished.includes(p.id);
            const rank     = isDone ? G.finished.indexOf(p.id) + 1 : null;
            const willSkip = G.skipNext === p.id;
            const count = p.hand.length;
            const cw = 20, ch = 30, ov = 10;
            const fanW = count > 0 ? cw + Math.max(0, count - 1) * ov : cw;
            const canHighlight = allBots && isActive && G.phase === 'play' && !isDone;
            const playableSet = canHighlight ? new Set(p.hand.filter(c => canPlay(c, G.top)).map(c => c.id)) : null;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 10, background: isActive ? `${C.gold}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '55' : willSkip ? C.red + '55' : C.panelBorder}`, opacity: isDone ? 0.45 : 1 }}>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : willSkip ? C.red : C.dim, minWidth: 70, flexShrink: 0 }}>
                  {isActive ? '► ' : '🤖 '}{truncName(p.name)}
                  {willSkip && <span style={{ color: C.red, marginLeft: 4 }}>⚠</span>}
                  {isDone && <span style={{ color: C.gold, marginLeft: 4 }}>({rank}.)</span>}
                </span>
                {debugOpen ? (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {sortHand(p.hand).map(c => {
                      const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                      const isPlayable = playableSet?.has(c.id);
                      return <Card key={c.id} card={c} small backStyle={BACKS[cardBack]}
                        selected={isIntended}
                        highlight={!isIntended && !!isPlayable}
                        dim={!isIntended && playableSet !== null && !isPlayable}
                      />;
                    })}
                  </div>
                ) : isDone ? null : count === 0 ? null : (
                  <div style={{ position: 'relative', width: fanW, height: ch, flexShrink: 0 }}>
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} style={{ position: 'absolute', left: i * ov, top: 0, width: cw, height: ch, borderRadius: 3, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, zIndex: i, boxShadow: i === count - 1 ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Viimeisin lyönti -badge — kiinteä korkeus, ei nytkähtelyä */}
      <div style={{ height: 28, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
        {showLastPlay && lastPlay && (
          <div key={lastPlay.cards[0].id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(13,22,18,0.95)', border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`,
            borderRadius: 12, padding: '4px 12px',
            animation: 'lastPlayFade 1.9s ease forwards', pointerEvents: 'none',
          }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>{lastPlay.name}</span>
            {lastPlay.cards.map(c => (
              <span key={c.id} style={{ background: '#f8f2e6', borderRadius: 4, padding: '1px 5px', fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif', color: suitColor(c.s) }}>
                {c.r}{c.s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pino */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${G.top ? C.gold + '33' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 10px' : '12px 16px', marginBottom: isMobile ? 4 : 10, minHeight: isMobile ? 90 : 130, animation: kasaAnim === 'quad' ? 'kasaQuad 2s ease forwards' : kasaAnim === 'clear' ? 'kasaClear 1.4s ease forwards' : kasaAnim === 'take' ? 'kasaTake 0.85s ease forwards' : undefined }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: C.dim }}>KASA — {G.pile.length === 0 ? 'tyhjä' : `${G.pile.length} korttia`}</span>
          <span style={{
            color: G.draw.length === 0 ? C.red : C.dim,
            animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined,
            fontWeight: G.draw.length === 0 ? 700 : 400,
          }}>
            PAKKA — {G.draw.length === 0 ? 'TYHJÄ!' : `${G.draw.length} korttia`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {G.top
            ? <FanStack
                count={G.pile.length}
                w={80} h={108}
                backStyle={BACKS[cardBack]}
                glowColor={jpIds.has(G.top.id) ? C.gold : undefined}
                topCard={
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: suitColor(G.top.s), fontFamily: 'Georgia,serif', lineHeight: 1.1 }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{G.top.r}</div>
                    <div style={{ fontSize: 24 }}>{G.top.s}</div>
                  </div>
                }
              />
            : (
              <div style={{ width: 80, height: 108, borderRadius: 7, border: '1.5px dashed #1a3a22', opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim }}>tyhjä</span>
              </div>
            )}
          {G.top && (() => {
            // laske kuinka monta samanarvoista korttia on pinon päällä
            let sameRankCount = 0;
            for (let i = G.pile.length - 1; i >= 0; i--) {
              if (G.pile[i].r === G.top.r) sameRankCount++;
              else break;
            }
            return (
              <div>
                <div style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.gold, marginBottom: 3 }}>
                  {G.top.r}{G.top.s} — arvo {G.top.v}
                </div>
                {sameRankCount > 1 && (
                  <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.tikki, marginBottom: 2 }}>
                    ×{sameRankCount} samanarvoista päällä
                  </div>
                )}
                {G.pile.length > sameRankCount && (
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>
                    + {G.pile.length - sameRankCount} muuta alla
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Ohje */}
      {isMyTurn && !mustSkip && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, marginBottom: 8, fontStyle: 'italic' }}>
          {selected.length > 0
            ? `Valittu: ${selected.map(lbl).join(', ')} — paina Pelaa tai valitse lisää samanarvoisia`
            : G.top
              ? 'Klikkaa korttia (tai useita samanarvoisia) pelata. Pelaa yhtä suuri tai suurempi.'
              : 'Kasa tyhjä — kaikki kortit käyvät aloittamaan.'}
        </div>
      )}

      {!allBots && (<>
      {/* Oma käsi + vaihto-overlay */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        {/* Vaihto-overlay — ei vaikuta layoutiin */}
        {G.phase === 'swap_offer' && G.swapData?.pidx === 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 14, background: 'rgba(13,22,18,0.97)', border: `2px solid ${C.gold}66`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.gold }}>
              ⚡ Nostit pelattavia! Vaihda {G.swapData.playedCards.map(lbl).join(', ')} → kasaan:
            </div>
            <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>
              Klikkaa kortteja valitaksesi — tai paina Vaihda suoraan
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {G.swapData.eligible.map(c => {
                const isSel = !!selected.find(s => s.id === c.id);
                return (
                  <Card key={c.id} card={c} large={!isMobile} small={isMobile}
                    selected={isSel} highlight={!isSel}
                    justPlaced={jpIds.has(c.id)}
                    onClick={() => toggleCard(c)}
                    backStyle={BACKS[cardBack]}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => { const toSwap = selected.length ? selected : G.swapData.eligible; setSel([]); applySwap(gRef.current, toSwap); }}
                style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 20px', color: '#0d2118', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Vaihda! {(selected.length ? selected : G.swapData.eligible).map(lbl).join(' ')}
              </button>
              <button
                onClick={() => skipSwap(gRef.current)}
                style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 16px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Ohita ({swapCountdown}s)
              </button>
            </div>
          </div>
        )}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : G.phase === 'swap_offer' && G.swapData?.pidx === 0 ? C.gold + '22' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero — {korttia(human.hand.length)} kädessä
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const isSwapPhase  = G.phase === 'swap_offer' && G.swapData?.pidx === 0;
            const isSel    = !!selected.find(s => s.id === c.id);
            const playable = isMyTurn && !mustSkip && canPlay(c, G.top);
            const sameRank = selected.length > 0 && selected[0].r === c.r;
            const hl       = isMyTurn && !mustSkip && playable && !isSel && (selected.length === 0 || sameRank);
            const dimmed   = (isMyTurn && !mustSkip && !playable && !isSel) || (isSwapPhase && !isSel);
            return (
              <Card key={c.id} card={c} large={!isMobile} small={isMobile}
                selected={isSel}
                highlight={!!hl}
                dim={!!dimmed}
                justPlaced={jpIds.has(c.id)}
                onClick={(isMyTurn && !mustSkip && playable) ? () => toggleCard(c) : undefined}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>
      </div>{/* /oma käsi + vaihto-overlay */}
      </>)}

      {/* Toiminnot */}
      <div style={{ minHeight: 52, display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {mustSkip && (
          <button onClick={() => applySkip(gRef.current, 0)} style={{ background: 'rgba(224,92,59,0.12)', border: `1px solid ${C.red}55`, borderRadius: 10, padding: '10px 20px', color: C.red, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Nosta kortti ja menetä vuoro ⚠
          </button>
        )}
        {isMyTurn && !mustSkip && selValid && (
          <button onClick={humanPlay} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 22px', color: '#0d2118', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Pelaa ({selected.map(lbl).join(', ')})
          </button>
        )}
        {isMyTurn && !mustSkip && selected.length > 0 && (
          <button onClick={() => setSel([])} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
        )}
        {canKnock && (
          <button onClick={() => { setSel([]); applyKnock(gRef.current, 0); }} style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${C.gold}55`, borderRadius: 10, padding: '10px 20px', color: C.gold, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Aina voi kokeilla pakasta
          </button>
        )}
        {canTake && (
          <button onClick={() => { setSel([]); applyTakePile(gRef.current, 0); }} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.dim}44`, borderRadius: 10, padding: '10px 18px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Nosta kasa ({G.pile.length}k)
          </button>
        )}
      </div>

      {/* Yhtäkkinen kuolema -laskuri */}
      {timerLeft !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 8, borderRadius: 10, background: timerLeft <= 30 ? 'rgba(224,92,59,0.12)' : 'rgba(123,47,190,0.08)', border: `1px solid ${timerLeft <= 30 ? '#e05c3b66' : 'rgba(123,47,190,0.35)'}` }}>
          <span style={{ fontSize: 14 }}>⏱</span>
          <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: timerLeft <= 30 ? '#ff6644' : '#e0ccff', minWidth: 48, animation: timerLeft <= 10 ? 'timerPulse 1s ease infinite' : undefined }}>
            {String(Math.floor(timerLeft / 60)).padStart(2, '0')}:{String(timerLeft % 60).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: timerLeft <= 30 ? '#ff9977' : '#bb88ff' }}>
            Yhtäkkinen kuolema — vähemmän kortteja voittaa!
          </span>
        </div>
      )}

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}><span style={{ color: C.gold, fontWeight: 700 }}>Tavoite:</span> pääse kortistasi eroon — viimeinen on Paskahousu</span>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {soundOn ? '🔊' : '🔇'} Ääni
        </button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {debugOpen ? '🙈' : '🔍'} Cheat Mode
        </button>
      </div>

      {allBots && G?.phase !== 'gameover' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 10px', background: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.25)', borderRadius: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#bb88ff' }}>🔮 Katsomotila</span>
          <button onClick={togglePause} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(123,47,190,0.4)', background: paused ? 'rgba(123,47,190,0.3)' : 'transparent', color: '#f0e6ff', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>{paused ? '▶ Jatka' : '⏸ Tauko'}</button>
          <button onClick={() => { aiDelayRef.current = Math.max(500, aiDelayRef.current - 500); setAiDelayMs(aiDelayRef.current); }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(123,47,190,0.3)', background: 'transparent', color: '#bb88ff', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>−0.5s</button>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#bb88ff', minWidth: 36, textAlign: 'center' }}>{(aiDelayMs / 1000).toFixed(1)}s</span>
          <button onClick={() => { aiDelayRef.current = Math.min(4000, aiDelayRef.current + 500); setAiDelayMs(aiDelayRef.current); }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(123,47,190,0.3)', background: 'transparent', color: '#bb88ff', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>+0.5s</button>
        </div>
      )}

      {pendingResult && allBots && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,22,18,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 100, padding: 24 }}>
          <div style={{ fontSize: 32 }}>🔮</div>
          <h2 style={{ color: C.gold, fontFamily: 'Georgia,serif', margin: 0, letterSpacing: 4 }}>KATSOMOTILA PÄÄTTYI</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
            {pendingResult.ranking.map((r, i) => {
              const medals = ['🥇','🥈','🥉','4️⃣'];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12, background: i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? C.gold + '55' : C.panelBorder}` }}>
                  <span style={{ fontSize: 18 }}>{medals[i] || ''}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : C.dim }}>{r.name}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={startBotBattle} style={{ padding: '12px 28px', borderRadius: 12, background: 'rgba(123,47,190,0.3)', border: '1px solid rgba(123,47,190,0.5)', color: '#f0e6ff', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🔮 Uusi katselutila</button>
            <button onClick={() => onResult?.(pendingResult)} style={{ padding: '12px 28px', borderRadius: 12, background: `linear-gradient(135deg,#e8c96a,${C.gold})`, border: 'none', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Tulokset →</button>
          </div>
        </div>
      )}

      {/* Loki */}
      <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>TAPAHTUMALOKI</span>
          <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div>
            {log.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 14px', borderTop: '1px solid rgba(42,74,50,0.4)', background: i === 0 ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
                <span style={{ fontSize: 12, color: i === 0 ? '#c8e0d0' : '#8aaa90', fontFamily: 'sans-serif', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: e.m }}></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MomentFeedback
        moment={currentMoment}
        onClose={() => setCurrentMoment(null)}
        onRate={() => {
          setMsg_('💾 Momentti tallennettu! Hyvä peli!');
          setCurrentMoment(null);
        }}
      />

      <style>{`
        button:active { transform: scale(0.97); }
        @keyframes lastPlayFade {
          0%   { opacity: 0; transform: translateY(-4px); }
          12%  { opacity: 1; transform: translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes kasaQuad {
          0%   { box-shadow: none; border-color: rgba(201,168,76,0.2); transform: scale(1) rotate(0deg); }
          10%  { box-shadow: 0 0 0 8px rgba(155,89,182,0.6), 0 0 60px 25px rgba(201,168,76,0.5), 0 0 100px 50px rgba(155,89,182,0.3); border-color: rgba(155,89,182,0.9); transform: scale(1.03) rotate(-1deg); }
          25%  { box-shadow: 0 0 0 12px rgba(201,168,76,0.5), 0 0 80px 35px rgba(201,168,76,0.4), 0 0 120px 60px rgba(155,89,182,0.25); border-color: rgba(201,168,76,0.9); transform: scale(1.04) rotate(1deg); }
          45%  { box-shadow: 0 0 0 8px rgba(76,175,125,0.4), 0 0 60px 30px rgba(76,175,125,0.25); border-color: rgba(76,175,125,0.7); transform: scale(1.02) rotate(-0.5deg); }
          70%  { box-shadow: 0 0 0 4px rgba(76,175,125,0.2), 0 0 30px 15px rgba(76,175,125,0.1); border-color: rgba(76,175,125,0.4); transform: scale(1) rotate(0deg); }
          100% { box-shadow: none; border-color: rgba(201,168,76,0.2); transform: scale(1) rotate(0deg); }
        }
        @keyframes kasaClear {
          0%   { box-shadow: none; border-color: rgba(201,168,76,0.2); }
          18%  { box-shadow: 0 0 0 6px rgba(201,168,76,0.5), 0 0 50px 20px rgba(201,168,76,0.4), 0 0 80px 40px rgba(76,175,125,0.25); border-color: rgba(201,168,76,0.9); }
          45%  { box-shadow: 0 0 0 10px rgba(76,175,125,0.3), 0 0 60px 30px rgba(76,175,125,0.2); border-color: rgba(76,175,125,0.6); }
          100% { box-shadow: none; border-color: rgba(201,168,76,0.2); }
        }
        @keyframes kasaTake {
          0%   { opacity: 1; transform: scale(1) translateY(0); }
          30%  { opacity: 0.75; transform: scale(1.02) translateY(-5px); }
          65%  { opacity: 0.3; transform: scale(0.97) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pakaFlash {
          0%   { opacity: 0.4; letter-spacing: 1.5px; }
          12%  { opacity: 1; letter-spacing: 3px; text-shadow: 0 0 14px rgba(224,92,59,0.9), 0 0 30px rgba(224,92,59,0.5); }
          40%  { opacity: 1; letter-spacing: 2px; text-shadow: 0 0 8px rgba(224,92,59,0.5); }
          70%  { opacity: 1; letter-spacing: 1.5px; text-shadow: none; }
          100% { opacity: 1; }
        }
        @keyframes timerPulse {
          0%   { opacity: 1; transform: scale(1); }
          50%  { opacity: 0.65; transform: scale(1.1); color: #ff3300; }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
