import { useState, useRef, useEffect } from 'react';
import { C, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { tone, noise } from '../shared/audio.js';
import { isRed, lbl, SUITS, RANKS, VAL, shuffle } from '../shared/helpers.js';
import FanStack from '../shared/FanStack.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames() {
  const a = [...AI_NAMES];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: VAL[r], id: `${r}${s}_${Math.random()}` }))));
}

const SFX = {
  flip:     () => { noise(0.04, 0.06, 1200); tone(800, 0.03, 0.08, 'sine'); },
  swap:     () => { noise(0.06, 0.1, 900); tone(400, 0.08, 0.15, 'triangle'); },
  reveal:   () => { tone(440, 0.15, 0.2, 'triangle'); tone(554, 0.15, 0.2, 'triangle', 0.15); tone(659, 0.4, 0.25, 'triangle', 0.3); },
  fanfare:  () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.12, 0.25, 'triangle', i * 0.12)); },
};

function initGame(nPlayers) {
  const aiNames = shuffledAINames();
  const deck = newDeck();
  const players = Array.from({ length: nPlayers }, (_, i) => ({
    id: i, name: i === 0 ? 'Hero' : aiNames[i - 1], isHuman: i === 0,
    unknown: deck.shift(),
    row: [deck.shift(), deck.shift(), deck.shift(), deck.shift(), deck.shift()],
    known: new Set(),
  }));
  return { players, deck, discard: [] };
}

// Paikallinen Card — tukee "unknown"-tilaa
function KaCard({ card, faceUp, small, highlight, dim, pulse, unknown, onClick, backStyle }) {
  const [h, setH] = useState(false);
  const w = small ? 44 : 60, ht = small ? 60 : 82;
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
          <div style={{ textAlign: 'center', color: isRed(card.s) ? '#b83030' : '#1a1a2e', fontFamily: 'Georgia,serif', lineHeight: 1.1 }}>
            <div style={{ fontSize: small ? 13 : 17, fontWeight: 700 }}>{card.r}</div>
            <div style={{ fontSize: small ? 14 : 20 }}>{card.s}</div>
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
    setTimeout(() => {
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

export default function Kultakala({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true }) {
  const [screen, setScreen]   = useState('select');
  const [nP, setNP]           = useState(3);
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

  const gRef        = useRef(null);
  const phaseRef    = useRef('idle');
  const curRef      = useRef(0);
  const aiTmr       = useRef(null);
  const logRef      = useRef([]);
  const sndRef      = useRef(true);
  const drawnFromRef = useRef(null); // 'deck' | 'discard' | null

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { curRef.current = curIdx; }, [curIdx]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => clearTimeout(aiTmr.current), []);

  const korttia = n => n === 1 ? '1 kortti' : `${n} korttia`;

  function triggerKohahdus(card) {
    setKohahdus(card);
    setTimeout(() => setKohahdus(null), 1800);
  }

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 50);
    setLog([...logRef.current]);
  }

  function startGame() {
    clearTimeout(aiTmr.current);
    const g = initGame(nP);
    setG(g); gRef.current = g;
    setCur(0); curRef.current = 0;
    setPhase('drawing'); phaseRef.current = 'drawing';
    setHeld(null); setSwapIdx(null); setRevealed(false); drawnFromRef.current = null; setFromDeck(false); setShowDice(false);
    logRef.current = []; setLog([]);
    addLog('Kortit on jaettu. Jokaisella on tuntematon kortti ja viisi pöytäkorttia. Nosta pakasta tai poistopakasta.');
    setScreen('game');
    setShuffling(true);
    setTimeout(() => maybeAI(0, g), 2500);
  }

  function advance(g, fromIdx) {
    if (phaseRef.current === 'gameover') return;
    const next = (fromIdx + 1) % g.players.length;
    if (g.deck.length === 0) {
      addLog('Nostopakka ehtyi — paljastetaan tuntemattomat!');
      setTimeout(() => doReveal(g), 800);
      return;
    }
    setCur(next); curRef.current = next;
    setPhase('drawing'); phaseRef.current = 'drawing';
    setHeld(null); setSwapIdx(null); drawnFromRef.current = null; setFromDeck(false);
    const p = g.players[next];
    addLog(p.id === 0 ? 'Sinun vuorosi — nosta pakasta tai poistopakasta.' : `${p.name} miettii...`);
    aiTmr.current = setTimeout(() => maybeAI(next, g), 600);
  }

  function maybeAI(idx, g) {
    if (phaseRef.current === 'gameover') return;
    if (idx === 0) return;
    setTimeout(() => aiTurn(idx, gRef.current), 900 + Math.random() * 600);
  }

  function aiTurn(idx, g) {
    if (!g || phaseRef.current === 'gameover') return;
    const p = g.players[idx];
    const top = g.discard[g.discard.length - 1];
    // Valitse huonoin tunnettu kortti vaihtokohteeksi
    const worstKnownIdx = [...p.known].sort((a, b) => p.row[b].v - p.row[a].v)[0];
    let card, newG;
    if (top && worstKnownIdx !== undefined && top.v < p.row[worstKnownIdx].v) {
      // Poistopakasta nostaminen: pakollinen vaihto
      const discard = [...g.discard]; discard.pop();
      newG = { ...g, discard }; card = top;
      addLog(`${p.name} nostaa poistopakasta.`);
      setG(newG); gRef.current = newG;
      if (sndRef.current) SFX.flip();
      setTimeout(() => aiDoSwap(idx, gRef.current, card, worstKnownIdx), 1000);
    } else {
      if (!g.deck.length) { advance(g, idx); return; }
      card = g.deck[0]; newG = { ...g, deck: g.deck.slice(1) };
      addLog(`${p.name} nostaa pakasta.`);
      setG(newG); gRef.current = newG;
      if (sndRef.current) SFX.flip();
      setTimeout(() => {
        const g2 = gRef.current, p2 = g2.players[idx];
        const worst = [...p2.known].sort((a, b) => p2.row[b].v - p2.row[a].v)[0];
        if (worst !== undefined && card.v < p2.row[worst].v) {
          aiDoSwap(idx, g2, card, worst);
        } else if (card.v <= 5) {
          // Matala arvo: vaihda sokkona satunnaiseen tuntemattomaan paikkaan
          const unknowns = p2.row.map((_, i) => i).filter(i => !p2.known.has(i));
          if (unknowns.length) {
            aiDoSwap(idx, g2, card, unknowns[Math.floor(Math.random() * unknowns.length)]);
          } else {
            aiDoDiscard(idx, g2, card);
          }
        } else {
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
    addLog(`${g.players[idx].name} vaihtaa paikka ${rowIdx + 1} poistopakkaan.`);
    if (rowIdx === 0 && old.v <= 2) triggerKohahdus(old);
    setTimeout(() => advance(newG, idx), 700);
  }

  function aiDoDiscard(idx, g, card) {
    const newG = { ...g, discard: [...g.discard, card] };
    setG(newG); gRef.current = newG;
    addLog(`${g.players[idx].name} heittää ${lbl(card)} poistopakkaan.`);
    setTimeout(() => advance(newG, idx), 600);
  }

  function humanDraw(fromDiscard) {
    if (phaseRef.current !== 'drawing' || curIdx !== 0) return;
    const g = gRef.current;
    let card, newG;
    if (fromDiscard) {
      if (!g.discard.length) return;
      const discard = [...g.discard]; card = discard.pop();
      newG = { ...g, discard };
      addLog(`Nostit ${lbl(card)} (${card.v} p) poistopakasta — pakollinen vaihto. Klikkaa pöytäkorttia.`);
    } else {
      if (!g.deck.length) return;
      card = g.deck[0]; newG = { ...g, deck: g.deck.slice(1) };
      addLog(`Nostit ${lbl(card)} (${card.v} p). Klikkaa pöytäkorttia vaihtaaksesi tai heitä poistopakkaan.`);
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
    const players = g.players.map((pl, i) => i === 0 ? { ...pl, row: newRow, known } : pl);
    if (sndRef.current) SFX.swap();
    const wasKnown = p.known.has(rowIdx);
    const oldName = wasKnown ? `${lbl(old)} (${old.v} p)` : `?? (${old.v} p paljastui)`;
    const nextIdx = rowIdx - 1;
    drawnFromRef.current = null; setFromDeck(false);

    if (nextIdx < 0) {
      // Reached leftmost — displaced card forced to discard
      const finalG = { ...g, players, discard: [...g.discard, old] };
      setG(finalG); gRef.current = finalG;
      addLog(`Paikka ${rowIdx + 1}: ${lbl(held)} (${held.v} p) sisään, ${oldName} poistopakkaan.`);
      if (old.v <= 2) triggerKohahdus(old);
      setHeld(null); setSwapIdx(null);
      setPhase('drawing'); phaseRef.current = 'drawing';
      setTimeout(() => advance(finalG, 0), 500);
    } else {
      // Displaced card goes to KÄDESSÄ for possible continued chain
      const newG = { ...g, players };
      setG(newG); gRef.current = newG;
      addLog(`Paikka ${rowIdx + 1}: ${lbl(held)} (${held.v} p) sisään, ${oldName} käteen.`);
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
    addLog(`Heitit ${lbl(held)} poistopakkaan. Vuoro ohi.`);
    setHeld(null); setSwapIdx(null); drawnFromRef.current = null; setFromDeck(false);
    setPhase('drawing'); phaseRef.current = 'drawing';
    setTimeout(() => advance(newG, 0), 300);
  }

  function doReveal(g) {
    setPhase('gameover'); phaseRef.current = 'gameover';
    setRevealed(true);
    if (sndRef.current) SFX.reveal();
    setG(g); gRef.current = g;
    const scores = g.players.map(p => ({ ...p, total: p.unknown.v + p.row.reduce((s, c) => s + c.v, 0) }));
    const minScore = Math.min(...scores.map(s => s.total));
    onResult?.(scores[0].total === minScore);
    const tied = scores.filter(s => s.total === minScore);
    addLog(`Tuntemattomat paljastetaan! ${scores.map(s => `${s.name}: ${s.total} p`).join(', ')}`);
    setTimeout(() => {
      if (tied.length > 1) {
        addLog(`Tasatilanne — noppafanaali!`);
        setTiedPlayers(tied); setShowDice(true);
      }
      setScreen('gameover');
    }, 2000);
  }

  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 8, color: C.gold, opacity: 0.6, marginBottom: 8 }}>🐟</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>KULTAKALA</h1>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 8 }}>Tuntematon kaataa parhaimmankin käden</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, marginBottom: 12, letterSpacing: 2 }}>PELAAJIA</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.7 }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt lyhyesti</span><br />
        Jokaisella on 1 tuntematon + 5 pöytäkorttia. Nosta vuorolla kortti ja vaihda jonosi oikeaan päähän. Tuntematon paljastuu vasta pelin lopussa!
      </div>
      <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
    </div>
  );

  if (screen === 'gameover' && G) {
    const scores = G.players.map(p => ({ ...p, total: p.unknown.v + p.row.reduce((s, c) => s + c.v, 0) })).sort((a, b) => a.total - b.total);
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
        {showDice && <DiceRoll players={tiedPlayers} onDone={() => setShowDice(false)} soundOn={soundOn} />}
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scores.map((p, i) => (
            <div key={p.id} style={{ borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? C.gold + '55' : C.panelBorder}` }}>
              <span style={{ fontSize: 22, minWidth: 28 }}>{i === 0 ? '🏆' : i === scores.length - 1 ? '🐟' : '🎯'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: i === 0 ? C.gold : C.text, marginBottom: 6 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <KaCard card={p.unknown} faceUp small backStyle={BACKS[cardBack]} />
                    <span style={{ fontSize: 9, color: C.gold, fontFamily: 'sans-serif' }}>?</span>
                  </div>
                  <span style={{ color: C.dim, fontSize: 14, margin: '0 2px' }}>+</span>
                  {p.row.map((c, ci) => <KaCard key={ci} card={c} faceUp small backStyle={BACKS[cardBack]} />)}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? C.gold : C.dim }}>{p.total}<span style={{ fontSize: 11, opacity: 0.6 }}>p</span></div>
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
  const ais = G.players.slice(1);
  const discardTop = G.discard[G.discard.length - 1];
  const canDraw = curIdx === 0 && phase === 'drawing';
  const canSwapRow = curIdx === 0 && (phase === 'holding' || phase === 'swapping');
  // canDiscard: holding phase AND drew from deck (not discard)
  const canDiscard = curIdx === 0 && phase === 'holding' && drawnFromRef.current !== 'discard';
  const canStop    = curIdx === 0 && !!held && (phase === 'swapping' || canDiscard);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: 32 }}>
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
      <div style={{ background: 'linear-gradient(135deg,#09192a,#071420)', border: `1px solid ${C.blue}40`, borderRadius: 14, padding: '12px 16px', marginBottom: 12, height: 72, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🐟</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: '#b5d5e5' }}>{msg}</p>
      </div>

      {ais.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {ais.map((p, i) => {
            const pi = i + 1, isActive = curIdx === pi;
            return (
              <div key={p.id} style={{ flex: 1, minWidth: 100, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, marginBottom: 6 }}>🤖 {p.name}{isActive ? ' ●' : ''}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <KaCard card={p.unknown} unknown={!revealed && !debugOpen} faceUp={revealed || debugOpen} small backStyle={BACKS[cardBack]} />
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {p.row.map((c, ci) => <KaCard key={ci} card={c} faceUp={revealed || debugOpen} small backStyle={BACKS[cardBack]} />)}
                </div>
                <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginTop: 4 }}>
                  {revealed ? `${p.unknown.v + p.row.reduce((s, c) => s + c.v, 0)} p` : korttia(p.row.length)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pakka-alue */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, marginBottom: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>NOSTOPAKKA</div>
          <div onClick={canDraw ? () => humanDraw(false) : undefined}>
            <FanStack
              count={G.deck.length}
              w={72} h={98}
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
            style={{ cursor: (canDraw && discardTop) || canDiscard ? 'pointer' : 'default', position: 'relative', width: 72, height: 98 }}
          >
            {!discardTop
              ? <div style={{ width: 72, height: 98, borderRadius: 9, border: `1.5px dashed ${canDiscard ? C.gold : C.panelBorder}`, opacity: canDiscard ? 0.8 : 0.3, boxShadow: canDiscard ? `0 0 14px rgba(201,168,76,0.4)` : 'none', transition: 'all 0.2s' }} />
              : <div style={{ position: 'relative', width: 72, height: 98, borderRadius: 9, background: C.card, border: `2px solid ${(canDraw || canDiscard) ? C.gold : '#aaa'}`, boxShadow: (canDraw || canDiscard) ? `0 0 18px rgba(201,168,76,0.5)` : '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: isRed(discardTop.s) ? '#b83030' : '#1a1a2e', fontFamily: 'Georgia,serif', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{discardTop.r}</div>
                  <div style={{ fontSize: 22 }}>{discardTop.s}</div>
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
      </div>

      {/* Ihmispelaajan tuntematon + jono */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${curIdx === 0 ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: curIdx === 0 ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero {curIdx === 0 ? '●' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <KaCard card={human.unknown} unknown faceUp={false} small backStyle={BACKS[cardBack]} />
            <div style={{ fontFamily: 'sans-serif', fontSize: 9, color: C.gold, marginTop: 3 }}>?</div>
          </div>
          <span style={{ color: C.dim, fontSize: 16, marginBottom: 20 }}>+</span>
          {human.row.map((c, i) => {
            const isSwapTarget = canSwapRow && swapIdx === i;
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <KaCard card={c} faceUp={debugOpen || human.known.has(i)} small
                  highlight={isSwapTarget}
                  pulse={hints && human.known.has(i) && !isSwapTarget}
                  backStyle={BACKS[cardBack]} />
                <div style={{ fontFamily: 'sans-serif', fontSize: 9, color: isSwapTarget ? C.gold : C.dim, marginTop: 3 }}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toimintopainikkeet */}
      <div style={{ minHeight: 44, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        {canSwapRow && swapIdx !== null && (
          <button onClick={() => humanSwapRow(swapIdx)} style={{ background: C.gold + '18', border: `1px solid ${C.gold}`, borderRadius: 9, padding: '10px 18px', color: C.gold, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.5 }}>
            {`Vaihda ${lbl(held)} paikan ${swapIdx + 1} korttiin`}
          </button>
        )}
        {canStop && (
          <button onClick={humanStopSwap} style={{ background: 'transparent', border: `1px solid ${C.gold}88`, borderRadius: 9, padding: '10px 18px', color: C.gold, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.5 }}>
            {`Heitä ${lbl(held)} poistopakkaan`}
          </button>
        )}
      </div>

      {/* Tilarivi */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        {G.players.map((p, i) => (
          <div key={p.id} style={{ fontFamily: 'sans-serif', fontSize: 11, padding: '4px 10px', borderRadius: 16, border: `1px solid ${curIdx === i ? C.gold + '55' : C.panelBorder}`, color: curIdx === i ? C.gold : C.dim, background: curIdx === i ? C.gold + '08' : 'transparent' }}>
            {p.name}{curIdx === i ? ' ●' : ''}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'}</button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: '1px solid #2a4a32', background: 'transparent', color: C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'}</button>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>TAPAHTUMALOKI</span>
          <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {log.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 14px', borderTop: '1px solid rgba(42,74,50,0.4)', background: i === 0 ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
                <span style={{ fontSize: 12, color: i === 0 ? '#c0d8c8' : '#8aaa90', fontFamily: 'sans-serif', lineHeight: 1.5 }}>{e.m}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes revealFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9)}100%{box-shadow:none}}
        @keyframes platina{0%,100%{border-color:rgba(200,210,235,0.5);box-shadow:0 0 5px rgba(210,215,255,0.2)}50%{border-color:rgba(235,240,255,1);box-shadow:0 0 14px rgba(220,225,255,0.7)}}
        @keyframes kohahdus{0%{opacity:0;transform:scale(0.55)}15%{opacity:1;transform:scale(1.08)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.92)}}
        button:active{transform:scale(0.97)}
      `}</style>
    </div>
  );
}
