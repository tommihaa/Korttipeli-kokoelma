import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, SUITS, RANKS, VAL } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';

// ── Seiska ─────────────────────────────────────────────────────
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';
const coloredSuit = s => `<span style="color:${SUIT_COLOR[s]}">${s}</span>`;
const SUIT_SYMS = ['♠', '♥', '♦', '♣'];

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames(pool) {
  const a = [...(pool || AI_NAMES)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mkDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({
    s, r, v: VAL[r], id: `${r}${s}_${Math.random()}`,
  }))));
}

// Voidaanko yksittäinen kortti lyödä
function canSingle(card, discardTop, reqSuit, isLast) {
  if (card.r === '7' && isLast)            return false; // ei voi voittaa seiskalla
  if (card.r === 'A' && isLast)            return false; // ei voi voittaa ässällä
  if (card.r === '7')                      return true;  // 7 on villikortti — käy kaiken päälle
  const suit = reqSuit || discardTop.s;
  if (card.s === suit)                     return true;
  if (!reqSuit && card.r === discardTop.r) return true;
  return false;
}

// Voidaanko korttiryhmä lyödä (sama arvo useampana)
function canGroup(cards, discardTop, reqSuit, handSize) {
  if (!cards.length) return false;
  if (cards.length === 1) return canSingle(cards[0], discardTop, reqSuit, handSize === 1);
  if (cards[0].r === '7' || cards[0].r === 'A') return false; // seiskat ja ässät vain yksinään
  if (cards.some(c => c.r !== cards[0].r)) return false;      // kaikki sama arvo
  return cards.some(c => canSingle(c, discardTop, reqSuit, false)); // vähintään yksi käy
}

function validSingles(hand, discardTop, reqSuit) {
  return hand.filter(c => canSingle(c, discardTop, reqSuit, hand.length === 1));
}

function mkInitState(nP, pool) {
  const aiNames = shuffledAINames(pool);
  let deck = mkDeck();
  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? 'Hero' : aiNames[i - 1],
    isHuman: i === 0,
    hand: deck.splice(0, 7),
  }));
  let top;
  do { top = deck.shift(); }
  while ((top.r === '7' || top.r === 'A') && deck.length > 0);
  return {
    players, deck,
    discardPile: [top], discardTop: top,
    reqSuit: null,
    activePlayer: 0,
    drawsThisTurn: 0,
    lappuSaid: new Set(),
    pendingLappu: null,
    aceBonus: null,
    finished: [],
    phase: 'play',
    reshuffleCount: 0,
  };
}

function reshuffleIfNeeded(g) {
  if (g.deck.length > 0) return g;
  if (g.discardPile.length <= 1) return g;
  const top = g.discardPile[g.discardPile.length - 1];
  return { ...g, deck: shuffle(g.discardPile.slice(0, -1)), discardPile: [top], reshuffleCount: (g.reshuffleCount || 0) + 1 };
}

function nextActive(players, from, finished) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!finished.includes(idx)) return idx;
  }
  return -1;
}

function aiBestPlay(hand, discardTop, reqSuit) {
  if (!reqSuit) {
    const same = hand.filter(c => c.r === discardTop.r && c.r !== '7');
    if (same.length > 1) return same;
  }
  const singles = validSingles(hand, discardTop, reqSuit);
  if (!singles.length) return null;
  const non7 = singles.filter(c => c.r !== '7');
  return [non7.length ? non7[0] : singles[0]];
}

function aiSuit(hand) {
  const cnt = {};
  SUIT_SYMS.forEach(s => { cnt[s] = hand.filter(c => c.s === s).length; });
  return SUIT_SYMS.reduce((a, b) => cnt[a] >= cnt[b] ? a : b);
}

const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
    return sd !== 0 ? sd : a.v - b.v;
  });
}

// ── Komponentti ─────────────────────────────────────────────────
export default function Seiska({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, teachMode = true, isMobile = false, playerNames }) {
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(4);
  const [soundOn,  setSnd]     = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G,        setG]       = useState(null);
  const [msg,      setMsg_]    = useState('');
  const [log,      setLog]     = useState([]);
  const [logOpen,  setLO]      = useState(hints);
  const [selected, setSel]     = useState([]);
  const [debugOpen,setDebug]   = useState(initSeeAll);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [jpId, setJP] = useState(null);
  const [shuffling, setShuffling] = useState(false);
  const [currentMoment, setCurrentMoment] = useState(null);

  const gRef   = useRef(null);
  const aiTmr  = useRef(null);
  const logRef = useRef([]);
  const sndRef = useRef(true);
  const prevDeckRef = useRef(null);
  const prevRCRef   = useRef(0);

  useEffect(() => { gRef.current = G; },        [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => clearTimeout(aiTmr.current), []);

  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    const trulyEmpty = cur === 0 && G.discardPile.length <= 1;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && trulyEmpty) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length, G?.discardPile?.length]);

  useEffect(() => {
    if (!G) return;
    const rc = G.reshuffleCount || 0;
    if (rc > prevRCRef.current) {
      prevRCRef.current = rc;
      setShuffling(true);
    }
  }, [G?.reshuffleCount]);

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function setGS(g) { setG(g); gRef.current = g; }

  function startGame() {
    clearTimeout(aiTmr.current);
    prevRCRef.current = 0;
    const g = mkInitState(nP, playerNames);
    logRef.current = []; setLog([]); setSel([]); setPakaAnim(false);
    setGS(g);
    addLog(`Seiska alkaa! Päällimmäinen: ${lblColored(g.discardTop)}.`);
    setScreen('game');
    setShuffling(true);
    if (g.players[0].isHuman) {
      addLog(`Sinun vuorosi — lyö ${coloredSuit(g.discardTop.s)}-maa tai ${g.discardTop.r}.`);
    } else {
      aiTmr.current = setTimeout(() => runAI(g), 3100);
    }
  }

  // ── Ässärangaistus: muut nostavat kortin ────────────────────
  function applyAcePenalty(g, fromIdx) {
    let g2 = reshuffleIfNeeded(g);
    let deck = [...g2.deck];
    const players = g2.players.map((p, i) => {
      if (i === fromIdx || g2.finished.includes(i)) return p;
      if (!deck.length) return p;
      const drawn = deck.shift();
      addLog(`${p.isHuman ? 'Sinä nostat' : `${p.name} nostaa`} ässärangaistuksena ${lblColored(drawn)}.`);
      return { ...p, hand: [...p.hand, drawn] };
    });
    return { ...g2, players, deck };
  }

  // ── Lappu-tarkistus ennen seuraavaa vuoroa ──────────────────
  function applyLappu(g) {
    if (g.pendingLappu === null || g.lappuSaid.has(g.pendingLappu)) {
      return { ...g, pendingLappu: null };
    }
    let g2 = reshuffleIfNeeded(g);
    const pen = g2.deck.slice(0, 5);
    g2 = {
      ...g2,
      deck: g2.deck.slice(pen.length),
      players: g2.players.map((p, i) => i !== g.pendingLappu ? p
        : { ...p, hand: [...p.hand, ...pen] }),
      lappuSaid: new Set([...g2.lappuSaid, g.pendingLappu]),
      pendingLappu: null,
    };
    addLog(`${g.players[g.pendingLappu].name} unohti sanoa Lappu — +${pen.length} korttia sakkona!`);
    return g2;
  }

  // ── Vuoron vaihto ───────────────────────────────────────────
  function advanceTurn(g, fromIdx) {
    let g2 = applyLappu(g);
    const nextIdx = nextActive(g2.players, fromIdx, g2.finished);
    if (nextIdx === -1) return;
    const g3 = { ...g2, activePlayer: nextIdx, drawsThisTurn: 0 };
    setGS(g3);
    if (!g3.players[nextIdx].isHuman) {
      aiTmr.current = setTimeout(() => runAI(g3), 1200 + Math.random() * 400);
    } else if (hints) {
      const cl = g3.reqSuit
        ? `Vaadittu maa: ${coloredSuit(g3.reqSuit)} — lyö ${coloredSuit(g3.reqSuit)}-maa tai nosta.`
        : `Lyö ${coloredSuit(g3.discardTop.s)}-maa tai ${g3.discardTop.r}-arvo tai nosta.`;
      addLog(`Sinun vuorosi — ${cl}`);
    }
  }

  // ── Lyönti ──────────────────────────────────────────────────
  function doPlay(g, playerIdx, cards, suitChoice) {
    const p     = g.players[playerIdx];
    const card  = cards[cards.length - 1];
    const isH   = p.isHuman;

    if (sndRef.current) SFX.flip();
    addLog(`${isH ? 'Sinä' : p.name}: ${cards.map(lblColored).join(', ')}`);

    // Poista kädestä
    let players = g.players.map((pl, i) => i !== playerIdx ? pl
      : { ...pl, hand: pl.hand.filter(c => !cards.find(sc => sc.id === c.id)) });
    const newHand = players[playerIdx].hand;

    // Tarkista voitto
    let finished = [...g.finished];
    let gameOver = false;
    if (newHand.length === 0 && !finished.includes(playerIdx)) {
      finished = [...finished, playerIdx];
      addLog(`${isH ? 'Veit voiton' : `${p.name} vei voiton`}! 🏆🎉`);
      if (sndRef.current) SFX.capture();
      if (g.players.every((_, i) => finished.includes(i) || i === playerIdx)) {
        g.players.forEach((_, i) => { if (!finished.includes(i)) finished.push(i); });
        gameOver = true;
      } else if (finished.length >= g.players.length - 1) {
        g.players.forEach((_, i) => { if (!finished.includes(i)) finished.push(i); });
        gameOver = true;
      }
    }

    let g2 = { ...g, players, finished };

    if (gameOver) {
      onResult?.(finished[0] === 0);
      setGS({ ...g2, phase: 'gameover' });
      return;
    }

    setJP(card.id);
    setTimeout(() => setJP(null), 2200);

    // Seiska: valitse maa
    if (card.r === '7') {
      const newDiscard = { ...g2, discardTop: card, discardPile: [...g2.discardPile, ...cards], reqSuit: null, finished };
      const pendLappu = (newHand.length === 1 && !g2.lappuSaid.has(playerIdx)) ? playerIdx : g2.pendingLappu;
      if (g2.reqSuit !== null) {
        // Seiska seiskan päälle — väri automaattisesti tämän seiskan oma maa
        const suit = card.s;
        addLog(`${isH ? 'Sinä' : p.name} laittaa seiskan päälle — vaadittu maa: ${suit}`);
        g2 = { ...newDiscard, reqSuit: suit, pendingLappu: pendLappu };
      } else if (!suitChoice && p.isHuman) {
        setGS({ ...newDiscard, phase: 'awaiting_suit', pendingLappu: null });
        addLog('Valitse vaadittu maa seiskan jälkeen.');
        return;
      } else {
        const suit = suitChoice || aiSuit(newHand);
        if (!suitChoice) addLog(`${isH ? 'Sinä valitset' : `${p.name} valitsee`} maan: ${suit}`);
        g2 = { ...newDiscard, reqSuit: suit, pendingLappu: pendLappu };
      }
    } else {
      g2 = { ...g2, discardTop: card, discardPile: [...g2.discardPile, ...cards], reqSuit: null };
    }

    // Ässä: bonusvuoro — pelaaja voi jatkaa saman maan kortilla
    if (card.r === 'A') {
      g2 = { ...g2, aceBonus: card.s };
      if (newHand.length === 1 && !g2.lappuSaid.has(playerIdx) && !finished.includes(playerIdx)) {
        if (!p.isHuman) {
          addLog(`${p.name}: Lappu!`);
          g2 = { ...g2, lappuSaid: new Set([...g2.lappuSaid, playerIdx]) };
        }
        // Ihmiselle: ei aseteta pendingLappu vielä — odotetaan bonusvuoron päättymistä
      }
      addLog(`Ässä! ${isH ? 'Sinä voit' : `${p.name} voi`} jatkaa ${card.s}-maalla.`);
      setGS(g2);
      if (!p.isHuman) aiTmr.current = setTimeout(() => runAI(gRef.current), 1600);
      return;
    }

    // Lappu
    if (newHand.length === 1 && !g2.lappuSaid.has(playerIdx) && !finished.includes(playerIdx)) {
      if (!p.isHuman) {
        addLog(`${p.name}: Lappu!`);
        g2 = { ...g2, lappuSaid: new Set([...g2.lappuSaid, playerIdx]) };
        advanceTurn(g2, playerIdx);
      } else {
        g2 = { ...g2, pendingLappu: playerIdx };
        setGS(g2);
        // Anna ihmiselle 3 s aikaa sanoa Lappu ennen sakotusta
        setTimeout(() => advanceTurn(gRef.current, playerIdx), 3000);
      }
    } else {
      advanceTurn(g2, playerIdx);
    }
  }

  // ── Nosto ───────────────────────────────────────────────────
  function doDraw(g, playerIdx) {
    let g2 = reshuffleIfNeeded(g);
    if (!g2.deck.length) {
      addLog('Pakka tyhjä — vuoro päättyy.');
      advanceTurn(g2, playerIdx);
      return;
    }
    const [drawn, ...deck] = g2.deck;
    const prevHandSize = g2.players[playerIdx].hand.length;
    const players = g2.players.map((p, i) => i !== playerIdx ? p : { ...p, hand: [...p.hand, drawn] });
    const draws   = g2.drawsThisTurn + 1;
    let lappuSaid = g2.lappuSaid;
    if (prevHandSize === 1 && lappuSaid.has(playerIdx)) {
      lappuSaid = new Set([...lappuSaid].filter(id => id !== playerIdx));
    }
    g2 = { ...g2, deck, players, drawsThisTurn: draws, lappuSaid };
    const isH2 = g2.players[playerIdx].isHuman;
    setGS(g2);

    const hand  = players[playerIdx].hand;
    const valid = canSingle(drawn, g2.discardTop, g2.reqSuit, hand.length === 1);

    if (!isH2) {
      const pName = g2.players[playerIdx].name;
      if (valid) {
        addLog(`${pName} nostaa.`);
        aiTmr.current = setTimeout(() => doPlay(gRef.current, playerIdx, [drawn], null), 700);
      } else if (draws < 3) {
        addLog(`${pName}: Nosto ei auta.`);
        aiTmr.current = setTimeout(() => doDraw(gRef.current, playerIdx), 700);
      } else {
        addLog(`${pName}: Nostot eivät auttaneet.`);
        aiTmr.current = setTimeout(() => advanceTurn(gRef.current, playerIdx), 700);
      }
    } else {
      addLog(`Nostat ${lbl(drawn)}.`);
      if (valid) {
        addLog(`${lbl(drawn)} on pelattavissa! Lyö se tai nosta uudelleen (${3 - draws} jäljellä).`);
      } else if (draws >= 3) {
        addLog('3 nostoa käytetty — vuoro päättyy automaattisesti.');
        setTimeout(() => advanceTurn(gRef.current, playerIdx), 900);
      } else {
        addLog(`${lbl(drawn)} ei käy. Nosta uudelleen (${3 - draws} jäljellä) tai lopeta vuoro.`);
      }
    }
  }

  // ── AI ──────────────────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase !== 'play') return;
    const { activePlayer, players, discardTop, reqSuit, drawsThisTurn, aceBonus } = g;
    const p = players[activePlayer];
    if (!p || p.isHuman) return;

    // Ässä-bonusvuoro: pelaa saman maan kortti tai lopeta (+ rangaistus)
    if (aceBonus !== null) {
      const bonusCard = p.hand.find(c => c.s === aceBonus && c.r !== '7');
      if (bonusCard) {
        doPlay({ ...gRef.current, aceBonus: null }, activePlayer, [bonusCard], null);
      } else {
        const g2 = applyAcePenalty({ ...gRef.current, aceBonus: null }, activePlayer);
        advanceTurn(g2, activePlayer);
      }
      return;
    }

    const play = aiBestPlay(p.hand, discardTop, reqSuit);
    if (play) {
      const suit = play[0].r === '7'
        ? aiSuit(p.hand.filter(c => c.id !== play[0].id))
        : null;
      doPlay(gRef.current, activePlayer, play, suit);
    } else if (drawsThisTurn < 3) {
      doDraw(gRef.current, activePlayer);
    } else {
      advanceTurn(gRef.current, activePlayer);
    }
  }

  // ── Ihmistoiminnot ──────────────────────────────────────────
  function humanToggle(card) {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    if (G.aceBonus !== null) {
      if (card.s !== G.aceBonus || card.r === '7') return;
      setSel(prev => prev.find(c => c.id === card.id) ? [] : [card]);
      return;
    }
    setSel(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0) {
        if (card.r === '7' || card.r === 'A') return prev;
        if (prev[0].r !== card.r) return prev;
      }
      return [...prev, card];
    });
  }

  function humanPlay() {
    if (!selected.length || !G) return;
    const g = gRef.current;
    if (g.aceBonus !== null) {
      const card = selected[0];
      if (card.s !== g.aceBonus) { addLog('Valitse sama maa kuin ässä.'); return; }
      setSel([]);
      doPlay({ ...g, aceBonus: null }, 0, [card], null);
      return;
    }
    if (!canGroup(selected, g.discardTop, g.reqSuit, g.players[0].hand.length)) {
      addLog('Nämä kortit eivät käy.');
      return;
    }
    const cards = [...selected]; setSel([]);
    doPlay(g, 0, cards, null);
  }

  function humanSkipAceBonus() {
    const g = gRef.current;
    if (!g || g.aceBonus === null) return;
    setSel([]);
    const g2 = applyAcePenalty({ ...g, aceBonus: null }, 0);
    const newHand = g2.players[0].hand;
    if (newHand.length === 1 && !g2.lappuSaid.has(0)) {
      const g3 = { ...g2, pendingLappu: 0 };
      setGS(g3);
      setTimeout(() => advanceTurn(gRef.current, 0), 3000);
    } else {
      advanceTurn(g2, 0);
    }
  }

  function humanChooseSuit(suit) {
    const g = gRef.current;
    if (!g || g.phase !== 'awaiting_suit') return;
    addLog(`Valitsit maan: ${suit}`);
    const newHand = g.players[0].hand;
    if (newHand.length === 1 && !g.lappuSaid.has(0)) {
      const g2 = { ...g, reqSuit: suit, phase: 'play', pendingLappu: 0 };
      setGS(g2);
      setTimeout(() => advanceTurn(gRef.current, 0), 3000);
    } else {
      advanceTurn({ ...g, reqSuit: suit, phase: 'play' }, 0);
    }
  }

  function humanDraw() {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    doDraw(gRef.current, 0);
  }

  function humanEndTurn() {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0 || G.drawsThisTurn === 0) return;
    setSel([]);
    advanceTurn(gRef.current, 0);
  }

  function humanLappu() {
    const g = gRef.current;
    if (!g) return;
    setGS({ ...g, lappuSaid: new Set([...g.lappuSaid, 0]), pendingLappu: null });
    addLog('Lappu! Sinulla on yksi kortti jäljellä.');
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => { if (G?.phase === 'gameover') window.scrollTo(0, 0); }, [G?.phase]);

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>7️⃣</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SEISKA</h1>
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
              <button key={n} onClick={() => setNP(n)} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.9, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt lyhyesti</span><br />
        Lyö sama maa (1 kerralla) TAI sama arvo (useampi kerralla)<br />
        Ei sovi → nosta enintään 3 korttia, pelaa jos löytyy<br />
        <span style={{ color: C.blue }}>7</span> → valitse vaadittu maa<br />
        <span style={{ color: C.red }}>A</span> → bonusvuoro saman maan kortilla<br />
        1 kortti → sano LAPPU tai +5
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
      </div>
    </div>
  );

  // ── Gameover ────────────────────────────────────────────────
  if (screen === 'game' && G?.phase === 'gameover') {
    const { finished, players } = G;
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {finished.map((pid, i) => {
            const p = players[pid];
            const isFirst = i === 0, isLast = i === finished.length - 1;
            return (
              <div key={pid} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: isFirst ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${isFirst ? C.gold + '55' : C.panelBorder}` }}>
                <span style={{ fontSize: 20 }}>{isFirst ? '🏆' : isLast ? '💀' : '🎯'}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: isFirst ? C.gold : C.text }}>{p.name}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim }}>Sija {i + 1}</span>
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

  const human      = G.players[0];
  const isMyTurn   = G.activePlayer === 0 && (G.phase === 'play' || G.phase === 'awaiting_suit');
  const canAct     = isMyTurn && G.phase === 'play';
  const hasValid   = canAct && validSingles(human.hand, G.discardTop, G.reqSuit).length > 0;
  const canDraw    = canAct && G.drawsThisTurn < 3 && G.aceBonus === null;
  const canEnd     = canAct && G.drawsThisTurn > 0 && G.aceBonus === null;
  const showLappu  = human.hand.length === 1 && !G.lappuSaid.has(0) && G.pendingLappu === 0 && G.phase === 'play';

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: isMobile ? 8 : 32 }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, color: C.gold }}>7</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Pelaajastatus */}
      <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
        {G.players.map((p, i) => {
          const isActive = G.activePlayer === i;
          const isDone   = G.finished.includes(i);
          const rank     = isDone ? G.finished.indexOf(i) + 1 : null;
          return (
            <div key={i} style={{ padding: '4px 10px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: 11, background: isActive ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, color: isActive ? C.gold : C.dim, opacity: isDone ? 0.5 : 1 }}>
              {isActive ? '► ' : ''}{p.name}{isDone ? ` (${rank}.)` : ` — ${p.hand.length}k`}
            </div>
          );
        })}
      </div>

      {/* AI-kädet */}
      {G.players.filter((_, i) => i !== 0).length > 0 && (
        isMobile ? (
          <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
            {G.players.filter((_, i) => i !== 0).map(p => {
              const isActive = G.activePlayer === p.id;
              const isDone   = G.finished.includes(p.id);
              const hasLappu = G.lappuSaid.has(p.id) && p.hand.length === 1;
              return (
                <div key={p.id} style={{ padding: '3px 8px', borderRadius: 8, fontFamily: 'sans-serif', fontSize: 11, background: isActive ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, color: isActive ? C.gold : C.dim, opacity: isDone ? 0.4 : 1 }}>
                  {isActive ? '► ' : '🤖 '}{p.name} — {p.hand.length}k{hasLappu ? <span style={{ color: C.red }}> LAPPU</span> : ''}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {G.players.filter((_, i) => i !== 0).map(p => {
              const isActive = G.activePlayer === p.id;
              const isDone   = G.finished.includes(p.id);
              return (
                <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '7px 10px', textAlign: 'center', opacity: isDone ? 0.35 : 1 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, marginBottom: 4 }}>
                    {isActive ? '► ' : '🤖 '}{p.name}
                    {G.lappuSaid.has(p.id) && p.hand.length === 1 && <span style={{ color: C.red, marginLeft: 4 }}>LAPPU</span>}
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
        )
      )}

      {/* Pakka + lyöntipakka */}
      <div style={{ display: 'flex', gap: 16, marginBottom: isMobile ? 6 : 12, alignItems: 'center', padding: isMobile ? '8px 10px' : '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 5, letterSpacing: 1.5 }}>PAKKA</div>
          <div style={{ width: 60, height: 82, borderRadius: 7, background: BACKS[cardBack].bg, border: `2px solid ${BACKS[cardBack].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11,
              color: G.deck.length === 0 && G.discardPile.length <= 1 ? C.red : C.dim,
              fontWeight: G.deck.length === 0 && G.discardPile.length <= 1 ? 700 : 400,
              animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
              {G.deck.length === 0 && G.discardPile.length <= 1 ? 'TYHJÄ!' : G.deck.length}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 5, letterSpacing: 1.5 }}>LYÖNTIPAKKA</div>
          <Card card={G.discardTop} large justPlaced={G.discardTop?.id === jpId} backStyle={BACKS[cardBack]} />
        </div>
        {G.reqSuit && (
          <div style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(201,168,76,0.1)', border: `2px solid ${C.gold}66`, textAlign: 'center' }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, marginBottom: 4, letterSpacing: 1.5 }}>VAADITTU MAA</div>
            <div style={{ fontSize: 48, color: SUIT_COLOR[G.reqSuit], lineHeight: 1 }}>{G.reqSuit}</div>
          </div>
        )}
        {G.drawsThisTurn > 0 && (
          <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.blue }}>
            Nostoja: {G.drawsThisTurn}/3
          </div>
        )}
      </div>

      {/* Suit-valitsin (seiskan jälkeen) */}
      {G.phase === 'awaiting_suit' && G.activePlayer === 0 && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${C.gold}44`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.gold, marginBottom: 10 }}>Valitse vaadittu maa:</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {SUIT_SYMS.map(s => (
              <button key={s} onClick={() => humanChooseSuit(s)}
                style={{ width: 52, height: 52, fontSize: 26, borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: `2px solid ${C.gold}55`, color: SUIT_COLOR[s], transition: 'all 0.15s' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ässä-bonusvuoro */}
      {G.aceBonus !== null && G.activePlayer === 0 && (
        <div style={{ background: 'rgba(91,168,212,0.1)', border: `1px solid ${C.blue}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 30, color: SUIT_COLOR[G.aceBonus], lineHeight: 1 }}>{G.aceBonus}</span>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.text, flex: 1 }}>Ässä! Voit jatkaa {G.aceBonus}-maalla tai lopettaa vuoron.</span>
          <button onClick={humanSkipAceBonus} style={{ background: 'transparent', border: `1px solid ${C.dim}55`, borderRadius: 8, padding: '7px 14px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Lopeta</button>
        </div>
      )}

      {/* Lappu-banneri */}
      {showLappu && (
        <div style={{ background: 'rgba(224,92,59,0.12)', border: `1px solid ${C.red}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.red, flex: 1 }}>1 kortti jäljellä — sano Lappu ennen seuraavan vuoroa!</span>
          <button onClick={humanLappu} style={{ background: C.red, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>LAPPU!</button>
        </div>
      )}

      {/* Oma käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero{human.hand.length > 0 ? ` — ${korttia(human.hand.length)} kädessä` : ' — tyhjä! 🏆'}
          {G.lappuSaid.has(0) && human.hand.length === 1 && <span style={{ color: C.gold, marginLeft: 8 }}>LAPPU</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: isMobile ? 90 : 216 }}>
          {sortHand(human.hand).map(c => {
            const isSel   = !!selected.find(s => s.id === c.id);
            const single  = canAct && (G.aceBonus !== null
              ? (c.s === G.aceBonus && c.r !== '7')
              : canSingle(c, G.discardTop, G.reqSuit, human.hand.length === 1));
            const multi   = canAct && G.aceBonus === null && c.r !== '7' && c.r !== 'A' && (
              selected.length > 0
                ? c.r === selected[0].r && !isSel
                : !G.reqSuit && c.r === G.discardTop.r
            );
            const hl      = !isSel && (selected.length > 0 ? multi : (single || multi));
            const dimmed  = canAct && !isSel && (selected.length > 0 ? !multi : (!single && !multi));
            return (
              <Card key={c.id} card={c} large={!isMobile} small={isMobile}
                selected={isSel}
                highlight={!!hl}
                dim={!!dimmed}
                onClick={canAct ? () => humanToggle(c) : undefined}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>

      {/* Toiminnot */}
      <div style={{ minHeight: isMobile ? 36 : 52, display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {canAct && (
          <>
            {selected.length > 0 && (
              <>
                <button onClick={humanPlay}
                  style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 20px', color: '#0d2118', fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                  Lyö ({selected.map(lbl).join(', ')})
                </button>
                <button onClick={() => setSel([])} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </>
            )}
            {!selected.length && canDraw && (
              <button onClick={humanDraw}
                style={{ background: 'rgba(91,168,212,0.12)', border: `1px solid ${C.blue}55`, borderRadius: 10, padding: '10px 18px', color: C.blue, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Nosta ({3 - G.drawsThisTurn} jäljellä)
              </button>
            )}
            {!selected.length && canEnd && (
              <button onClick={humanEndTurn}
                style={{ background: 'rgba(106,138,114,0.12)', border: `1px solid ${C.dim}55`, borderRadius: 10, padding: '10px 18px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                Lopeta vuoro
              </button>
            )}
          </>
        )}
      </div>

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: isMobile ? 4 : 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: isMobile ? 4 : 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flex: 1 }}>
          <span style={{
            color: G.deck.length === 0 && G.discardPile.length <= 1 ? C.red : 'inherit',
            fontWeight: G.deck.length === 0 && G.discardPile.length <= 1 ? 700 : 'inherit',
            animation: pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
            {G.deck.length === 0 && G.discardPile.length <= 1 ? 'Pakka: TYHJÄ' : `Pakka: ${G.deck.length}k`}
          </span>
          {' · '}{G.reqSuit ? `Vaadittu: ${G.reqSuit}` : `Päällimmäinen: ${lbl(G.discardTop)}`}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'}</button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, border: '1px solid #2a4a32', background: 'transparent', color: C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'}</button>
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
          setMsg_('💾 Momentti tallennettu! Loistava peli!');
          setCurrentMoment(null);
        }}
      />

      <style>{`button:active{transform:scale(0.97)}@keyframes pakaFlash{0%{color:inherit}20%{color:#e05555;font-weight:700;transform:scale(1.15)}60%{color:#e05555;font-weight:700}100%{color:#e05555;font-weight:700}}`}</style>
    </div>
  );
}
