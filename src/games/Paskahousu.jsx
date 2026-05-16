import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import FanStack from '../shared/FanStack.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames() {
  const a = [...AI_NAMES];
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

function mkGame(nP) {
  const aiNames = shuffledAINames();
  const deck    = mkDeck();
  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? 'Hero' : aiNames[i - 1],
    isHuman: i === 0, hand: deck.splice(0, HAND_SZ),
  }));
  const starter = players.reduce((best, p, i) => {
    const m = Math.min(...p.hand.map(c => c.v));
    return m < best.val ? { idx: i, val: m } : best;
  }, { idx: 0, val: Infinity }).idx;
  return {
    players, draw: deck, pile: [], top: null,
    turn: starter, skipNext: -1, finished: [], phase: 'play',
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
function aiCards(hand, top, pile) {
  const opts = hand.filter(c => canPlay(c, top));
  if (!opts.length) return null;

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

export default function Paskahousu({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, teachMode = true }) {
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(4);
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

  const gRef    = useRef(null);
  const aiTmr   = useRef(null);
  const swapTmr = useRef(null);
  const logRef  = useRef([]);
  const sndRef  = useRef(true);

  useEffect(() => { gRef.current = G; },         [G]);
  useEffect(() => { sndRef.current = soundOn; },  [soundOn]);
  useEffect(() => () => { clearTimeout(aiTmr.current); clearInterval(swapTmr.current); }, []);

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

  function triggerKasaAnim(type) {
    setKasaAnim(type);
    setTimeout(() => setKasaAnim(null), type === 'quad' ? 2000 : type === 'clear' ? 1400 : 850);
  }

  function startGame() {
    clearTimeout(aiTmr.current);
    setSel([]); setPakaAnim(false);
    const g = mkGame(nP);
    logRef.current = []; setLog([]);
    setGS(g);
    const s = g.players[g.turn];
    const lowestCard = s.hand.reduce((a, b) => a.v <= b.v ? a : b);
    addLog(`Paskahousu alkaa! ${s.isHuman ? `Kellään ei ole pienempää kuin ${lblColored(lowestCard)}, joten sinä aloitat. Voit lyödä useammankin samanarvoisen kerralla.` : `${s.name} aloittaa (pienin kortti).`}`);
    setScreen('game');
    setShuffling(true);
    if (!s.isHuman) aiTmr.current = setTimeout(() => runAI(g), 4100);
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
    addLog(`${isH ? 'Sinä' : p.name}: ${cards.map(lblColored).join(', ')}`);
    if (sndRef.current) SFX.flip();
    setJP(ids);
    setLP({ name: isH ? 'Sinä' : p.name, cards, isHuman: isH });
    setTimeout(() => setJP(new Set()), 1900);
    setTimeout(() => setLP(null), 1900);

    const prevPile = [...g.pile]; // kasa ennen tätä pelausta (vaihto-logiikkaa varten)
    pile = [...pile, ...cards];
    const newTop = cards[cards.length - 1];

    const filled = fillHand(p.hand, draw);
    p.hand = filled.hand;
    const newlyDrawn = filled.drawn;
    if (g.draw.length > 0 && draw.length === 0) setPakaAnim(true); // pakka ehtyi

    let finished = [...g.finished];
    if (p.hand.length === 0 && !finished.includes(pidx)) {
      finished = [...finished, pidx];
      addLog(`${isH ? 'Pääsit kortista' : `${p.name} pääsi kortista`}! 🎉`);
      if (sndRef.current) SFX.capture();
    }

    // Peli ohi?
    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      const f = [...finished];
      remaining.forEach(pl => { if (!f.includes(pl.id)) f.push(pl.id); });
      const loser = players[f[f.length - 1]];
      addLog(`${loser.isHuman ? 'Sinä olet' : `${loser.name} on`} Paskahousu! 💩`);
      onResult?.(f[0] === 0);
      return setGS({ ...g, players, draw, pile, top: newTop, finished: f, phase: 'gameover' });
    }

    // Kaato? → kaataja jatkaa (uusi vuoro)
    if (pileClears(cards, topBefore, pile)) {
      addLog(`${isH ? 'Sinä kaadat kasan' : `${p.name} kaataa kasan`}! Jatkaa.`);
      if (sndRef.current) SFX.capture();
      const isQuad = cards[0].r !== '10' && cards[0].r !== 'A';
      triggerKasaAnim(isQuad ? 'quad' : 'clear');
      const contP = finished.includes(pidx) ? nextActive(players, pidx, finished) : pidx;
      const g2 = { ...g, players, draw, pile: [], top: null, finished, turn: contP, skipNext: -1, phase: 'play' };
      setGS(g2);
      if (players[contP] && !players[contP].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
      else addLog('Sinä jatkat vuoroasi.');
      return;
    }

    // Tyhjän pöydän rangaistus?
    let skipNext = g.skipNext;
    if (!topBefore && emptyPenalty(cards[0])) {
      const nextP = nextActive(players, pidx, finished);
      if (nextP !== -1) {
        skipNext = nextP;
        addLog(`${lblColored(cards[0])} tyhjälle — ${players[nextP].name} nostaa ja menettää vuoronsa!`);
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
        else aiTmr.current = setTimeout(() => doAISwap(g2, pidx), 900);
        return;
      }
    }

    const advTurn = nextActive(players, pidx, finished);
    const g2 = { ...g, players, draw, pile, top: newTop, finished, turn: advTurn, skipNext, phase: 'play' };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog('On vuorosi.');
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
      setTimeout(() => setJP(new Set()), 2000);

      p.hand = fillHand(p.hand, draw).hand;
      if (draw.length === 0) setPakaAnim(true); // pakka ehtyi

      let finished = [...g.finished];
      if (p.hand.length === 0 && !finished.includes(pidx)) {
        finished = [...finished, pidx];
        addLog(`${isH ? 'Sinä pääsit kortista' : `${p.name} pääsi kortista`}! 🎉`);
        if (sndRef.current) SFX.capture();
      }

      const remaining = players.filter((_, i) => !finished.includes(i));
      if (remaining.length <= 1) {
        const f = [...finished];
        remaining.forEach(pl => { if (!f.includes(pl.id)) f.push(pl.id); });
        const loserK = players[f[f.length - 1]];
        addLog(`${loserK.isHuman ? 'Sinä olet' : `${loserK.name} on`} Paskahousu! 💩`);
        onResult?.(f[0] === 0);
        return setGS({ ...g, players, draw, pile, top: knocked, finished: f, phase: 'gameover' });
      }

      if (pileClears([knocked], topBefore, pile)) {
        addLog(`${isH ? 'Sinä vedät sokkona' : `${p.name} veti sokkona`} ${lblColored(knocked)} pakasta — kaato! ${isH ? 'Jatkat.' : 'Jatkaa.'}`);
        if (sndRef.current) SFX.capture();
        triggerKasaAnim('clear');
        const contP = finished.includes(pidx) ? nextActive(players, pidx, finished) : pidx;
        const g2 = { ...g, players, draw, pile: [], top: null, finished, turn: contP, skipNext: -1, phase: 'play' };
        setGS(g2);
        if (players[contP] && !players[contP].isHuman)
          aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
        else addLog('Sinä jatkat vuoroasi.');
        return;
      }

      addLog(`${isH ? 'Sinä vedät sokkona' : `${p.name} veti sokkona`} ${lblColored(knocked)} pakasta — kortti kävi!`);

      let skipNext = g.skipNext;
      if (!topBefore && emptyPenalty(knocked)) {
        const nextP = nextActive(players, pidx, finished);
        if (nextP !== -1) {
          skipNext = nextP;
          addLog(`${lblColored(knocked)} tyhjälle — ${players[nextP].name} menettää vuoronsa!`);
        }
      }

      const advTurn = nextActive(players, pidx, finished);
      const g2 = { ...g, players, draw, pile, top: knocked, finished, turn: advTurn, skipNext, phase: 'play' };
      setGS(g2);
      if (players[advTurn] && !players[advTurn].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
      else addLog('On vuorosi.');
    } else {
      addLog(`${isH ? 'Sinä vedät sokkona' : `${p.name} veti sokkona`} ${lblColored(knocked)} pakasta — ei käynyt, nosta kasa!`);
      triggerKasaAnim('take');
      p.hand = [...p.hand, knocked, ...pile];
      const advTurn = nextActive(players, pidx, g.finished);
      const g2 = { ...g, players, draw, pile: [], top: null, finished: g.finished, turn: advTurn, skipNext: g.skipNext, phase: 'play' };
      setGS(g2);
      if (players[advTurn] && !players[advTurn].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
      else addLog('On vuorosi.');
    }
  }

  // ── applyTakePile ─────────────────────────────────────────────────────────
  function applyTakePile(g, pidx) {
    if (!g.pile.length) return;
    let players = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    const isH = players[pidx].isHuman;
    addLog(`${isH ? 'Sinä nostat kasan' : `${players[pidx].name} nostaa kasan`} (${g.pile.length}k).`);
    triggerKasaAnim('take');
    players[pidx].hand = [...players[pidx].hand, ...g.pile];
    const advTurn = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, pile: [], top: null, finished: g.finished, turn: advTurn, skipNext: g.skipNext, phase: 'play' };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog('On vuorosi.');
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
      addLog(`${isH ? 'Sinä nostat' : `${pname} nostaa`} (${lblColored(penaltyCard)}) ja ${isH ? 'menetät' : 'menettää'} vuoronsa.`);
    } else if (draw.length) {
      const drawn = draw.shift();
      players[pidx].hand.push(drawn);
      addLog(`${isH ? 'Sinä nostat' : `${pname} nostaa`} (${lblColored(drawn)}) ja ${isH ? 'menetät' : 'menettää'} vuoronsa.`);
    } else {
      addLog(`${isH ? 'Sinä menetät' : `${pname} menettää`} vuoronsa.`);
    }

    const nextP = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, draw, pile, top: newTop, skipNext: -1, turn: nextP, phase: 'play' };
    setGS(g2);
    if (nextP !== -1) {
      if (!players[nextP]?.isHuman) aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
      else addLog('On vuorosi.');
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
      aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
    else if (advTurn !== -1) addLog('On vuorosi.');
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
    addLog(`${p.isHuman ? 'Sinä vaihdat' : `${p.name} vaihtaa`}! ${swapCards.map(lblColored).join(', ')} kasaan.`);
    if (sndRef.current) SFX.flip();
    setJP(new Set(swapCards.map(c => c.id)));
    setTimeout(() => setJP(new Set()), 2000);
    const newPile = [...prevPile, ...swapCards];
    const newTop  = swapCards[swapCards.length - 1];
    setSel([]);
    if (pileClears(swapCards, prevTop, newPile)) {
      addLog(`${p.isHuman ? 'Sinä kaadat kasan vaihdolla! Jatkat.' : `${p.name} kaataa kasan vaihdolla! Jatkaa.`}`);
      if (sndRef.current) SFX.capture();
      triggerKasaAnim('clear');
      const contP = g.finished.includes(pidx) ? nextActive(players, pidx, g.finished) : pidx;
      const g2 = { ...g, players, pile: [], top: null, turn: contP, phase: 'play', swapData: null };
      setGS(g2);
      if (players[contP] && !players[contP].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
      else addLog('Sinä jatkat vuoroasi.');
      return;
    }
    const advTurn = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, pile: newPile, top: newTop, turn: advTurn, skipNext: g.skipNext, phase: 'play', swapData: null };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog('On vuorosi.');
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
      addLog(`${g.players[pidx].name} vaihtaa!`);
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

    const cards = aiCards(p.hand, top, g.pile);
    if (cards)           { applyPlay(gRef.current, turn, cards); return; }
    if (draw.length)     { applyKnock(gRef.current, turn);       return; }
    if (g.pile.length)   { applyTakePile(gRef.current, turn);    return; }

    addLog(`${p.name}: ei pysty tekemään mitään.`);
    const nextP = nextActive(players, turn, finished);
    const g2 = { ...g, turn: nextP };
    setGS(g2);
    if (nextP !== -1 && !players[nextP]?.isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 1600 + Math.random() * 300);
    else addLog('On vuorosi.');
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
      addLog('Kortti ei kelpaa tähän.');
      return;
    }
    const cards = [...selected];
    setSel([]);
    applyPlay(gRef.current, 0, cards);
  }

  // ── select-näkymä ─────────────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🃏</div>
        <h1 style={{ fontSize: 40, letterSpacing: 8, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PASKAHOUSU</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8, marginBottom: 6 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', margin: '0', marginBottom: 6 }}>Wikipedia-versio · viimeinen on Paskahousu</p>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, marginBottom: 12, letterSpacing: 2 }}>PELAAJIA</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 360, fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.8, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt lyhyesti</span><br />
        6 korttia. Pienin kortti aloittaa. Neljä samaa kaataa.<br />
        Seiskan päälle saa laittaa kuvan. 10 kaataa 2–9, A kaataa J–K.<br />
        Voi pelata 1–4 samanarvoista yhdellä vuorolla.<br />
        Saa vaihtaa, jos ehtii ennen seuraavan lyöntiä.<br />
        Tavoite: päästä korteista eroon nostopakan ehdyttyä.<br />
        Viimeinen pelaaja on Paskahousu.
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>
          Aloita →
        </button>
      </div>
    </div>
  );

  // ── gameover-näkymä ───────────────────────────────────────────────────────
  if (screen === 'game' && G?.phase === 'gameover') {
    const { finished, players } = G;
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {finished.map((pid, i) => {
            const p      = players[pid];
            const isLast = i === finished.length - 1;
            return (
              <div key={pid} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: isLast ? 'rgba(224,92,59,0.1)' : i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${isLast ? '#e05c3b55' : i === 0 ? C.gold + '55' : C.panelBorder}` }}>
                <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : isLast ? '💩' : '🎯'}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : isLast ? C.red : C.text }}>{p.name}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim }}>Sija {i + 1}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
          <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
        </div>
      </div>
    );
  }

  if (!G) return null;

  // ── peli-näkymä ───────────────────────────────────────────────────────────
  const human      = G.players[0];
  const isMyTurn   = G.phase === 'play' && G.turn === 0;
  const mustSkip   = isMyTurn && G.skipNext === 0;
  const myPlayable = human.hand.filter(c => canPlay(c, G.top));
  const canKnock   = isMyTurn && !mustSkip && G.draw.length > 0;
  const canTake    = isMyTurn && !mustSkip && G.pile.length > 0;
  const selValid   = selected.length > 0 && canPlay(selected[0], G.top);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: 32 }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 12, minHeight: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💩</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Pelaajastatus */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {G.players.map((p, i) => {
          const isActive = G.turn === i && (G.phase === 'play' || G.phase === 'swap_offer');
          const isDone   = G.finished.includes(i);
          const rank     = isDone ? G.finished.indexOf(i) + 1 : null;
          const willSkip = G.skipNext === i;
          return (
            <div key={i} style={{ padding: '4px 10px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: 11, background: isActive ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '55' : willSkip ? C.red + '55' : C.panelBorder}`, color: isActive ? C.gold : willSkip ? C.red : C.dim, opacity: isDone ? 0.5 : 1, transition: 'all 0.2s' }}>
              {isActive ? '► ' : ''}{p.name}
              {isDone ? ` (${rank}.)` : ` — ${p.hand.length}k`}
              {willSkip ? ' ⚠' : ''}
            </div>
          );
        })}
      </div>

      {/* AI-kädet */}
      {G.players.filter((_, i) => i !== 0).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {G.players.filter((_, i) => i !== 0).map(p => {
            const isActive = G.turn === p.id && G.phase === 'play';
            const isDone   = G.finished.includes(p.id);
            return (
              <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '7px 10px', textAlign: 'center', opacity: isDone ? 0.35 : 1 }}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, marginBottom: 4 }}>
                  {isActive ? '► ' : '🤖 '}{p.name}
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {debugOpen
                    ? p.hand.map(c => <Card key={c.id} card={c} small backStyle={BACKS[cardBack]} />)
                    : p.hand.map((_, ci) => <div key={ci} style={{ width: 22, height: 33, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Viimeisin lyönti -badge — kiinteä korkeus, ei nytkähtelyä */}
      <div style={{ height: 28, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
        {lastPlay && (
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
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${G.top ? C.gold + '33' : C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 10, minHeight: 130, animation: kasaAnim === 'quad' ? 'kasaQuad 2s ease forwards' : kasaAnim === 'clear' ? 'kasaClear 1.4s ease forwards' : kasaAnim === 'take' ? 'kasaTake 0.85s ease forwards' : undefined }}>
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
                  <Card key={c.id} card={c} large
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
              <Card key={c.id} card={c} large
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

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flex: 1 }}>
          Pelissä: {G.players.filter((_, i) => !G.finished.includes(i)).length} pelaajaa
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
      `}</style>
    </div>
  );
}
