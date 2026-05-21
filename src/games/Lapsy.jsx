import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { isRed, lbl, SUITS, RANKS, shuffle, aiNoise } from '../shared/helpers.js';
import FanStack from '../shared/FanStack.jsx';
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

const SPEC   = { J: 1, Q: 2, K: 3, A: 4 };
const isSpec = r => r in SPEC;
const kk = n => n === 1 ? 'kortti' : 'korttia';
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, id: `${r}${s}_${Math.random()}` }))));
}
function deal(nPlayers) {
  const deck = newDeck();
  const piles = Array.from({ length: nPlayers }, () => []);
  deck.forEach((c, i) => piles[i % nPlayers].push(c));
  return piles;
}

export default function Lapsy({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showPlayHints = true, teachMode = true, showLastPlay = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal' }) {
  const [screen, setScreen] = useState('select');
  const [nP, setNP]         = useState(playerCount);
  const [soundOn, setSnd]   = useState(initSoundOn);
  const [phase, setPhase]   = useState('idle');
  const [center, setCenter] = useState([]);
  const [piles, setPiles]   = useState([]);
  const [curTurn, setCur]   = useState(0);
  const [challenge, setCh]  = useState(null);
  const [msg, setMsg]       = useState('');
  const [log, setLog]       = useState([]);
  const cardBack = 'ilves';
  const [logOpen, setLO]    = useState(hints);
  const [debugOpen, setDebug] = useState(initSeeAll);
  const [shuffling, setShuffling] = useState(false);
  const [slapResult, setSR]   = useState(null);
  const [bestMs, setBestMs]   = useState(null);
  const [failReveal, setFR]  = useState(null);
  const [flipAnim,  setFA]   = useState(null); // { playerIdx, card }
  const [cardBackState]      = [cardBack];
  const [aiNames]            = useState(() => shuffledAINames(playerNames));
  const [currentMoment, setCurrentMoment] = useState(null);
  const [finishOrder, setFinishOrder] = useState([]); // eliminointijärjestys, ensin poistunut ensin

  const pilesRef       = useRef([]);
  const finishOrderRef = useRef([]);
  const centerRef    = useRef([]);
  const phaseRef     = useRef('idle');
  const curRef       = useRef(0);
  const chRef        = useRef(null);
  const sndRef       = useRef(false);
  const aiLevelRef   = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // AI memory: kortinlaskija (normal) tracks seen ranks; tosilaskija (hard) also tracks collected-card order
  const memoryRef    = useRef({ seenByRank: {}, knownBottoms: {} });
  const predMatchRef = useRef(false); // tosilaskija: true when the next flip was predicted
  const aiTmr        = useRef(null);
  const matchTimeRef = useRef(null);
  const recentMatch  = useRef(false);
  const aiSlapTmrs   = useRef([]);
  const failTmr      = useRef(null);
  const logRef       = useRef([]);
  const tmrs         = useRef(new Set());
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };

  useEffect(() => { pilesRef.current = piles; }, [piles]);
  useEffect(() => { centerRef.current = center; }, [center]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { curRef.current = curTurn; }, [curTurn]);
  useEffect(() => { chRef.current = challenge; }, [challenge]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); clearTimeout(failTmr.current); aiSlapTmrs.current.forEach(clearTimeout); }, []);

  const addLog = useCallback(m => {
    const entry = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [entry, ...logRef.current].slice(0, 50);
    setLog([...logRef.current]);
    setMsg(m);
  }, []);

  const detectMoment = useCallback((eventType, context) => {
    if (eventType === 'epic_fast_slap' && context.ms && context.ms < 400) {
      if (hints) addLog(`💾 Momentti: ${context.ms}ms — salamannopea reaktio!`);
    }
  }, [hints]);

  const pName = i => i === 0 ? 'Hero' : aiNames[i - 1];

  const M = {
    gameStart: 'Peli alkaa! Jokainen kääntää vuorollaan pinonsa päällimmäisen kortin.',
    winChallengeNoRival: (winner, target) => `${winner} voitti kasan — ${target}:lla ei kortteja!`,
    respondedSpecialNoRival: (player, card) => `${player} vastasi ${card}! Ei enää vastustajia — voittaa kasan!`,
    respondedSpecial: (player, card, target, count, cardStr) => `${player} vastasi haasteeseen ${card}! Haaste siirtyy — Pelaajalla ${target} on ${count} ${cardStr} aikaa vastata haasteeseen.`,
    failedResponse: (player, winner, count, cardStr) => `${player} epäonnistui. ${winner} voitti ${count} ${cardStr}.`,
    noResponse: (player, left, cardStr) => `${player} — ${left} ${cardStr} jäljellä vastata haasteeseen.`,
    challengedNoRival: (player, card) => `${player} haastaa ${card}! Ei enää vastustajia — voittaa kasan!`,
    challenged: (player, card, target, count, cardStr) => `${player} haastaa ${card}! Pelaajalla ${target} on ${count} ${cardStr} aikaa vastata haasteeseen.`,
    flipped: (player, card) => `${player} kääntää ${card}.`,
    match: (rank) => `TÄSMÄYS! ${rank} — kuka läpsää ensin?`,
    wrongSlap: (player) => `${player} läpsäsi väärin — menettää päällimmäisen!`,
    correctSlap: (player, ms, count) => {
      const msStr = ms ? ` (${ms} ms)` : '';
      return `${player} läpsäsi nopeiten${msStr} — voitti ${count} korttia!`;
    },
    heroTooSlow: 'Hero oli hieman hitaampi — ei rangaistusta.',
    heroSlapNoMatch: 'Hero läpsäsi — mutta ei täsmäystä! Menettää päällimmäisen kortin.',
    gameOver: (playerName) => playerName ? `${playerName === 'Hero' ? 'Veit voiton' : playerName + ' vei voiton'}! 🏆🎉` : 'Peli päättyi!',
  };

  useLayoutEffect(() => { startGame(); }, []);

  function startGame() {
    clearTimeout(aiTmr.current);
    aiSlapTmrs.current.forEach(clearTimeout);
    clearTimeout(failTmr.current); setFR(null);
    const initPiles = deal(nP);
    setPiles(initPiles); pilesRef.current = initPiles;
    setCenter([]); centerRef.current = [];
    setCur(0); curRef.current = 0;
    setPhase('idle'); phaseRef.current = 'idle';
    setCh(null); chRef.current = null;
    setSR(null);
    finishOrderRef.current = []; setFinishOrder([]);
    logRef.current = []; setLog([]);
    memoryRef.current = { seenByRank: {}, knownBottoms: {} };
    predMatchRef.current = false;
    addLog(M.gameStart);
    setScreen('game');
    setShuffling(true);
    tm(() => maybeAIFlip(0, initPiles, [], null), 2300);
  }

  function nextTurn(fromIdx, newPiles, newCenter, ch) {
    const activeNow = newPiles.filter(p => p.length > 0);
    if (activeNow.length <= 1) {
      const winnerIdx = newPiles.findIndex(p => p.length > 0);
      if (newCenter.length > 0 && winnerIdx >= 0) {
        giveCenter(winnerIdx, newPiles, newCenter);
      } else {
        checkGameOver(newPiles);
      }
      return;
    }
    if (ch) {
      const target = ch.targetIdx;
      if (newPiles[target].length === 0) {
        addLog(M.winChallengeNoRival(pName(ch.byIdx), pName(target)));
        giveCenter(ch.byIdx, newPiles, newCenter, null);
        return;
      }
      setCur(target); curRef.current = target;
      tm(() => maybeAIFlip(target, newPiles, newCenter, ch), 100 + Math.random() * 80);
      return;
    }
    const n = newPiles.length;
    let next = (fromIdx + 1) % n, tries = 0;
    while (newPiles[next].length === 0 && tries < n) { next = (next + 1) % n; tries++; }
    if (tries >= n) { checkGameOver(newPiles); return; }
    setCur(next); curRef.current = next;
    tm(() => maybeAIFlip(next, newPiles, newCenter, null), 500);
  }

  function maybeAIFlip(idx, piles, center, ch) {
    if (phaseRef.current === 'gameover') return;
    if (idx === 0) return;
    if (piles[idx].length === 0) { nextTurn(idx, piles, center, chRef.current); return; }
    const delay = ch ? 1000 : 800 + Math.random() * 100;
    tm(() => doFlip(idx, piles, center), delay);
  }

  function doFlip(playerIdx, curPiles, curCenter) {
    if (phaseRef.current === 'gameover') return;
    const pile = [...curPiles[playerIdx]];
    if (pile.length === 0) { nextTurn(playerIdx, curPiles, curCenter, chRef.current); return; }
    const card = pile.shift();
    const newCenter = [card, ...curCenter];
    const newPiles = curPiles.map((p, i) => i === playerIdx ? pile : p);
    if (sndRef.current) SFX.flip();
    setFA({ playerIdx, card });
    tm(() => setFA(null), 1900);
    setPiles(newPiles); pilesRef.current = newPiles;
    setCenter(newCenter); centerRef.current = newCenter;

    // AI memory update
    const level = aiLevelRef.current;
    if (level === 'normal' || level === 'hard') {
      const mem = memoryRef.current;
      mem.seenByRank[card.r] = (mem.seenByRank[card.r] || 0) + 1;
      if (level === 'hard') {
        const kb = mem.knownBottoms[playerIdx];
        if (kb) {
          if (kb.totalAbove > 0) {
            kb.totalAbove--;           // burned one unknown card from above the known section
          } else if (kb.cards.length > 0) {
            const predictedCard = kb.cards.shift(); // consume the predicted card
            // If this predicted card matches the current top → we foresaw this exact match
            if (curCenter.length > 0 && predictedCard.r === curCenter[0].r) {
              predMatchRef.current = true;
            }
          }
        }
      }
    }

    if (curCenter.length > 0 && curCenter[0].r === card.r) {
      handleMatch(newPiles, newCenter, playerIdx); return;
    }
    const ch = chRef.current;
    if (ch) {
      if (isSpec(card.r)) {
        if (sndRef.current) SFX.challenge();
        const nn = newPiles.length;
        let target2 = (playerIdx + 1) % nn, t2 = 0;
        while ((newPiles[target2].length === 0 || target2 === playerIdx) && t2 < nn) { target2 = (target2 + 1) % nn; t2++; }
        if (t2 >= nn || target2 === playerIdx) {
          addLog(M.respondedSpecialNoRival(pName(playerIdx), lblColored(card)));
          giveCenter(playerIdx, newPiles, newCenter, null); return;
        }
        const newCh = { byIdx: playerIdx, targetIdx: target2, cardsLeft: SPEC[card.r], specRank: card.r };
        setCh(newCh); chRef.current = newCh;
        const count = SPEC[card.r];
        const cardStr = count === 1 ? 'kortti' : 'korttia';
        addLog(M.respondedSpecial(pName(playerIdx), lblColored(card), pName(target2), count, cardStr));
        nextTurn(playerIdx, newPiles, newCenter, newCh);
      } else {
        const left = ch.cardsLeft - 1;
        if (left <= 0) {
          const cardStr = newCenter.length === 1 ? 'kortti' : 'korttia';
          addLog(M.failedResponse(pName(playerIdx), pName(ch.byIdx), newCenter.length, cardStr));
          setCh(null); chRef.current = null;
          setFR({ card, winner: ch.byIdx, n: newCenter.length });
          clearTimeout(failTmr.current);
          failTmr.current = tm(() => { setFR(null); giveCenter(ch.byIdx, newPiles, newCenter, null); }, 1600);
        } else {
          const newCh = { ...ch, cardsLeft: left };
          setCh(newCh); chRef.current = newCh;
          const cardStr = left === 1 ? 'kortti' : 'korttia';
          addLog(M.noResponse(pName(playerIdx), left, cardStr));
          nextTurn(playerIdx, newPiles, newCenter, newCh);
        }
      }
      return;
    }
    if (isSpec(card.r)) {
      if (sndRef.current) SFX.challenge();
      const n = newPiles.length;
      let target = (playerIdx + 1) % n, t = 0;
      while ((newPiles[target].length === 0 || target === playerIdx) && t < n) { target = (target + 1) % n; t++; }
      if (t >= n || target === playerIdx) {
        addLog(M.challengedNoRival(pName(playerIdx), lblColored(card)));
        giveCenter(playerIdx, newPiles, newCenter, null); return;
      }
      const newCh = { byIdx: playerIdx, targetIdx: target, cardsLeft: SPEC[card.r], specRank: card.r };
      setCh(newCh); chRef.current = newCh;
      const count2 = SPEC[card.r];
      const cardStr2 = count2 === 1 ? 'kortti' : 'korttia';
      addLog(M.challenged(pName(playerIdx), lblColored(card), pName(target), count2, cardStr2));
      nextTurn(playerIdx, newPiles, newCenter, newCh);
      return;
    }
    addLog(M.flipped(pName(playerIdx), lblColored(card)));
    nextTurn(playerIdx, newPiles, newCenter, null);
  }

  function handleMatch(piles, center, flippedBy) {
    setPhase('match'); phaseRef.current = 'match';
    setCh(null); chRef.current = null;
    matchTimeRef.current = performance.now();
    addLog(M.match(center[0].r));

    const matchRank = center[0].r;
    const level = aiLevelRef.current;
    const mem = memoryRef.current;

    // Kortinlaskija (normal + hard): anticipation from how many of this rank were seen BEFORE
    // seenByRank already includes both matching cards → subtract 2 for prior sightings
    const prevSeen = (level === 'normal' || level === 'hard')
      ? Math.max(0, (mem.seenByRank[matchRank] || 0) - 2)
      : 0;
    const anticipation = Math.min(prevSeen / 2, 1.0); // 0.0 → 0.5 → 1.0

    // Tosilaskija (hard): additional bonus if the exact card was predicted from known pile order
    const predicted = level === 'hard' && predMatchRef.current;
    predMatchRef.current = false; // consume

    aiSlapTmrs.current.forEach(clearTimeout);
    aiSlapTmrs.current = piles.map((pile, i) => {
      if (i === 0 || pile.length === 0) return null;
      const noise = aiNoise(level);
      const minDelay = 150 + noise * 1200;   // beginner: 750ms, normal: 330ms, hard: 150ms
      const spread   = 600 + noise * 2000;   // beginner: 1600, normal: 900, hard: 600
      // Memory shortens the minimum reaction time: up to 300ms for counting, 200ms for prediction
      const anticipationBonus = anticipation * 300;
      const predictBonus      = predicted ? 200 : 0;
      const effectiveMin = Math.max(60, minDelay - anticipationBonus - predictBonus);
      const delay = effectiveMin + Math.random() * spread;
      return tm(() => {
        if (phaseRef.current !== 'match') return;
        const ms = Math.round(performance.now() - matchTimeRef.current);
        doSlap(i, pilesRef.current, centerRef.current, ms);
      }, delay);
    }).filter(Boolean);
  }

  function doSlap(playerIdx, curPiles, curCenter, ms) {
    if (phaseRef.current !== 'match') return;
    setPhase('idle'); phaseRef.current = 'idle';
    aiSlapTmrs.current.forEach(clearTimeout);
    if (curCenter.length < 2 || curCenter[0].r !== curCenter[1].r) {
      if (sndRef.current) SFX.wrongSlap();
      addLog(M.wrongSlap(pName(playerIdx)));
      if (curPiles[playerIdx].length === 0) { nextTurn(playerIdx, curPiles, curCenter, chRef.current); return; }
      const lostCard = curPiles[playerIdx][0];
      const newPiles = curPiles.map((p, i) => i === playerIdx ? p.slice(1) : p);
      const newCenter = [lostCard, ...curCenter];
      setPiles(newPiles); pilesRef.current = newPiles;
      setCenter(newCenter); centerRef.current = newCenter;
      nextTurn(playerIdx, newPiles, newCenter, chRef.current);
      return;
    }
    if (sndRef.current) { SFX.slap(); tm(() => SFX.winPile(), 200); }
    const n = curCenter.length;
    addLog(M.correctSlap(pName(playerIdx), ms, n));
    if (playerIdx === 0 && ms) {
      setBestMs(prev => prev === null || ms < prev ? ms : prev);
      if (ms < 400) detectMoment('epic_fast_slap', { ms });
    }
    setSR({ winner: playerIdx, ms, n }); tm(() => setSR(null), 2000);
    giveCenter(playerIdx, curPiles, curCenter, ms);
  }

  function humanSlap() {
    if (phaseRef.current !== 'match') {
      if (recentMatch.current) { return; }
      if (sndRef.current) SFX.wrongSlap();
      addLog(M.heroSlapNoMatch);
      if (pilesRef.current[0].length === 0) return;
      setPhase('idle'); phaseRef.current = 'idle';
      const lostCard = pilesRef.current[0][0];
      const newPiles = pilesRef.current.map((p, i) => i === 0 ? p.slice(1) : p);
      const newCenter = [lostCard, ...centerRef.current];
      setPiles(newPiles); pilesRef.current = newPiles;
      setCenter(newCenter); centerRef.current = newCenter;
      return;
    }
    const ms = Math.round(performance.now() - matchTimeRef.current);
    doSlap(0, pilesRef.current, centerRef.current, ms);
  }

  function humanFlip() {
    if (curRef.current !== 0 || phaseRef.current !== 'idle') return;
    if (pilesRef.current[0].length === 0) return;
    doFlip(0, pilesRef.current, centerRef.current);
  }

  function recordEliminated(newPiles) {
    const alreadyOut = finishOrderRef.current;
    const newlyOut = newPiles
      .map((p, i) => i)
      .filter(i => newPiles[i].length === 0 && !alreadyOut.includes(i));
    if (newlyOut.length > 0) {
      const updated = [...alreadyOut, ...newlyOut];
      finishOrderRef.current = updated;
      setFinishOrder(updated);
    }
  }

  function giveCenter(winnerIdx, curPiles, curCenter) {
    recentMatch.current = true;
    tm(() => { recentMatch.current = false; }, 800);
    const newPiles = curPiles.map((p, i) => i === winnerIdx ? [...p, ...[...curCenter].reverse()] : p);

    // Tosilaskija: memorise the order of cards now at the bottom of the winner's pile
    if (aiLevelRef.current === 'hard') {
      const mem = memoryRef.current;
      // Cards go to bottom in reversed center order — same as [...curCenter].reverse()
      mem.knownBottoms[winnerIdx] = {
        cards: [...curCenter].reverse(), // first element = first card to come up from known section
        totalAbove: curPiles[winnerIdx].length, // unknown cards sitting above the new known section
      };
    }

    recordEliminated(newPiles);
    setPiles(newPiles); pilesRef.current = newPiles;
    setCenter([]); centerRef.current = [];
    setCh(null); chRef.current = null;
    setPhase('idle'); phaseRef.current = 'idle';
    if (checkGameOver(newPiles)) return;
    setCur(winnerIdx); curRef.current = winnerIdx;
    tm(() => maybeAIFlip(winnerIdx, newPiles, [], null), 800);
  }

  function checkGameOver(piles) {
    const active = piles.filter(p => p.length > 0);
    if (active.length <= 1) {
      setPhase('gameover'); phaseRef.current = 'gameover';
      const winner = piles.findIndex(p => p.length > 0);
      addLog(M.gameOver(winner >= 0 ? pName(winner) : null));
      const eliminated = finishOrderRef.current;
      const fullOrder  = winner >= 0
        ? [winner, ...[...eliminated].reverse()]
        : [...eliminated].reverse();
      const ranking = fullOrder.map((idx, pos) => ({
        name: pName(idx), place: pos + 1, isHuman: idx === 0,
      }));
      tm(() => onResult?.({ ranking }), 1800);
      return true;
    }
    return false;
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LÄPSY</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8, marginBottom: 6 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>PELAAJIA</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.red : C.panelBorder}`, background: nP === n ? C.red + '18' : 'transparent', color: nP === n ? C.red : C.dim, transition: 'all 0.2s' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Pelitapa</span><br />
        Kortit jaetaan tasan. Pelaajat kääntävät vuorotellen pinonsa päällimmäisen pöydälle kasaan, mutta sitten voi tapahtua kaksi asiaa.<br /><br />
        <strong style={{ fontSize: 11 }}>1. Täsmäys:</strong> Kaksi päällimmäistä korttia oli samanarvoisia → nopein läpsääjä voittaa kasan.<br /><br />
        <strong style={{ fontSize: 11 }}>2. Erityiskortit (J, Q, K, A):</strong> Puolustajalla on 1–4 mahdollisuutta vetää erityiskortti. Jos epäonnistuu → haastaja voittaa. Jos onnistuu → haastaa seuraavan. Voi sattua myös täsmäys → nopein voittaa.<br /><br />
        <strong style={{ fontSize: 11, color: C.gold }}>Voittaja:</strong> Se pelaaja, jolla on kortit kun muilla ei ole.
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={startGame} style={{ background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
      </div>
    </div>
  );

  if (screen === 'gameover') {
    const winnerIdx = piles.findIndex(p => p.length > 0);
    // Rakenna sijoituslista: voittaja ensin, sitten eliminointijärjestys käänteisesti
    const ranked = [
      winnerIdx >= 0 ? winnerIdx : null,
      ...[...finishOrder].reverse(),
    ].filter(i => i !== null);
    const medals = ['🥇', '🥈', '🥉', '4️⃣'];

    return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 380 }}>
        {ranked.map((playerIdx, rank) => {
          const isWinner = rank === 0;
          const p = piles[playerIdx];
          return (
            <div key={playerIdx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: isWinner ? C.gold + '14' : 'rgba(255,255,255,0.04)', border: `1px solid ${isWinner ? C.gold + '55' : C.panelBorder}` }}>
              <span style={{ fontSize: 20, minWidth: 28 }}>{medals[rank] || '💀'}</span>
              <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: isWinner ? C.gold : C.dim }}>{pName(playerIdx)}</span>
              {isWinner
                ? <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.gold, fontWeight: 700 }}>VOITTO — {p.length} korttia</span>
                : <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim }}>sija {rank + 1}</span>
              }
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.red},#8a1500)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
        <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.red}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
      </div>
    </div>
  );
  }

  if (!piles.length) return null;

  const top2 = center.slice(0, 2);
  const isMatch = top2.length === 2 && top2[0].r === top2[1].r;
  const humanPile = piles[0] || [];
  const humanTurn = curTurn === 0 && phase === 'idle' && humanPile.length > 0;
  const ch = challenge;

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 520, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, height: isMobile ? 44 : 60, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>👋</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 6 : 12, flexWrap: 'wrap' }}>
        {piles.slice(1).map((pile, i) => {
          const pi = i + 1;
          return (
            <div key={pi} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.04)', border: `1px solid ${curTurn === pi ? C.red + '55' : C.panelBorder}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center', transition: 'border-color 0.2s' }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: curTurn === pi ? C.red : C.dim, marginBottom: 5 }}>
                🤖 {pName(pi)}{curTurn === pi ? ' ●' : ''}
              </div>
              <div style={{ margin: '0 auto' }}>
                {debugOpen
                  ? <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {pile.slice(0, 6).map((c, ci) => <Card key={ci} card={c} small backStyle={BACKS[cardBack]} />)}
                      {pile.length > 6 && <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, alignSelf: 'center' }}>+{pile.length - 6}</span>}
                    </div>
                  : <FanStack
                      count={pile.length}
                      w={44} h={60}
                      backStyle={BACKS[cardBack]}
                      borderColor={curTurn === pi ? C.red + '88' : undefined}
                    />}
              </div>
              <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, marginTop: 5 }}>{pile.length} {pile.length === 1 ? 'kortti' : 'korttia'}</div>
            </div>
          );
        })}
      </div>

      <div style={{ height: isMobile ? 28 : 36, marginBottom: isMobile ? 4 : 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {bestMs !== null && (
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.gold, opacity: 0.7, letterSpacing: 1 }}>
            ⚡ paras {bestMs} ms
          </div>
        )}
        {ch && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 14px', background: C.gold + '14', border: `1px solid ${C.gold}55`, borderRadius: 20 }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold }}>Haaste: {pName(ch.byIdx)}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: C.gold }}>{ch.cardsLeft}</span>
          </div>
        )}
      </div>

      <div style={{ height: isMobile ? 34 : 46, marginBottom: isMobile ? 4 : 10 }}>
        {failReveal && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(224,92,59,0.08)', border: `1px solid ${C.red}44`, borderRadius: 10, animation: 'fadeIn 0.25s ease' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.red, flexShrink: 0 }}>{pName(failReveal.winner)} voitti haasteen! {pName(failReveal.winner)} voitti {failReveal.n} {kk(failReveal.n)}.</span>
            <span style={{ background: '#f8f2e6', borderRadius: 5, padding: '2px 8px', fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 16, color: SUIT_COLOR[failReveal.card.s] }}>{failReveal.card.r}{failReveal.card.s}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 16 : 28, marginBottom: isMobile ? 8 : 16, padding: isMobile ? '6px 0' : '14px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 8, letterSpacing: 1.5 }}>KASA — {center.length} kpl</div>
          <div style={{ position: 'relative', width: 82, height: 130, margin: '0 auto' }}>
            {/* Flippaaja-animaatio */}
            {flipAnim && (
              <div key={flipAnim.card.id} style={{
                position: 'absolute',
                left: '50%',
                top: flipAnim.playerIdx === 0 ? 'auto' : '-44px',
                bottom: flipAnim.playerIdx === 0 ? '-44px' : 'auto',
                transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(13,22,18,0.95)',
                border: `1px solid ${C.panelBorder}`,
                borderRadius: 16, padding: '3px 9px',
                whiteSpace: 'nowrap', zIndex: 30,
                animation: flipAnim.playerIdx === 0 ? 'flipFromBottom 1.9s ease forwards' : 'flipFromTop 1.9s ease forwards',
                pointerEvents: 'none',
              }}>
                <span style={{
                  background: '#f8f2e6', borderRadius: 4, padding: '1px 4px',
                  fontSize: 11, fontWeight: 700, lineHeight: 1.3,
                  color: SUIT_COLOR[flipAnim.card.s],
                }}>
                  {flipAnim.card.r}{flipAnim.card.s}
                </span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>
                  {flipAnim.playerIdx === 0 ? 'Hero' : aiNames[flipAnim.playerIdx - 1]}
                </span>
              </div>
            )}
            {center.length > 2 && <div style={{ position: 'absolute', top: 0, left: 0, width: 82, height: 112, borderRadius: 9, background: '#f0eadc', border: '1px solid #ccc', transform: 'rotate(-5deg)', transformOrigin: 'bottom center', zIndex: 0 }} />}
            {top2.length > 1 && (
              <div style={{ position: 'absolute', top: 18, left: 2, width: 82, height: 112, borderRadius: 9, background: C.card, border: `2px solid ${isMatch ? C.red + 'bb' : '#bbb'}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, zIndex: 1 }}>
                <div style={{ textAlign: 'center', color: SUIT_COLOR[top2[1].s], fontFamily: 'Georgia,serif', lineHeight: 1, opacity: 0.7 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{top2[1].r}</div>
                  <div style={{ fontSize: 18 }}>{top2[1].s}</div>
                </div>
              </div>
            )}
            {center.length > 0
              ? <div style={{ position: 'absolute', top: 0, left: 0, width: 82, height: 112, borderRadius: 9, background: C.card, border: `2px solid ${isMatch ? C.red : '#aaa'}`, boxShadow: isMatch ? `0 0 22px ${C.red}88` : '0 2px 8px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, animation: isMatch ? 'cardMatch 0.4s ease infinite' : 'none' }}>
                <div style={{ textAlign: 'center', color: SUIT_COLOR[center[0].s], fontFamily: 'Georgia,serif', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{center[0].r}</div>
                  <div style={{ fontSize: 28 }}>{center[0].s}</div>
                </div>
              </div>
              : <div style={{ position: 'absolute', top: 0, left: 0, width: 82, height: 112, borderRadius: 9, border: `1.5px dashed ${C.panelBorder}`, opacity: 0.4, zIndex: 2 }} />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <button onClick={humanSlap} style={{ width: isMobile ? 110 : 108, height: isMobile ? 110 : 108, borderRadius: isMobile ? 55 : 54, background: isMatch ? `radial-gradient(circle at 40% 35%,${C.red}dd,#7a1500)` : `radial-gradient(circle at 40% 35%,#2a4a32,#0d2118)`, border: `3px solid ${isMatch ? C.red : C.panelBorder}`, color: isMatch ? C.text : C.dim, fontSize: isMobile ? 24 : 32, cursor: 'pointer', boxShadow: isMatch ? `0 0 32px ${C.red}88` : '0 4px 14px rgba(0,0,0,0.4)', transition: 'all 0.15s', animation: isMatch ? 'slapPulse 0.7s ease infinite' : 'none' }}>👋</button>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: isMatch ? C.red : C.dim, letterSpacing: 1.5, fontWeight: isMatch ? 700 : 400 }}>{isMatch ? 'LÄPSÄÄ!' : 'läpsää'}</span>
        </div>
      </div>

      <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? 4 : 8 }}>
        {slapResult && (
          <div style={{ padding: '4px 16px', background: '#4caf7d22', border: `1px solid #4caf7d66`, borderRadius: 20, fontFamily: 'sans-serif', fontSize: 12, color: '#88cc88' }}>
            {`${pName(slapResult.winner)} läpsäsi nopeiten${slapResult.ms ? ` (${slapResult.ms} ms)` : ''} — voitti ${slapResult.n || ''} korttia!`}
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: `2px solid ${humanTurn ? C.red + '66' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: humanTurn ? C.red : C.dim, marginBottom: 6 }}>👤 Hero{curTurn === 0 ? ' ●' : ''}</div>
          <div>
            <FanStack
              count={humanPile.length}
              w={60} h={82}
              backStyle={BACKS[cardBack]}
              borderColor={humanTurn ? C.red + '88' : undefined}
            />
          </div>
          <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, marginTop: 5 }}>{humanPile.length} {humanPile.length === 1 ? 'kortti' : 'korttia'}</div>
        </div>
        <button onClick={humanFlip} disabled={!humanTurn} style={{ padding: '12px 22px', borderRadius: 10, border: `1px solid ${humanTurn ? C.red : C.dim + '44'}`, background: humanTurn ? `linear-gradient(135deg,${C.red},#8a1500)` : 'transparent', color: humanTurn ? C.text : C.dim + '66', fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, cursor: humanTurn ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>Käännä →</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}><span style={{ color: C.gold, fontWeight: 700 }}>Tavoite:</span> voita kaikki kortit — viimeinen pelissä voittaa</span>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.red + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.red : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'} Ääni</button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.red + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.red : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'} Cheat Mode</button>
      </div>

      <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>TAPAHTUMALOKI</span>
          <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div>
            {log.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 14px', borderTop: '1px solid rgba(42,26,26,0.5)', background: i === 0 ? 'rgba(200,50,30,0.04)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
                <span style={{ fontSize: 12, color: i === 0 ? '#dd9988' : C.dim, fontFamily: 'sans-serif', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: e.m }}></span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes slapPulse{0%,100%{box-shadow:0 0 32px ${C.red}88}50%{box-shadow:0 0 52px ${C.red}cc}}
        @keyframes cardMatch{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes flipFromTop{
          0%{opacity:0;transform:translateX(-50%) translateY(-10px)}
          18%{opacity:1;transform:translateX(-50%) translateY(0)}
          72%{opacity:1;transform:translateX(-50%) translateY(0)}
          100%{opacity:0;transform:translateX(-50%) translateY(-6px)}
        }
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flipFromBottom{
          0%{opacity:0;transform:translateX(-50%) translateY(10px)}
          18%{opacity:1;transform:translateX(-50%) translateY(0)}
          72%{opacity:1;transform:translateX(-50%) translateY(0)}
          100%{opacity:0;transform:translateX(-50%) translateY(6px)}
        }
        button:active{transform:scale(0.96)}
      `}</style>

      <MomentFeedback
        moment={currentMoment}
        onClose={() => setCurrentMoment(null)}
        onRate={() => {
          addLog('💾 Momentti tallennettu! Loistava reaktio!');
          setCurrentMoment(null);
        }}
      />
    </div>
  );
}
