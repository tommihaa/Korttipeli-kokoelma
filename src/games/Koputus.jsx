import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GroupPicker from '../shared/GroupPicker.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { isRed, lbl, shuffle, newDeck } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import { useT, tr } from '../shared/i18n.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

const pScore = p => p.cards.reduce((s, c) => s + (c ? c.v : 0), 0);
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
const shuffledAINames = pool => shuffle(pool || AI_NAMES);

function initGame(n, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  return {
    players: Array.from({ length: n }, (_, i) => ({
      id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1], isHuman: allBots ? false : i === 0,
      cards: [deck.shift(), deck.shift(), deck.shift(), deck.shift()],
      known: new Set(allBots ? [0, 1] : (i === 0 ? [] : [0, 1])),
    })),
    deck, discard: [],
  };
}

const M = {
  get peekStart() { return tr('games.koputus.msg.peekStart'); },
  get peekOne()   { return tr('games.koputus.msg.peekOne'); },
  get peekDone()  { return tr('games.koputus.msg.peekDone'); },
  get yourTurn()  { return tr('games.koputus.msg.yourTurn'); },
  drawn:     c => tr('games.koputus.msg.drawn', { card: lblColored(c), v: c.v }),
  drawnD:    c => tr('games.koputus.msg.drawnD', { card: lblColored(c), v: c.v }),
  swapped:   c => tr('games.koputus.msg.swapped', { card: lblColored(c) }),
  discarded: c => tr('games.koputus.msg.discarded', { card: lblColored(c) }),
  reactQ:    c => tr('games.koputus.msg.reactQ', { card: lblColored(c) }),
  reactWin:  () => tr('games.koputus.msg.reactWin'),
  get reactWrong() { return tr('games.koputus.msg.reactWrong'); },
  get reactEnd()   { return tr('games.koputus.msg.reactEnd'); },
  get jackMsg()    { return tr('games.koputus.msg.jackMsg'); },
  get queenMsg()   { return tr('games.koputus.msg.queenMsg'); },
  get queenMsg2()  { return tr('games.koputus.msg.queenMsg2'); },
  get kingMsg()    { return tr('games.koputus.msg.kingMsg'); },
  knocked:   n => tr('games.koputus.msg.knocked', { name: n }),
  get gameOver()   { return tr('games.koputus.msg.gameOver'); },
  aiTurn:    n => tr('games.koputus.msg.aiTurn', { name: n }),
  aiSwapped: (n, c) => tr('games.koputus.msg.aiSwapped', { name: n, card: lblColored(c) }),
  aiDiscard: (n, c) => tr('games.koputus.msg.aiDiscard', { name: n, card: lblColored(c) }),
  aiKnock:   n => tr('games.koputus.msg.aiKnock', { name: n }),
  aiReact:   (n, c) => tr('games.koputus.msg.aiReact', { name: n, card: lblColored(c) }),
  aiWrongReact: n => tr('games.koputus.msg.aiWrongReact', { name: n }),
};

// ── Bottipäätökset puhtaina funktioina ──────────────────────────
// Irrotettu runAI:sta, jotta sama logiikka ajaa botit ja Heron Mestari-neuvon.
// Käyttävät vain pelaajan omaa known-joukkoa + julkista tietoa (ei kurkkimista).

// Tuntemattoman paikan odotusarvo (vaihto- ja nostopäätöksiin)
const UNKNOWN_EV = 7;

// Koputusarvio: tunnettujen summa + tuntemattomien EV vs. kynnys
function koKnockEstimate(player, level) {
  const ks = [...player.known].reduce((s, i) => s + (player.cards[i]?.v || 0), 0);
  const uk = player.cards.filter(c => c !== null).length - player.known.size;
  const unkEV = level === 'hard' ? 6 : 5;
  const est = ks + uk * unkEV;
  // Oppipoika ei uskalla koputtaa ajoissa (mitattu: aikainen koputus on etu)
  const knockThreshold = level === 'beginner' ? 5 : 8;
  return { shouldKnock: est <= knockThreshold, est };
}

// Haluaako pelaaja poistopakan kortin? Oppipoika ei huomaa poistopakkaa lainkaan;
// Mestari ottaa myös pikkukortin (≤4) tuntemattomaan paikkaan (EV-hyöty ≥3).
function koWantsDiscard(g, playerIdx, level) {
  const pp = g.players[playerIdx];
  const top = g.discard[g.discard.length - 1];
  if (!top || level === 'beginner') return false;
  const worst = [...pp.known].filter(i => pp.cards[i] !== null)
    .sort((a, b) => pp.cards[b].v - pp.cards[a].v)[0];
  if (worst !== undefined && top.v < pp.cards[worst].v) return true;
  if (level === 'hard' && top.v <= UNKNOWN_EV - 3
      && pp.cards.some((c, i) => c !== null && !pp.known.has(i))) return true;
  return false;
}

// Vaihtokohde nostetulle kortille: hyötyvertailu. Tunnetun parannus = varma hyöty;
// tuntemattoman täyttö = EV-hyöty (Kisälli vaatii ≥5, Mestari ≥3). null = poistoon.
function koSwapTarget(player, card, level) {
  const wo = [...player.known].filter(i => player.cards[i] !== null)
    .sort((a, b) => player.cards[b].v - player.cards[a].v)[0];
  const unknownSlot = player.cards.findIndex((c, i) => c !== null && !player.known.has(i));
  const gainKnown   = wo !== undefined ? player.cards[wo].v - card.v : -Infinity;
  const gainUnknown = (level !== 'beginner' && unknownSlot !== -1) ? UNKNOWN_EV - card.v : -Infinity;
  const unknownGate = level === 'hard' ? 3 : 5;
  if (gainUnknown >= unknownGate && gainUnknown > gainKnown) return unknownSlot;
  if (gainKnown > 0) return wo;
  return null;
}

// Mestarin neuvo Herolle. phase 'draw' → koputus/nostolähde, 'drawn' → vaihto/poisto.
// Palauttaa { type, card?, slot? } — type vastaa games.koputus.advice.* -avainta.
export function getAdvice(g, phase, drawn, knocked) {
  const p = g.players[0];
  if (!p) return null;
  if (phase === 'draw') {
    if (knocked === null && koKnockEstimate(p, 'hard').shouldKnock) return { type: 'knock' };
    if (koWantsDiscard(g, 0, 'hard')) {
      return { type: 'drawDiscard', card: g.discard[g.discard.length - 1] };
    }
    return { type: 'drawDeck' };
  }
  if (phase === 'drawn' && drawn) {
    const slot = koSwapTarget(p, drawn, 'hard');
    return slot === null ? { type: 'discardDrawn' } : { type: 'swapSlot', slot };
  }
  return null;
}

function PlayerGrid({ player, isActive, clickableSet, onCardClick, peekSet, small, showScore, phase, debug, lastSwap, backStyle, showKnown = true, intentSlot, adviceSlot }) {
  const t = useT();
  return (
    <div style={{ padding: small ? '4px 8px' : 14, borderRadius: 12, transition: 'border-color 0.2s', border: `1px solid ${isActive ? 'rgba(201,168,76,0.3)' : 'rgba(42,74,50,0.4)'}`, background: isActive ? 'rgba(201,168,76,0.03)' : 'transparent', display: small ? 'flex' : 'block', alignItems: small ? 'center' : undefined, gap: small ? 6 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: small ? 4 : 8, marginBottom: small ? 0 : 8, fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, flexShrink: 0 }}>
        <span style={{ fontSize: small ? 12 : 14 }}>{player.isHuman ? '👤' : '🤖'}</span>
        <span style={{ fontWeight: isActive ? 700 : 400, letterSpacing: 0.5 }}>{player.name}</span>
        {isActive && !small && <span style={{ fontSize: 9, animation: 'blink 1.2s ease infinite', opacity: 0.8 }}>{t('games.koputus.ui.turnIndicator')}</span>}
        {showScore && player.isHuman && <span style={{ marginLeft: 'auto', color: '#a0baa8', fontSize: 12 }}>{pScore(player)} p</span>}
        {!small && <span style={{ marginLeft: showScore && player.isHuman ? 6 : 'auto', fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65 }}>{t('ui.shared.fieldLabel')}</span>}
      </div>
      <div style={small ? { display: 'flex', flexDirection: 'row', gap: 4 } : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {player.cards.map((card, i) => {
          const vis = !!(debug || peekSet?.has(i));
          const cl = clickableSet?.has(i) ?? false;
          const memGlow = player.known.has(i) && !peekSet?.has(i) && showKnown;
          const reactHL = cl && phase === 'reaction';
          const justPlaced = lastSwap === i;
          if (card === null) return <Card key={i} empty small={small} />;
          return (
            <Card key={i} card={card} faceUp={vis}
              highlight={cl && !small && !reactHL}
              reactHL={reactHL}
              justPlaced={justPlaced}
              pulse={memGlow && !cl && !justPlaced}
              selected={intentSlot === i}
              advice={adviceSlot === i}
              backStyle={backStyle}
              onClick={cl ? () => onCardClick?.(i) : undefined}
              disabled={clickableSet && !cl}
              small={small}
            />
          );
        })}
      </div>
    </div>
  );
}

// Module-scopessa ettei React remounttaa nappia (ja siten hover-tilaa/transitiota) joka renderillä.
function Btn({ label, onClick, color, outline, small: sm }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: outline ? (h ? color + '18' : 'transparent') : `linear-gradient(135deg,${color},${color}cc)`, border: `1px solid ${outline ? (h ? color : color + '66') : color}`, borderRadius: 9, padding: sm ? '7px 14px' : '10px 20px', color: outline ? (h ? color : color + 'bb') : '#0d2118', fontSize: sm ? 11 : 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.4, transition: 'all 0.15s' }}>
      {label}
    </button>
  );
}

export default function Koputus({ onResult, showLog = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, showAIKnown = true, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen]     = useState('select');
  const [nP, setNP]             = useState(playerCount);
  const [G, setG]               = useState(null);
  const [phase, setPhase]       = useState('idle');
  const [curIdx, setCurIdx]     = useState(0);
  const [drawn, setDrawn]       = useState(null);
  const [msg, setMsg_]          = useState('');
  const [log, setLog]           = useState([]);
  const [debugOpen, setDebug]   = useState(initSeeAll);
  const [peeksDone, setPD]      = useState(0);
  const [tempPeek, setTP]       = useState(new Set());
  const [reactionOpen, setRO]   = useState(false);
  const [reactionSec, setRS]    = useState(3);
  const [knockedBy, setKB]      = useState(null);
  const [lastRound, setLR]      = useState(null);
  const [specState, setSS]      = useState(null);
  const [lastSwap, setLastSwap] = useState(null);
  const [soundOn, setSnd]   = useState(initSoundOn);
  const [logOpen, setLogOpen]   = useState(showLog);
  const cardBack = 'ilves';
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [allBots, setAllBots]   = useState(false);
  const [paused, setPaused]     = useState(false);
  const [aiDelayMs, setAiDelayMs] = useState(2000);
  const [intention, setIntention] = useState(null); // { playerIdx, slotIdx } | null
  const [pendingResult, setPendingResult] = useState(null);
  const [advice, setAdvice] = useState(null); // { text, slot?, target? } | null

  const logRef     = useRef([]);
  const gRef       = useRef(null);
  const knockRef   = useRef(null);
  const prevDeckRef = useRef(null);
  const lrRef    = useRef(null);
  const curRef   = useRef(0);
  const stopReact = useRef(false);
  const reactInt  = useRef(null);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const sndRef     = useRef(initSoundOn);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedAI, guard } =
    useAIScheduler({ extraIntervalRefs: [reactInt] });

  const setMsg = m => {
    setMsg_(m);
    if (!m) return;
    const entry = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [entry, ...logRef.current].slice(0, 40);
    setLog([...logRef.current]);
    if (allBotsRef.current && onSnapshot && gRef.current) {
      const g = gRef.current;
      onSnapshot({ step: logRef.current.length, logText: m,
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.cards ?? [], cardCount: p.cards?.length ?? 0, score: null })),
        tableCards: (g.discard ?? []).slice(-1), extraText: null });
    }
  };

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { setAdvice(null); }, [G, phase, drawn]); // neuvo vanhenee tilamuutoksista
  useEffect(() => { knockRef.current = knockedBy; }, [knockedBy]);

  function askAdvice() {
    const g = gRef.current; if (!g) return;
    const a = getAdvice(g, phase, drawn, knockRef.current);
    if (!a) return;
    setAdvice({
      text: t('games.koputus.advice.' + a.type, {
        card: a.card ? lbl(a.card) : undefined,
        slot: a.slot !== undefined ? a.slot + 1 : undefined,
      }),
      slot: a.slot,
      target: a.type === 'drawDiscard' ? 'discard' : a.type === 'drawDeck' ? 'deck' : null,
    });
  }
  useEffect(() => { lrRef.current = lastRound; }, [lastRound]);
  useEffect(() => { curRef.current = curIdx; }, [curIdx]);
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  function startGame(forcedCount, allBotsMode = false) {
    clearTimeout(aiTmr.current); clearInterval(reactInt.current);
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    pausedRef.current = false; setPaused(false);
    setPendingResult(null);
    const cnt = forcedCount || nP;
    const g = initGame(cnt, playerNames, allBotsMode);
    setG(g); gRef.current = g;
    setDrawn(null); setKB(null); knockRef.current = null;
    setLR(null); lrRef.current = null; setSS(null); setRO(false);
    logRef.current = []; setLog([]); setPakaAnim(false);
    if (allBotsMode) {
      // Ohita kurkkausvaihe — kaikki botit tietävät jo 2 korttiaan
      const si = 1 % cnt;
      setPhase('draw'); setCurIdx(si); curRef.current = si;
      setPD(2); setTP(new Set());
      setMsg(t('games.koputus.msg.botBattleStart'));
      setScreen('game');
      setShuffling(true);
      schedAI(() => runAI(si, gRef.current), 2000);
    } else {
      setPhase('peeking'); setCurIdx(0); setPD(0); setTP(new Set());
      setMsg(M.peekStart);
      setScreen('game');
      setShuffling(true);
    }
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

  function onPeek(idx) {
    if (peeksDone >= 2) return;
    const next = peeksDone + 1;
    setPD(next);
    setTP(prev => new Set([...prev, idx]));
    const newG = { ...gRef.current, players: gRef.current.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p) };
    setG(newG); gRef.current = newG;
    tm(() => setTP(prev => { const n = new Set(prev); n.delete(idx); return n; }), 2500);
    if (next === 1) setMsg(M.peekOne);
    else {
      setMsg(M.peekDone);
      tm(() => {
        setPhase('draw');
        const si = 1 % nP;
        setCurIdx(si); curRef.current = si;
        if (newG.players[si].isHuman) setMsg(M.yourTurn);
        else { setMsg(M.aiTurn(newG.players[si].name)); aiTmr.current = tm(guard(() => runAI(si, gRef.current)), 600); }
      }, 1600);
    }
  }

  function advance(gState, fromIdx) {
    const kb = knockRef.current, lr = lrRef.current;
    if (kb !== null && lr !== null) {
      const newLR = new Set(lr); newLR.delete(gState.players[fromIdx].id);
      if (newLR.size === 0) { endGame(gState); return; }
      setLR(newLR); lrRef.current = newLR;
    }
    const next = (fromIdx + 1) % gState.players.length;
    setCurIdx(next); curRef.current = next;
    setPhase('draw'); setDrawn(null); setSS(null);
    const np = gState.players[next];
    if (np.isHuman) setMsg(M.yourTurn);
    else { setMsg(M.aiTurn(np.name)); schedAI(() => runAI(next, gRef.current), 600); }
  }

  function endGame(gState) {
    const players = gState.players;
    const sorted  = [...players].sort((a, b) => pScore(a) - pScore(b));
    const ranking = sorted.map(p => {
      const s = pScore(p);
      return { name: p.name, place: sorted.filter(q => pScore(q) < s).length + 1, score: s, isHuman: p.isHuman };
    });
    const revealCards = players.map(p => ({ name: p.name, cards: p.cards }));
    if (sndRef.current) { SFX.reveal(); tm(() => SFX.fanfare(), 500); }
    if (allBotsRef.current) {
      tm(() => onResult?.({ ranking, revealCards }), 600);
    } else {
      onResult?.({ ranking, revealCards });
    }
    setPhase('gameover'); setScreen('gameover'); setMsg(M.gameOver);
  }

  function humanDrawDeck() {
    const g = gRef.current; if (!g || !g.deck.length) return;
    if (soundOn) SFX.flip();
    const deck = [...g.deck], card = deck.shift();
    const newG = { ...g, deck }; setG(newG); gRef.current = newG;
    setDrawn(card); setPhase('drawn'); setMsg(M.drawn(card));
  }
  function humanDrawDiscard() {
    const g = gRef.current; if (!g || !g.discard.length) return;
    if (soundOn) SFX.flip();
    const discard = [...g.discard], card = discard.pop();
    const newG = { ...g, discard }; setG(newG); gRef.current = newG;
    setDrawn(card); setPhase('drawn'); setMsg(M.drawnD(card));
  }
  function humanKnock() {
    if (knockRef.current !== null) return;
    if (soundOn) SFX.tikki();
    setKB(0); knockRef.current = 0;
    const lr = new Set(gRef.current.players.filter((_, i) => i !== 0).map(p => p.id));
    setLR(lr); lrRef.current = lr;
    setMsg(M.knocked('Hero'));
  }

  function flashSlot(pIdx, cIdx) {
    setLastSwap({ pIdx, cIdx });
    tm(() => setLastSwap(null), 2200);
  }

  function humanSwap(cardIdx) {
    const g = gRef.current, oldCard = g.players[0].cards[cardIdx];
    flashSlot(0, cardIdx);
    if (soundOn) SFX.swap();
    const players = g.players.map((p, i) => {
      if (i !== 0) return p;
      const cards = [...p.cards]; cards[cardIdx] = drawn;
      return { ...p, cards, known: new Set([...p.known, cardIdx]) };
    });
    const newG = { ...g, players, discard: [...g.discard, oldCard] };
    setG(newG); gRef.current = newG;
    setMsg(M.swapped(oldCard));
    stopReact.current = false;
    tm(() => openReaction(newG, oldCard, 0), 600);
  }
  function humanDiscard() {
    const g = gRef.current;
    if (soundOn) SFX.play();
    const newG = { ...g, discard: [...g.discard, drawn] };
    setG(newG); gRef.current = newG; setMsg(M.discarded(drawn));
    if (drawn.r === 'J') { setPhase('spec_j'); setMsg(M.jackMsg); return; }
    if (drawn.r === 'Q') { setPhase('spec_q_own'); setMsg(M.queenMsg); setSS({ type: 'Q', ownIdx: null }); return; }
    if (drawn.r === 'K') { setPhase('spec_k'); setMsg(M.kingMsg); setSS({ type: 'K', ownIdx: null }); return; }
    tm(() => openReaction(newG, drawn, 0), 200);
  }

  function handleJ(idx) {
    const g = gRef.current, card = g.players[0].cards[idx];
    setTP(new Set([idx])); tm(() => setTP(new Set()), 2500);
    const players = g.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p);
    const newG = { ...g, players }; setG(newG); gRef.current = newG;
    setMsg(t('games.koputus.msg.peekedCard', { card: lbl(card), v: card.v }));
    tm(() => openReaction(newG, drawn, 0), 2800);
  }
  function handleQOwn(idx) {
    stopReact.current = true; clearInterval(reactInt.current);
    setSS({ type: 'Q', ownIdx: idx }); setPhase('spec_q_tgt');
    setMsg(t('games.koputus.msg.queenPickOther', { idx: idx + 1 }));
  }
  function handleQTarget(pIdx, cIdx) {
    const g = gRef.current, own = specState.ownIdx;
    const oc = g.players[0].cards[own], tc = g.players[pIdx].cards[cIdx];
    const players = g.players.map((p, i) => {
      if (i === 0) { const c = [...p.cards]; c[own] = tc; return { ...p, cards: c }; }
      if (i === pIdx) { const c = [...p.cards]; c[cIdx] = oc; return { ...p, cards: c }; }
      return p;
    });
    const newG = { ...g, players }; setG(newG); gRef.current = newG; setSS(null);
    setMsg(t('games.koputus.msg.swapDoneHidden'));
    stopReact.current = false;
    tm(() => openReaction(newG, drawn, 0), 800);
  }
  function handleKPeek(idx) {
    stopReact.current = true; clearInterval(reactInt.current);
    const g = gRef.current, card = g.players[0].cards[idx];
    setTP(new Set([idx]));
    const players = g.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p);
    const newG = { ...g, players }; setG(newG); gRef.current = newG;
    setMsg(t('games.koputus.msg.kingPeeked', { card: lbl(card), v: card.v }));
    setSS({ type: 'K', ownIdx: idx }); setPhase('spec_k_decide');
  }
  function handleKPeekTarget(pIdx, cIdx) {
    const g = gRef.current, tgtCard = g.players[pIdx].cards[cIdx];
    if (!tgtCard) return;
    setSS(prev => ({ ...prev, tgtPIdx: pIdx, tgtCIdx: cIdx, tgtCard }));
    setPhase('spec_k_confirm');
    setMsg(t('games.koputus.msg.kingRivalCard', { card: lbl(tgtCard), v: tgtCard.v }));
  }
  function handleKSwap() {
    const g = gRef.current, own = specState.ownIdx;
    const realPIdx = specState.tgtPIdx, realCIdx = specState.tgtCIdx;
    const oc = g.players[0].cards[own], tc = g.players[realPIdx].cards[realCIdx];
    const players = g.players.map((p, i) => {
      if (i === 0) { const c = [...p.cards]; c[own] = tc; return { ...p, cards: c }; }
      if (i === realPIdx) { const c = [...p.cards]; c[realCIdx] = oc; return { ...p, cards: c }; }
      return p;
    });
    const newG = { ...g, players }; setG(newG); gRef.current = newG;
    setTP(new Set()); setSS(null); stopReact.current = false;
    setMsg(t('games.koputus.msg.swapDone'));
    tm(() => openReaction(newG, drawn, 0), 1200);
  }
  function handleKSkip() {
    setTP(new Set()); setSS(null); stopReact.current = false;
    setMsg(t('games.koputus.msg.skipped'));
    tm(() => openReaction(gRef.current, drawn, 0), 800);
  }

  function openReaction(gState, card, byIdx) {
    if (gState.deck.length < 2) { advance(gState, byIdx); return; }
    stopReact.current = false; setRO(true); setRS(3.5); setPhase('reaction'); setMsg(M.reactQ(card));
    let t = 3.5;
    clearInterval(reactInt.current);
    reactInt.current = setInterval(() => {
      t = Math.round((t - 0.5) * 10) / 10; setRS(t);
      if (t <= 0) {
        clearInterval(reactInt.current);
        if (!stopReact.current) { stopReact.current = true; setRO(false); setMsg(M.reactEnd); advance(gState, byIdx); }
      }
    }, 500);
    gState.players.forEach((p, i) => {
      if (p.isHuman) return;
      const level = botLevelsRef.current?.[i] ?? (allBotsRef.current ? 'hard' : aiLevelRef.current);
      const missProbability   = level === 'beginner' ? 0.5 : level === 'normal' ? 0.25 : 0.03;
      const wrongReactChance  = level === 'beginner' ? 0.15 : 0;
      const mi = [...p.known].find(ki => p.cards[ki]?.r === card.r);

      // Passiivisuus: jättää reagoimatta vaikka tietää sopivan kortin
      if (mi !== undefined && Math.random() < missProbability) return;

      if (mi !== undefined) {
        // Oikea reaktio
        const delay = 800 + Math.random() * 2400;
        tm(() => {
          if (stopReact.current) return;
          stopReact.current = true; clearInterval(reactInt.current); setRO(false);
          setMsg(M.aiReact(p.name, p.cards[mi]));
          const cur = gRef.current;
          const reactedCard = cur.players[i].cards[mi];
          const players = cur.players.map((pl, pi) => {
            if (pi !== i) return pl;
            const cards = [...pl.cards]; cards[mi] = null;
            const kn = new Set([...pl.known].filter(k => k !== mi));
            return { ...pl, cards, known: kn };
          });
          const newG = { ...cur, players, discard: reactedCard ? [...cur.discard, reactedCard] : cur.discard };
          setG(newG); gRef.current = newG;
          tm(() => advance(newG, byIdx), 900);
        }, delay);
      } else if (Math.random() < wrongReactChance) {
        // Aloittelija-virhe: arvaa tuntemattomalla kortilla
        const unknownIdxs = [0,1,2,3].filter(ki => !p.known.has(ki) && p.cards[ki] !== null);
        if (!unknownIdxs.length) return;
        const wrongIdx = unknownIdxs[Math.floor(Math.random() * unknownIdxs.length)];
        const delay = 1200 + Math.random() * 1600;
        tm(() => {
          if (stopReact.current) return;
          stopReact.current = true; clearInterval(reactInt.current); setRO(false);
          const cur = gRef.current;
          const wrongCard = cur.players[i].cards[wrongIdx];
          if (!wrongCard) return;
          if (wrongCard.r === card.r) {
            // Sattumalta oikein — käy onneksi
            setMsg(M.aiReact(p.name, wrongCard));
            if (sndRef.current) SFX.reactWin();
            const players = cur.players.map((pl, pi) => {
              if (pi !== i) return pl;
              const cards = [...pl.cards]; cards[wrongIdx] = null;
              const kn = new Set([...pl.known].filter(k => k !== wrongIdx));
              return { ...pl, cards, known: kn };
            });
            const newG = { ...cur, players, discard: [...cur.discard, wrongCard] };
            setG(newG); gRef.current = newG;
            tm(() => advance(newG, byIdx), 900);
          } else {
            // Väärä arvaus — rangaistus
            setMsg(M.aiWrongReact(p.name));
            if (sndRef.current) SFX.reactWrong();
            const afterLoss = [...cur.players[i].cards]; afterLoss[wrongIdx] = null;
            const draws = cur.deck.slice(0, 2); let dIdx = 0;
            const withPenalty = afterLoss.map(c => { if (c === null && dIdx < draws.length) return draws[dIdx++]; return c; });
            const remainingDeck = cur.deck.slice(2);
            const players = cur.players.map((pl, pi) => {
              if (pi !== i) return pl;
              const kn = new Set([...pl.known].filter(k => k !== wrongIdx));
              return { ...pl, cards: withPenalty, known: kn };
            });
            const newG = { ...cur, players, deck: remainingDeck, discard: [...cur.discard, wrongCard] };
            setG(newG); gRef.current = newG;
            tm(() => advance(newG, byIdx), 1200);
          }
        }, delay);
      }
    });
  }

  function humanReact(cardIdx) {
    if (!reactionOpen || !gRef.current) return;
    const g = gRef.current, top = g.discard[g.discard.length - 1];
    if (!top) return;
    stopReact.current = true; clearInterval(reactInt.current); setRO(false);
    if (g.players[0].cards[cardIdx]?.r === top.r) {
      const remainingNonNull = g.players[0].cards.filter((c, i) => c !== null && i !== cardIdx).length;
      const isLastCard = remainingNonNull === 0;
      const reactedCard = g.players[0].cards[cardIdx];
      const players = g.players.map((p, i) => {
        if (i !== 0) return p;
        const cards = [...p.cards]; cards[cardIdx] = null;
        const kn = new Set(p.known); kn.delete(cardIdx);
        return { ...p, cards, known: kn };
      });
      const newG = { ...g, players, discard: reactedCard ? [...g.discard, reactedCard] : g.discard };
      setG(newG); gRef.current = newG;
      if (isLastCard) {
        if (soundOn) SFX.lastCardWin();
        setMsg(t('games.koputus.msg.lastCardPlayed'));
        tm(() => endGame(newG), 2200);
      } else {
        if (soundOn) SFX.reactWin();
        setMsg(M.reactWin());
        tm(() => advance(newG, curRef.current), 2000);
      }
    } else {
      if (soundOn) SFX.reactWrong();
      setMsg(M.reactWrong);
      const lostCard = g.players[0].cards[cardIdx];
      const afterLoss = [...g.players[0].cards]; afterLoss[cardIdx] = null;
      const draws = g.deck.slice(0, 2); let dIdx = 0;
      const withPenalty = afterLoss.map(c => { if (c === null && dIdx < draws.length) return draws[dIdx++]; return c; });
      const remainingDeck = g.deck.slice(2);
      const newKn = new Set([...g.players[0].known].filter(k => k !== cardIdx));
      const players = g.players.map((p, i) => i === 0 ? { ...p, cards: withPenalty, known: newKn } : p);
      const newG = { ...g, players, deck: remainingDeck, discard: [...g.discard, lostCard] };
      setG(newG); gRef.current = newG;
      tm(() => advance(newG, curRef.current), 2200);
    }
  }

  function runAI(playerIdx, gState) {
    if (!gState) gState = gRef.current; if (!gState) return;
    if (curRef.current !== playerIdx) return;
    const p = gState.players[playerIdx];
    // Kyvykkyysporras (ei satunnaiskohinaa):
    //   Oppipoika: ei huomaa poistopakkaa; arka koputtaja (kynnys 5) — botbench
    //              osoitti että AIKAINEN koputus on etu, joten heikkous on arkuus
    //   Kisälli:   poistopakka + vaihto huonoimpaan tunnettuun; arvio ×5, kynnys 8;
    //              täyttää tuntemattoman vain varmalla kortilla (A/2)
    //   Mestari:   + realistinen tuntemattoman arvio (×6) ja laajempi EV-vaihto
    //              tuntemattomaan paikkaan (≤4; KOPUTUS.md strategia, kohta 3)
    const level = botLevelsRef.current?.[playerIdx] ?? (allBotsRef.current ? 'hard' : aiLevelRef.current);
    if (knockRef.current === null) {
      if (koKnockEstimate(p, level).shouldKnock) {
        setKB(playerIdx); knockRef.current = playerIdx;
        if (sndRef.current) SFX.tikki();
        const lr = new Set(gState.players.filter((_, i) => i !== playerIdx).map(pl => pl.id));
        setLR(lr); lrRef.current = lr; setMsg(M.aiKnock(p.name));
      }
    }
    const wantsDiscard = (gg) => koWantsDiscard(gg, playerIdx, level);
    const drawFromDiscard = wantsDiscard(gState);
    const thinkMs = allBotsRef.current ? Math.min(aiDelayRef.current * 0.25, 500) : 1600;
    const reactMs = allBotsRef.current ? 400 : 1200;
    tm(() => { setMsg(t(drawFromDiscard ? 'games.koputus.msg.aiDrawingDiscard' : 'games.koputus.msg.aiDrawingDeck', { name: p.name })); if (sndRef.current) SFX.flip(); }, thinkMs);
    schedAI(() => {
      const gNow = gRef.current; if (!gNow) return;
      const pNow = gNow.players[playerIdx];
      const drawFromDiscardNow = wantsDiscard(gNow);
      let card, deck, discard;
      if (drawFromDiscardNow) {
        card = gNow.discard[gNow.discard.length - 1];
        deck = gNow.deck; discard = gNow.discard.slice(0, -1);
      } else {
        if (!gNow.deck.length) { endGame(gNow); return; }
        card = gNow.deck[0]; deck = gNow.deck.slice(1); discard = gNow.discard;
      }
      const targetSlot = koSwapTarget(pNow, card, level);
      const target = targetSlot === null ? undefined : targetSlot;
      if (target !== undefined) {
        const doSwap = () => {
          const old = pNow.cards[target];
          const players = gNow.players.map((pl, i) => {
            if (i !== playerIdx) return pl;
            const cards = [...pl.cards]; cards[target] = card;
            return { ...pl, cards, known: new Set([...pl.known, target]) };
          });
          const updG = { ...gNow, players, deck, discard: [...discard, old] };
          setG(updG); gRef.current = updG; setMsg(M.aiSwapped(p.name, old));
          if (sndRef.current) SFX.swap();
          flashSlot(playerIdx, target);
          tm(() => openReaction(updG, old, playerIdx), reactMs);
        };
        if (initShowIntention) {
          const intentionMs = Math.min(1200, Math.max(400, aiDelayRef.current * 0.3));
          setIntention({ playerIdx, slotIdx: target });
          tm(() => { setIntention(null); doSwap(); }, intentionMs);
          return;
        }
        doSwap();
      } else {
        const updG = { ...gNow, deck, discard: [...discard, card] };
        setG(updG); gRef.current = updG; setMsg(M.aiDiscard(p.name, card));
        if (sndRef.current) SFX.play();
        tm(() => openReaction(updG, card, playerIdx), reactMs);
      }
    }, 3600);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🤜</div>
        <h1 style={{ fontSize: isMobile ? 36 : 54, letterSpacing: isMobile ? 8 : 14, margin: 0, background: 'linear-gradient(135deg,#e8c96a,#c9a84c,#a07830)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>KOPUTUS</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>{t('ui.start.players')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 52, height: 52, borderRadius: 10, cursor: 'pointer', fontSize: 19, fontWeight: 700, fontFamily: 'Georgia,serif', transition: 'all 0.2s', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim }}>{n}</button>
          ))}
        </div>
      </div>
      <GroupPicker value={playerGroup} onChange={onPlayerGroupChange} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>{t('ui.start.beginGame')}</button>
        <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {t('ui.start.botBattle')}
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}</span>
        </button>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
    </div>
  );

  if (screen === 'gameover' && G && !allBotsRef.current) {
    const sorted = [...G.players].sort((a, b) => pScore(a) - pScore(b));
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>{t('ui.result.title')}</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? C.gold + '55' : '#1a3a22'}` }}>
              <div style={{ fontSize: 24, minWidth: 32, textAlign: 'center' }}>{i === 0 ? '🏆' : i === sorted.length - 1 ? '💀' : '🎯'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: i === 0 ? C.gold : C.text, marginBottom: 6, fontSize: 15 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {p.cards.map((c, ci) => <Card key={ci} card={c} faceUp small />)}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: i === 0 ? C.gold : C.dim }}>{pScore(p)}<span style={{ fontSize: 11, opacity: 0.55 }}> p</span></div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {allBots ? (
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1e9a)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('ui.result.newWatch')}</button>
          ) : (
            <>
              <Btn label={t('ui.result.newGame')} onClick={() => startGame()} color={C.gold} />
              <Btn label={t('ui.start.changePlayers')} onClick={() => setScreen('select')} color={C.gold} outline />
            </>
          )}
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
      </div>
    );
  }

  if (!G) return null;

  const human = G.players[0];
  const ais = allBots ? G.players : G.players.slice(1);
  const discardTop = G.discard[G.discard.length - 1];
  const isHuman = curIdx === 0 && !allBots;

  const ownClickable = () => {
    const nonNull = i => G.players[0].cards[i] !== null;
    if (phase === 'peeking' && peeksDone < 2) return new Set([0, 1, 2, 3].filter(i => !human.known.has(i) && nonNull(i)));
    if (phase === 'drawn' && isHuman) return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'reaction' && reactionOpen) return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'spec_j') return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'spec_q_own') return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'spec_k') return new Set([0, 1, 2, 3].filter(nonNull));
    return null;
  };
  const tgtClickable = pi => (phase === 'spec_q_tgt' || phase === 'spec_k_decide') && pi !== 0 ? new Set([0, 1, 2, 3]) : null;
  const onOwnCard = idx => {
    if (phase === 'peeking') onPeek(idx);
    else if (phase === 'drawn' && isHuman) humanSwap(idx);
    else if (phase === 'reaction' && reactionOpen) humanReact(idx);
    else if (phase === 'spec_j') handleJ(idx);
    else if (phase === 'spec_q_own') handleQOwn(idx);
    else if (phase === 'spec_k') handleKPeek(idx);
  };
  const showDrawn = ['drawn', 'spec_j', 'spec_q_own', 'spec_q_tgt', 'spec_k', 'spec_k_decide', 'spec_k_confirm'].includes(phase);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : 16, maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 40, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />
      <TurnPrompt show={isHuman && !showDrawn} action={t('ui.turn.koputus')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 66 : 72, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>🤜</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>
      {knockedBy !== null && (
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.red + '14', border: `1px solid ${C.red}40`, borderRadius: 10, padding: '4px 14px', fontFamily: 'sans-serif', fontSize: 12, color: C.red, letterSpacing: 0.5 }}>{t('games.koputus.ui.knockedBanner')}</div>
        </div>
      )}
      {ais.length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 6 : 12 }}>
              {ais.map((ai) => {
                const pi = ai.id;
                return (
                  <div key={ai.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === pi ? C.gold + '55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px' }}>
                    <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: curIdx === pi ? C.gold : C.dim }}>
                      🤖 {ai.name.slice(0, 8)}{curIdx === pi ? ' ●' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', flex: 1, paddingTop: 8 }}>
                      {ai.cards.map((c, ci) =>
                        c
                          ? <Card key={ci} card={c} small backStyle={BACKS[cardBack]} faceUp={debugOpen}
                              selected={intention?.playerIdx === pi && intention.slotIdx === ci} />
                          : <div key={ci} style={{ width: isMobile ? 30 : 36, height: isMobile ? 43 : 52, borderRadius: 5, border: '1px dashed rgba(255,255,255,0.1)', opacity: 0.3, flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          : (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: isMobile ? 'nowrap' : 'wrap', marginBottom: isMobile ? 6 : 12 }}>
              {ais.map((ai) => {
                const pi = ai.id;
                return (
                  <div key={ai.id} style={isMobile ? { width: '100%' } : { flex: 1, minWidth: 110 }}>
                    <PlayerGrid player={ai} isActive={curIdx === pi} small={true} backStyle={BACKS[cardBack]}
                      phase={phase} debug={debugOpen} showKnown={showAIKnown}
                      lastSwap={lastSwap?.pIdx === pi ? lastSwap.cIdx : null}
                      clickableSet={tgtClickable(pi)}
                      intentSlot={intention?.playerIdx === pi ? intention.slotIdx : undefined}
                      onCardClick={ci => {
                        if (phase === 'spec_q_tgt') handleQTarget(pi, ci);
                        else if (phase === 'spec_k_decide') handleKPeekTarget(pi, ci);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Pakka-alue */}
      {(() => { const cw = isMobile ? 62 : 82; const ch = isMobile ? 88 : 112; return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 8px' : '14px 16px', background: 'rgba(255,255,255,0.013)', border: '1px solid #1a3a22', borderRadius: 14, marginBottom: isMobile ? 6 : 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.deck')}</div>
          <div onClick={isHuman && phase === 'draw' && G.deck.length ? humanDrawDeck : undefined}
            {...(isHuman && phase === 'draw' && G.deck.length ? { role: 'button', tabIndex: 0, 'aria-label': t('ui.shared.drawDeckAria'), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); humanDrawDeck(); } } } : {})}
            style={{ cursor: isHuman && phase === 'draw' && G.deck.length ? 'pointer' : 'default', position: 'relative', width: cw, height: ch }}>
            {G.deck.length === 0
              ? <div style={{ width: cw, height: ch, borderRadius: 9, border: '1.5px dashed #1a3a22', opacity: 0.3 }} />
              : <>
                {G.deck.length > 2 && <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-5deg) translate(-4px,3px)', transformOrigin: 'bottom center', opacity: 0.55, zIndex: 0 }}>{BACKS[cardBack].render(cw, ch)}</div>}
                {G.deck.length > 1 && <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-2.5deg) translate(-2px,1.5px)', transformOrigin: 'bottom center', opacity: 0.75, zIndex: 1 }}>{BACKS[cardBack].render(cw, ch)}</div>}
                <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, overflow: 'hidden', background: BACKS[cardBack].bg, border: `2px solid ${advice?.target === 'deck' ? C.botMode : isHuman && phase === 'draw' ? C.gold : BACKS[cardBack].border}`, boxShadow: advice?.target === 'deck' ? '0 0 18px rgba(192,132,252,0.65)' : isHuman && phase === 'draw' ? `0 0 18px rgba(201,168,76,0.55)` : '0 2px 8px rgba(0,0,0,0.4)', zIndex: 2 }}>
                  {BACKS[cardBack].render(cw, ch)}
                </div>
              </>}
          </div>
          <div style={{ marginTop: 6 }}>
            <PakkaCount variant="count" count={G.deck.length} flash={pakaAnim} style={{ fontSize: 10, fontFamily: 'sans-serif' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: isMobile ? 52 : 72, flexShrink: 0 }}>
          {reactionOpen
            ? <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, borderRadius: 32, border: `3px solid ${C.red}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${C.red}44`, animation: 'rpulse 1s ease infinite' }}>
              <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.red, lineHeight: 1, fontFamily: 'monospace' }}>{reactionSec}</span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: 'sans-serif', letterSpacing: 1 }}>{t('games.koputus.ui.sec')}</span>
            </div>
            : <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.12 }}>⚡</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.discardLabel')}</div>
          <div onClick={isHuman && phase === 'draw' && discardTop ? humanDrawDiscard : undefined}
            {...(isHuman && phase === 'draw' && discardTop ? { role: 'button', tabIndex: 0, 'aria-label': t('ui.shared.drawDiscardAria'), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); humanDrawDiscard(); } } } : {})}
            style={{ cursor: isHuman && phase === 'draw' && discardTop ? 'pointer' : 'default', position: 'relative', width: cw, height: ch }}>
            {!discardTop
              ? <div style={{ width: cw, height: ch, borderRadius: 9, border: '1.5px dashed #1a3a22', opacity: 0.25 }} />
              : <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: '#f8f2e6', border: `2px solid ${advice?.target === 'discard' ? C.botMode : isHuman && phase === 'draw' ? C.gold : '#aaa'}`, boxShadow: advice?.target === 'discard' ? '0 0 18px rgba(192,132,252,0.65)' : isHuman && phase === 'draw' ? `0 0 18px rgba(201,168,76,0.55)` : '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: SUIT_COLOR[discardTop.s], fontFamily: 'Georgia,serif', textAlign: 'center', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700 }}>{discardTop.r}</div>
                  <div style={{ fontSize: isMobile ? 20 : 26 }}>{discardTop.s}</div>
                </div>
              </div>}
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginTop: 6 }}>{G.discard.length} {t('ui.shared.pcs')}</div>
        </div>
      </div>
      ); })()}

      {!allBots && (
      <div style={{ marginBottom: isMobile ? 6 : 12 }}>
        <PlayerGrid player={human} isActive={isHuman} phase={phase} debug={debugOpen || allBots} backStyle={BACKS[cardBack]}
          clickableSet={ownClickable()} onCardClick={onOwnCard} peekSet={tempPeek}
          adviceSlot={advice?.slot}
          lastSwap={lastSwap?.pIdx === 0 ? lastSwap.cIdx : null} small={isMobile} />
      </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: drawn && showDrawn ? 'rgba(255,255,255,0.022)' : 'transparent', border: `1px solid ${drawn && showDrawn ? '#2a4a32' : 'transparent'}`, borderRadius: 10, marginBottom: isMobile ? 4 : 12, minHeight: isMobile ? 36 : 50, transition: 'background 0.2s' }}>
        {drawn && showDrawn
          ? <><span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flexShrink: 0 }}>{t('games.koputus.ui.drawnLabel')}</span><Card card={drawn} faceUp small /><span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{drawn.r}{drawn.s} — <span style={{ color: C.gold, fontWeight: 700 }}>{drawn.v} p</span></span></>
          : <span style={{ color: 'transparent', userSelect: 'none' }}>·</span>}
      </div>
      {phase === 'spec_k_confirm' && specState?.tgtCard && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}44`, borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, flexShrink: 0 }}>{t('games.koputus.ui.opponentCardLabel')}</span>
          <Card card={specState.tgtCard} faceUp small />
          <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{specState.tgtCard.r}{specState.tgtCard.s} — <span style={{ color: C.gold, fontWeight: 700 }}>{specState.tgtCard.v} p</span></span>
        </div>
      )}

      {/* Bottien taistelu -hallintapalkki */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: isMobile ? 4 : 10, minHeight: isMobile ? 36 : 44, alignItems: 'center' }}>
        {isHuman && phase === 'drawn' && <Btn label={t('games.koputus.ui.discard')} onClick={humanDiscard} color={C.gold} />}
        {isHuman && phase === 'draw' && knockedBy === null && <Btn label={t('games.koputus.ui.knock')} onClick={humanKnock} color={C.red} outline />}
        {isHuman && (phase === 'draw' || phase === 'drawn') && <AdviceButton onClick={askAdvice} />}
        {!allBots && phase === 'spec_q_tgt' && specState && <Btn label={t('games.koputus.ui.skipSwap')} onClick={() => { setSS(null); stopReact.current = false; tm(() => openReaction(gRef.current, drawn, 0), 200); }} color={C.dim} outline />}
        {!allBots && phase === 'spec_k_decide' && specState && <Btn label={t('games.koputus.ui.skipSwap')} onClick={handleKSkip} color={C.dim} outline />}
        {!allBots && phase === 'spec_k_confirm' && <Btn label={t('games.koputus.ui.swapHere')} onClick={handleKSwap} color={C.gold} />}
        {!allBots && phase === 'spec_k_confirm' && <Btn label={t('games.koputus.ui.skipSwap')} onClick={handleKSkip} color={C.dim} outline />}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #1a3a22', alignItems: 'center' }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}><span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('games.koputus.ui.goal')}</span>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'} {t('ui.shared.sound')}</button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'} {t('ui.shared.openCards')}</button>
      </div>

      <div style={{ marginTop: 14, border: '1px solid #1a3a22', borderRadius: 12, overflow: 'hidden' }}>
        <button onClick={() => setLogOpen(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', borderBottom: logOpen ? '1px solid #1a3a22' : 'none', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontSize: 11, fontFamily: 'sans-serif', letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>{t('ui.shared.logTitle')}</span>
          <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div>
            {log.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 14px', borderBottom: '1px solid rgba(42,74,50,0.3)', background: i === 0 ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
                <span style={{ fontSize: 12, color: i === 0 ? '#c0d8c8' : '#8aaa90', fontFamily: 'sans-serif', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: e.m }}></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PendingResult overlay — allBots-tilan loppunäyttö */}
      {pendingResult && screen === 'game' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 26, color: C.botMode, fontFamily: 'Georgia,serif', letterSpacing: 4 }}>{t('ui.result.battleEnded')}</div>
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
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1e9a)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('ui.result.newBattle')}</button>
            <button onClick={() => { setPendingResult(null); setScreen('select'); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('ui.menu.back')}</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rpulse{0%{transform:scale(1);box-shadow:0 0 22px rgba(224,92,59,0.4)}40%{transform:scale(1.13);box-shadow:0 0 32px rgba(224,92,59,0.7)}100%{transform:scale(1);box-shadow:0 0 22px rgba(224,92,59,0.4)}}
        @keyframes slotFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9),0 0 18px rgba(201,168,76,0.6)}60%{box-shadow:0 0 0 2px rgba(201,168,76,0.5),0 0 10px rgba(201,168,76,0.3)}100%{box-shadow:none}}
        @keyframes reactPulse{0%,100%{border-color:#e05c3b;box-shadow:0 0 8px rgba(224,92,59,0.4)}50%{border-color:#ff7a5a;box-shadow:0 0 16px rgba(224,92,59,0.7)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
      `}</style>
    </div>
  );
}
