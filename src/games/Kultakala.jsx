import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { isRed, lbl, shuffle, aiShouldFumble, truncName, newDeck } from '../shared/helpers.js';
import FanStack from '../shared/FanStack.jsx';
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


// Värilliset kortit lokeissa
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

const M = {
  gameStart: 'Kortit on jaettu. Jokaisella on tuntematon kortti ja viisi kenttäkorttia. Aloita klikkaamalla nostopakkaa. Myöhemmillä kierroksilla voit nostaa myös poistopakasta.',
  deckEmpty: 'Nostopakka ehtyi — paljastetaan tuntemattomat!',
  yourTurn: 'Vuorossa Hero. Nosta nostopakasta tai poistopakasta.',
  aiThinking: p => `Vuorossa ${p.name}.`,
  aiDrawDiscard: p => `${p.name} nostaa poistopakasta.`,
  aiDrawDeck: p => `${p.name} nostaa nostopakasta.`,
  aiSwapRow: (p, idx, newCard, oldCard) => `${p.name} vaihtaa: paikka ${idx + 1}: ${lblColored(newCard)} (${newCard.v} p) sisään, ${lblColored(oldCard)} poistopakkaan.`,
  aiDiscard: (p, c) => `${p.name} heittää ${lblColored(c)} poistopakkaan.`,
  aiCannotForceSwap: (p, c, reason) => `${p.name} ei voi vaihtaa ${lblColored(c)} pakosta: ${reason}`,
  humanDrawDiscard: (c, v) => `Nostit ${lblColored(c)} (${v} p) poistopakasta — pakollinen vaihto. Klikkaa kenttäkorttia.`,
  humanDrawDeck: (c, v) => `Nostit ${lblColored(c)} (${v} p). Jos haluat sen kenttäkorteihisi, niin Vaihda se tai Heitä poistopakkaan.`,
  humanSwappedEnd: (idx, c, v, oldName) => `Paikka ${idx + 1}: ${lblColored(c)} (${v} p) sisään, ${oldName} poistopakkaan.`,
  humanSwappedContinue: (idx, c, v, oldName) => `Paikka ${idx + 1}: ${lblColored(c)} (${v} p) sisään, ${oldName} käteen.`,
  humanDiscard: (c) => `Heitit ${lblColored(c)} poistopakkaan. Vuoro ohi.`,
  gameOverScores: (scores) => `Tuntemattomat paljastetaan! ${scores.map(s => `${s.name}: ${s.total} p`).join(', ')}`,
  tieBreaker: 'Tasatilanne — noppafanaali!',
};

function initGame(nPlayers, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  const players = Array.from({ length: nPlayers }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0,
    unknown: deck.shift(),
    row: [deck.shift(), deck.shift(), deck.shift(), deck.shift(), deck.shift()],
    known: new Set(),
  }));
  return { players, deck, discard: [] };
}

// Paikallinen Card — tukee "unknown"-tilaa
function KaCard({ card, faceUp, small, mini, tiny, highlight, dim, pulse, unknown, onClick, backStyle }) {
  const [h, setH] = useState(false);
  const w = mini ? 30 : tiny ? 36 : small ? 44 : 60, ht = mini ? 42 : tiny ? 50 : small ? 60 : 82;
  const back = backStyle || BACKS.ilves;
  const clickable = !!onClick;

  if (unknown) {
    return (
      <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ width: w, height: ht, borderRadius: 7, position: 'relative', overflow: 'hidden', flexShrink: 0, border: '2px solid #4a6a9a', boxShadow: `0 0 ${h ? '14px' : '7px'} rgba(74,106,154,0.${h ? '5' : '28'})`, cursor: 'default', transition: 'box-shadow 0.2s' }}>
        {back.render(w, ht)}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(20,30,60,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: small ? 10 : 13, color: '#8aaccc', opacity: 0.9 }}>🔒</span>
          <span style={{ fontSize: small ? 8 : 10, color: '#6a8aaa', fontFamily: 'sans-serif', letterSpacing: 1 }}>?</span>
        </div>
      </div>
    );
  }

  const borderCol = highlight ? C.gold : pulse ? 'rgba(210,215,235,0.75)' : back.border;
  const shadow = highlight ? '0 0 16px rgba(201,168,76,0.6)' : pulse ? '0 0 10px rgba(210,215,255,0.35)' : h && clickable ? '0 6px 16px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.3)';

  return (
    <div onClick={clickable ? onClick : undefined} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: w, height: ht, borderRadius: 7, position: 'relative', overflow: 'hidden', flexShrink: 0, border: `2px solid ${borderCol}`, background: faceUp ? C.card : back.bg, cursor: clickable ? 'pointer' : 'default', transition: 'transform 0.15s,box-shadow 0.15s', transform: h && clickable ? 'translateY(-4px) scale(1.06)' : 'none', boxShadow: shadow, opacity: dim ? 0.4 : 1, animation: pulse ? 'platina 2.4s ease-in-out infinite' : undefined }}>
      {faceUp && card
        ? <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', color: SUIT_COLOR[card.s], fontFamily: 'Georgia,serif', lineHeight: 1.1 }}>
            <div style={{ fontSize: mini ? 11 : small ? 13 : 17, fontWeight: 700 }}>{card.r}</div>
            <div style={{ fontSize: mini ? 12 : small ? 14 : 20 }}>{card.s}</div>
          </div>
        </div>
        : <>{back.render(w, ht)}</>}
    </div>
  );
}

function DiceRoll({ players, onDone, soundOn }) {
  const [phase, setPhase] = useState('rolling');
  const [rolls, setRolls] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const r = {};
      players.forEach(p => { r[p.id] = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6)); });
      setRolls(r);
    }, 120);
    tm(() => {
      clearInterval(interval);
      const finalRolls = {};
      players.forEach(p => { finalRolls[p.id] = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6)); });
      setRolls(finalRolls);
      setPhase('result');
      if (soundOn) SFX.fanfare();
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const sums = Object.entries(rolls).map(([id, dice]) => ({ id: parseInt(id), sum: dice.reduce((a, b) => a + b, 0) }));
  const winner = phase === 'result' ? [...sums].sort((a, b) => b.sum - a.sum)[0] : null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 100 }}>
      <div style={{ fontSize: 18, color: C.gold, fontFamily: 'Georgia,serif', letterSpacing: 4 }}>TASATILANNE</div>
      {players.map(p => {
        const dice = rolls[p.id] || [1, 1, 1, 1, 1];
        const sum = dice.reduce((a, b) => a + b, 0);
        const isWinner = phase === 'result' && winner && winner.id === p.id;
        return (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: isWinner ? C.gold + '18' : 'rgba(255,255,255,0.04)', border: `1px solid ${isWinner ? C.gold : C.panelBorder}`, borderRadius: 16, padding: '14px 20px', minWidth: 220, transition: 'all 0.4s' }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, color: isWinner ? C.gold : C.dim }}>{p.name}{isWinner ? ' 🏆' : ''}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {dice.map((d, i) => <div key={i} style={{ width: 38, height: 38, borderRadius: 8, background: isWinner ? C.gold + '22' : 'rgba(255,255,255,0.08)', border: `1px solid ${isWinner ? C.gold : C.panelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: isWinner ? C.gold : C.text }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][d - 1]}</div>)}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 16, color: isWinner ? C.gold : C.text, fontWeight: 700 }}>{sum}{phase !== 'rolling' ? ' pistettä' : ''}</div>
          </div>
        );
      })}
      {phase === 'result' && (
        <button onClick={onDone} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', marginTop: 8 }}>Näytä tulokset →</button>
      )}
    </div>
  );
}

export default function Kultakala({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showLastPlay = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', showAIKnown = true, onAiLevelChange, onSnapshot }) {
  const [screen, setScreen]   = useState('select');
  const [nP, setNP]           = useState(playerCount);
  const [soundOn, setSnd]     = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G, setG]             = useState(null);
  const [phase, setPhase]     = useState('idle');
  const [curIdx, setCur]      = useState(0);
  const [held, setHeld]       = useState(null);
  const [swapIdx, setSwapIdx] = useState(null);
  const [msg, setMsg_]        = useState('');
  const [log, setLog]         = useState([]);
  const [logOpen, setLO]      = useState(hints);
  const [revealed, setRevealed] = useState(false);
  const [drawnFromDeck, setFromDeck] = useState(false);
  const [debugOpen, setDebug] = useState(initSeeAll);
  const [shuffling, setShuffling] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [tiedPlayers, setTiedPlayers] = useState([]);
  const [kohahdus, setKohahdus] = useState(null);
  const [currentMoment, setCurrentMoment] = useState(null);
  const [lastPlay, setLastPlay] = useState(null);
  const [allBots, setAllBots]             = useState(false);
  const [paused, setPaused]               = useState(false);
  const [aiDelayMs, setAiDelayMs]         = useState(2000);
  const [pendingResult, setPendingResult] = useState(null);

  const gRef        = useRef(null);
  const phaseRef    = useRef('idle');
  const curRef      = useRef(0);
  const aiTmr       = useRef(null);
  const logRef      = useRef([]);
  const sndRef      = useRef(true);
  const aiLevelRef  = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  const drawnFromRef = useRef(null); // 'deck' | 'discard' | null
  const tmrs         = useRef(new Set());
  const lastPlayTmr  = useRef(null);
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };
  const allBotsRef   = useRef(false);
  const pausedRef    = useRef(false);
  const aiDelayRef   = useRef(2000);

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { curRef.current = curIdx; }, [curIdx]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => { tmrs.current.forEach(clearTimeout); clearTimeout(aiTmr.current); clearTimeout(lastPlayTmr.current); }, []);


  const korttia = n => n === 1 ? '1 kortti' : `${n} korttia`;

  function triggerKohahdus(card) {
    setKohahdus(card);
    tm(() => setKohahdus(null), 1800);
  }

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 50);
    setLog([...logRef.current]);
    if (allBotsRef.current && onSnapshot && gRef.current) {
      const g = gRef.current;
      onSnapshot({ step: logRef.current.length, logText: m,
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman,
          hand: [p.unknown, ...(p.row ?? [])].filter(Boolean),
          cardCount: 1 + (p.row?.length ?? 0), score: null })),
        tableCards: (g.discard ?? []).slice(-1), extraText: null });
    }
  }

  function detectMoment(eventType, context) {
    if (eventType === 'epic_high_value_swap' && context.cardValue >= 10) {
      const moment = {
        type: 'epic_high_value_swap',
        game: 'Kultakala',
        title: '🧠 EPIC! Muisti loistaa!',
        description: `Muistit paikan, jossa oli ${lbl(context.card)} (${context.cardValue} p)! Erinomainen muistipeli-suoritus!`,
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

  function flashLastPlay(name, card, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: [card], isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function startGame(forcedCount, allBotsMode = false) {
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    pausedRef.current = false; setPaused(false);
    setPendingResult(null);
    clearTimeout(aiTmr.current);
    const count = forcedCount ?? nP;
    const g = initGame(count, playerNames, allBotsMode);
    setG(g); gRef.current = g;
    setCur(0); curRef.current = 0;
    setPhase('drawing'); phaseRef.current = 'drawing';
    setHeld(null); setSwapIdx(null); setRevealed(false); drawnFromRef.current = null; setFromDeck(false); setShowDice(false);
    logRef.current = []; setLog([]);
    addLog(M.gameStart);
    setScreen('game');
    setShuffling(true);
    tm(() => maybeAI(0, g), 2500);
  }

  function startBotBattle() {
    allBotsRef.current = true; setAllBots(true);
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

  function advance(g, fromIdx) {
    if (phaseRef.current === 'gameover') return;
    const next = (fromIdx + 1) % g.players.length;
    if (g.deck.length === 0) {
      addLog(M.deckEmpty);
      tm(() => doReveal(g), 800);
      return;
    }
    setCur(next); curRef.current = next;
    setPhase('drawing'); phaseRef.current = 'drawing';
    setHeld(null); setSwapIdx(null); drawnFromRef.current = null; setFromDeck(false);
    const p = g.players[next];
    addLog(p.isHuman ? M.yourTurn : M.aiThinking(p));
    aiTmr.current = tm(() => maybeAI(next, g), 600);
  }

  function maybeAI(idx, g) {
    if (phaseRef.current === 'gameover') return;
    if (idx === 0 && !allBotsRef.current) return;
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 900;
    const schedFlip = () => {
      if (pausedRef.current) { tm(schedFlip, 300); return; }
      aiTurn(idx, gRef.current);
    };
    tm(schedFlip, baseDelay + Math.random() * 600);
  }

  function aiTurn(idx, g) {
    if (!g || phaseRef.current === 'gameover') return;
    const p = g.players[idx];
    const top = g.discard[g.discard.length - 1];

    // Strategia: AI voi nähdä vain omat kortit. Pelaa omaa pistesummaansa parantaakseen.
    const currentScore = p.row.reduce((s, c) => s + c.v, 0);
    const cardsRemaining = g.deck.length + g.discard.length;
    const roundsLeft = Math.ceil(cardsRemaining / (g.players.length || 1));

    // **PHASE 1: Opponent Threat Analysis**
    // Analysoi vastustajien uhkataso näkyvien pisteiden perusteella
    const threats = g.players
      .map((pl, i) => {
        const visibleScore = pl.row.reduce((s, c) => s + c.v, 0);
        const unknownEstimate = pl.unknown ? pl.unknown.v : 7; // Keskimääräinen arvio tuntemattomalle
        const totalEstimate = visibleScore + unknownEstimate;
        return {
          playerIdx: i,
          visibleScore,
          totalEstimate,
          knownCount: pl.known.size,
          name: pl.name,
        };
      })
      .filter(t => t.playerIdx !== idx) // Exclude self
      .sort((a, b) => a.totalEstimate - b.totalEstimate);

    const minThreat = threats.length > 0 ? threats[0].totalEstimate : Infinity;
    const isLeadingThreaten = currentScore < minThreat; // We're losing if our score is lower
    const gameState = {
      farBehind: currentScore > minThreat + 10,
      slightlyBehind: currentScore > minThreat && currentScore <= minThreat + 10,
      closeGame: Math.abs(currentScore - minThreat) <= 5,
      ahead: currentScore < minThreat,
    };

    // Mitä vähemmän kierroksia, sitä konservatiivisempi. Matala kynnys = enemmän swappeja.
    const isLateGame = roundsLeft <= 2;
    let swapThreshold = isLateGame ? 3 : 5;

    // **PHASE 2: Dynamic Threshold Adjustment**
    // Jos olemme jäljessä, ottaa enemmän riskejä
    if (gameState.farBehind) {
      swapThreshold = 7; // Aggressive when far behind
    } else if (gameState.slightlyBehind) {
      swapThreshold = 6; // More aggressive
    } else if (gameState.closeGame && roundsLeft <= 2) {
      swapThreshold = 2; // Very conservative in close late-game
    }

    // Valitse huonoin tunnettu kortti vaihtokohteeksi
    const worstKnownIdx = [...p.known].sort((a, b) => p.row[b].v - p.row[a].v)[0];
    let card, newG;
    // Aloittelija-virhe: ottaa poistopakasta kortin vaikka se on hieman huonompi
    const kultaFumbleBonus = aiShouldFumble(aiLevelRef.current) ? 3 : 0;
    if (top && worstKnownIdx !== undefined && top.v < p.row[worstKnownIdx].v + kultaFumbleBonus) {
      // Poistopakasta nostaminen: pakollinen vaihto
      const discard = [...g.discard]; discard.pop();
      newG = { ...g, discard }; card = top;
      addLog(M.aiDrawDiscard(p));
      setG(newG); gRef.current = newG;
      if (sndRef.current) SFX.flip();
      tm(() => aiDoSwap(idx, gRef.current, card, worstKnownIdx), 1000);
    } else {
      if (!g.deck.length) { advance(g, idx); return; }
      card = g.deck[0]; newG = { ...g, deck: g.deck.slice(1) };
      addLog(M.aiDrawDeck(p));
      setG(newG); gRef.current = newG;
      if (sndRef.current) SFX.flip();
      tm(() => {
        const g2 = gRef.current, p2 = g2.players[idx];
        const playerCount = g2.players.length;
        // 2-pel: A-3, 3-pel: A-4, 4-pel: A-5 (kokemuspohjainen)
        const maxSwapValue = playerCount + 1;

        // **PHASE 3: Smart Position Selection**
        // Helper function to score how good a position is for a card
        const scorePositionForCard = (cardValue, position) => {
          // position is 1-5 (from left to right)
          // Low cards: prefer left (revealed early, lowers total)
          // High cards: prefer right (hidden longer)
          const posIndex = position - 1; // 0-4

          if (cardValue <= 3) {
            // Low card: left side better (position 1 best)
            return 5 - position; // 4,3,2,1,0 for pos 1-5
          } else if (cardValue >= 9) {
            // High card: right side better (position 5 best)
            return position - 1; // 0,1,2,3,4 for pos 1-5
          } else {
            // Medium card: prefer middle
            return 2.5 - Math.abs(3 - position);
          }
        };

        // Find best unknown position for a card (preferring score but filling left-to-right)
        const findBestUnknownPos = (heldCard) => {
          const unknowns = Array.from({ length: 5 }, (_, i) => i + 1).filter(pos => !p2.known.has(pos - 1));
          if (unknowns.length === 0) return null;

          let bestPos = unknowns[0];
          let bestScore = scorePositionForCard(heldCard.v, bestPos);

          for (const pos of unknowns) {
            const score = scorePositionForCard(heldCard.v, pos);
            if (score > bestScore) {
              bestScore = score;
              bestPos = pos;
            }
          }
          return bestPos;
        };

        // KETJUVAIHTO: järjestys 5,4,3,2,1
        let held = card;
        const swaps = []; // Seuraa jokaista swappia: { pos, card }

        for (let pos = 5; pos >= 1; pos--) {
          const idx_pos = pos - 1;

          // Paikka 1: älä aja ulos tunnettua pientä korttia poistopakkaan
          if (pos === 1 && p2.known.has(0) && p2.row[0].v <= maxSwapValue) break;
          if (pos === 1 && held.v > maxSwapValue) break;

          const hasUnknownsAhead = Array.from({ length: pos - 1 }, (_, i) => i).some(i => !p2.known.has(i));

          if (held.v <= maxSwapValue) {
            // A-3/4/5 (2/3/4 pel): vaihda tuntemattomaan tai tunnettuun jos sen jälkeen tuntemattomia
            if (!p2.known.has(idx_pos) || hasUnknownsAhead) {
              const old = p2.row[idx_pos];
              p2.row[idx_pos] = held;
              p2.known.add(idx_pos);
              swaps.push({ pos, card: held });
              held = old;
            } else {
              // Kaikki tunnetaan eikä tuntemattomia jäljellä - ketju loppuu
              break;
            }
          } else if (held.v <= 7) {
            // 5-7: vaihda tuntemattomaan paikoissa 5,4,3,2 (ei paikkaan 1)
            if (pos >= 2 && !p2.known.has(idx_pos)) {
              const old = p2.row[idx_pos];
              p2.row[idx_pos] = held;
              p2.known.add(idx_pos);
              swaps.push({ pos, card: held });
              held = old;
            } else {
              // Tunnettu paikka tai paikka 1 - ketju loppuu
              break;
            }
          } else {
            // 8-K: heitä pois (ei vaihda)
            break;
          }
        }

        // Päivitä pelin state vaihtojen jälkeen
        if (swaps.length > 0) {
          const players = g2.players.map((pl, i) => i === idx ? p2 : pl);
          const newG = { ...g2, players, discard: [...g2.discard, held] };
          setG(newG);
          gRef.current = newG;
          if (sndRef.current) SFX.swap();

          // Logita ketjuvaihto - näytä kaikki välivaiheet väreillä
          const swapChain = swaps.map(s => `paikka ${s.pos}: ${lblColored(s.card)}`).join(' → ');
          addLog(`${g2.players[idx].name} vaihtaa: ${swapChain}, ${lblColored(held)} poistopakkaan.`);

          tm(() => advance(newG, idx), 700);
        } else {
          // Ei vaihtoja - discardata kortti suoraan
          aiDoDiscard(idx, g2, card);
        }
      }, 1000);
    }
  }

  function aiDoSwap(idx, g, card, rowIdx) {
    const p = g.players[idx], old = p.row[rowIdx];
    const newRow = [...p.row]; newRow[rowIdx] = card;
    const known = new Set(p.known); known.add(rowIdx);
    const players = g.players.map((pl, i) => i === idx ? { ...pl, row: newRow, known } : pl);
    const newG = { ...g, players, discard: [...g.discard, old] };
    setG(newG); gRef.current = newG;
    if (sndRef.current) SFX.swap();
    addLog(M.aiSwapRow(g.players[idx], rowIdx, card, old));
    if (rowIdx === 0 && old.v <= 2) triggerKohahdus(old);
    tm(() => advance(newG, idx), 700);
  }

  function aiDoDiscard(idx, g, card) {
    const newG = { ...g, discard: [...g.discard, card] };
    setG(newG); gRef.current = newG;
    addLog(M.aiDiscard(g.players[idx], card));
    flashLastPlay(g.players[idx].name, card, false);
    tm(() => advance(newG, idx), 600);
  }

  function humanDraw(fromDiscard) {
    // Varmista, että olemme 'drawing' vaiheessa, ei 'viewing'
    if (phaseRef.current !== 'drawing' || curIdx !== 0) {
      // Jos olemme 'viewing' vaiheessa, älä tee mitään
      return;
    }
    const g = gRef.current;
    let card, newG;
    if (fromDiscard) {
      if (!g.discard.length) return;
      const discard = [...g.discard]; card = discard.pop();
      newG = { ...g, discard };
      addLog(M.humanDrawDiscard(card, card.v));
    } else {
      if (!g.deck.length) return;
      card = g.deck[0]; newG = { ...g, deck: g.deck.slice(1) };
      addLog(M.humanDrawDeck(card, card.v));
    }
    if (sndRef.current) SFX.flip();
    setG(newG); gRef.current = newG;
    drawnFromRef.current = fromDiscard ? 'discard' : 'deck';
    setHeld(card); setSwapIdx(4); setFromDeck(!fromDiscard);
    setPhase('holding'); phaseRef.current = 'holding';
  }

  function humanSwapRow(rowIdx) {
    if ((phaseRef.current !== 'holding' && phaseRef.current !== 'swapping') || curIdx !== 0) return;
    const g = gRef.current;
    if (!g) return;
    const p = g.players[0];
    const newRow = [...p.row];
    const known = new Set(p.known);

    const old = p.row[rowIdx];
    newRow[rowIdx] = held;
    known.add(rowIdx);
    if (held && held.v >= 10) {
      detectMoment('epic_high_value_swap', { card: held, cardValue: held.v });
    }
    const players = g.players.map((pl, i) => i === 0 ? { ...pl, row: newRow, known } : pl);
    if (sndRef.current) SFX.swap();
    const wasKnown = p.known.has(rowIdx);
    const oldName = wasKnown ? `${lbl(old)} (${old.v} p)` : `${lbl(old)} (${old.v} p paljastui)`;
    const nextIdx = rowIdx - 1;
    drawnFromRef.current = null; setFromDeck(false);

    if (nextIdx < 0) {
      // Reached leftmost — displaced card forced to discard
      const finalG = { ...g, players, discard: [...g.discard, old] };
      setG(finalG); gRef.current = finalG;
      addLog(M.humanSwappedEnd(rowIdx, held, held.v, oldName));
      if (old.v <= 2) triggerKohahdus(old);
      setHeld(null); setSwapIdx(null);
      setPhase('drawing'); phaseRef.current = 'drawing';
      tm(() => advance(finalG, 0), 500);
    } else {
      // Displaced card goes to KÄDESSÄ for possible continued chain
      const newG = { ...g, players };
      setG(newG); gRef.current = newG;
      addLog(M.humanSwappedContinue(rowIdx, held, held.v, oldName));
      setHeld(old);
      setSwapIdx(nextIdx);
      setPhase('swapping'); phaseRef.current = 'swapping';
    }
  }

  function humanStopSwap() {
    if ((phaseRef.current !== 'swapping' && phaseRef.current !== 'holding') || curIdx !== 0) return;
    if (drawnFromRef.current === 'discard') return;
    const g = gRef.current;
    const newG = { ...g, discard: [...g.discard, held] };
    setG(newG); gRef.current = newG;
    addLog(M.humanDiscard(held));
    flashLastPlay(g.players[0].name, held, true);
    setHeld(null); setSwapIdx(null); drawnFromRef.current = null; setFromDeck(false);
    setPhase('drawing'); phaseRef.current = 'drawing';
    tm(() => advance(newG, 0), 300);
  }

  function doReveal(g) {
    setPhase('gameover'); phaseRef.current = 'gameover';
    setRevealed(true);
    if (sndRef.current) SFX.reveal();
    setG(g); gRef.current = g;
    const scores = g.players.map(p => ({ ...p, total: p.unknown.v + p.row.reduce((s, c) => s + c.v, 0) }));
    const minScore = Math.min(...scores.map(s => s.total));
    const sortedSc = [...scores].sort((a, b) => a.total - b.total);
    const ranking  = sortedSc.map(p => ({
      name: p.name, isHuman: p.isHuman, score: p.total,
      place: sortedSc.filter(q => q.total < p.total).length + 1,
    }));
    const revealCards = g.players.map(p => ({ name: p.name, cards: [p.unknown, ...p.row] }));
    if (allBotsRef.current) { tm(() => onResult?.({ ranking, revealCards }), 800); }
    else { onResult?.({ ranking, revealCards }); }
    const tied = scores.filter(s => s.total === minScore);
    addLog(M.gameOverScores(scores));
    tm(() => {
      if (tied.length > 1) {
        addLog(M.tieBreaker);
        setTiedPlayers(tied); setShowDice(true);
      }
      setScreen('gameover');
    }, 2000);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🐟</div>
        <h1 style={{ fontSize: isMobile ? 30 : 52, letterSpacing: isMobile ? 5 : 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>KULTAKALA</h1>
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
    const scores = G.players.map(p => ({ ...p, total: p.unknown.v + p.row.reduce((s, c) => s + c.v, 0) })).sort((a, b) => a.total - b.total);
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        {showDice && <DiceRoll players={tiedPlayers} onDone={() => setShowDice(false)} soundOn={soundOn} />}
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scores.map((p, i) => (
            <div key={p.id} style={{ borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? C.gold + '55' : C.panelBorder}` }}>
              <span style={{ fontSize: 22, minWidth: 28 }}>{i === 0 ? '🏆' : i === scores.length - 1 ? '🐟' : '🎯'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: i === 0 ? C.gold : C.text, marginBottom: 6 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'nowrap' }}>
                  <KaCard card={p.unknown} faceUp mini backStyle={BACKS[cardBack]} />
                  <span style={{ color: C.dim, fontSize: 11, margin: '0 1px' }}>+</span>
                  {p.row.map((c, ci) => <KaCard key={ci} card={c} faceUp mini highlight={!p.isHuman && p.known?.has(ci)} backStyle={BACKS[cardBack]} />)}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? C.gold : C.dim }}>{p.total}<span style={{ fontSize: 11, opacity: 0.6 }}>p</span></div>
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
  const ais = allBots ? G.players : G.players.slice(1);
  const discardTop = G.discard[G.discard.length - 1];
  const canDraw = curIdx === 0 && phase === 'drawing';
  const canSwapRow = curIdx === 0 && (phase === 'holding' || phase === 'swapping');
  // canDiscard: holding phase AND drew from deck (not discard)
  const canDiscard = curIdx === 0 && phase === 'holding' && drawnFromRef.current !== 'discard';
  const canStop    = curIdx === 0 && !!held && (phase === 'swapping' || canDiscard);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />
      {kohahdus && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(160,20,20,0.18)', border: '2px solid rgba(255,90,90,0.65)', borderRadius: 22, padding: '22px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: '0 0 50px rgba(255,60,60,0.45)', animation: 'kohahdus 1.8s ease-out forwards' }}>
            <span style={{ fontSize: 40 }}>😱</span>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: isRed(kohahdus.s) ? '#ff7070' : '#e8e8e8' }}>{lbl(kohahdus)}</span>
            <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#cc8888', letterSpacing: 1 }}>pakotettiin poistopakkaan!</span>
          </div>
        </div>
      )}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🐟</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: isMobile ? 12 : 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {ais.length > 0 && (
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 6 }}>
            {ais.map((p, i) => {
              const pi = allBots ? i : i + 1, isActive = curIdx === pi;
              return (
                <div key={p.id} style={{ display: 'flex', gap: 5, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '5px 8px' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: isActive ? C.gold : C.dim, minWidth: 54, flexShrink: 0 }}>🤖 {truncName(p.name)}{isActive ? ' ●' : ''}</div>
                  <KaCard card={p.unknown} unknown={!revealed && !debugOpen} faceUp={revealed || debugOpen} tiny backStyle={BACKS[cardBack]} />
                  <div style={{ display: 'flex', gap: 2 }}>
                    {p.row.map((c, ci) => (
                      <div key={ci} style={{ borderRadius: 4, border: showAIKnown && p.known.has(ci) ? `2px solid ${C.gold}` : 'none', boxShadow: showAIKnown && p.known.has(ci) ? `0 0 6px ${C.gold}66` : 'none', padding: showAIKnown && p.known.has(ci) ? 1 : 0 }}>
                        <KaCard card={c} faceUp={revealed || debugOpen} tiny backStyle={BACKS[cardBack]} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65, marginBottom: 2 }}>KENTTÄ</div>
            {ais.map((p, i) => {
              const pi = allBots ? i : i + 1, isActive = curIdx === pi;
              return (
                <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, minWidth: 80, flexShrink: 0 }}>🤖 {truncName(p.name)}{isActive ? ' ●' : ''}</div>
                  <KaCard card={p.unknown} unknown={!revealed && !debugOpen} faceUp={revealed || debugOpen} tiny backStyle={BACKS[cardBack]} />
                  <div style={{ display: 'flex', gap: 2 }}>
                    {p.row.map((c, ci) => (
                      <div key={ci} style={{ borderRadius: 6, border: showAIKnown && p.known.has(ci) ? `2px solid ${C.gold}` : 'none', boxShadow: showAIKnown && p.known.has(ci) ? `0 0 8px ${C.gold}66` : 'none', padding: showAIKnown && p.known.has(ci) ? 2 : 0 }}>
                        <KaCard card={c} faceUp={revealed || debugOpen} tiny backStyle={BACKS[cardBack]} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Pakka-alue */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: isMobile ? '8px 10px' : '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, marginBottom: isMobile ? 6 : 12 }}>
        {(() => { const pw = isMobile ? 58 : 72, ph = isMobile ? 80 : 98; return (<>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>NOSTOPAKKA</div>
          <div onClick={canDraw ? () => humanDraw(false) : undefined}>
            <FanStack
              count={G.deck.length}
              w={pw} h={ph}
              backStyle={BACKS[cardBack]}
              borderColor={canDraw ? C.gold : undefined}
              glowColor={canDraw ? C.gold : undefined}
            />
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginTop: 5 }}>{G.deck.length} kpl</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>POISTOPAKKA</div>
          <div
            onClick={canDraw ? () => humanDraw(true) : canDiscard ? humanStopSwap : undefined}
            style={{ cursor: (canDraw && discardTop) || canDiscard ? 'pointer' : 'default', position: 'relative', width: pw, height: ph }}
          >
            {!discardTop
              ? <div style={{ width: pw, height: ph, borderRadius: 9, border: `1.5px dashed ${canDiscard ? C.gold : C.panelBorder}`, opacity: canDiscard ? 0.8 : 0.3, boxShadow: canDiscard ? `0 0 14px rgba(201,168,76,0.4)` : 'none', transition: 'all 0.2s' }} />
              : <div style={{ position: 'relative', width: pw, height: ph, borderRadius: 9, background: C.card, border: `2px solid ${(canDraw || canDiscard) ? C.gold : '#aaa'}`, boxShadow: (canDraw || canDiscard) ? `0 0 18px rgba(201,168,76,0.5)` : '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: SUIT_COLOR[discardTop.s], fontFamily: 'Georgia,serif', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700 }}>{discardTop.r}</div>
                  <div style={{ fontSize: isMobile ? 18 : 22 }}>{discardTop.s}</div>
                </div>
              </div>}
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginTop: 5 }}>{G.discard.length} kpl</div>
        </div>
        {held && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.gold, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>KÄDESSÄ</div>
            <KaCard card={held} faceUp small backStyle={BACKS[cardBack]} highlight />
            <div style={{ fontSize: 10, color: C.gold, fontFamily: 'sans-serif', marginTop: 5 }}>{held.v} p</div>
          </div>
        )}
        </>); })()}
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

      {/* Pelaaja 0 (ihminen — piilotettu allBots-tilassa, koska näkyy ais-listassa) */}
      {!allBots && <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${curIdx === 0 ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'sans-serif', fontSize: 12, color: curIdx === 0 ? C.gold : C.dim, marginBottom: 8 }}>
          <span>{allBots ? '🤖' : '👤'} {human.name} {curIdx === 0 ? '●' : ''}</span>
          {!isMobile && <span style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65 }}>KENTTÄ</span>}
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 4 : 8, alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <KaCard card={human.unknown} unknown faceUp={false} small={!isMobile} tiny={isMobile} backStyle={BACKS[cardBack]} />
            <div style={{ fontFamily: 'sans-serif', fontSize: 9, color: C.gold, marginTop: 3 }}>?</div>
          </div>
          <span style={{ color: C.dim, fontSize: isMobile ? 12 : 16, marginBottom: isMobile ? 14 : 20, flexShrink: 0 }}>+</span>
          {human.row.map((c, i) => {
            const isSwapTarget = canSwapRow && swapIdx === i;
            return (
              <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
                <KaCard card={c} faceUp={debugOpen || allBots || human.known.has(i)} small={!isMobile} tiny={isMobile}
                  highlight={isSwapTarget}
                  pulse={hints && human.known.has(i) && !isSwapTarget}
                  backStyle={BACKS[cardBack]} />
                <div style={{ fontFamily: 'sans-serif', fontSize: 9, color: isSwapTarget ? C.gold : C.dim, marginTop: 3 }}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* Toimintopainikkeet — piilotettu katselutilassa */}
      {!allBots && (
        <div style={{ minHeight: isMobile ? 32 : 44, display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center', marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
          {canSwapRow && swapIdx !== null && (
            <button onClick={() => humanSwapRow(swapIdx)} style={{ background: C.gold + '18', border: `1px solid ${C.gold}`, borderRadius: 9, padding: isMobile ? '6px 12px' : '10px 18px', color: C.gold, fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.5 }}
              dangerouslySetInnerHTML={{ __html: `Vaihda ${lblColored(held)} paikan ${swapIdx + 1} korttiin` }} />
          )}
          {canStop && (
            <button onClick={humanStopSwap} style={{ background: 'transparent', border: `1px solid ${C.gold}88`, borderRadius: 9, padding: isMobile ? '6px 12px' : '10px 18px', color: C.gold, fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.5 }}
              dangerouslySetInnerHTML={{ __html: `Heitä ${lblColored(held)} poistopakkaan` }} />
          )}
        </div>
      )}

      {/* Bottien taistelu -ohjauspaneeli */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Tilarivi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: isMobile ? 4 : 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: isMobile ? 4 : 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}><span style={{ color: C.gold, fontWeight: 700 }}>Tavoite:</span> pienimmät pisteet kun pakka loppuu</span>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'} Ääni</button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'} Avoimet kortit</button>
      </div>

      {/* Katselutila: pending result overlay */}
      {allBots && pendingResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 300 }}>
          <div style={{ background: '#1a0a2e', border: '2px solid rgba(123,47,190,0.7)', borderRadius: 20, padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 360 }}>
            <span style={{ fontSize: 32 }}>🐟</span>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: C.botMode, letterSpacing: 4 }}>KATSELUTILA PÄÄTTYI</span>
            {pendingResult.ranking.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: 16 }}>{i === 0 ? '🏆' : i === pendingResult.ranking.length - 1 ? '🐟' : '🎯'}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: i === 0 ? C.botMode : C.botModeDim, flex: 1 }}>{p.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 14, color: i === 0 ? C.botMode : C.botModeDimmer }}>{p.score} p</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1f8a)', border: 'none', borderRadius: 12, padding: '11px 24px', color: '#f0d0ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🤖 Uusi</button>
              <button onClick={() => { onResult?.(pendingResult); setPendingResult(null); }} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '11px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Tulokset →</button>
            </div>
          </div>
        </div>
      )}

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
          addLog('💾 Momentti tallennettu! Loistava muisti!');
          setCurrentMoment(null);
        }}
      />

      <style>{`
        @keyframes revealFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9)}100%{box-shadow:none}}
        @keyframes platina{0%,100%{border-color:rgba(200,210,235,0.5);box-shadow:0 0 5px rgba(210,215,255,0.2)}50%{border-color:rgba(235,240,255,1);box-shadow:0 0 14px rgba(220,225,255,0.7)}}
        @keyframes kohahdus{0%{opacity:0;transform:scale(0.55)}15%{opacity:1;transform:scale(1.08)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.92)}}
        @keyframes lastPlayFade{0%{opacity:0;transform:translateY(-4px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}
        button:active{transform:scale(0.97)}
      `}</style>
    </div>
  );
}
