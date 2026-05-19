import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, kortin, shuffle, SUITS, RANKS, VAL } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
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
    const color = SUIT_COLOR[suit];
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

function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: VAL[r], id: `${r}${s}_${Math.random()}` }))));
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

function initGame(nPlayers, pool) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  const players = Array.from({ length: nPlayers }, (_, i) => ({
    id: i, name: i === 0 ? 'Hero' : aiNames[i - 1], isHuman: i === 0,
    hand: [], captured: [], tikkiCount: 0, score: 0,
  }));
  const table = deck.splice(0, 4);
  players.forEach(p => p.hand = deck.splice(0, 4));
  return { players, deck, table, builds: [], lastCapture: null, round: 1 };
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
  gameStart: (hint) => `Kasino alkaa! Pöydässä kortit. Sinun vuorosi. ${hint}`,
  newDeal: (left) => `Uusi jako — ${left} pakassa jäljellä.`,
  forcedLeave: 'Pakollinen siirto — yksi kortti kädessä, pöytä tyhjä.',
  yourTurn: (count, hint) => `Sinun vuorosi — ${count} kädessä. ${hint}`,
  aiThinking: (name) => `${name} miettii...`,
  endRound: 'Kierros päättyi! Pisteet lasketaan...',
  newRound: (scores, hint) => `Uusi peli! Pisteet: ${scores}. Sinun vuorosi — ${hint}`,
  humanCapture: (who, handCard, captureStr, isMokki) => `${who}: ${handCard} ← ${captureStr}${isMokki ? ' 🏠 MÖKKI!' : ''}`,
  humanLeave: (who, card) => `${who} ${card} pöytään.`,
  warning: (card, captured) => `⚠ Huom: ${card} olisi kaapattu ${captured} — klikkaa pöytäkortit ennen käsikorttia.`,
  invalidMove: (card) => `${card} ei kaappaa valittuja kortteja — tarkista valintasi tai peruuta.`,
  aiCapture: (name, handCard, captureStr, isMokki) => `${name}: ${handCard} ← ${captureStr}${isMokki ? ' 🏠' : ''}`,
};

export default function Kasino({ game, onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, teachMode = true, isMobile = false, playerNames }) {
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(4);
  const [soundOn, setSnd] = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G, setG] = useState(null);
  const [curIdx, setCur] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [selTable, setSelTable] = useState([]);
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

  const gRef    = useRef(null);
  const phaseRef = useRef('idle');
  const prevDeckRef = useRef(null);
  const curRef  = useRef(0);
  const aiTmr   = useRef(null);
  const logRef  = useRef([]);
  const sndRef  = useRef(false);
  const tmrs    = useRef(new Set());
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { curRef.current = curIdx; }, [curIdx]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); }, []);
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function detectMoment(eventType, context) {
    if (eventType === 'epic_score' && context.score >= 12) {
      const moment = {
        type: 'epic_score',
        game: 'Kasino',
        title: '⚔️ EPIC! Voitolla liikkeellä!',
        description: `Olet ${context.score} pisteellä! Kasino kuumenee — jäljellä enää ${16 - context.score} pistettä voittoon!`,
        timestamp: new Date().toISOString(),
        rarity: 'epic',
        context,
      };
      saveMomentSilently(moment);
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

  function startGame() {
    clearTimeout(aiTmr.current);
    const g = initGame(nP, playerNames);
    setG(g); gRef.current = g;
    setCur(0); curRef.current = 0;
    setPhase('select_table'); phaseRef.current = 'select_table';
    setSelTable([]); setScores(null); setPakaAnim(false);
    logRef.current = []; setLog([]);
    const hint = getTurnHint(g.players[0].hand, g.table);
    addLog(M.gameStart(hint));
    setScreen('game');
    setShuffling(true);
  }

  function getTurnHint(hand, table) {
    if (table.length === 0) return 'Pöytä tyhjä — jätä kortti pöytään.';
    const captures = [];
    for (const hc of hand) {
      const hv = handVal(hc);
      const n = table.length;
      let bestSet = null, bestScore = 0;
      for (let mask = 1; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        if (canPartition(sel, hv)) {
          const sc = sel.filter(isPataKakkonen).length * 50
            + sel.filter(isRuutuKymppi).length * 20
            + sel.length;
          if (sc > bestScore) { bestScore = sc; bestSet = sel; }
        }
      }
      if (bestSet) captures.push({ hc, bestSet, bestScore });
    }
    if (!captures.length) return 'Ei kaappauksia — jätä kortti pöytään.';
    captures.sort((a, b) => b.bestScore - a.bestScore);
    const top = captures.slice(0, 2).map(({ hc, bestSet }) => {
      const groups = findGroups(bestSet, handVal(hc));
      const groupStr = groups.length > 1
        ? groups.map(grp => '(' + grp.map(id => lbl(bestSet.find(c => c.id === id))).join('+') + ')').join('+')
        : bestSet.map(lbl).join('+');
      return `${lbl(hc)}→${groupStr}`;
    });
    const extra = captures.length > 2 ? ` +${captures.length - 2} muuta` : '';
    return `Kaappaus: ${top.join(' · ')}${extra}`;
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

    // Pakollinen siirto: yksi kortti kädessä ja pöytä tyhjä
    if (next === 0 && p.hand.length === 1 && g2.table.length === 0) {
      setCur(0); curRef.current = 0;
      setPhase('idle'); phaseRef.current = 'idle';
      setSelTable([]);
      setG(g2); gRef.current = g2;
      const g3 = doLeave(g2, 0, p.hand[0]);
      setG(g3); gRef.current = g3;
      addLog(M.forcedLeave);
      aiTmr.current = tm(() => advance(g3, 0), 1200);
      return;
    }

    setCur(next); curRef.current = next;
    setPhase('select_table'); phaseRef.current = 'select_table';
    setSelTable([]);
    setG(g2); gRef.current = g2;
    if (p.isHuman) {
      const hint = getTurnHint(p.hand, g2.table);
      addLog(M.yourTurn(korttia(p.hand.length), hint));
    } else {
      addLog(M.aiThinking(p.name));
      aiTmr.current = tm(() => runAI(next, g2), 1200 + Math.random() * 400);
    }
  }

  function endRound(g) {
    let g2 = g;
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
    if (newScores[0].totalScore >= 12 && (g2.players[0].score || 0) < 12) {
      detectMoment('epic_score', { score: newScores[0].totalScore });
    }
    const anyAt16 = newScores.some(s => s.totalScore >= 16);
    if (anyAt16) {
      const maxScore = Math.max(...newScores.map(s => s.totalScore));
      const winnerIndex = newScores.findIndex(s => s.totalScore === maxScore);
      onResult?.(winnerIndex === 0);
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
    const newG = initGame(nP, playerNames);
    const withScores = {
      ...newG,
      players: newG.players.map((p, i) => ({ ...p, score: finalPlayers[i]?.score || 0 })),
    };
    setG(withScores); gRef.current = withScores;
    setScores(null); setSelTable([]); setPakaAnim(false);
    setCur(0); curRef.current = 0;
    setPhase('select_table'); phaseRef.current = 'select_table';
    const h0 = withScores.players[0];
    const scoreStr = finalPlayers.map(p => `${p.name} ${p.score}p`).join(', ');
    addLog(M.newRound(scoreStr, getTurnHint(h0.hand, withScores.table)));
  }

  function scoreRound(g) {
    const counts = g.players.map(p => p.captured.length);
    const maxCards = Math.max(...counts);
    const spadesCounts = g.players.map(p => p.captured.filter(c => c.s === '♠').length);
    const maxSpades = Math.max(...spadesCounts);
    const tikkiCounts = g.players.map(p => p.tikkiCount);
    const maxTikki = Math.max(...tikkiCounts);
    return g.players.map((p, i) => {
      let pts = 0;
      if (counts[i] === maxCards && counts.filter(c => c === maxCards).length === 1) pts += 1;
      if (spadesCounts[i] === maxSpades && spadesCounts.filter(s => s === maxSpades).length === 1) pts += 1;
      p.captured.forEach(c => {
        if (isRuutuKymppi(c)) pts += 2;
        if (isPataKakkonen(c)) pts += 1;
        if (c.r === 'A') pts += 1;
      });
      if (tikkiCounts[i] > 0) {
        const othersHaveLess = tikkiCounts.some((t, j) => j !== i && t < tikkiCounts[i]);
        if (othersHaveLess) pts += p.tikkiCount;
      }
      return { roundPts: pts, cards: counts[i], spades: spadesCounts[i], tikkiCount: p.tikkiCount, aces: p.captured.filter(c => c.r === 'A').length };
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
    if (!silent) {
      const who = playerIdx === 0 ? 'Kaappasit' : `${g.players[playerIdx].name} kaappasi`;
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
    const who = playerIdx === 0 ? 'Jätit' : `${g.players[playerIdx].name} jätti`;
    addLog(M.humanLeave(who, lblColored(handCard)));
    return newG;
  }

  // Validoi: voidaanko pöytäkortit jakaa ryhmiin, joista kukin = käsikortin arvo
  function isValidCapture(handCard, tableCards) {
    if (!tableCards.length) return false;
    return canPartition(tableCards, handVal(handCard));
  }

  // Ihmispelaajan toiminnot
  function humanToggleTable(card) {
    if (phase !== 'select_table') return;
    setSelTable(prev => {
      const has = prev.find(c => c.id === card.id);
      return has ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
  }

  function humanSelectHand(card) {
    if (phase !== 'select_table') return;
    if (selTable.length === 0) {
      const g = gRef.current;
      const best = findBestCapture(g.players[0], g.table);
      const g2 = doLeave(g, 0, card);
      setG(g2); gRef.current = g2;
      setSelTable([]);
      setPhase('select_table'); phaseRef.current = 'select_table';
      if (best && g.table.length > 0) {
        const capturedStr = best.tableCards.map(lbl).join('+');
        addLog(M.warning(lblColored(best.handCard), capturedStr));
      }
      tm(() => advance(g2, 0), 600);
      return;
    }
    if (!isValidCapture(card, selTable)) {
      addLog(M.invalidMove(lblColored(card)));
      return;
    }
    const g = gRef.current;
    const captured = [...selTable];
    setCaptureAnim({ handCard: card, tableCards: captured });
    setSelTable([]);
    setPhase('idle'); phaseRef.current = 'idle';
    aiTmr.current = tm(() => {
      setCaptureAnim(null);
      const g2 = doCapture(gRef.current, 0, card, captured);
      setG(g2); gRef.current = g2;
      setPendingCapture({ g2, fromIdx: 0 });
    }, 1200);
  }

  // AI: etsi paras kaappaus (tukee multi-capture)
  function findBestCapture(p, table) {
    let best = null;
    for (const handCard of p.hand) {
      const hv = handVal(handCard);
      const n = table.length;
      for (let mask = 1; mask < (1 << n); mask++) {
        const sel = table.filter((_, i) => (mask >> i) & 1);
        if (canPartition(sel, hv)) {
          const isMokki = sel.length === table.length;
          const score = (isMokki ? 10000 : 0)
            + sel.filter(isPataKakkonen).length * 500
            + sel.filter(isRuutuKymppi).length * 200
            + sel.filter(c => c.s === '♠').length * 5
            + sel.length;
          if (!best || score > best.score) {
            best = { handCard, tableCards: sel, score, isMokki };
          }
        }
      }
    }
    return best;
  }

  function runAI(playerIdx, g) {
    if (!g) g = gRef.current;
    if (!g || phaseRef.current === 'idle') return;
    const p = g.players[playerIdx];
    if (!p.hand.length) { advance(g, playerIdx); return; }

    const bestCapture = findBestCapture(p, g.table);

    if (bestCapture) {
      // Näytä mitä AI aikoo tehdä — highlight pöytäkorteille
      const groups = findGroups(bestCapture.tableCards, handVal(bestCapture.handCard));
      const captureStr = groups.length > 1
        ? groups.map(grp => grp.map(id => lbl(bestCapture.tableCards.find(c => c.id === id))).join('+')).join(' ja ')
        : bestCapture.tableCards.map(lbl).join('+');
      addLog(M.aiCapture(p.name, lblColored(bestCapture.handCard), captureStr, bestCapture.isMokki));
      setCaptureAnim({ handCard: bestCapture.handCard, tableCards: bestCapture.tableCards });
      setAiSel({ handCard: bestCapture.handCard, tableCards: bestCapture.tableCards });
      aiTmr.current = tm(() => {
        setCaptureAnim(null);
        setAiSel({ handCard: null, tableCards: [] });
        const g2 = gRef.current;
        const g3 = doCapture(g2, playerIdx, bestCapture.handCard, bestCapture.tableCards, true);
        setG(g3); gRef.current = g3;
        setPendingCapture({ g2: g3, fromIdx: playerIdx });
      }, 1200);
    } else {
      const nonSpecial = p.hand.filter(c => !isPataKakkonen(c) && !isRuutuKymppi(c));
      const leavePool = nonSpecial.length > 0 ? nonSpecial : p.hand;
      const toLeave = [...leavePool].sort((a, b) => a.v - b.v)[0];
      aiTmr.current = tm(() => {
        const g2 = gRef.current;
        const g3 = doLeave(g2, playerIdx, toLeave);
        setG(g3); gRef.current = g3;
        tm(() => advance(g3, playerIdx), 600);
      }, 700 + Math.random() * 400);
    }
  }

  function continueAfterCapture() {
    if (!pendingCapture) return;
    const { g2, fromIdx } = pendingCapture;
    setPendingCapture(null);
    setPhase('select_table'); phaseRef.current = 'select_table';
    advance(g2, fromIdx);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  // ── Näkymät ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🂺</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>KASINO</h1>
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
            <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt lyhyesti</span><br />
        Eniten kortteja +1 · 10♦ +2 · 2♠ +1 · Ässä +1<br />
        Ensimmäinen 16 pisteeseen voittaa!
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
      </div>
    </div>
  );

  if (screen === 'gameover' && G) {
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
          <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
          <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
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
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 32 }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viestikupla */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>🂺</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }}>{renderLogMessage(msg)}</p>
      </div>

      {/* Pisteet + pakka */}
      <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {G.players.map((p, i) => (
          <div key={p.id} style={{ padding: '4px 12px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: 12, background: curIdx === i ? C.gold + '14' : 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === i ? C.gold + '66' : C.panelBorder}`, color: curIdx === i ? C.gold : C.dim }}>
            {p.name}: {p.score}p {curIdx === i ? '●' : ''}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: 11,
          color: G.deck.length === 0 ? C.red : C.dim,
          fontWeight: G.deck.length === 0 ? 700 : 400,
          border: `1px solid ${G.deck.length === 0 ? C.red + '55' : C.panelBorder}`,
          animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
          {G.deck.length === 0 ? 'PAKKA TYHJÄ' : `${korttia(G.deck.length)} pakassa`}
        </div>
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
            <button onClick={() => setScreen('gameover')} style={{ marginTop: 10, width: '100%', background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 0', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 1 }}>
              Uusi ottelu →
            </button>
          ) : (
            <button onClick={startNextRound} style={{ marginTop: 10, width: '100%', background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 0', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 1 }}>
              Seuraava peli →
            </button>
          )}
        </div>
      )}

      {/* AI-pelaajat */}
      {G.players.filter((_, i) => i !== 0).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
          {G.players.filter((_, i) => i !== 0).map(p => (
            <div key={p.id} style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === p.id ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: isMobile ? '5px 8px' : '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: curIdx === p.id ? C.gold : C.dim, marginBottom: 4 }}>
                🤖 {p.name} {curIdx === p.id ? '●' : ''} — {korttia(p.captured.length)} kaapattu
              </div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {debugOpen
                  ? p.hand.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} />)
                  : p.hand.map((_, ci) => <div key={ci} style={{ width: 28, height: 40, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pöytä */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, height: isMobile ? 170 : 250, overflow: 'hidden' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 8, letterSpacing: 1.5 }}>
          PÖYTÄ — {G.table.length === 0 ? 'tyhjä' : korttia(G.table.length)}
          {selTable.length > 0 && (
            <span style={{ color: multiGroupDisplay ? C.gold : C.blue, marginLeft: 8 }}>
              {multiGroupDisplay
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
                  selected={!!isSel || !!isAiPick}
                  highlight={isMyTurn && !isSel}
                  justPlaced={c.id === jpId}
                  onClick={isMyTurn ? () => humanToggleTable(c) : undefined}
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
          {!captureAnim && G.table.length === 0 && (
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.tikki, opacity: 0.8, padding: '10px 0' }}>Pöytä tyhjä!</div>
          )}
        </div>
      </div>

      {/* Ohje */}
      {isMyTurn && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, marginBottom: 8, fontStyle: 'italic' }}>
          {selTable.length === 0
            ? 'Valitse pöytäkortit ensin, sitten käsikortti. Tai klikkaa käsikorttia suoraan jättääksesi sen pöytään.'
            : multiGroupDisplay
              ? `Multi-kaappaus: ${multiGroupDisplay} — klikkaa käsikortti.`
              : `Valittuna ${selTable.map(lbl).join('+')} = ${selSum} — klikkaa käsikortti.`
          }
        </div>
      )}

      {/* Ihmispelaajan käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero {curIdx === 0 ? '●' : ''} — {korttia(human.captured.length)} kaapattu, {human.tikkiCount} mökkiä
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const valid = isMyTurn && selTable.length > 0 && isValidCapture(c, selTable);
            return (
              <Card key={c.id} card={c} small={isMobile} showBadges
                highlight={valid}
                dim={isMyTurn && selTable.length > 0 && !valid}
                onClick={isMyTurn ? () => humanSelectHand(c) : undefined}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>

      {/* Peruuta / Seuraava */}
      <div style={{ minHeight: isMobile ? 36 : 44, display: 'flex', alignItems: 'center', marginBottom: isMobile ? 4 : 10, gap: 10 }}>
        {isMyTurn && selTable.length > 0 && (
          <button onClick={() => setSelTable([])} style={{ background: 'transparent', border: `1px solid ${C.dim}66`, borderRadius: 9, padding: '10px 16px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Peruuta valinta
          </button>
        )}
        {pendingCapture && (
          <button onClick={continueAfterCapture} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 9, padding: '10px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Seuraava →
          </button>
        )}
      </div>

      {/* Tilarivi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: isMobile ? 4 : 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: isMobile ? 4 : 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}>
          <span style={{ color: C.gold, fontWeight: 700 }}>Tavoite:</span> 16p · <span style={{ color: SUIT_COLOR['♦'], fontWeight: 700 }}>10♦</span>=2p · <span style={{ color: SUIT_COLOR['♠'], fontWeight: 700 }}>2♠</span>=1p · kukin ässä=1p · eniten kortteja=1p · eniten patoja=1p · kukin mökki=1p
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {soundOn ? '🔊' : '🔇'} Ääni
          </button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {debugOpen ? '🙈' : '🔍'} Kortit
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

      <style>{`button:active{transform:scale(0.97)}@keyframes pakaFlash{0%{color:inherit}20%{color:#e05555;font-weight:700;transform:scale(1.15)}60%{color:#e05555;font-weight:700}100%{color:#e05555;font-weight:700}}`}</style>
    </div>
  );
}
