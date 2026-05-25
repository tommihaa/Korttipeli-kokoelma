import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { isRed, lbl, SUITS, RANKS, VAL, shuffle, aiShouldFumble } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';

const pScore = p => p.cards.reduce((s, c) => s + (c ? c.v : 0), 0);
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames(pool) {
  const a = [...(pool || AI_NAMES)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: VAL[r], id: `${r}${s}_${Math.random()}` }))));
}

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
  peekStart: 'Kortit on jaettu! Kurkkaa kaksi omaa kenttäkorttia — muista ne, sillä ne pysyvät piilossa koko pelin.',
  peekOne:   'Hyvä! Kurkkaa vielä toinen kortti.',
  peekDone:  'Pelaajat katsoivat kaksi korttiaan. Peli voi alkaa.',
  yourTurn:  'Sinun vuorosi — nosta kortti pakasta tai poistopakasta. Voit koputtaa ennen nostoa, jos uskot pisteidesi olevan pienimmät.',
  drawn:     c => `Nostit ${lblColored(c)} (${c.v} p). Vaihda se johonkin pöytäkorteistasi tai heitä poistopakkaan.`,
  drawnD:    c => `Nostit ${lblColored(c)} (${c.v} p) poistopakasta. Vaihda pöytäkorttiin vai heitä takaisin?`,
  swapped:   c => `Vaihdoit — ${lblColored(c)} siirtyi poistopakkaan. Löytyykö keneltäkään samanvahvuista?`,
  discarded: c => `Heitit ${lblColored(c)} poistopakkaan. Löytyykö keneltäkään samanvahvuista?`,
  reactQ:    c => `${lblColored(c)} on poistopakassa — onko sinulla samanvahvuinen pöytäkortti? Klikkaa sitä nopeasti!`,
  reactWin:  () => 'Muistit oikein, pöytäkorttimääräsi vähenee.',
  reactWrong: 'Väärä kortti! Menetät sen poistopakkaan ja nostat kaksi rangaistuskorttia (max 4 pöytäkorttia).',
  reactEnd:  'Reaktioaika umpeutui — kukaan ei reagoinut.',
  jackMsg:   'Jätkä! Saat kurkata yhtä omaa pöytäkorttia — valitse kumpi.',
  queenMsg:  'Kuningatar! Valitse ensin oma korttisi jonka haluat vaihtaa...',
  queenMsg2: 'Hyvä. Valitse nyt kenen tahansa pöytäkortti — ne vaihtavat paikkaa.',
  kingMsg:   'Kuningas! Kurkkaa ensin yksi omistasi — valitse se.',
  knocked:   n => `${n} koputtaa! Peli päättyy kunkin pelattua vuoronsa.`,
  gameOver:  'Peli päättyi! Pienin pistesumma voittaa.',
  aiTurn:    n => `${n} miettii...`,
  aiSwapped: (n, c) => `${n} vaihtoi pöytäkortin — ${lblColored(c)} poistopakkaan.`,
  aiDiscard: (n, c) => `${n} heitti ${lblColored(c)} poistopakkaan.`,
  aiKnock:   n => `${n} koputtaa — luottaa käteensä!`,
  aiReact:   (n, c) => `${n} reagoi lyömällä ${lblColored(c)} — kortti poistuu!`,
  aiWrongReact: n => `${n} reagoi — väärä kortti! Rangaistus.`,
  tipKnock:  (n, est) => `💡 ${n} koputti — arvioitu pistemäärä ≤${est}, pienin kädessä!`,
  tipTakeDiscard: (n, card, old) => `💡 ${n} ottaa ${card} poistopakasta — parempi kuin käden ${old}`,
  tipDrawDeck: n => `💡 ${n} nostaa pakasta — poistopakan kortti ei paranna käsiä`,
  tipSwap:   (n, newC, oldC) => `💡 ${n} vaihtaa ${oldC} → ${newC} — pienentää pistelukua`,
  tipDiscard: (n, c) => `💡 ${n} heittää ${c} — nostamasi kortti ei paranna käsiä`,
};

function PlayerGrid({ player, isActive, clickableSet, onCardClick, peekSet, small, showScore, phase, debug, lastSwap, backStyle, showKnown = true }) {
  return (
    <div style={{ padding: small ? '4px 8px' : 14, borderRadius: 12, transition: 'border-color 0.2s', border: `1px solid ${isActive ? 'rgba(201,168,76,0.3)' : 'rgba(42,74,50,0.4)'}`, background: isActive ? 'rgba(201,168,76,0.03)' : 'transparent', display: small ? 'flex' : 'block', alignItems: small ? 'center' : undefined, gap: small ? 6 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: small ? 4 : 8, marginBottom: small ? 0 : 8, fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, flexShrink: 0 }}>
        <span style={{ fontSize: small ? 12 : 14 }}>{player.isHuman ? '👤' : '🤖'}</span>
        <span style={{ fontWeight: isActive ? 700 : 400, letterSpacing: 0.5 }}>{player.name}</span>
        {isActive && !small && <span style={{ fontSize: 9, animation: 'blink 1.2s ease infinite', opacity: 0.8 }}>● vuoro</span>}
        {showScore && player.isHuman && <span style={{ marginLeft: 'auto', color: '#a0baa8', fontSize: 12 }}>{pScore(player)} p</span>}
        {!small && <span style={{ marginLeft: showScore && player.isHuman ? 6 : 'auto', fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65 }}>KENTTÄ</span>}
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

export default function Koputus({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showPlayHints = true, teachMode = true, showLastPlay = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', showAIKnown = true }) {
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
  const [soundOn, setSoundOn]   = useState(initSoundOn);
  const [logOpen, setLogOpen]   = useState(hints);
  const cardBack = 'ilves';
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [currentMoment, setCurrentMoment] = useState(null);
  const [allBots, setAllBots]   = useState(false);
  const [paused, setPaused]     = useState(false);
  const [aiDelayMs, setAiDelayMs] = useState(2000);
  const [pendingResult, setPendingResult] = useState(null);

  const logRef     = useRef([]);
  const gRef       = useRef(null);
  const knockRef   = useRef(null);
  const prevDeckRef = useRef(null);
  const lrRef    = useRef(null);
  const curRef   = useRef(0);
  const stopReact = useRef(false);
  const reactInt  = useRef(null);
  const aiTmr     = useRef(null);
  const teachRef  = useRef(teachMode);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  const tmrs      = useRef(new Set());
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };
  const allBotsRef = useRef(false);
  const pausedRef  = useRef(false);
  const aiDelayRef = useRef(2000);
  const sndRef     = useRef(initSoundOn);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  function schedAI(fn, base) {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    aiTmr.current = tm(() => {
      if (pausedRef.current) { const w = () => { if (!pausedRef.current) fn(); else tm(w, 300); }; w(); return; }
      fn();
    }, d + Math.random() * 400);
  }

  const setMsg = m => {
    setMsg_(m);
    if (!m) return;
    const entry = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [entry, ...logRef.current].slice(0, 40);
    setLog([...logRef.current]);
  };

  function detectMoment(eventType, context) {
    if (eventType === 'legendary_reaction' && context.isLastCard && Math.random() < 0.003) {
      const moment = {
        type: 'legendary_reaction',
        game: 'Koputus',
        title: '🟠 LEGENDARY! Viimeinen reaktio!',
        description: '1 kortti jäljellä ja osasit lyödä samanarvoisella? Täydellinen ajoitus!',
        timestamp: new Date().toISOString(),
        rarity: 'legendary',
        context,
      };
      setCurrentMoment(moment);
    } else if (eventType === 'epic_knock') {
      const moment = {
        type: 'epic_knock',
        game: 'Koputus',
        title: '⚔️ EPIC! Koputus laukaistaan!',
        description: 'Kopautit — nyt seuraavat kierrokset ovat kireät ja draamallisia!',
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
      setMsg(`💾 Momentti tallennettu: ${feedback.rarity}`);
    }
  }

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { knockRef.current = knockedBy; }, [knockedBy]);
  useEffect(() => { lrRef.current = lastRound; }, [lastRound]);
  useEffect(() => { curRef.current = curIdx; }, [curIdx]);
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); clearInterval(reactInt.current); }, []);
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
      setMsg('🤖 Bottien taistelu alkaa!');
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
        if (si === 0) setMsg(M.yourTurn);
        else { setMsg(M.aiTurn(newG.players[si].name)); aiTmr.current = tm(() => runAI(si, gRef.current), 600); }
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
    if (allBotsRef.current) {
      setPendingResult({ ranking });
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
    detectMoment('epic_knock', { knockedBy: 'Hero' });
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
    if (soundOn) SFX.flip();
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
    setMsg(`Kurkkasit ${lbl(card)} (${card.v} p) — muista se!`);
    tm(() => openReaction(newG, drawn, 0), 2800);
  }
  function handleQOwn(idx) {
    stopReact.current = true; clearInterval(reactInt.current);
    setSS({ type: 'Q', ownIdx: idx }); setPhase('spec_q_tgt');
    setMsg(`Valitsit oman korttisi (paikka ${idx + 1}). Valitse nyt kenen tahansa pöytäkortti jonka kanssa vaihdat — tai paina Ohita.`);
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
    setMsg('Vaihto tehty — kukaan ei nähnyt kortteja!');
    stopReact.current = false;
    tm(() => openReaction(newG, drawn, 0), 800);
  }
  function handleKPeek(idx) {
    stopReact.current = true; clearInterval(reactInt.current);
    const g = gRef.current, card = g.players[0].cards[idx];
    setTP(new Set([idx]));
    const players = g.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p);
    const newG = { ...g, players }; setG(newG); gRef.current = newG;
    setMsg(`Kurkkasit ${lbl(card)} (${card.v} p). Klikkaa vastustajan korttia kurkataksesi sen — tai paina Ohita.`);
    setSS({ type: 'K', ownIdx: idx }); setPhase('spec_k_decide');
  }
  function handleKPeekTarget(pIdx, cIdx) {
    const g = gRef.current, tgtCard = g.players[pIdx].cards[cIdx];
    if (!tgtCard) return;
    setSS(prev => ({ ...prev, tgtPIdx: pIdx, tgtCIdx: cIdx, tgtCard }));
    setPhase('spec_k_confirm');
    setMsg(`Vastustajan kortti on ${lbl(tgtCard)} (${tgtCard.v} p). Vaihdetaanko?`);
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
    setMsg('Vaihto tehty!');
    tm(() => openReaction(newG, drawn, 0), 1200);
  }
  function handleKSkip() {
    setTP(new Set()); setSS(null); stopReact.current = false;
    setMsg('Ohitettu — vuoro jatkuu.');
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
    const level = allBotsRef.current ? 'supernatural' : aiLevelRef.current;
    const missProbability   = level === 'beginner' ? 0.5  : level === 'normal' ? 0.25 : level === 'hard' ? 0.1 : 0.03;
    const wrongReactChance  = level === 'beginner' ? 0.15 : 0;

    gState.players.forEach((p, i) => {
      if (p.isHuman) return;
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
          const players = cur.players.map((pl, pi) => {
            if (pi !== i) return pl;
            const cards = [...pl.cards]; cards[mi] = null;
            const kn = new Set([...pl.known].filter(k => k !== mi));
            return { ...pl, cards, known: kn };
          });
          const newG = { ...cur, players }; setG(newG); gRef.current = newG;
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
            const newG = { ...cur, players }; setG(newG); gRef.current = newG;
            tm(() => advance(newG, byIdx), 900);
          } else {
            // Väärä arvaus — rangaistus
            setMsg(M.aiWrongReact(p.name));
            if (sndRef.current) SFX.reactWrong();
            const afterLoss = [...cur.players[i].cards]; afterLoss[wrongIdx] = null;
            const draws = cur.deck.slice(0, 2); let dIdx = 0;
            const withPenalty = afterLoss.map(c => { if (c === null && dIdx < draws.length) return draws[dIdx++]; return c; });
            const newDeck = cur.deck.slice(2);
            const players = cur.players.map((pl, pi) => {
              if (pi !== i) return pl;
              const kn = new Set([...pl.known].filter(k => k !== wrongIdx));
              return { ...pl, cards: withPenalty, known: kn };
            });
            const newG = { ...cur, players, deck: newDeck, discard: [...cur.discard, wrongCard] };
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
      const players = g.players.map((p, i) => {
        if (i !== 0) return p;
        const cards = [...p.cards]; cards[cardIdx] = null;
        const kn = new Set(p.known); kn.delete(cardIdx);
        return { ...p, cards, known: kn };
      });
      const newG = { ...g, players }; setG(newG); gRef.current = newG;
      if (isLastCard) {
        detectMoment('legendary_reaction', { cardIdx, discardCard: top });
        if (soundOn) SFX.lastCardWin();
        setMsg('Löit viimeisen korttisi — peli päättyy sinulle! Erinomainen!');
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
      const newDeck = g.deck.slice(2);
      const newKn = new Set([...g.players[0].known].filter(k => k !== cardIdx));
      const players = g.players.map((p, i) => i === 0 ? { ...p, cards: withPenalty, known: newKn } : p);
      const newG = { ...g, players, deck: newDeck, discard: [...g.discard, lostCard] };
      setG(newG); gRef.current = newG;
      tm(() => advance(newG, curRef.current), 2200);
    }
  }

  function runAI(playerIdx, gState) {
    if (!gState) gState = gRef.current; if (!gState) return;
    if (curRef.current !== playerIdx) return;
    const p = gState.players[playerIdx];
    if (knockRef.current === null) {
      const ks = [...p.known].reduce((s, i) => s + (p.cards[i]?.v || 0), 0);
      const uk = p.cards.filter(c => c !== null).length - p.known.size;
      const est = ks + uk * 5;
      // Aloittelija koputaa liian aikaisin — ylioptimistinen arvio omasta tilanteesta
      const knockThreshold = aiShouldFumble(allBotsRef.current ? 'supernatural' : aiLevelRef.current) ? 14 : 8;
      if (est <= knockThreshold) {
        setKB(playerIdx); knockRef.current = playerIdx;
        const lr = new Set(gState.players.filter((_, i) => i !== playerIdx).map(pl => pl.id));
        setLR(lr); lrRef.current = lr; setMsg(M.aiKnock(p.name));
      }
    }
    const dt = gState.discard[gState.discard.length - 1];
    const worstKn = [...p.known].filter(i => gState.players[playerIdx].cards[i] !== null)
      .sort((a, b) => gState.players[playerIdx].cards[b].v - gState.players[playerIdx].cards[a].v)[0];
    const drawFromDiscard = dt && worstKn !== undefined && dt.v < p.cards[worstKn].v;
    const thinkMs = allBotsRef.current ? Math.min(aiDelayRef.current * 0.25, 500) : 1600;
    const reactMs = allBotsRef.current ? 400 : 1200;
    tm(() => { setMsg(`${p.name} nostaa kortin ${drawFromDiscard ? 'poistopakasta' : 'nostopakasta'}...`); }, thinkMs);
    schedAI(() => {
      const gNow = gRef.current; if (!gNow) return;
      const pNow = gNow.players[playerIdx];
      const dtNow = gNow.discard[gNow.discard.length - 1];
      const worstKnNow = [...pNow.known].filter(i => gNow.players[playerIdx].cards[i] !== null)
        .sort((a, b) => gNow.players[playerIdx].cards[b].v - gNow.players[playerIdx].cards[a].v)[0];
      const drawFromDiscardNow = dtNow && worstKnNow !== undefined && dtNow.v < pNow.cards[worstKnNow].v;
      let card, deck, discard;
      if (drawFromDiscardNow) {
        card = dtNow; deck = gNow.deck; discard = gNow.discard.slice(0, -1);
      } else {
        if (!gNow.deck.length) { endGame(gNow); return; }
        card = gNow.deck[0]; deck = gNow.deck.slice(1); discard = gNow.discard;
      }
      const wo = [...pNow.known].filter(i => gNow.players[playerIdx].cards[i] !== null)
        .sort((a, b) => pNow.cards[b].v - pNow.cards[a].v)[0];
      if (wo !== undefined && card.v < pNow.cards[wo].v) {
        const old = pNow.cards[wo];
        const players = gNow.players.map((pl, i) => {
          if (i !== playerIdx) return pl;
          const cards = [...pl.cards]; cards[wo] = card;
          return { ...pl, cards, known: new Set([...pl.known, wo]) };
        });
        const updG = { ...gNow, players, deck, discard: [...discard, old] };
        setG(updG); gRef.current = updG; setMsg(M.aiSwapped(p.name, old));
        flashSlot(playerIdx, wo);
        tm(() => openReaction(updG, old, playerIdx), reactMs);
      } else {
        const updG = { ...gNow, deck, discard: [...discard, card] };
        setG(updG); gRef.current = updG; setMsg(M.aiDiscard(p.name, card));
        tm(() => openReaction(updG, card, playerIdx), reactMs);
      }
    }, 3600);
  }

  const Btn = ({ label, onClick, color, outline, small: sm }) => {
    const [h, setH] = useState(false);
    return (
      <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ background: outline ? (h ? color + '18' : 'transparent') : `linear-gradient(135deg,${color},${color}cc)`, border: `1px solid ${outline ? (h ? color : color + '66') : color}`, borderRadius: 9, padding: sm ? '7px 14px' : '10px 20px', color: outline ? (h ? color : color + 'bb') : '#0d2118', fontSize: sm ? 11 : 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.4, transition: 'all 0.15s' }}>
        {label}
      </button>
    );
  };

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, fontFamily: 'Georgia,serif' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>PELAAJIA</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 52, height: 52, borderRadius: 10, cursor: 'pointer', fontSize: 19, fontWeight: 700, fontFamily: 'Georgia,serif', transition: 'all 0.2s', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita peli →</button>
        <button onClick={startBotBattle} style={{ background: 'transparent', border: '1px solid rgba(123,47,190,0.5)', borderRadius: 14, padding: '12px 32px', color: '#c084fc', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 1 }}>🤖 Bottien taistelu</button>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
    </div>
  );

  if (screen === 'gameover' && G) {
    const sorted = [...G.players].sort((a, b) => pScore(a) - pScore(b));
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
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
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1e9a)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi katselutila</button>
          ) : (
            <>
              <Btn label="Uusi peli →" onClick={() => startGame()} color={C.gold} />
              <Btn label="← Vaihda pelaajia" onClick={() => setScreen('select')} color={C.gold} outline />
            </>
          )}
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
      </div>
    );
  }

  if (!G) return null;

  const human = G.players[0];
  const ais = G.players.slice(1);
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
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 66 : 72, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>🤜</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>
      {knockedBy !== null && (
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.red + '14', border: `1px solid ${C.red}40`, borderRadius: 10, padding: '4px 14px', fontFamily: 'sans-serif', fontSize: 12, color: C.red, letterSpacing: 0.5 }}>🤜 Koputettu — viimeinen kierros!</div>
        </div>
      )}
      {ais.length > 0 && (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: isMobile ? 'nowrap' : 'wrap', marginBottom: isMobile ? 6 : 12 }}>
          {ais.map((ai, i) => {
            const pi = i + 1;
            return (
              <div key={ai.id} style={isMobile ? { width: '100%' } : { flex: 1, minWidth: 110 }}>
                <PlayerGrid player={ai} isActive={curIdx === pi} small={true} backStyle={BACKS[cardBack]}
                  phase={phase} debug={debugOpen || allBots} showKnown={showAIKnown}
                  lastSwap={lastSwap?.pIdx === pi ? lastSwap.cIdx : null}
                  clickableSet={tgtClickable(pi)}
                  onCardClick={ci => {
                    if (phase === 'spec_q_tgt') handleQTarget(pi, ci);
                    else if (phase === 'spec_k_decide') handleKPeekTarget(pi, ci);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Pakka-alue */}
      {(() => { const cw = isMobile ? 62 : 82; const ch = isMobile ? 88 : 112; return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 8px' : '14px 16px', background: 'rgba(255,255,255,0.013)', border: '1px solid #1a3a22', borderRadius: 14, marginBottom: isMobile ? 6 : 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>NOSTOPAKKA</div>
          <div onClick={isHuman && phase === 'draw' && G.deck.length ? humanDrawDeck : undefined}
            style={{ cursor: isHuman && phase === 'draw' && G.deck.length ? 'pointer' : 'default', position: 'relative', width: cw, height: ch }}>
            {G.deck.length === 0
              ? <div style={{ width: cw, height: ch, borderRadius: 9, border: '1.5px dashed #1a3a22', opacity: 0.3 }} />
              : <>
                {G.deck.length > 2 && <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-5deg) translate(-4px,3px)', transformOrigin: 'bottom center', opacity: 0.55, zIndex: 0 }}>{BACKS[cardBack].render(cw, ch)}</div>}
                {G.deck.length > 1 && <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-2.5deg) translate(-2px,1.5px)', transformOrigin: 'bottom center', opacity: 0.75, zIndex: 1 }}>{BACKS[cardBack].render(cw, ch)}</div>}
                <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, overflow: 'hidden', background: BACKS[cardBack].bg, border: `2px solid ${isHuman && phase === 'draw' ? C.gold : BACKS[cardBack].border}`, boxShadow: isHuman && phase === 'draw' ? `0 0 18px rgba(201,168,76,0.55)` : '0 2px 8px rgba(0,0,0,0.4)', zIndex: 2 }}>
                  {BACKS[cardBack].render(cw, ch)}
                </div>
              </>}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'sans-serif', marginTop: 6, color: G.deck.length === 0 ? C.red : C.dim, fontWeight: G.deck.length === 0 ? 700 : 400, animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
            {G.deck.length === 0 ? 'TYHJÄ!' : `${G.deck.length} kpl`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: isMobile ? 52 : 72, flexShrink: 0 }}>
          {reactionOpen
            ? <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, borderRadius: 32, border: `3px solid ${C.red}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${C.red}44`, animation: 'rpulse 1s ease infinite' }}>
              <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.red, lineHeight: 1, fontFamily: 'monospace' }}>{reactionSec}</span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: 'sans-serif', letterSpacing: 1 }}>SEK</span>
            </div>
            : <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.12 }}>⚡</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>POISTOPAKKA</div>
          <div onClick={isHuman && phase === 'draw' && discardTop ? humanDrawDiscard : undefined}
            style={{ cursor: isHuman && phase === 'draw' && discardTop ? 'pointer' : 'default', position: 'relative', width: cw, height: ch }}>
            {!discardTop
              ? <div style={{ width: cw, height: ch, borderRadius: 9, border: '1.5px dashed #1a3a22', opacity: 0.25 }} />
              : <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: '#f8f2e6', border: `2px solid ${isHuman && phase === 'draw' ? C.gold : '#aaa'}`, boxShadow: isHuman && phase === 'draw' ? `0 0 18px rgba(201,168,76,0.55)` : '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: SUIT_COLOR[discardTop.s], fontFamily: 'Georgia,serif', textAlign: 'center', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700 }}>{discardTop.r}</div>
                  <div style={{ fontSize: isMobile ? 20 : 26 }}>{discardTop.s}</div>
                </div>
              </div>}
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginTop: 6 }}>{G.discard.length} kpl</div>
        </div>
      </div>
      ); })()}

      <div style={{ marginBottom: isMobile ? 6 : 12 }}>
        <PlayerGrid player={human} isActive={isHuman} phase={phase} debug={debugOpen || allBots} backStyle={BACKS[cardBack]}
          clickableSet={ownClickable()} onCardClick={onOwnCard} peekSet={tempPeek}
          lastSwap={lastSwap?.pIdx === 0 ? lastSwap.cIdx : null} small={isMobile} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: drawn && showDrawn ? 'rgba(255,255,255,0.022)' : 'transparent', border: `1px solid ${drawn && showDrawn ? '#2a4a32' : 'transparent'}`, borderRadius: 10, marginBottom: isMobile ? 4 : 12, minHeight: isMobile ? 36 : 50, transition: 'background 0.2s' }}>
        {drawn && showDrawn
          ? <><span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flexShrink: 0 }}>Nostettu:</span><Card card={drawn} faceUp small /><span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{drawn.r}{drawn.s} — <span style={{ color: C.gold, fontWeight: 700 }}>{drawn.v} p</span></span></>
          : <span style={{ color: 'transparent', userSelect: 'none' }}>·</span>}
      </div>
      {phase === 'spec_k_confirm' && specState?.tgtCard && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}44`, borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, flexShrink: 0 }}>Vastustajan kortti:</span>
          <Card card={specState.tgtCard} faceUp small />
          <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{specState.tgtCard.r}{specState.tgtCard.s} — <span style={{ color: C.gold, fontWeight: 700 }}>{specState.tgtCard.v} p</span></span>
        </div>
      )}

      {/* Bottien taistelu -hallintapalkki */}
      {allBots && (
        <div style={{ background: 'rgba(123,47,190,0.12)', border: '1px solid rgba(123,47,190,0.4)', borderRadius: 12, padding: '8px 14px', marginBottom: isMobile ? 4 : 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#c084fc', letterSpacing: 1 }}>🤖 KATSELUTILA</span>
          <button onClick={togglePause} style={{ background: paused ? 'rgba(192,132,252,0.2)' : 'transparent', border: '1px solid rgba(192,132,252,0.4)', borderRadius: 8, padding: '5px 12px', color: '#c084fc', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>{paused ? '▶ Jatka' : '⏸ Tauko'}</button>
          <input type="range" min={500} max={4000} step={250} value={aiDelayMs} onChange={e => { const v = +e.target.value; setAiDelayMs(v); aiDelayRef.current = v; }} style={{ flex: 1, minWidth: 80, accentColor: '#7B2FBE' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#c084fc' }}>{(aiDelayMs / 1000).toFixed(1)}s</span>
          <button onClick={startBotBattle} style={{ background: 'transparent', border: '1px solid rgba(192,132,252,0.4)', borderRadius: 8, padding: '5px 10px', color: '#c084fc', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>↺</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: isMobile ? 4 : 10, minHeight: isMobile ? 36 : 44, alignItems: 'center' }}>
        {isHuman && phase === 'drawn' && <Btn label="Heitä poistopakkaan ›" onClick={humanDiscard} color={C.gold} />}
        {isHuman && phase === 'draw' && knockedBy === null && <Btn label="🤜 Koputan!" onClick={humanKnock} color={C.red} outline />}
        {!allBots && phase === 'spec_q_tgt' && specState && <Btn label="Ohita — en vaihda" onClick={() => { setSS(null); stopReact.current = false; tm(() => openReaction(gRef.current, drawn, 0), 200); }} color={C.dim} outline />}
        {!allBots && phase === 'spec_k_decide' && specState && <Btn label="Ohita — en vaihda" onClick={handleKSkip} color={C.dim} outline />}
        {!allBots && phase === 'spec_k_confirm' && <Btn label="✓ Vaihda tähän" onClick={handleKSwap} color={C.gold} />}
        {!allBots && phase === 'spec_k_confirm' && <Btn label="Ohita — en vaihda" onClick={handleKSkip} color={C.dim} outline />}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #1a3a22', alignItems: 'center' }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}><span style={{ color: C.gold, fontWeight: 700 }}>Tavoite:</span> pienimmät pisteet kun koputus tai pakka loppuu</span>
        <button onClick={() => setSoundOn(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'} Ääni</button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'} Cheat Mode</button>
      </div>

      <div style={{ marginTop: 14, border: '1px solid #1a3a22', borderRadius: 12, overflow: 'hidden' }}>
        <button onClick={() => setLogOpen(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', borderBottom: logOpen ? '1px solid #1a3a22' : 'none', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontSize: 11, fontFamily: 'sans-serif', letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>TAPAHTUMALOKI</span>
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

      <MomentFeedback
        moment={currentMoment}
        onClose={() => setCurrentMoment(null)}
        onRate={() => {
          setMsg('💾 Momentti tallennettu! Hyvä peli!');
          setCurrentMoment(null);
        }}
      />

      {/* PendingResult overlay — allBots-tilan loppunäyttö */}
      {pendingResult && screen === 'game' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 26, color: '#c084fc', fontFamily: 'Georgia,serif', letterSpacing: 4 }}>🤖 TAISTELU PÄÄTTYI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 380 }}>
            {pendingResult.ranking.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12, background: i === 0 ? 'rgba(123,47,190,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : '🤖'}</span>
                <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 14, color: i === 0 ? '#c084fc' : C.text }}>{p.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: i === 0 ? '#c084fc' : C.dim }}>{p.score}<span style={{ fontSize: 11, opacity: 0.6 }}>p</span></span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1e9a)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi taistelu</button>
            <button onClick={() => { setPendingResult(null); setScreen('select'); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Valikko</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rpulse{0%{transform:scale(1);box-shadow:0 0 22px rgba(224,92,59,0.4)}40%{transform:scale(1.13);box-shadow:0 0 32px rgba(224,92,59,0.7)}100%{transform:scale(1);box-shadow:0 0 22px rgba(224,92,59,0.4)}}
        @keyframes slotFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9),0 0 18px rgba(201,168,76,0.6)}60%{box-shadow:0 0 0 2px rgba(201,168,76,0.5),0 0 10px rgba(201,168,76,0.3)}100%{box-shadow:none}}
        @keyframes reactPulse{0%,100%{border-color:#e05c3b;box-shadow:0 0 8px rgba(224,92,59,0.4)}50%{border-color:#ff7a5a;box-shadow:0 0 16px rgba(224,92,59,0.7)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
        @keyframes pakaFlash{0%{opacity:0.4;letter-spacing:1.5px}12%{opacity:1;letter-spacing:3px;text-shadow:0 0 14px rgba(224,92,59,0.9),0 0 30px rgba(224,92,59,0.5)}40%{opacity:1;letter-spacing:2px;text-shadow:0 0 8px rgba(224,92,59,0.5)}70%{opacity:1;letter-spacing:1.5px;text-shadow:none}100%{opacity:1}}
      `}</style>
    </div>
  );
}
