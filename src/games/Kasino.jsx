import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR, SUIT_COLOR_DARK } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, kortin, shuffle, SUITS, RANKS, VAL, aiShouldFumble, newDeck } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames(pool) {
  const a = [...(pool || AI_NAMES)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderLogMessage(text) {
  const parts = [];
  let lastIndex = 0;
  const cardRegex = /(\d+|[JQKA])([♠♥♦♣])/g;
  let match;

  while ((match = cardRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const rank = match[1];
    const suit = match[2];
    const color = SUIT_COLOR_DARK[suit];
    parts.push(
      <span key={`${match.index}-${rank}${suit}`} style={{ color, fontWeight: 700 }}>
        {rank}{suit}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 1 ? <>{parts}</> : text;
}

// ── Kasino-arvot ──────────────────────────────────────────────
const isRuutuKymppi  = c => c && c.r === '10' && c.s === '♦';
const isPataKakkonen = c => c && c.r === '2'  && c.s === '♠';
const handVal  = c => isPataKakkonen(c) ? 15 : isRuutuKymppi(c) ? 16 : c.r === 'A' ? 14 : c.v;
const tableVal = c => isPataKakkonen(c) ? 2  : isRuutuKymppi(c) ? 10 : c.r === 'A' ? 1  : c.v;

// Kuinka vaarallista on jättää candidate pöytään (mahdollistaa pistekorttien kaappauksen)?
function leaveDanger(candidate, table) {
  const cv = tableVal(candidate);
  let score = 0;
  for (const t of table) {
    const sum = cv + tableVal(t);
    // Vastustaja voi kaapata molemmat jos pystyy pelaamaan kortin arvolla = sum (max 14 = ässä)
    if (sum <= 14) {
      if (isPataKakkonen(t)) score += 10;
      else if (isRuutuKymppi(t)) score += 7;
      else score += 1;
    }
  }
  return score;
}

// ── AI-pistearvo: sama kaava kuin Vaihtoehdot-modaalissa ─────────────────
function aiCardScore(cards, isMokki = false) {
  let pts = 0;
  for (const c of cards) {
    if (isRuutuKymppi(c)) pts += 2;
    else if (isPataKakkonen(c)) pts += 1;
    else if (c.r === 'A') pts += 1;
  }
  if (isMokki) pts += 1;
  const spades = cards.filter(c => c.s === '♠').length;
  return pts * 10000 + spades * 100 + cards.length;
}

// ── Supernatural AI: tuntematon korttipankki ─────────────────────────────
// Palauttaa kaikki kortit joita em. pelaaja ei varmuudella tiedä
function getUnknownPool(g, playerIdx) {
  const known = new Set();
  const mark = cards => cards.forEach(c => known.add(`${c.r}${c.s}`));
  mark(g.players[playerIdx].hand);
  mark(g.table);
  mark(g.builds.flatMap(b => b.cards));
  g.players.forEach(p => mark(p.captured));
  return SUITS.flatMap(s => RANKS.map(r => `${r}${s}`)).filter(rs => !known.has(rs));
}

// Todennäköisyys, että vähintään yhdellä vastustajalla on kortti jolla handVal = targetHV
// (hypergeometrinen: käytetään ilman palautusta)
function pAnyOpponentHas(g, playerIdx, targetHV) {
  const pool = getUnknownPool(g, playerIdx);
  const U = pool.length;
  if (U === 0) return 0;
  // Laske kuinka monta tuntematonta korttia osuu targetHV:hen
  const m = pool.filter(rs => {
    const r = rs.slice(0, -1); // rank: 'A','2'..'K','10' (suit on viimeinen merkki)
    if (r === '2' && rs.endsWith('♠')) return targetHV === 15;  // 2♠ handVal=15
    if (r === '10' && rs.endsWith('♦')) return targetHV === 16; // 10♦ handVal=16
    if (r === 'A') return targetHV === 14;
    return VAL[r] === targetHV;
  }).length;
  if (m === 0) return 0;
  const k = g.players.filter((_, i) => i !== playerIdx).reduce((s, p) => s + p.hand.length, 0);
  if (k === 0) return 0;
  // P(ei yksikään k vastustajan kortista osu) = product((U-m-i)/(U-i))  i=0..k-1
  let pNone = 1;
  for (let i = 0; i < k && (U - i) > 0; i++) {
    pNone *= Math.max(0, U - m - i) / (U - i);
  }
  return 1 - pNone;
}

// Etsi paras pöytäkorttilisäys rakennelmakaapin yhteyteen (sama arvo kuin rakennelmalla)
function findTableBonus(table, value) {
  let best = null;
  const n = table.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sel = table.filter((_, i) => (mask >> i) & 1);
    if (canPartition(sel, value)) {
      const score = aiCardScore(sel);
      if (!best || score > best.score) best = { cards: sel, score };
    }
  }
  return best ? best.cards : [];
}

// Todennäköisyyspainotettu varastusriski: kuinka vaarallinen tämä jättö on?
function pWeightedLeaveDanger(candidate, g, playerIdx) {
  const cardW = c => isPataKakkonen(c) ? 10 : isRuutuKymppi(c) ? 7 : c.r === 'A' ? 3 : 1;
  const cv = tableVal(candidate);
  // Suora: joku kaappaa candidaten yksin (tarvitsee käsikortin arvolla cv)
  let danger = pAnyOpponentHas(g, playerIdx, cv) * cardW(candidate);
  // Epäsuora: yhdistelmä candidaten + pöytäkortin kaappaus
  for (const t of g.table) {
    const sum = cv + tableVal(t);
    if (sum > 16) continue; // korkein kaappausarvo: ♦10 = 16, ♠2 = 15, ässä = 14
    danger += pAnyOpponentHas(g, playerIdx, sum) * cardW(t);
  }
  return danger;
}

// ── Multi-capture: voidaanko valitut pöytäkortit jakaa ryhmiin,
//    joista kukin summautuu kohdearvoon?
function canPartition(cards, target) {
  if (!cards.length) return false;
  const used = new Array(cards.length).fill(false);

  function bt(currentSum, groupCount) {
    const allUsed = used.every(u => u);
    if (allUsed) return groupCount > 0 && currentSum === 0;
    for (let i = 0; i < cards.length; i++) {
      if (used[i]) continue;
      const v = tableVal(cards[i]);
      if (currentSum + v > target) continue;
      used[i] = true;
      if (currentSum + v === target) {
        if (bt(0, groupCount + 1)) return true;
      } else {
        if (bt(currentSum + v, groupCount)) return true;
      }
      used[i] = false;
    }
    return false;
  }
  return bt(0, 0);
}

// Etsi miten kortit jakautuvat ryhmiin (käytetään UI-visualisointiin)
function findGroups(cards, target) {
  const used = new Array(cards.length).fill(false);
  const groups = [];

  function bt(currentGroup, currentSum) {
    const allUsed = used.every(u => u);
    if (allUsed) return currentSum === 0;
    for (let i = 0; i < cards.length; i++) {
      if (used[i]) continue;
      const v = tableVal(cards[i]);
      if (currentSum + v > target) continue;
      used[i] = true;
      currentGroup.push(cards[i].id);
      if (currentSum + v === target) {
        groups.push([...currentGroup]);
        if (bt([], 0)) return true;
        groups.pop();
      } else {
        if (bt(currentGroup, currentSum + v)) return true;
      }
      currentGroup.pop();
      used[i] = false;
    }
    return false;
  }
  if (bt([], 0)) return groups;
  return [];
}

// Sääntövalinta (aloitusnäytöltä): salli rakennelmat erikoiskorttien arvoille (A=14, ♠2=15, ♦10=16)
const KASINO_DEFAULT_RULES = { specialBuilds: false };

function initGame(nPlayers, pool, allBots = false, rules = KASINO_DEFAULT_RULES) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  const players = Array.from({ length: nPlayers }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1], isHuman: allBots ? false : i === 0,
    hand: [], captured: [], tikkiCount: 0, score: 0,
  }));
  const table = deck.splice(0, 4);
  players.forEach(p => p.hand = deck.splice(0, 4));
  return { players, deck, table, builds: [], lastCapture: null, round: 1, rules };
}

function dealHands(g) {
  if (g.deck.length === 0) return g;
  const deck = [...g.deck];
  const players = g.players.map(p => ({ ...p, hand: [...p.hand, ...deck.splice(0, 4)] }));
  return { ...g, players, deck };
}

const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
    return sd !== 0 ? sd : handVal(a) - handVal(b);
  });
}

const lblColored = c => c ? `${c.r}${c.s}` : '—';

const M = {
  gameStart: (hint) => `Kasino alkaa! Pöydässä kortit. Vuorossa Hero. ${hint}`,
  newDeal: (left) => `Uusi jako — ${left} pakassa jäljellä.`,
  forcedLeave: 'Pakollinen siirto — yksi kortti kädessä, pöytä tyhjä.',
  yourTurn: (count, hint) => `Vuorossa Hero. ${count} kädessä. ${hint}`,
  aiThinking: (name) => `Vuorossa ${name}.`,
  endRound: 'Kierros päättyi! Pisteet lasketaan...',
  newRound: (scores, hint) => `Uusi peli! Pisteet: ${scores}. Vuorossa Hero. ${hint}`,
  humanCapture: (who, handCard, captureStr, isMokki) => `${who}: ${handCard} ← ${captureStr}${isMokki ? ' 🏠 MÖKKI!' : ''}`,
  humanLeave: (who, card) => `${who} ${card} pöytään.`,
  warning: (card, captured) => `⚠ Huom: ${card} olisi kaapattu ${captured} — klikkaa pöytäkortit ennen käsikorttia.`,
  invalidMove: (card) => `${card} ei kaappaa valittuja kortteja — tarkista valintasi tai peruuta.`,
  aiCapture: (name, handCard, captureStr, isMokki) => `${name}: ${handCard} ← ${captureStr}${isMokki ? ' 🏠 MÖKKI!' : ''}`,
  humanBuild: (who, value) => `${who} rakentaa rakennelman — arvo ${value}`,
  aiBuild:    (name, value) => `${name} rakentaa rakennelman — arvo ${value}`,
  noBuildLeave: 'Sinulla on rakennelma pöydässä — kaappaa se ensin!',
};

export default function Kasino({ game, onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showLastPlay = true, showNextBtn = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', onAiLevelChange, onSnapshot }) {
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(playerCount);
  const [rules, setRules] = useState(KASINO_DEFAULT_RULES); // sääntövalinnat aloitusnäytöltä
  const buildCap = rules.specialBuilds ? 16 : 13; // rakennelman max-arvo (13=K, 16=♦10 erikoissäännöllä)
  const [soundOn, setSnd] = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G, setG] = useState(null);
  const [curIdx, setCur] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [selTable, setSelTable] = useState([]);
  const [selBuilds, setSelBuilds] = useState([]); // selected build IDs for capture
  const [captureMode, setCaptureMode] = useState(false); // kaappaustila
  const [buildMode, setBuildMode] = useState(false); // rakennustila
  const [leaveMode, setLeaveMode] = useState(false); // jättämistila
  const [msg, setMsg_] = useState('');
  const [log, setLog] = useState([]);
  const [logOpen, setLO] = useState(hints);
  const [debugOpen, setDebug] = useState(initSeeAll);
  const [scores, setScores] = useState(null);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [aiSel, setAiSel] = useState({ handCard: null, tableCards: [] });
  const [captureAnim, setCaptureAnim] = useState(null); // {handCard, tableCards}
  const [pendingCapture, setPendingCapture] = useState(null); // odottaa Seuraava-nappia
  const [jpId, setJP] = useState(null);
  const [shuffling, setShuffling] = useState(false);
  const [currentMoment, setCurrentMoment] = useState(null);
  const [lastPlay, setLastPlay] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [helpTerm, setHelpTerm] = useState(null); // 'kaappaus' | 'rakennus'
  const [allBots, setAllBots] = useState(false);
  const [paused, setPaused] = useState(false);
  const [aiDelayMs, setAiDelayMs] = useState(2000);
  const [pendingResult, setPendingResult] = useState(null);

  const gRef    = useRef(null);
  const phaseRef = useRef('idle');
  const prevDeckRef = useRef(null);
  const curRef  = useRef(0);
  const aiTmr   = useRef(null);
  const logRef  = useRef([]);
  const cumulBdRef    = useRef(null); // kumulatiivinen pisteytysdata joka kierros
  const showNextBtnRef = useRef(showNextBtn);
  useEffect(() => { showNextBtnRef.current = showNextBtn; }, [showNextBtn]);
  const allBotsRef = useRef(false);
  const pausedRef  = useRef(false);
  const aiDelayRef = useRef(2000);
  const sndRef     = useRef(false);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  const tmrs    = useRef(new Set());
  const lastPlayTmr = useRef(null);
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };
  function schedAI(fn, base) {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    aiTmr.current = tm(() => {
      if (pausedRef.current) { const w = () => { if (!pausedRef.current) fn(); else tm(w, 300); }; w(); return; }
      fn();
    }, d + Math.random() * 400);
  }

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { curRef.current = curIdx; }, [curIdx]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  // Auto-advance kun showNextBtn=false tai allBots-tila ja kaappaus odottaa jatkoa
  useEffect(() => {
    if (pendingCapture && (!showNextBtnRef.current || allBotsRef.current)) {
      const delay = allBotsRef.current ? 400 : 600;
      const id = tm(() => continueAfterCapture(), delay);
      return () => clearTimeout(id);
    }
  }, [pendingCapture]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); clearTimeout(lastPlayTmr.current); }, []);
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  // allBots: kierrosten välissä EI edetä automaattisesti — katsoja näkee pisteiden
  // kertymisen ja klikkaa "Seuraava peli →". Vain pelin lopussa (joku ≥16p) siirrytään
  // automaattisesti tulosnäkymään.
  useEffect(() => {
    if (!scores || !allBotsRef.current) return;
    if (!scores.some(s => s.totalScore >= 16)) return;
    let tid;
    const tryAdv = () => {
      if (pausedRef.current) { tid = tm(tryAdv, 500); return; }
      setScores(null); // pendingResult overlay ottaa vallan
    };
    tid = tm(tryAdv, 3000);
    return () => clearTimeout(tid);
  }, [scores]); // eslint-disable-line react-hooks/exhaustive-deps

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
    if (allBotsRef.current && onSnapshot && gRef.current) {
      const g = gRef.current;
      onSnapshot({ step: logRef.current.length, logText: m,
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: p.score ?? 0 })),
        tableCards: [...(g.table ?? []), ...(g.builds ?? []).flatMap(b => b.cards ?? [])], extraText: null });
    }
  }

  function detectMoment(eventType, context) {
    if (eventType === 'epic_score' && context.score >= 12) {
      if (hints) addLog(`💾 Momentti: ${context.score} pistettä — kasino kuumenee!`);
    }
  }

  function flashLastPlay(name, card, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: [card], isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function startGame(forcedCount, allBotsMode = false) {
    clearTimeout(aiTmr.current);
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    pausedRef.current = false; setPaused(false);
    setPendingResult(null);
    const cnt = forcedCount || nP;
    const g = initGame(cnt, playerNames, allBotsMode, rules);
    setG(g); gRef.current = g;
    setCur(0); curRef.current = 0;
    setPhase('select_table'); phaseRef.current = 'select_table';
    setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false); setScores(null); setPakaAnim(false);
    logRef.current = []; setLog([]);
    cumulBdRef.current = null;
    if (allBotsMode) {
      addLog('🤖 Bottien taistelu alkaa!');
      schedAI(() => runAI(0, gRef.current), 2000);
    } else {
      const hint = getTurnHint(g.players[0].hand, g.table, g.builds);
      addLog(M.gameStart(hint));
    }
    setScreen('game');
    setShuffling(true);
  }

  function startBotBattle() {
    aiLevelRef.current = aiLevel;
    onAiLevelChange?.(aiLevel);
    aiDelayRef.current = 2000; setAiDelayMs(2000);
    setDebug(true);
    startGame(nP, true);
  }

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next; setPaused(next);
  }

  function getTurnHint(hand, table, builds = []) {
    const uniq = arr => arr.filter((hc, i, a) => a.findIndex(c => c.id === hc.id) === i);

    // Omat rakennelmat joihin kädessä sopiva kortti
    const ownBuildHCards = uniq(
      builds.filter(b => b.ownerIdx === 0 && hand.some(hc => handVal(hc) === b.value))
        .flatMap(b => hand.filter(hc => handVal(hc) === b.value))
    );
    // Vastustajan rakennelmat jotka voi kähveltää
    const stealHCards = uniq(
      builds.filter(b => b.ownerIdx !== 0 && hand.some(hc => handVal(hc) === b.value))
        .flatMap(b => hand.filter(hc => handVal(hc) === b.value))
    );

    if (table.length === 0) {
      const parts = [];
      if (ownBuildHCards.length) parts.push(`Vie rakennelma: ${ownBuildHCards.map(c => lblColored(c)).join(', ')}`);
      if (stealHCards.length)    parts.push(`Kähvellys: ${stealHCards.map(c => lblColored(c)).join(', ')}`);
      if (parts.length) return `Pöytä tyhjä — ${parts.join(' · ')}`;
      return 'Pöytä tyhjä — jätä kortti pöytään.';
    }

    // Pöytäkorttien kaappaus
    const tableCaptureHCards = [];
    for (const hc of hand) {
      const hv = handVal(hc);
      const n = table.length;
      for (let mask = 1; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        if (canPartition(sel, hv)) { tableCaptureHCards.push(hc); break; }
      }
    }

    // Kaappaus = pöytäkortit + omat rakennelmat (deduplikoitu)
    const allCaptureHCards = [...tableCaptureHCards];
    for (const hc of ownBuildHCards) {
      if (!allCaptureHCards.find(c => c.id === hc.id)) allCaptureHCards.push(hc);
    }
    // Kähvellys vain ne jotka eivät ole jo kaappauksissa
    const uniqueStealHCards = stealHCards.filter(hc => !allCaptureHCards.find(c => c.id === hc.id));

    // Rakennelman luonti (ei jo muissa kategorioissa)
    const allUsed = [...allCaptureHCards, ...uniqueStealHCards];
    const buildCreateHCards = [];
    for (const hc of hand) {
      if (allUsed.find(c => c.id === hc.id)) continue;
      const hv = handVal(hc);
      const n = table.length;
      for (let mask = 0; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        const buildValue = hv + sel.reduce((s, c) => s + tableVal(c), 0);
        if (buildValue > buildCap) continue;
        if (hand.some(c => c.id !== hc.id && handVal(c) === buildValue)) {
          buildCreateHCards.push(hc); break;
        }
      }
    }

    const totalCount = allCaptureHCards.length + uniqueStealHCards.length + buildCreateHCards.length;
    if (!totalCount) return 'Ei kaappauksia — jätä kortti pöytään.';

    const parts = [];
    if (allCaptureHCards.length)   parts.push(`Kaappaus: ${allCaptureHCards.map(c => lblColored(c)).join(', ')}`);
    if (uniqueStealHCards.length)  parts.push(`Kähvellys: ${uniqueStealHCards.map(c => lblColored(c)).join(', ')}`);
    if (buildCreateHCards.length)  parts.push(`Rakenna: ${buildCreateHCards.map(c => lblColored(c)).join(', ')}`);
    return parts.join(' · ');
  }

  function advance(g, fromIdx) {
    let g2 = g;
    const allHandsEmpty = g2.players.every(p => p.hand.length === 0);
    if (allHandsEmpty) {
      if (g2.deck.length === 0) { endRound(g2); return; }
      g2 = dealHands({ ...g2, deck: [...g2.deck] });
      addLog(M.newDeal(korttia(g2.deck.length)));
    }
    const next = (fromIdx + 1) % g2.players.length;
    const p = g2.players[next];

    // Pakollinen siirto: yksi kortti kädessä ja pöytä tyhjä (vain ihmispelaajalle)
    if (next === 0 && p.isHuman && p.hand.length === 1 && g2.table.length === 0) {
      setCur(0); curRef.current = 0;
      setPhase('idle'); phaseRef.current = 'idle';
      setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false);
      setG(g2); gRef.current = g2;
      const g3 = doLeave(g2, 0, p.hand[0]);
      setG(g3); gRef.current = g3;
      addLog(M.forcedLeave);
      aiTmr.current = tm(() => advance(g3, 0), 1200);
      return;
    }

    setCur(next); curRef.current = next;
    setPhase('select_table'); phaseRef.current = 'select_table';
    setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false);
    setG(g2); gRef.current = g2;
    if (p.isHuman) {
      const hint = getTurnHint(p.hand, g2.table, g2.builds);
      addLog(M.yourTurn(korttia(p.hand.length), hint));
    } else {
      addLog(M.aiThinking(p.name));
      schedAI(() => runAI(next, gRef.current), 1200);
    }
  }

  function endRound(g) {
    let g2 = g;
    // Rakennelmat → lisää pöytäkortteihin (viimeinen kaappaaja saa ne)
    if (g2.builds.length > 0) {
      const buildCards = g2.builds.flatMap(b => b.cards);
      g2 = { ...g2, table: [...g2.table, ...buildCards], builds: [] };
    }
    if (g2.table.length > 0 && g2.lastCapture !== null) {
      const players = g2.players.map((p, i) =>
        i === g2.lastCapture ? { ...p, captured: [...p.captured, ...g2.table] } : p
      );
      g2 = { ...g2, players, table: [] };
    }
    const results = scoreRound(g2);
    const newScores = results.map((r, i) => ({
      ...g2.players[i], ...r,
      totalScore: (g2.players[i].score || 0) + r.roundPts,
    }));

    // Kumulatiivinen breakdown-kertymä
    if (!cumulBdRef.current) {
      cumulBdRef.current = g2.players.map(() =>
        ({ mostCards: 0, mostSpades: 0, ruutuKymppi: 0, pataKakk: 0, aces: 0, tikki: 0, cardsTied: 0, spadesTied: 0 })
      );
    }
    results.forEach((r, i) => {
      const bd = cumulBdRef.current[i];
      if (r.hasMostCards)   bd.mostCards++;
      if (r.hasMostSpades)  bd.mostSpades++;
      if (r.isInCardsTie)   bd.cardsTied++;
      if (r.isInSpadesTie)  bd.spadesTied++;
      bd.ruutuKymppi += r.ruutuKymppiCount;
      bd.pataKakk    += r.pataKakkonenCount;
      bd.aces        += r.aceCount;
      bd.tikki       += r.tikkiPts;
    });

    if (newScores[0].totalScore >= 12 && (g2.players[0].score || 0) < 12) {
      detectMoment('epic_score', { score: newScores[0].totalScore });
    }
    const anyAt16 = newScores.some(s => s.totalScore >= 16);
    if (anyAt16) {
      const ranking = g2.players.map((p, i) => ({
        name: p.name, isHuman: p.isHuman, score: newScores[i].totalScore,
        place: newScores.filter((_, j) => newScores[j].totalScore > newScores[i].totalScore).length + 1,
      })).sort((a, b) => a.place - b.place);
      const scoreBreakdown = g2.players.map((p, i) => {
        const bd = cumulBdRef.current[i];
        const items = [];
        if (bd.mostCards)   items.push({ label: `Eniten kortteja (${bd.mostCards}×)`,      pts: bd.mostCards });
        if (bd.cardsTied)   items.push({ label: `Kortit tasan (${bd.cardsTied}×)`,          pts: 0 });
        if (bd.mostSpades)  items.push({ label: `Eniten patoja (${bd.mostSpades}×)`,        pts: bd.mostSpades });
        if (bd.spadesTied)  items.push({ label: `Padat tasan (${bd.spadesTied}×)`,          pts: 0 });
        if (bd.ruutuKymppi) items.push({ label: `♦10 (${bd.ruutuKymppi} kpl)`,         pts: bd.ruutuKymppi * 2 });
        if (bd.pataKakk)    items.push({ label: `♠2 (${bd.pataKakk} kpl)`,               pts: bd.pataKakk });
        if (bd.aces)        items.push({ label: `Ässät (${bd.aces} kpl)`,               pts: bd.aces });
        if (bd.tikki)       items.push({ label: `Mökit (${bd.tikki} kpl)`,              pts: bd.tikki });
        return { name: p.name, score: newScores[i].totalScore, items };
      }).sort((a, b) => b.score - a.score);
      if (allBotsRef.current) {
        tm(() => onResult?.({ ranking, scoreBreakdown }), 1200);
      } else {
        onResult?.({ ranking, scoreBreakdown });
      }
    }
    const finalPlayers = g2.players.map((p, i) => ({ ...p, score: newScores[i].totalScore }));
    const g3 = { ...g2, players: finalPlayers };
    setG(g3); gRef.current = g3;
    setScores(newScores);
    if (sndRef.current) SFX.score();
    addLog(M.endRound);
  }

  function startNextRound() {
    const g = gRef.current;
    const finalPlayers = g.players;
    const newG = initGame(nP, playerNames, allBotsRef.current, rules);
    const withScores = {
      ...newG,
      players: newG.players.map((p, i) => ({ ...p, score: finalPlayers[i]?.score || 0 })),
    };
    setG(withScores); gRef.current = withScores;
    setScores(null); setSelTable([]); setSelBuilds([]); setPakaAnim(false);
    setCur(0); curRef.current = 0;
    setPhase('select_table'); phaseRef.current = 'select_table';
    const h0 = withScores.players[0];
    const scoreStr = finalPlayers.map(p => `${p.name} ${p.score}p`).join(', ');
    if (allBotsRef.current) {
      addLog(`🤖 Uusi peli! Pisteet: ${scoreStr}`);
      schedAI(() => runAI(0, gRef.current), 2000);
    } else {
      addLog(M.newRound(scoreStr, getTurnHint(h0.hand, withScores.table, withScores.builds)));
    }
  }

  function scoreRound(g) {
    const counts      = g.players.map(p => p.captured.length);
    const maxCards    = Math.max(...counts);
    const spadesCounts = g.players.map(p => p.captured.filter(c => c.s === '♠').length);
    const maxSpades   = Math.max(...spadesCounts);
    const tikkiCounts = g.players.map(p => p.tikkiCount);
    const cardsTied   = counts.filter(c => c === maxCards).length > 1;
    const spadesTied  = spadesCounts.filter(s => s === maxSpades).length > 1;
    return g.players.map((p, i) => {
      let pts = 0;
      const hasMostCards   = counts[i] === maxCards  && !cardsTied;
      const hasMostSpades  = spadesCounts[i] === maxSpades && !spadesTied;
      const isInCardsTie   = cardsTied  && counts[i] === maxCards;
      const isInSpadesTie  = spadesTied && spadesCounts[i] === maxSpades;
      if (hasMostCards)  pts += 1;
      if (hasMostSpades) pts += 1;
      const ruutuKymppiCount  = p.captured.filter(isRuutuKymppi).length;
      const pataKakkonenCount = p.captured.filter(isPataKakkonen).length;
      const aceCount          = p.captured.filter(c => c.r === 'A').length;
      pts += ruutuKymppiCount * 2 + pataKakkonenCount + aceCount;
      const tikkiPts = (tikkiCounts[i] > 0 && tikkiCounts.some((t, j) => j !== i && t < tikkiCounts[i]))
        ? p.tikkiCount : 0;
      pts += tikkiPts;
      return {
        roundPts: pts,
        cards: counts[i], spades: spadesCounts[i],
        tikkiCount: p.tikkiCount, aces: aceCount,
        hasMostCards, hasMostSpades, isInCardsTie, isInSpadesTie,
        ruutuKymppiCount, pataKakkonenCount, aceCount, tikkiPts,
      };
    });
  }

  function doCapture(g, playerIdx, handCard, tableCards, silent = false) {
    const isMökki = tableCards.length === g.table.length && g.table.length > 0;
    const allCaptured = [handCard, ...tableCards];
    const newTable = g.table.filter(c => !tableCards.find(t => t.id === c.id));
    let players = g.players.map((p, i) => i === playerIdx ? {
      ...p,
      hand: p.hand.filter(c => c.id !== handCard.id),
      captured: [...p.captured, ...allCaptured],
      tikkiCount: p.tikkiCount + (isMökki ? 1 : 0),
    } : p);

    // Jos sai mökin, tarkista jos kaikilla muilla on mökit — jos on, poista ne
    if (isMökki) {
      const othersWithTikki = players.filter((p, i) => i !== playerIdx && p.tikkiCount > 0).length;
      if (othersWithTikki === players.length - 1) {
        players = players.map(p => ({ ...p, tikkiCount: 0 }));
      }
    }

    const newG = { ...g, players, table: newTable, lastCapture: playerIdx };
    if (sndRef.current) SFX.capture();
    if (isMökki && sndRef.current) tm(() => SFX.tikki(), 200);
    flashLastPlay(g.players[playerIdx].name, handCard, g.players[playerIdx].isHuman);
    if (!silent) {
      const who = `${g.players[playerIdx].name} kaappasi`;
      const groups = findGroups(tableCards, handVal(handCard));
      const captureStr = groups.length > 1
        ? groups.map(grp => grp.map(id => lbl(tableCards.find(c => c.id === id))).join('+')).join(' ja ')
        : tableCards.map(lbl).join('+');
      addLog(M.humanCapture(who, lblColored(handCard), captureStr, isMökki));
    }
    return newG;
  }

  function doLeave(g, playerIdx, handCard) {
    const players = g.players.map((p, i) => i === playerIdx
      ? { ...p, hand: p.hand.filter(c => c.id !== handCard.id) }
      : p
    );
    const newG = { ...g, players, table: [...g.table, handCard] };
    setJP(handCard.id);
    tm(() => setJP(null), 2200);
    if (sndRef.current) SFX.leave();
    const who = `${g.players[playerIdx].name} jätti`;
    addLog(M.humanLeave(who, lblColored(handCard)));
    flashLastPlay(g.players[playerIdx].name, handCard, g.players[playerIdx].isHuman);
    return newG;
  }

  // Validoi: voidaanko pöytäkortit jakaa ryhmiin, joista kukin = käsikortin arvo
  function isValidCapture(handCard, tableCards) {
    if (!tableCards.length) return false;
    return canPartition(tableCards, handVal(handCard));
  }

  // ── Rakennelma-apufunktiot ──────────────────────────────────
  function getBuildValue(handCard, tableCards, hand) {
    const handV = handVal(handCard);
    const tableSum = tableCards.reduce((s, c) => s + tableVal(c), 0);
    const buildValue = handV + tableSum;
    if (buildValue > buildCap) return null; // max rakennelman arvo: 13 (K) tai 16 (♦10) erikoissäännöllä
    const hasCapturer = hand.some(c => c.id !== handCard.id && handVal(c) === buildValue);
    return hasCapturer ? buildValue : null;
  }

  function doBuild(g, playerIdx, handCard, tableCards, buildValue) {
    const build = {
      id: `build_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      cards: [handCard, ...tableCards],
      value: buildValue,
      ownerIdx: playerIdx,
    };
    const newTable = g.table.filter(c => !tableCards.find(t => t.id === c.id));
    const players = g.players.map((p, i) => i === playerIdx
      ? { ...p, hand: p.hand.filter(c => c.id !== handCard.id) }
      : p
    );
    if (sndRef.current) SFX.build();
    const buildMsg = `${g.players[playerIdx].name} rakentaa rakennelman — arvo ${buildValue}`;
    addLog(buildMsg);
    return { ...g, players, table: newTable, builds: [...g.builds, build] };
  }

  function doBuildCapture(g, playerIdx, handCard, capturedBuilds, capturedTableCards, silent = false) {
    const buildCards = capturedBuilds.flatMap(b => b.cards);
    const allCaptured = [handCard, ...buildCards, ...capturedTableCards];
    const newBuilds = g.builds.filter(b => !capturedBuilds.find(cb => cb.id === b.id));
    const newTable = g.table.filter(c => !capturedTableCards.find(t => t.id === c.id));
    const isMökki = newBuilds.length === 0 && newTable.length === 0;
    let players = g.players.map((p, i) => i === playerIdx ? {
      ...p,
      hand: p.hand.filter(c => c.id !== handCard.id),
      captured: [...p.captured, ...allCaptured],
      tikkiCount: p.tikkiCount + (isMökki ? 1 : 0),
    } : p);
    if (isMökki) {
      const othersWithTikki = players.filter((p, i) => i !== playerIdx && p.tikkiCount > 0).length;
      if (othersWithTikki === players.length - 1) {
        players = players.map(p => ({ ...p, tikkiCount: 0 }));
      }
    }
    if (sndRef.current) SFX.capture();
    if (isMökki && sndRef.current) tm(() => SFX.tikki(), 200);
    flashLastPlay(g.players[playerIdx].name, handCard, g.players[playerIdx].isHuman);
    const isSteal = capturedBuilds.some(b => b.ownerIdx !== playerIdx);
    const actor = g.players[playerIdx].name;
    const buildVal = capturedBuilds[0]?.value ?? handCard.v;
    if (!silent) {
      if (isSteal) {
        const verb = 'kähveltää';
        addLog(`${actor} ${verb} rakennelman (${buildVal})!`);
      } else {
        const [viet, rakennelmasi] = ['vie', 'rakennelmansa'];
        addLog(`${actor} ${viet} ${rakennelmasi} (${buildVal})`);
      }
    }
    return { ...g, players, table: newTable, builds: newBuilds, lastCapture: playerIdx };
  }

  // Ihmispelaajan toiminnot
  function humanToggleTable(card) {
    if (phaseRef.current !== 'select_table' || curRef.current !== 0) return;
    setSelTable(prev => {
      const has = prev.find(c => c.id === card.id);
      return has ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
  }

  function humanToggleBuild(build) {
    if (phaseRef.current !== 'select_table' || curRef.current !== 0) return;
    setSelBuilds(prev => {
      const has = prev.includes(build.id);
      return has ? prev.filter(id => id !== build.id) : [...prev, build.id];
    });
  }

  function humanSelectHand(card) {
    if (phaseRef.current !== 'select_table' || curRef.current !== 0) return;
    const g = gRef.current;
    const hasOwnBuild = g.builds.some(b => b.ownerIdx === 0);
    const hv = handVal(card);

    // Rakennelma(t) valittu → kaappaa rakennelmat (+ mahdolliset pöytäkortit)
    if (selBuilds.length > 0) {
      const selectedBuildObjs = g.builds.filter(b => selBuilds.includes(b.id));
      const allMatchValue = selectedBuildObjs.every(b => b.value === hv);
      const extraTableValid = selTable.length === 0 || canPartition(selTable, hv);
      if (!allMatchValue || !extraTableValid) {
        addLog(M.invalidMove(lblColored(card)));
        return;
      }
      const snapshotBuilds = [...selectedBuildObjs];
      const snapshotTable = [...selTable];
      const animCards = [...snapshotBuilds.flatMap(b => b.cards), ...snapshotTable];
      setCaptureAnim({ handCard: card, tableCards: animCards });
      setSelTable([]); setSelBuilds([]);
      setPhase('idle'); phaseRef.current = 'idle';
      aiTmr.current = tm(() => {
        const g2 = doBuildCapture(gRef.current, 0, card, snapshotBuilds, snapshotTable);
        setG(g2); gRef.current = g2;
        setPendingCapture({ g2, fromIdx: 0 });
      }, 1200);
      return;
    }

    // Rakennustila — toimii myös tyhjällä pöytävalinnalla (parirakennelma, mask=0)
    if (buildMode) {
      if (hasOwnBuild && selTable.length === 0) { addLog(M.noBuildLeave); return; }
      const buildVal = getBuildValue(card, selTable, g.players[0].hand);
      if (buildVal !== null) {
        const g2 = doBuild(g, 0, card, selTable, buildVal);
        setG(g2); gRef.current = g2;
        setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false);
        setPhase('idle'); phaseRef.current = 'idle';
        tm(() => advance(g2, 0), 600);
      } else {
        addLog(M.invalidMove(lblColored(card)));
      }
      return;
    }

    // Tyhjä valinta (ei buildMode) → leaveMode tai tila-virhe
    if (selTable.length === 0) {
      if (hasOwnBuild) { addLog(M.noBuildLeave); return; }
      if (captureMode) { addLog('Kaappaustila — valitse ensin pöytäkortit, sitten käsikortti.'); return; }
      if (!leaveMode)  { addLog('Valitse toiminto: 🎯 Kaappaa, 🔨 Rakenna tai 📤 Jätä.'); return; }
      // leaveMode: jätä kortti pöytään
      phaseRef.current = 'idle'; setPhase('idle');
      const g2 = doLeave(g, 0, card);
      setG(g2); gRef.current = g2;
      setSelTable([]); setSelBuilds([]); setLeaveMode(false);
      tm(() => advance(g2, 0), 600);
      return;
    }

    // Normaalitila — kaappaus (selTable.length > 0, ei buildMode)
    if (isValidCapture(card, selTable)) {
      const captured = [...selTable];
      setCaptureAnim({ handCard: card, tableCards: captured });
      setSelTable([]); setSelBuilds([]);
      setPhase('idle'); phaseRef.current = 'idle';
      aiTmr.current = tm(() => {
        const g2 = doCapture(gRef.current, 0, card, captured);
        setG(g2); gRef.current = g2;
        setPendingCapture({ g2, fromIdx: 0 });
      }, 1200);
      return;
    }

    addLog(M.invalidMove(lblColored(card)));
  }

  // ── AI: parhaan kaappauksen haku ─────────────────────────────────────────
  function findBestCapture(p, table, builds = []) {
    let best = null;
    for (const handCard of p.hand) {
      const hv = handVal(handCard);
      const n = table.length;
      for (let mask = 1; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        if (canPartition(sel, hv)) {
          const isMokki = sel.length === table.length && builds.length === 0;
          const score = aiCardScore([handCard, ...sel], isMokki);
          if (!best || score > best.score) best = { handCard, tableCards: sel, score, isMokki };
        }
      }
    }
    return best;
  }

  // Aloittelija-virhe: huonoin käypä kaappaus
  function findWorstCapture(p, table) {
    let worst = null;
    for (const handCard of p.hand) {
      const hv = handVal(handCard);
      const n = table.length;
      for (let mask = 1; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        if (canPartition(sel, hv)) {
          const isMokki = sel.length === table.length;
          const score = aiCardScore([handCard, ...sel], isMokki);
          if (!worst || score < worst.score) worst = { handCard, tableCards: sel, score, isMokki };
        }
      }
    }
    return worst;
  }

  // Etsi paras rakennelma (ottaa huomioon pistearvo)
  function findAIBuild(p, table) {
    let best = null;
    for (const handCard of p.hand) {
      const hv = handVal(handCard);
      const n = table.length;
      for (let mask = 0; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
        if (bv > buildCap) continue;
        const capturer = p.hand.find(c => c.id !== handCard.id && handVal(c) === bv);
        if (!capturer) continue;
        const score = aiCardScore([handCard, ...sel, capturer]);
        if (!best || score > best.score) best = { handCard, tableCards: sel, value: bv, capturer, score };
      }
    }
    return best;
  }

  function runAI(playerIdx, g) {
    if (!g) g = gRef.current;
    if (!g || phaseRef.current === 'idle') return;
    const p = g.players[playerIdx];
    if (!p.hand.length) { advance(g, playerIdx); return; }
    const level = allBotsRef.current ? 'hard' : aiLevelRef.current;
    const isBeginner = level === 'beginner';
    const isSuper = level === 'hard';
    const fumble = aiShouldFumble(level);
    const aDel = allBotsRef.current ? 400 : 1200; // animation delay
    const qDel = allBotsRef.current ? 200 : 700;  // quick action delay

    // ─── 1. Kaappaa oma rakennelma (kaikki tasot, aloittelija 20% unohtaa) ───
    const ownBuilds = g.builds.filter(b => b.ownerIdx === playerIdx);
    if (ownBuilds.length > 0 && !(isBeginner && Math.random() < 0.2)) {
      for (const build of ownBuilds) {
        const capturer = p.hand.find(hc => handVal(hc) === build.value);
        if (capturer) {
          // Normaali 50%, hard/super aina: poimi myös pöytäkortit jotka summautuvat samaan arvoon
          const seesBonus = !isBeginner && (level !== 'normal' || Math.random() < 0.5);
          const bonus = seesBonus ? findTableBonus(g.table, build.value) : [];
          const animCards = [...build.cards, ...bonus];
          const isMokkiBuild = g.builds.filter(b => b.id !== build.id).length === 0
            && g.table.filter(c => !bonus.find(b2 => b2.id === c.id)).length === 0;
          addLog(`${p.name} vie rakennelmansa (${build.value})${bonus.length > 0 ? ' + ' + bonus.map(lbl).join('+') : ''}${isMokkiBuild ? ' 🏠 MÖKKI!' : ''}`);
          setCaptureAnim({ handCard: capturer, tableCards: animCards });
          setAiSel({ handCard: capturer, tableCards: animCards });
          aiTmr.current = tm(() => {
            const g2 = gRef.current;
            const g3 = doBuildCapture(g2, playerIdx, capturer, [build], bonus, true);
            setG(g3); gRef.current = g3;
            setPendingCapture({ g2: g3, fromIdx: playerIdx });
          }, aDel);
          return;
        }
      }
    }

    // ─── 2. Varasta vastustajan rakennelma (normal+) ──────────────────────────
    if (!isBeginner) {
      const opponentBuilds = g.builds.filter(b => b.ownerIdx !== playerIdx);
      for (const build of opponentBuilds) {
        const capturer = p.hand.find(hc => handVal(hc) === build.value);
        if (capturer) {
          // Normaali 50%, hard/super aina: poimi myös pöytäkortit
          const seesBonus = level !== 'normal' || Math.random() < 0.5;
          const bonus = seesBonus ? findTableBonus(g.table, build.value) : [];
          const animCards = [...build.cards, ...bonus];
          const isMokkiSteal = g.builds.filter(b => b.id !== build.id).length === 0
            && g.table.filter(c => !bonus.find(b2 => b2.id === c.id)).length === 0;
          addLog(`${p.name} kähveltää rakennelman (${build.value})!${bonus.length > 0 ? ' + ' + bonus.map(lbl).join('+') : ''}${isMokkiSteal ? ' 🏠 MÖKKI!' : ''}`);
          setCaptureAnim({ handCard: capturer, tableCards: animCards });
          setAiSel({ handCard: capturer, tableCards: animCards });
          aiTmr.current = tm(() => {
            const g2 = gRef.current;
            const g3 = doBuildCapture(g2, playerIdx, capturer, [build], bonus, true);
            setG(g3); gRef.current = g3;
            setPendingCapture({ g2: g3, fromIdx: playerIdx });
          }, aDel);
          return;
        }
      }
    }

    // ─── 3. Kaappaa pöydältä ────────────────────────────────────────────────
    const bestCapture = findBestCapture(p, g.table, g.builds);
    const captureToUse = (bestCapture && fumble)
      ? (findWorstCapture(p, g.table) || bestCapture)
      : bestCapture;

    // ─── 4. Harkitse rakentamista (normal+, ei omaa rakennelmaa jo) ──────────
    if (!isBeginner && ownBuilds.length === 0) {
      const buildResult = findAIBuild(p, g.table);
      if (buildResult) {
        let doBuildAction = false;
        if (level === 'normal') {
          // Normal: rakenna aina kun voi
          doBuildAction = true;
        } else {
          // Hard: rakenna vain jos rakennusarvo > kaappauksen arvo
          const captureScore = captureToUse ? captureToUse.score : 0;
          let stealRisk = 0;
          if (isSuper) {
            stealRisk = pAnyOpponentHas(g, playerIdx, buildResult.value);
          } else {
            // Hard: arvio varastusriskistä pöydän korttitilanteen mukaan
            const deckRemaining = 52 - g.players.flatMap(p2 => p2.captured).length
              - g.players.reduce((s, p2) => s + p2.hand.length, 0)
              - g.table.length - g.builds.flatMap(b => b.cards).length;
            stealRisk = deckRemaining > 20 ? 0.3 : 0.15;
          }
          const discount = isSuper ? (1 - stealRisk) * 0.85 : (1 - stealRisk) * 0.8;
          const effectiveBuildScore = buildResult.score * discount;
          doBuildAction = effectiveBuildScore > captureScore * 1.5;
        }
        if (doBuildAction) {
          if (initShowIntention) setAiSel({ handCard: buildResult.handCard, tableCards: buildResult.tableCards });
          aiTmr.current = tm(() => {
            const g2 = gRef.current;
            setAiSel({ handCard: null, tableCards: [] });
            const g3 = doBuild(g2, playerIdx, buildResult.handCard, buildResult.tableCards, buildResult.value);
            setG(g3); gRef.current = g3;
            tm(() => advance(g3, playerIdx), 400);
          }, qDel + Math.random() * 200);
          return;
        }
      }
    }

    // ─── 3b. Suorita kaappaus (jos löytyi) ──────────────────────────────────
    if (captureToUse) {
      const groups = findGroups(captureToUse.tableCards, handVal(captureToUse.handCard));
      const captureStr = groups.length > 1
        ? groups.map(grp => grp.map(id => lbl(captureToUse.tableCards.find(c => c.id === id))).join('+')).join(' ja ')
        : captureToUse.tableCards.map(lbl).join('+');
      addLog(M.aiCapture(p.name, lblColored(captureToUse.handCard), captureStr, captureToUse.isMokki));
      setCaptureAnim({ handCard: captureToUse.handCard, tableCards: captureToUse.tableCards });
      setAiSel({ handCard: captureToUse.handCard, tableCards: captureToUse.tableCards });
      aiTmr.current = tm(() => {
        const g2 = gRef.current;
        const g3 = doCapture(g2, playerIdx, captureToUse.handCard, captureToUse.tableCards, true);
        setG(g3); gRef.current = g3;
        setPendingCapture({ g2: g3, fromIdx: playerIdx });
      }, aDel);
      return;
    }

    // ─── 5. Jätä kortti pöytään ──────────────────────────────────────────────
    let toLeave;
    if (fumble) {
      toLeave = p.hand[Math.floor(Math.random() * p.hand.length)];
    } else if (isSuper) {
      // Supernatural: minimoi probabilistinen varastusriski, suojele pistekortit
      const nonSpecial = p.hand.filter(c => !isPataKakkonen(c) && !isRuutuKymppi(c) && c.r !== 'A');
      const leavePool = nonSpecial.length > 0 ? nonSpecial : p.hand;
      toLeave = [...leavePool].sort((a, b) => {
        const da = pWeightedLeaveDanger(a, g, playerIdx);
        const db = pWeightedLeaveDanger(b, g, playerIdx);
        return da !== db ? da - db : tableVal(a) - tableVal(b);
      })[0];
    } else {
      // Normal/hard: heuristinen varastusriski
      const nonSpecial = p.hand.filter(c => !isPataKakkonen(c) && !isRuutuKymppi(c));
      const leavePool = nonSpecial.length > 0 ? nonSpecial : p.hand;
      toLeave = [...leavePool].sort((a, b) => {
        const da = leaveDanger(a, g.table);
        const db = leaveDanger(b, g.table);
        return da !== db ? da - db : tableVal(a) - tableVal(b);
      })[0];
    }
    aiTmr.current = tm(() => {
      const g2 = gRef.current;
      const g3 = doLeave(g2, playerIdx, toLeave);
      setG(g3); gRef.current = g3;
      tm(() => advance(g3, playerIdx), 400);
    }, qDel + Math.random() * 200);
  }

  function continueAfterCapture() {
    if (!pendingCapture) return;
    const { g2, fromIdx } = pendingCapture;
    setPendingCapture(null);
    setCaptureAnim(null);
    setAiSel({ handCard: null, tableCards: [] });
    setSelBuilds([]); setCaptureMode(false); setBuildMode(false);
    setPhase('select_table'); phaseRef.current = 'select_table';
    advance(g2, fromIdx);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  // ── Näkymät ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🂺</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>KASINO</h1>
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
            <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
          <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5 }}>ERIKOISRAKENNELMAT</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['Kyllä', true], ['Ei', false]].map(([lab, val]) => {
              const active = rules.specialBuilds === val;
              return (
                <button key={lab} onClick={() => setRules(r => ({ ...r, specialBuilds: val }))}
                  style={{ minWidth: 48, height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${active ? C.gold : '#2a4a32'}`, background: active ? C.gold + '18' : 'transparent', color: active ? C.gold : C.dim, transition: 'all 0.2s' }}>
                  {lab}
                </button>
              );
            })}
          </div>
        </div>
        <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
          Salli rakennelmat arvoille 14–16: A&nbsp;=&nbsp;14, ♠2&nbsp;=&nbsp;15, ♦10&nbsp;=&nbsp;16
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
        <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          🔮 Bottien Taistelu
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>4 bottia · {({beginner:'Oppipoika',normal:'Kisälli',hard:'Mestari'})[aiLevel]}</span>
        </button>
      </div>
    </div>
  );

  if (screen === 'gameover' && G && !allBotsRef.current) {
    const sorted = [...G.players].sort((a, b) => b.score - a.score);
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? C.gold + '55' : C.panelBorder}` }}>
              <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : '🎯'}</span>
              <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : C.text }}>{p.name}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: i === 0 ? C.gold : C.dim }}>{p.score}<span style={{ fontSize: 11, opacity: 0.6 }}>p</span></span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {allBots ? (
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1e9a)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi katselutila</button>
          ) : (
            <>
              <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
              <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!G) return null;

  const human = G.players[0];
  const isMyTurn = curIdx === 0 && phase === 'select_table';
  const selSum = selTable.reduce((s, c) => s + tableVal(c), 0);

  // Laske ryhmät valituille korteille (jos käsikortti olisi valittuna)
  // Näytetään vain visuaalisena vihjeenä
  const groupColors = ['#4caf7d', '#5ba8d4', '#c9a84c', '#e05c3b'];
  // Kartoita kortti → ryhmäindeksi parhaalle matchaukselle ihmispelaajan käteen
  let cardGroupMap = {};
  let multiGroupDisplay = null;
  if (selTable.length > 0 && isMyTurn) {
    for (const hc of human.hand) {
      if (!isValidCapture(hc, selTable)) continue;
      const groups = findGroups(selTable, handVal(hc));
      if (groups.length > 1) {
        groups.forEach((grp, gi) => grp.forEach(id => { cardGroupMap[id] = gi; }));
        multiGroupDisplay = groups.map(grp =>
          '(' + grp.map(id => lbl(selTable.find(c => c.id === id))).join('+') + ')'
        ).join(' + ');
        break;
      }
    }
  }

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Pisteet-info */}
      {showInfo && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.8, marginBottom: isMobile ? 8 : 12, padding: '12px 16px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}55`, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: C.gold, fontWeight: 700, fontSize: 12, flex: 1 }}>Pisteytys — ensimmäinen 16 pisteeseen voittaa</span>
            <button onClick={() => setShowInfo(false)} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
          </div>
          <span style={{ color: SUIT_COLOR_DARK['♦'], fontWeight: 700 }}>10♦</span> = 2p &nbsp;·&nbsp;
          <span style={{ color: SUIT_COLOR_DARK['♠'], fontWeight: 700 }}>2♠</span> = 1p &nbsp;·&nbsp;
          kukin ässä = 1p &nbsp;·&nbsp; eniten kortteja = 1p &nbsp;·&nbsp; eniten patoja = 1p &nbsp;·&nbsp; kukin mökki = 1p
        </div>
      )}

      {/* Viestikupla */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 60 : 70, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>🂺</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }}>{renderLogMessage(msg)}</p>
      </div>

      {/* Pisteet + pakka */}
      <div style={{ display: 'flex', gap: isMobile ? 4 : 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {G.players.map((p, i) => (
          <div key={p.id} style={{ padding: isMobile ? '3px 7px' : '4px 12px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: isMobile ? 10 : 12, background: curIdx === i ? C.gold + '14' : 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === i ? C.gold + '66' : C.panelBorder}`, color: curIdx === i ? C.gold : C.dim }}>
            {p.name}: {p.score}{isMobile ? '' : '/16'}p {curIdx === i ? '●' : ''}
          </div>
        ))}
      </div>

      {/* Kierroksen pisteet */}
      {scores && (
        <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}44`, borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, marginBottom: 6, letterSpacing: 1 }}>KIERROKSEN PISTEET</div>
          {scores.map((s, i) => {
            const p = G.players[i];
            const has10d = p.captured.some(isRuutuKymppi);
            const has2s = p.captured.some(isPataKakkonen);
            return (
              <div key={i} style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ minWidth: 70 }}>{p.name}</span>
                <span style={{ color: C.gold, fontWeight: 700 }}>{s.roundPts}p</span>
                <span style={{ color: C.dim, fontSize: 11 }}>({s.cards}k · {s.spades}♠ · {s.aces}A · {s.tikkiCount}🏠)</span>
                {has10d && <span style={{ fontSize: 11, color: '#c05a00' }}>10♦</span>}
                {has2s && <span style={{ fontSize: 11, color: '#5ba8d4' }}>2♠</span>}
                <span style={{ marginLeft: 'auto', color: C.gold }}>→ {s.totalScore}p</span>
              </div>
            );
          })}
          {scores.some(s => s.totalScore >= 16) ? (
            allBots ? (
              <div style={{ marginTop: 10, textAlign: 'center', fontFamily: 'sans-serif', fontSize: 12, color: C.botMode }}>🤖 Näytetään tulokset...</div>
            ) : (
              <button onClick={() => setScreen('gameover')} style={{ marginTop: 10, width: '100%', background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 0', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 1 }}>
                Uusi ottelu →
              </button>
            )
          ) : (
            <button onClick={startNextRound} style={{ marginTop: 10, width: '100%', background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 0', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 1 }}>
              Seuraava peli →
            </button>
          )}
        </div>
      )}

      {/* AI-pelaajat */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 10 }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === p.id ? C.gold + '55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px' }}>
                  <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: curIdx === p.id ? C.gold : C.dim }}>
                    🤖 {p.name.slice(0, 8)}{curIdx === p.id ? ' ●' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', flex: 1 }}>
                    {p.hand.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} selected={initShowIntention && aiSel.handCard?.id === c.id} />)}
                  </div>
                </div>
              ))}
            </div>
          )
          : (
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => (
                <div key={p.id} style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === p.id ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: isMobile ? '5px 8px' : '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: curIdx === p.id ? C.gold : C.dim, marginBottom: 4 }}>
                    🤖 {p.name} {curIdx === p.id ? '●' : ''}{!isMobile && ` — ${korttia(p.captured.length)} kaapattu`}
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: debugOpen ? 'wrap' : 'nowrap', overflow: debugOpen ? 'visible' : 'hidden' }}>
                    {debugOpen
                      ? p.hand.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} selected={initShowIntention && aiSel.handCard?.id === c.id} />)
                      : p.hand.map((_, ci) => <div key={ci} style={{ width: 28, height: 40, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                    }
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* Pöytä */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, minHeight: isMobile ? 90 : 220 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 8, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>PÖYTÄ — {G.table.length === 0 && G.builds.length === 0 ? 'tyhjä' : `${korttia(G.table.length)}${G.builds.length > 0 ? ` + ${G.builds.length} rakennelma` : ''}`}</span>
          <span style={{ color: G.deck.length === 0 ? C.red : C.dim, fontWeight: G.deck.length === 0 ? 700 : 400, animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>PAKKA — {G.deck.length === 0 ? 'TYHJÄ!' : `${G.deck.length} korttia`}</span>
          {(selTable.length > 0 || selBuilds.length > 0) && (
            <span style={{ color: selBuilds.length > 0 ? '#e05c3b' : multiGroupDisplay ? C.gold : C.blue }}>
              {selBuilds.length > 0
                ? `Rakennelma: ${G.builds.filter(b => selBuilds.includes(b.id)).map(b => b.value).join('+')}${selTable.length > 0 ? ` + ${selTable.map(lbl).join('+')}` : ''}`
                : multiGroupDisplay
                  ? `Multi: ${multiGroupDisplay}`
                  : `Valittu: ${selTable.map(lbl).join('+')} = ${selSum}`
              }
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {G.table.map(c => {
            const isSel = selTable.find(x => x.id === c.id);
            const isAiPick = aiSel.tableCards.find(x => x.id === c.id);
            const gi = cardGroupMap[c.id];
            return (
              <div key={c.id} style={gi !== undefined ? { outline: `3px solid ${groupColors[gi % groupColors.length]}`, borderRadius: 9 } : {}}>
                <Card
                  card={c}
                  showBadges
                  small={isMobile}
                  selected={!!isSel || !!isAiPick}
                  highlight={isMyTurn && !isSel}
                  justPlaced={c.id === jpId}
                  onClick={isMyTurn && !allBots ? () => humanToggleTable(c) : undefined}
                  backStyle={BACKS[cardBack]}
                />
              </div>
            );
          })}
          {captureAnim && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 10, background: `${C.gold}10`, border: `1px solid ${C.gold}44`, flexWrap: 'wrap' }}>
              <Card card={captureAnim.handCard} small showBadges backStyle={BACKS[cardBack]} />
              <span style={{ color: C.gold, fontSize: 13, fontFamily: 'Georgia,serif' }}>←</span>
              {captureAnim.tableCards.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} />)}
            </div>
          )}
          {!captureAnim && G.table.length === 0 && G.builds.length === 0 && (
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.tikki, opacity: 0.8, padding: '10px 0' }}>Pöytä tyhjä!</div>
          )}
        </div>

        {/* Rakennelmat */}
        {G.builds.length > 0 && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.panelBorder}`, paddingTop: 10 }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, marginBottom: 6 }}>RAKENNELMAT</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {G.builds.map(build => {
                const isMine = G.players[build.ownerIdx]?.isHuman;
                const isSel = selBuilds.includes(build.id);
                const borderColor = isSel ? C.gold : isMine ? '#4caf7d' : '#e05c3b';
                return (
                  <div
                    key={build.id}
                    onClick={isMyTurn && !allBots ? () => humanToggleBuild(build) : undefined}
                    style={{ border: `2px solid ${borderColor}`, borderRadius: 10, padding: '6px 8px', background: isSel ? `${C.gold}12` : 'rgba(255,255,255,0.02)', cursor: isMyTurn ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                  >
                    <div style={{ display: 'flex', gap: 3 }}>
                      {build.cards.map(c => (
                        <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: borderColor, fontWeight: 700 }}>
                      {isMine ? '🔨' : '⚔'} {build.value} {isMine ? '(oma)' : `(${G.players[build.ownerIdx].name})`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
      {/* Ihmispelaajan käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          {allBots ? '🤖' : '👤'} {G.players[0].name} {curIdx === 0 ? '●' : ''} — {korttia(human.captured.length)} kaapattu, {human.tikkiCount} mökkiä
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const hv = handVal(c);
            const hasSelection = selTable.length > 0 || selBuilds.length > 0;
            const validBuildCapture = selBuilds.length > 0 &&
              G.builds.filter(b => selBuilds.includes(b.id)).every(b => b.value === hv) &&
              (selTable.length === 0 || canPartition(selTable, hv));
            const validTableCapture = !buildMode && selTable.length > 0 && selBuilds.length === 0 && isValidCapture(c, selTable);
            const validBuildCreate = buildMode && selTable.length > 0 && selBuilds.length === 0 && getBuildValue(c, selTable, human.hand) !== null;
            const valid = validBuildCapture || validTableCapture || validBuildCreate;
            return (
              <Card key={c.id} card={c} small={isMobile} showBadges
                highlight={valid}
                dim={isMyTurn && hasSelection && !valid}
                onClick={isMyTurn && !allBots ? () => humanSelectHand(c) : undefined}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>
      </>)}

      {/* Bottien taistelu -hallintapalkki */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Peruuta / Seuraava */}
      <div style={{ minHeight: isMobile ? 36 : 44, display: 'flex', alignItems: 'center', marginBottom: isMobile ? 4 : 10, gap: 8, flexWrap: 'wrap' }}>
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => {
              if (!captureMode) {
                const h = G.players[0].hand, t = G.table, n = t.length;
                const hasTableCapture = h.some(hc => {
                  const hv = handVal(hc);
                  for (let mask = 1; mask < (1 << n); mask++) {
                    const sel = t.filter((_, i) => (mask >> i) & 1);
                    if (canPartition(sel, hv)) return true;
                  }
                  return false;
                });
                const hasBuildCapture = G.builds.some(b => h.some(hc => handVal(hc) === b.value));
                if (!hasTableCapture && !hasBuildCapture) {
                  addLog('Ei kaappausmahdollisuuksia — mikään käsikortti ei sovi pöydän kortteihin.');
                  return;
                }
              }
              setCaptureMode(m => !m); setBuildMode(false); setLeaveMode(false); setSelTable([]); setSelBuilds([]);
            }}
            style={{ background: captureMode ? `${C.gold}18` : 'transparent', border: `1px solid ${captureMode ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: captureMode ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            🎯 Kaappaa{captureMode ? ' ●' : ''}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => {
              if (!buildMode) {
                const h = G.players[0].hand, t = G.table, n = t.length;
                let ok = false;
                outer: for (const hc of h) {
                  const hv = handVal(hc);
                  for (let mask = 0; mask < (1 << n); mask++) {
                    const sel = t.filter((_, i) => (mask >> i) & 1);
                    const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
                    if (bv > buildCap) continue;
                    if (h.some(c => c.id !== hc.id && handVal(c) === bv)) { ok = true; break outer; }
                  }
                }
                if (!ok) { addLog('Ei rakennusmahdollisuuksia — kädessä ei ole sopivaa paria rakennelmaan.'); return; }
              }
              setBuildMode(m => !m); setCaptureMode(false); setLeaveMode(false); setSelTable([]); setSelBuilds([]);
            }}
            style={{ background: buildMode ? `${C.gold}18` : 'transparent', border: `1px solid ${buildMode ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: buildMode ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            🔨 Rakenna{buildMode ? ' ●' : ''}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => {
              if (!leaveMode) {
                const h = G.players[0].hand, t = G.table, n = t.length;
                const hasCapture = h.some(hc => {
                  const hv = handVal(hc);
                  for (let mask = 1; mask < (1 << n); mask++) {
                    const sel = t.filter((_, i) => (mask >> i) & 1);
                    if (canPartition(sel, hv)) return true;
                  }
                  return false;
                }) || G.builds.some(b => h.some(hc => handVal(hc) === b.value));
                const hasBuild = (() => {
                  for (const hc of h) {
                    const hv = handVal(hc);
                    for (let mask = 0; mask < (1 << n); mask++) {
                      const sel = t.filter((_, i) => (mask >> i) & 1);
                      const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
                      if (bv > buildCap) continue;
                      if (h.some(c => c.id !== hc.id && handVal(c) === bv)) return true;
                    }
                  }
                  return false;
                })();
                const voit = [];
                if (hasCapture) voit.push('kaapata');
                if (hasBuild)   voit.push('rakentaa');
                if (voit.length) addLog(`⚠ Jättämistila — käsikorteillasi voi ${voit.join(' ja ')}.`);
              }
              setLeaveMode(m => !m); setCaptureMode(false); setBuildMode(false); setSelTable([]); setSelBuilds([]);
            }}
            style={{ background: leaveMode ? `${C.gold}18` : 'transparent', border: `1px solid ${leaveMode ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: leaveMode ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            📤 Jätä{leaveMode ? ' ●' : ''}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => setShowOptions(v => !v)}
            style={{ background: showOptions ? `${C.gold}18` : 'transparent', border: `1px solid ${showOptions ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: showOptions ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            📋{isMobile ? '' : ' Vaihtoehdot'}
          </button>
        )}
        {!allBots && isMyTurn && (selTable.length > 0 || selBuilds.length > 0) && (
          <button onClick={() => { setSelTable([]); setSelBuilds([]); }} style={{ background: 'transparent', border: `1px solid ${C.dim}66`, borderRadius: 9, padding: '10px 16px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Peruuta valinta
          </button>
        )}
        {!allBots && pendingCapture && showNextBtn && (
          <button onClick={continueAfterCapture} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 9, padding: '10px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Seuraava →
          </button>
        )}
      </div>

      {/* Tilarivi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: isMobile ? 4 : 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: isMobile ? 4 : 10, justifyContent: 'flex-end' }}>
        <button onClick={() => setShowInfo(v => !v)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${showInfo ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: showInfo ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          ℹ Pisteet
        </button>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {soundOn ? '🔊' : '🔇'} Ääni
        </button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {debugOpen ? '🙈' : '🔍'} Avoimet kortit
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
              <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 14px', borderTop: '1px solid rgba(42,74,50,0.4)', background: i === 0 ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
                <div style={{ fontSize: 12, color: i === 0 ? '#c0d8c8' : '#8aaa90', fontFamily: 'sans-serif', lineHeight: 1.5 }}>{renderLogMessage(e.m)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MomentFeedback
        moment={currentMoment}
        onClose={() => setCurrentMoment(null)}
        onRate={() => {
          addLog('💾 Momentti tallennettu! Hyvä peli!');
          setCurrentMoment(null);
        }}
      />

      {/* Vaihtoehdot-modaali */}
      {showOptions && isMyTurn && (() => {
        const hand = G.players[0].hand;
        const table = G.table;
        const n = table.length;

        // Arvostus: pisteet → padat → korttimäärä (kaikki laskevasti)
        const optScore = (cards, isMokki = false) => {
          let pts = 0;
          for (const c of cards) {
            if (isRuutuKymppi(c)) pts += 2;
            else if (isPataKakkonen(c)) pts += 1;
            else if (c.r === 'A') pts += 1;
          }
          if (isMokki) pts += 1;
          const spades = cards.filter(c => c.s === '♠').length;
          return pts * 10000 + spades * 100 + cards.length;
        };

        // Pöytäkaappaukset — tallennetaan kortit tekstin sijaan
        const captures = [];
        for (const hc of hand) {
          const hv = handVal(hc);
          for (let mask = 1; mask < (1 << n); mask++) {
            const sel = table.filter((_, i) => (mask >> i) & 1);
            if (canPartition(sel, hv)) {
              const isMokki = sel.length === table.length && G.builds.length === 0;
              captures.push({ hc, tableCards: sel, isMokki, score: optScore([hc, ...sel], isMokki) });
            }
          }
        }
        captures.sort((a, b) => b.score - a.score);

        // Omat rakennelmakaappaukset
        const ownCaptures = G.builds
          .filter(b => b.ownerIdx === 0)
          .flatMap(b => hand.filter(hc => handVal(hc) === b.value).map(hc => ({
            hc, build: b, score: optScore([hc, ...b.cards])
          })))
          .sort((a, b) => b.score - a.score);

        // Kähvellykset
        const steals = G.builds
          .filter(b => b.ownerIdx !== 0)
          .flatMap(b => hand.filter(hc => handVal(hc) === b.value).map(hc => ({
            hc, build: b, owner: G.players[b.ownerIdx].name, score: optScore([hc, ...b.cards])
          })))
          .sort((a, b) => b.score - a.score);

        // Rakennelmat — pisteet lasketaan koko tulevasta saaliista (hc + pöytäkortit + kaappaaja)
        const builds = [];
        for (const hc of hand) {
          const hv = handVal(hc);
          for (let mask = 0; mask < (1 << n); mask++) {
            const sel = table.filter((_, i) => (mask >> i) & 1);
            const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
            if (bv > buildCap) continue;
            const capturer = hand.find(c => c.id !== hc.id && handVal(c) === bv);
            if (capturer) builds.push({ hc, tableCards: sel, value: bv, capturer,
              score: optScore([hc, ...sel, capturer]) });
          }
        }
        builds.sort((a, b) => b.score - a.score);

        const hasAny = captures.length || ownCaptures.length || steals.length || builds.length;

        // Pieni kortti — sama koko kuin pöydällä mobiilissa
        const CS = ({ card }) => (
          <Card card={card} xsmall showBadges backStyle={BACKS[cardBack]} />
        );
        // Rivin wrapper
        const CardRow = ({ children, accent }) => (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '6px 2px',
            borderBottom: `1px solid ${C.panelBorder}33`, flexWrap: 'wrap',
            borderLeft: accent ? `3px solid ${accent}` : undefined,
            paddingLeft: accent ? 8 : 2 }}>
            {children}
          </div>
        );
        const Sep = ({ color = C.gold, ch = '←' }) => (
          <span style={{ color, fontFamily: 'Georgia,serif', fontSize: 14, flexShrink: 0, opacity: 0.8 }}>{ch}</span>
        );

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setShowOptions(false)}>
            <div style={{ background: C.bg, border: `1px solid ${C.panelBorder}`, borderRadius: '16px 16px 0 0', padding: '16px', maxHeight: '65vh', overflowY: 'auto', maxWidth: 560, width: '100%', margin: '0 auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 14, color: C.gold, letterSpacing: 1 }}>📋 Vaihtoehdot</span>
                <button onClick={() => setShowOptions(false)} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>

              {!hasAny && <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, padding: '8px 0' }}>Ei kaappaus- tai rakennusvaihtoehtoja.</div>}

              {(captures.length > 0 || ownCaptures.length > 0) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7 }}>🎯 KAAPPAUKSET</span>
                    <button onClick={() => setHelpTerm(t => t === 'kaappaus' ? null : 'kaappaus')} style={{ background: 'transparent', border: `1px solid ${helpTerm === 'kaappaus' ? C.gold : C.dim + '55'}`, borderRadius: 6, padding: '1px 7px', fontSize: 10, color: helpTerm === 'kaappaus' ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>Kaappaustila {helpTerm === 'kaappaus' ? '▴' : '▾'}</button>
                  </div>
                  {helpTerm === 'kaappaus' && (
                    <div style={{ marginBottom: 8, padding: '7px 10px', background: `${C.gold}0e`, borderLeft: `2px solid ${C.gold}66`, borderRadius: '0 6px 6px 0', fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>🎯 Kaappaustila</span> — paina nappia, valitse pöytäkortit joiden summa täsmää käsikorttisi arvoon, sitten klikkaa käsikorttia. <span style={{ color: '#7ec8a0' }}>Mökki</span> = kaappaat kaikki pöydältä kerralla (+1 piste).
                    </div>
                  )}
                  {captures.map((c, i) => (
                    <CardRow key={i} accent={c.isMokki ? C.tikki : undefined}>
                      <CS card={c.hc} />
                      <Sep />
                      {c.tableCards.map(tc => <CS key={tc.id} card={tc} />)}
                      {c.isMokki && <span style={{ fontSize: 11, color: C.tikki, fontFamily: 'sans-serif', fontWeight: 700 }}>🏠 MÖKKI</span>}
                    </CardRow>
                  ))}
                  {ownCaptures.map((c, i) => (
                    <CardRow key={i}>
                      <CS card={c.hc} />
                      <Sep />
                      {c.build.cards.map(bc => <CS key={bc.id} card={bc} />)}
                      <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim }}>oma</span>
                    </CardRow>
                  ))}
                </div>
              )}

              {steals.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>⚔ KÄHVELLYKSET</div>
                  {steals.map((s, i) => (
                    <CardRow key={i} accent='#e09060'>
                      <CS card={s.hc} />
                      <Sep color='#e09060' />
                      {s.build.cards.map(bc => <CS key={bc.id} card={bc} />)}
                      <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#e09060' }}>{s.owner}</span>
                    </CardRow>
                  ))}
                </div>
              )}

              {builds.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7 }}>🔨 RAKENNELMAT</span>
                    <button onClick={() => setHelpTerm(t => t === 'rakennus' ? null : 'rakennus')} style={{ background: 'transparent', border: `1px solid ${helpTerm === 'rakennus' ? C.gold : C.dim + '55'}`, borderRadius: 6, padding: '1px 7px', fontSize: 10, color: helpTerm === 'rakennus' ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>Rakennustila {helpTerm === 'rakennus' ? '▴' : '▾'}</button>
                  </div>
                  {helpTerm === 'rakennus' && (
                    <div style={{ marginBottom: 8, padding: '7px 10px', background: `${C.gold}0e`, borderLeft: `2px solid ${C.gold}66`, borderRadius: '0 6px 6px 0', fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>🔨 Rakennustila</span> — paina nappia, valitse pöytäkortteja joiden summa + käsikorttisi = rakennelman arvo. Sinulla täytyy olla kädessä toinen kortti samalla arvolla kaappaukseen. Vastustaja voi kähveltää rakennelmasi.
                    </div>
                  )}
                  {builds.map((b, i) => (
                    <CardRow key={i} accent='#7ec8a0'>
                      <CS card={b.hc} />
                      {b.tableCards.length > 0 && <Sep color={C.dim} ch='+' />}
                      {b.tableCards.map(tc => <CS key={tc.id} card={tc} />)}
                      <Sep color='#7ec8a0' ch={`→ ${b.value}`} />
                      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>🔑</span>
                      <Card card={b.capturer} xsmall showBadges highlight backStyle={BACKS[cardBack]} />
                    </CardRow>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PendingResult overlay — allBots-tilan loppunäyttö */}
      {pendingResult && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 26, color: C.botMode, fontFamily: 'Georgia,serif', letterSpacing: 4 }}>🤖 TAISTELU PÄÄTTYI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 380 }}>
            {pendingResult.ranking.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12, background: i === 0 ? 'rgba(123,47,190,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : '🤖'}</span>
                <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 14, color: i === 0 ? C.botMode : C.text }}>{p.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: i === 0 ? C.botMode : C.dim }}>{p.score}<span style={{ fontSize: 11, opacity: 0.6 }}>p</span></span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1e9a)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi taistelu</button>
            <button onClick={() => { setPendingResult(null); setScreen('select'); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Valikko</button>
          </div>
        </div>
      )}

      <style>{`button:active{transform:scale(0.97)}@keyframes pakaFlash{0%{color:inherit}20%{color:#e05555;font-weight:700;transform:scale(1.15)}60%{color:#e05555;font-weight:700}100%{color:#e05555;font-weight:700}}@keyframes lastPlayFade{0%{opacity:0;transform:translateY(-4px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}`}</style>
    </div>
  );
}
