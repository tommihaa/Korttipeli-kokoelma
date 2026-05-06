import { useState, useRef, useEffect } from 'react';
import { C } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';

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

function canPlay(card, top) {
  if (!top) return true; // kaikki kortit käyvät tyhjälle pöydälle
  if (FACES.has(card.r) && top.v < 7) return false; // kuvakorttia ei voi seiskaa pienemmän päälle
  return card.v >= top.v; // mustan kakkosen (v=15) päälle käy vain musta kakkonen
}

// cards = kaikki saman vuoron aikana pelatut kortit (sama arvo)
function pileClears(cards, top) {
  if (!top) return false;
  const r = cards[0].r;
  if (r === '10' && LOW.has(top.r))   return true; // 10 → 3-9
  if (r === 'A'  && FACES.has(top.r)) return true; // A → J/Q/K
  if (cards.length === 4 && (LOW.has(top.r) || FACES.has(top.r))) return true; // 4 samaa → 3-9 tai J/Q/K
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
  while (h.length < HAND_SZ && draw.length) h.push(draw.shift());
  return h;
}

// AI: valitse paras kortti tai kortit
function aiCards(hand, top) {
  const opts = hand.filter(c => canPlay(c, top));
  if (!opts.length) return null;

  // Etsi 4 samaa joka kaataa pinon
  if (top && (LOW.has(top.r) || FACES.has(top.r))) {
    const byRank = {};
    opts.forEach(c => { (byRank[c.r] = byRank[c.r] || []).push(c); });
    const quad = Object.values(byRank).find(g => g.length === 4);
    if (quad) return quad;
  }
  // Yksittäinen kaatava kortti
  const kd = opts.filter(c => pileClears([c], top));
  if (kd.length) return [kd.reduce((a, b) => a.v < b.v ? a : b)];
  // Pienin mahdollinen yksittäinen kortti
  return [opts.reduce((a, b) => a.v < b.v ? a : b)];
}

// ── Komponentti ───────────────────────────────────────────────────────────────

export default function Paskahousu() {
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(4);
  const [soundOn,  setSnd]     = useState(true);
  const [cardBack, setCB]      = useState('ilves');
  const [G,        setG]       = useState(null);
  const [msg,      setMsg_]    = useState('');
  const [log,      setLog]     = useState([]);
  const [logOpen,  setLO]      = useState(true);
  const [jpIds,    setJP]      = useState(new Set());
  const [selected, setSel]     = useState([]);
  const [debugOpen,setDebug]   = useState(false);

  const gRef   = useRef(null);
  const aiTmr  = useRef(null);
  const logRef = useRef([]);
  const sndRef = useRef(true);

  useEffect(() => { gRef.current = G; },         [G]);
  useEffect(() => { sndRef.current = soundOn; },  [soundOn]);
  useEffect(() => () => clearTimeout(aiTmr.current), []);

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

  function startGame() {
    clearTimeout(aiTmr.current);
    setSel([]);
    const g = mkGame(nP);
    logRef.current = []; setLog([]);
    setGS(g);
    const s = g.players[g.turn];
    addLog(`Paskahousu alkaa! ${s.name} aloittaa (alhaisin kortti).`);
    setScreen('game');
    if (!s.isHuman) aiTmr.current = setTimeout(() => runAI(g), 2200);
  }

  // ── applyPlay ─────────────────────────────────────────────────────────────
  function applyPlay(g, pidx, cards) {
    let players    = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    let draw       = [...g.draw];
    let pile       = [...g.pile];
    const p        = players[pidx];
    const topBefore = g.top;
    const pname    = p.name;
    const ids      = new Set(cards.map(c => c.id));

    p.hand = p.hand.filter(c => !ids.has(c.id));
    addLog(`${pname}: ${cards.map(lbl).join(', ')}`);
    if (sndRef.current) SFX.flip();
    setJP(ids);
    setTimeout(() => setJP(new Set()), 2000);

    pile = [...pile, ...cards];
    const newTop = cards[cards.length - 1];

    p.hand = fillHand(p.hand, draw);

    let finished = [...g.finished];
    if (p.hand.length === 0 && !finished.includes(pidx)) {
      finished = [...finished, pidx];
      addLog(`${pname} pääsi kortista! 🎉`);
      if (sndRef.current) SFX.capture();
    }

    // Peli ohi?
    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      const f = [...finished];
      remaining.forEach(pl => { if (!f.includes(pl.id)) f.push(pl.id); });
      addLog(`${players[f[f.length - 1]].name} on Paskahousu! 💩`);
      return setGS({ ...g, players, draw, pile, top: newTop, finished: f, phase: 'gameover' });
    }

    // Kaato? → kaataja jatkaa (uusi vuoro)
    if (pileClears(cards, topBefore)) {
      addLog(`${pname} kaataa pinon! Jatkaa.`);
      if (sndRef.current) SFX.capture();
      const contP = finished.includes(pidx) ? nextActive(players, pidx, finished) : pidx;
      const g2 = { ...g, players, draw, pile: [], top: null, finished, turn: contP, skipNext: -1, phase: 'play' };
      setGS(g2);
      if (players[contP] && !players[contP].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 2400);
      else addLog('Hero jatkaa vuoronsa.');
      return;
    }

    // Tyhjän pöydän rangaistus?
    let skipNext = g.skipNext;
    if (!topBefore && emptyPenalty(cards[0])) {
      const nextP = nextActive(players, pidx, finished);
      if (nextP !== -1) {
        skipNext = nextP;
        addLog(`${lbl(cards[0])} tyhjälle — ${players[nextP].name} nostaa ja menettää vuoronsa!`);
      }
    }

    const advTurn = nextActive(players, pidx, finished);
    const g2 = { ...g, players, draw, pile, top: newTop, finished, turn: advTurn, skipNext, phase: 'play' };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 2200 + Math.random() * 400);
    else addLog('Herolla vuoro.');
  }

  // ── applyKnock ────────────────────────────────────────────────────────────
  function applyKnock(g, pidx) {
    if (!g.draw.length) return;
    let players    = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    let draw       = [...g.draw];
    let pile       = [...g.pile];
    const p        = players[pidx];
    const topBefore = g.top;
    const pname    = p.name;

    const knocked = draw.shift();
    addLog(`${pname} kolautaa: ${lbl(knocked)}`);

    if (canPlay(knocked, topBefore)) {
      addLog(`${lbl(knocked)} kelpaa → menee pinoon.`);
      if (sndRef.current) SFX.flip();
      pile = [...pile, knocked];
      setJP(new Set([knocked.id]));
      setTimeout(() => setJP(new Set()), 2000);

      p.hand = fillHand(p.hand, draw);

      let finished = [...g.finished];
      if (p.hand.length === 0 && !finished.includes(pidx)) {
        finished = [...finished, pidx];
        addLog(`${pname} pääsi kortista! 🎉`);
        if (sndRef.current) SFX.capture();
      }

      const remaining = players.filter((_, i) => !finished.includes(i));
      if (remaining.length <= 1) {
        const f = [...finished];
        remaining.forEach(pl => { if (!f.includes(pl.id)) f.push(pl.id); });
        addLog(`${players[f[f.length - 1]].name} on Paskahousu! 💩`);
        return setGS({ ...g, players, draw, pile, top: knocked, finished: f, phase: 'gameover' });
      }

      if (pileClears([knocked], topBefore)) {
        addLog(`Kaato! ${pname} jatkaa.`);
        if (sndRef.current) SFX.capture();
        const contP = finished.includes(pidx) ? nextActive(players, pidx, finished) : pidx;
        const g2 = { ...g, players, draw, pile: [], top: null, finished, turn: contP, skipNext: -1, phase: 'play' };
        setGS(g2);
        if (players[contP] && !players[contP].isHuman)
          aiTmr.current = setTimeout(() => runAI(g2), 2400);
        else addLog('Hero jatkaa vuoronsa.');
        return;
      }

      let skipNext = g.skipNext;
      if (!topBefore && emptyPenalty(knocked)) {
        const nextP = nextActive(players, pidx, finished);
        if (nextP !== -1) {
          skipNext = nextP;
          addLog(`${lbl(knocked)} tyhjälle — ${players[nextP].name} menettää vuoronsa!`);
        }
      }

      const advTurn = nextActive(players, pidx, finished);
      const g2 = { ...g, players, draw, pile, top: knocked, finished, turn: advTurn, skipNext, phase: 'play' };
      setGS(g2);
      if (players[advTurn] && !players[advTurn].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 2200 + Math.random() * 400);
      else addLog('Herolla vuoro.');
    } else {
      addLog(`${lbl(knocked)} ei kelpaa → ${pname} nostaa koko pinon.`);
      p.hand = [...p.hand, knocked, ...pile];
      const advTurn = nextActive(players, pidx, g.finished);
      const g2 = { ...g, players, draw, pile: [], top: null, finished: g.finished, turn: advTurn, skipNext: g.skipNext, phase: 'play' };
      setGS(g2);
      if (players[advTurn] && !players[advTurn].isHuman)
        aiTmr.current = setTimeout(() => runAI(g2), 2200 + Math.random() * 400);
      else addLog('Herolla vuoro.');
    }
  }

  // ── applyTakePile ─────────────────────────────────────────────────────────
  function applyTakePile(g, pidx) {
    if (!g.pile.length) return;
    let players = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    const pname = players[pidx].name;
    addLog(`${pname} nostaa pinon (${g.pile.length}k).`);
    players[pidx].hand = [...players[pidx].hand, ...g.pile];
    const advTurn = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, pile: [], top: null, finished: g.finished, turn: advTurn, skipNext: g.skipNext, phase: 'play' };
    setGS(g2);
    if (players[advTurn] && !players[advTurn].isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 2200 + Math.random() * 400);
    else addLog('Herolla vuoro.');
  }

  // ── applySkip ─────────────────────────────────────────────────────────────
  function applySkip(g, pidx) {
    let players = g.players.map(p => ({ ...p, hand: [...p.hand] }));
    let draw    = [...g.draw];
    const pname = players[pidx].name;
    if (draw.length) {
      const drawn = draw.shift();
      players[pidx].hand.push(drawn);
      addLog(`${pname} nostaa (${lbl(drawn)}) ja menettää vuoronsa.`);
    } else {
      addLog(`${pname} menettää vuoronsa.`);
    }
    const nextP = nextActive(players, pidx, g.finished);
    const g2 = { ...g, players, draw, skipNext: -1, turn: nextP, phase: 'play' };
    setGS(g2);
    if (nextP !== -1) {
      if (!players[nextP]?.isHuman) aiTmr.current = setTimeout(() => runAI(g2), 2000);
      else addLog('Herolla vuoro.');
    }
  }

  // ── runAI ─────────────────────────────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const { turn, players, top, draw, finished } = g;
    const p = players[turn];
    if (!p || p.isHuman) return;

    if (g.skipNext === turn) { applySkip(gRef.current, turn); return; }

    const cards = aiCards(p.hand, top);
    if (cards)           { applyPlay(gRef.current, turn, cards); return; }
    if (draw.length)     { applyKnock(gRef.current, turn);       return; }
    if (g.pile.length)   { applyTakePile(gRef.current, turn);    return; }

    addLog(`${p.name}: ei pysty tekemään mitään.`);
    const nextP = nextActive(players, turn, finished);
    const g2 = { ...g, turn: nextP };
    setGS(g2);
    if (nextP !== -1 && !players[nextP]?.isHuman)
      aiTmr.current = setTimeout(() => runAI(g2), 1800);
    else addLog('Herolla vuoro.');
  }

  // ── Ihmispelaajan kortinvalinta ───────────────────────────────────────────
  function toggleCard(card) {
    if (!G || G.phase !== 'play' || G.turn !== 0) return;
    if (G.skipNext === 0) return;
    setSel(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      // Eri arvo kuin jo valitut → vaihda valinta
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
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 8, color: C.gold, opacity: 0.6, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
        <h1 style={{ fontSize: 40, letterSpacing: 8, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PASKAHOUSU</h1>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 8 }}>Wikipedia-versio · viimeinen on Paskahousu 💩</p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, marginBottom: 12, letterSpacing: 2 }}>PELAAJIA</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, marginTop: 10, opacity: 0.6 }}>Hero + {nP - 1} tekoäly{nP === 2 ? '' : 'ä'}</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 380, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.9 }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt</span><br />
        <span style={{ color: C.red }}>♥2/♦2</span> pienimmät (arvo 2) · 3…A · <span style={{ color: C.blue }}>♠2/♣2</span> suurimmat (15)<br />
        Maa ei merkitse — pelaa yhtä suuri tai suurempi<br />
        J/Q/K ei saa laittaa alle 7 (arvo &lt; 7) olevan päälle<br />
        Tyhjälle pöydälle: <span style={{ color: C.gold }}>kaikki kortit käyvät</span><br />
        <span style={{ color: C.gold }}>10</span> kaataa (päällä 3–9) · <span style={{ color: C.gold }}>A</span> kaataa (päällä J/Q/K)<br />
        <span style={{ color: C.gold }}>4 samaa</span> kaataa (päällä 3–9 tai J/Q/K) → kaataja jatkaa<br />
        10/A tyhjälle → seuraava nostaa ja menettää vuoronsa<br />
        Valitse 1–4 samanarvoista · Ei sovi → kolauta tai nosta pino
      </div>

      <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>
        Aloita →
      </button>
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
  const canKnock   = isMyTurn && !mustSkip && G.draw.length > 0 && myPlayable.length === 0;
  const canTake    = isMyTurn && !mustSkip && G.pile.length > 0;
  const selValid   = selected.length > 0 && canPlay(selected[0], G.top);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: 32 }}>

      {/* Viesti */}
      <div style={{ background: 'rgba(13,33,24,0.95)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 12, minHeight: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💩</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }}>{msg}</p>
      </div>

      {/* Pelaajastatus */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {G.players.map((p, i) => {
          const isActive = G.turn === i && G.phase === 'play';
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

      {/* Pino */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${G.top ? C.gold + '33' : C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 10, minHeight: 130 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, marginBottom: 8 }}>
          PINO — {G.pile.length === 0 ? 'tyhjä' : `${G.pile.length} korttia`}
          <span style={{ marginLeft: 16 }}>PAKKA — {G.draw.length} korttia</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {G.top
            ? <div style={{ position: 'relative', width: 80, height: 108, flexShrink: 0 }}>
                {G.pile.length >= 3 && <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 108, borderRadius: 7, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-5deg) translate(-4px,3px)', transformOrigin: 'bottom center', opacity: 0.55 }}>{BACKS[cardBack].render(80, 108)}</div>}
                {G.pile.length >= 2 && <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 108, borderRadius: 7, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-2.5deg) translate(-2px,1.5px)', transformOrigin: 'bottom center', opacity: 0.75 }}>{BACKS[cardBack].render(80, 108)}</div>}
                <div style={{ position: 'relative', zIndex: 10 }}>
                  <Card card={G.top} large justPlaced={jpIds.has(G.top.id)} backStyle={BACKS[cardBack]} />
                </div>
              </div>
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
              : 'Pino tyhjä — kaikki kortit käyvät aloittamaan.'}
        </div>
      )}

      {/* Oma käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero — {korttia(human.hand.length)} kädessä
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {human.hand.map(c => {
            const isSel    = !!selected.find(s => s.id === c.id);
            const playable = isMyTurn && !mustSkip && canPlay(c, G.top);
            const sameRank = selected.length > 0 && selected[0].r === c.r;
            const hl       = isMyTurn && !mustSkip && playable && !isSel && (selected.length === 0 || sameRank);
            const dimmed   = isMyTurn && !mustSkip && !playable && !isSel;
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
            Kolauta pakasta
          </button>
        )}
        {canTake && (
          <button onClick={() => { setSel([]); applyTakePile(gRef.current, 0); }} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.dim}44`, borderRadius: 10, padding: '10px 18px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            Nosta pino ({G.pile.length}k)
          </button>
        )}
      </div>

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flex: 1 }}>
          Pelissä: {G.players.filter((_, i) => !G.finished.includes(i)).length} pelaajaa
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Object.entries(BACKS).map(([key, b]) => (
            <button key={key} onClick={() => setCB(key)} title={b.label}
              style={{ width: 18, height: 25, borderRadius: 3, cursor: 'pointer', padding: 0, background: b.bg, border: `2px solid ${cardBack === key ? C.gold : b.border}`, transition: 'all 0.15s', transform: cardBack === key ? 'scale(1.2)' : 'none', flexShrink: 0 }} />
          ))}
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
                <span style={{ fontSize: 12, color: i === 0 ? '#c8e0d0' : '#8aaa90', fontFamily: 'sans-serif', lineHeight: 1.5 }}>{e.m}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`button:active { transform: scale(0.97); }`}</style>
    </div>
  );
}
