import { useState, useRef, useEffect } from 'react';
import { C, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, SUITS, RANKS, VAL } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';

// ── Ristiseiska ─────────────────────────────────────────────────
// Järjestys per maa: 7 → 6 → 8 → ala-pino (5,4,3,2,A) + ylä-pino (9,T,J,Q,K)
// 5 vaatii 8 ensin, 8 vaatii 6 ensin (kiusanteko)
// A kaataa ala-pinon (bonusvuoro), K kaataa ylä-pinon (bonusvuoro)

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames() {
  const a = [...AI_NAMES];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const RANK_VAL = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

function rv(card) { return RANK_VAL[card.r]; }

function isPlayable(card, rows) {
  const row = rows[card.s];
  const v   = rv(card);
  if (!row.active) {
    if (v !== 7) return false;
    // ♣7 on pakko pelata ensin — muut 7:t vasta sen jälkeen
    if (!rows['♣'].active && card.s !== '♣') return false;
    return true;
  }
  if (v === row.low - 1) {
    if (v === 5) return row.high >= 8;  // 5 vaatii 8 ensin
    return true;
  }
  if (v === row.high + 1) {
    if (v === 8) return row.low <= 6;   // 8 vaatii 6 ensin
    return true;
  }
  return false;
}

function hasAnyPlay(hand, rows) {
  return hand.some(c => isPlayable(c, rows));
}

function mkDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({
    s, r, v: VAL[r], id: `${r}${s}_${Math.random()}`,
  }))));
}

function initRows() {
  const rows = {};
  SUITS.forEach(s => { rows[s] = { active: false, low: null, high: null }; });
  return rows;
}

function initGame(nP) {
  const aiNames = shuffledAINames();
  const deck = mkDeck();
  const per  = Math.floor(52 / nP);
  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? 'Hero' : aiNames[i - 1],
    isHuman: i === 0,
    hand: deck.splice(0, per),
  }));

  let starter = 0;
  for (let i = 0; i < players.length; i++) {
    if (players[i].hand.some(c => c.r === '7' && c.s === '♣')) { starter = i; break; }
  }

  return {
    players,
    rows: initRows(),
    activePlayer: starter,
    finished: [],
    bonusTurn: null,
    givingCardTo: null,
    givingPlayerIdx: null,
    phase: 'play',
    turnCount: 0,
    firstRoundDone: false,
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

function prevWithCards(players, from, finished) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from - i + n) % n;
    if (!finished.includes(idx) && players[idx].hand.length > 1) return idx;
  }
  return -1;
}

const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
    return sd !== 0 ? sd : RANK_VAL[a.r] - RANK_VAL[b.r];
  });
}

// AI: seiskat ensin, sitten vältä porttikortteja (6 ja 8) kiusaamiseksi,
// muuten pienin arvo.
function aiBestCard(hand, rows) {
  const valid = hand.filter(c => isPlayable(c, rows));
  if (!valid.length) return null;
  const sevens = valid.filter(c => c.r === '7');
  if (sevens.length) return sevens[0];
  const nonGates = valid.filter(c => c.r !== '6' && c.r !== '8');
  const pool = nonGates.length ? nonGates : valid;
  pool.sort((a, b) => rv(a) - rv(b));
  return pool[0];
}

// ── Komponentti ─────────────────────────────────────────────────
export default function Ristiseiska({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true }) {
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(4);
  const [soundOn,  setSnd]     = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G,        setG]       = useState(null);
  const [msg,      setMsg_]    = useState('');
  const [log,      setLog]     = useState([]);
  const [logOpen,  setLO]      = useState(hints);
  const [selCard,  setSel]     = useState(null);
  const [debugOpen,setDebug]   = useState(initSeeAll);
  const [shuffling, setShuffling] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);

  const gRef       = useRef(null);
  const aiTmr      = useRef(null);
  const lastPlayTmr = useRef(null);
  const logRef     = useRef([]);
  const sndRef     = useRef(true);

  useEffect(() => { gRef.current = G; },        [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => {
    clearTimeout(aiTmr.current);
    clearTimeout(lastPlayTmr.current);
  }, []);

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function showLastPlay(name, card, isHuman = false) {
    setLastPlay({ name, card, isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = setTimeout(() => setLastPlay(null), 2200);
  }

  function setGS(g) { setG(g); gRef.current = g; }

  function startGame() {
    clearTimeout(aiTmr.current);
    const g = initGame(nP);
    logRef.current = []; setLog([]); setSel(null); setLastPlay(null);
    setGS(g);
    const s = g.players[g.activePlayer];
    addLog(`Ristiseiska alkaa! ${s.name} aloittaa ♣7:llä.`);
    setScreen('game');
    setShuffling(true);
    if (!s.isHuman) aiTmr.current = setTimeout(() => runAI(g), 3100);
  }

  // ── Vuoron vaihto ───────────────────────────────────────────
  function advanceTurnRS(g, fromIdx) {
    const nextIdx = nextActive(g.players, fromIdx, g.finished);
    if (nextIdx === -1) return;
    const turnCount = g.turnCount + 1;
    const firstRoundDone = g.firstRoundDone || turnCount >= g.players.length;
    const g2 = { ...g, activePlayer: nextIdx, turnCount, firstRoundDone };
    setGS(g2);
    if (!g.players[nextIdx].isHuman) {
      aiTmr.current = setTimeout(() => runAI(g2), 1100 + Math.random() * 400);
    } else {
      addLog('Sinun vuorosi.');
    }
  }

  // ── Lyönti ──────────────────────────────────────────────────
  function doPlay(g, playerIdx, card) {
    const p   = g.players[playerIdx];
    const isH = p.isHuman;
    const v   = rv(card);

    if (sndRef.current) SFX.flip();
    addLog(`${isH ? 'Sinä' : p.name}: ${lbl(card)}`);
    showLastPlay(isH ? 'Sinä' : p.name, card, isH);

    const rows = { ...g.rows };
    const row  = rows[card.s];
    if (!row.active) {
      rows[card.s] = { active: true, low: 7, high: 7 };
    } else if (v === row.low - 1) {
      rows[card.s] = { ...row, low: v };
    } else {
      rows[card.s] = { ...row, high: v };
    }

    let players = g.players.map((pl, i) => i !== playerIdx ? pl
      : { ...pl, hand: pl.hand.filter(c => c.id !== card.id) });

    let finished = [...g.finished];
    if (players[playerIdx].hand.length === 0 && !finished.includes(playerIdx)) {
      finished = [...finished, playerIdx];
      addLog(`${isH ? 'Voitat' : `${p.name} voittaa`}! 🏆`);
      if (sndRef.current) SFX.capture();
    }

    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      remaining.forEach(pl => { if (!finished.includes(pl.id)) finished.push(pl.id); });
      onResult?.(finished[0] === 0);
      setGS({ ...g, players, rows, finished, phase: 'gameover' });
      return;
    }

    // A kaataa ala-pinon, K kaataa ylä-pinon → bonusvuoro
    const gaveBonus = v === 1 || v === 13;
    const g2 = { ...g, players, rows, finished, bonusTurn: gaveBonus ? playerIdx : null };
    if (gaveBonus) {
      setGS(g2);
      if (!p.isHuman) {
        addLog(`${p.name}: ${v === 1 ? 'Ässä kaataa ala-pinon' : 'Kuningas kaataa ylä-pinon'} — bonusvuoro!`);
        aiTmr.current = setTimeout(() => runAI(g2), 900);
      } else {
        addLog(`${v === 1 ? 'Ässä kaataa ala-pinon' : 'Kuningas kaataa ylä-pinon'} — saat bonusvuoron!`);
      }
      return;
    }

    advanceTurnRS(g2, playerIdx);
  }

  // ── Passaus ─────────────────────────────────────────────────
  function doPass(g, playerIdx) {
    const p   = g.players[playerIdx];
    const isH = p.isHuman;

    if (!g.firstRoundDone) {
      addLog(`${isH ? 'Sinä passaat' : `${p.name} passaa`} (1. kierros — ei rangaistusta).`);
      advanceTurnRS({ ...g }, playerIdx);
      return;
    }

    const giverIdx = prevWithCards(g.players, playerIdx, g.finished);

    if (giverIdx !== -1 && g.players[giverIdx].isHuman) {
      const g2 = { ...g, givingCardTo: playerIdx, givingPlayerIdx: giverIdx };
      setGS(g2);
      addLog(`${isH ? 'Sinä passaat' : `${p.name} passaa`} — valitse kortti annettavaksi.`);
      return;
    }

    let players = g.players;
    if (giverIdx !== -1) {
      const giver    = g.players[giverIdx];
      const unusable = giver.hand.filter(c => !isPlayable(c, g.rows));
      const toGive   = unusable.length ? unusable[unusable.length - 1] : giver.hand[giver.hand.length - 1];
      players = g.players.map((pl, i) => {
        if (i === giverIdx)  return { ...pl, hand: pl.hand.filter(c => c.id !== toGive.id) };
        if (i === playerIdx) return { ...pl, hand: [...pl.hand, toGive] };
        return pl;
      });
      addLog(`${isH ? 'Sinä passaat' : `${p.name} passaa`} — ${giver.isHuman ? 'sinä annat' : `${giver.name} antaa`} ${lbl(toGive)}.`);
    } else {
      addLog(`${isH ? 'Sinä passaat' : `${p.name} passaa`}.`);
    }

    advanceTurnRS({ ...g, players }, playerIdx);
  }

  // ── AI ──────────────────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const { activePlayer, players, rows, bonusTurn } = g;
    const p = players[activePlayer];
    if (!p || p.isHuman) return;

    if (bonusTurn !== null && bonusTurn === activePlayer) {
      const g2 = { ...gRef.current, bonusTurn: null };
      const card = aiBestCard(p.hand, rows);
      if (card) doPlay(g2, activePlayer, card);
      else      advanceTurnRS(g2, activePlayer);
      return;
    }

    const card = aiBestCard(p.hand, rows);
    if (card) doPlay(gRef.current, activePlayer, card);
    else      doPass(gRef.current, activePlayer);
  }

  // ── Ihmistoiminnot ──────────────────────────────────────────
  function humanSelect(card) {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    setSel(prev => prev?.id === card.id ? null : card);
  }

  function humanPlay() {
    if (!selCard || !G) return;
    const g = { ...gRef.current, bonusTurn: null };
    if (!isPlayable(selCard, g.rows)) {
      addLog('Tämä kortti ei käy tähän — valitse toinen.');
      return;
    }
    const card = selCard; setSel(null);
    doPlay(g, 0, card);
  }

  function humanPass() {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    if (hasAnyPlay(G.players[0].hand, G.rows)) {
      addLog('Sinulla on pelattavissa oleva kortti — passata ei voi.');
      return;
    }
    setSel(null);
    doPass(gRef.current, 0);
  }

  function humanEndBonusTurn() {
    const g = gRef.current;
    if (!g || g.bonusTurn !== 0) return;
    setSel(null);
    advanceTurnRS({ ...g, bonusTurn: null }, 0);
  }

  function humanGiveCard(card) {
    const g = gRef.current;
    if (!g || g.givingCardTo === null) return;
    const receiverIdx = g.givingCardTo;
    const players = g.players.map((pl, i) => {
      if (i === 0)           return { ...pl, hand: pl.hand.filter(c => c.id !== card.id) };
      if (i === receiverIdx) return { ...pl, hand: [...pl.hand, card] };
      return pl;
    });
    addLog(`Sinä annat ${lbl(card)} pelaajalle ${g.players[receiverIdx].name}.`);
    const g2 = { ...g, players, givingCardTo: null, givingPlayerIdx: null };
    advanceTurnRS(g2, receiverIdx);
  }

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 8, color: C.gold, opacity: 0.6, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
        <h1 style={{ fontSize: 42, letterSpacing: 10, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>RISTISEISKA</h1>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 8 }}>Rakenna neljä pinoa · Aloita ♣7:llä</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, marginBottom: 12, letterSpacing: 2 }}>PELAAJIA</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, marginTop: 10, opacity: 0.6 }}>Hero + {nP - 1} tekoäly{nP === 2 ? '' : 'ä'}</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 420, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.9 }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt</span><br />
        <span style={{ color: '#1a1a2e', fontWeight: 700, background: '#e8e0d0', borderRadius: 3, padding: '0 4px' }}>♠</span>
        <span style={{ color: '#4a8a5a' }}> ♣</span>
        <span style={{ color: '#c04040' }}> ♥</span>
        <span style={{ color: '#4060c0' }}> ♦</span>
        {' '}· ♣7 haltija aloittaa · Jokaiselle maalle kaksi pinoa<br />
        Järjestys: 7 → 6 → 8 → ala-pino (5,4,3,2,A) + ylä-pino (9,T,J,Q,K)<br />
        5 vaatii 8:n ensin · 8 vaatii 6:n ensin (kiusanteko!)<br />
        Passata voi vain jos mikään kortti ei käy<br />
        1. kierros: passaus rangaistukseton · myöhemmin edellinen pelaaja antaa korttinsa<br />
        A kaataa ala-pinon · K kaataa ylä-pinon — kumpikin antaa bonusvuoron<br />
        <span style={{ color: C.gold, fontWeight: 700 }}>Ensimmäinen kortiton voittaa.</span>
      </div>
      <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>Aloita →</button>
    </div>
  );

  // ── Gameover ────────────────────────────────────────────────
  if (screen === 'game' && G?.phase === 'gameover') {
    const { finished, players } = G;
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
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
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={startGame} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Uusi peli →</button>
          <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>← Vaihda pelaajia</button>
        </div>
      </div>
    );
  }

  if (!G) return null;

  const human       = G.players[0];
  const isGiving    = G.givingCardTo !== null && G.givingPlayerIdx === 0;
  const isBonusTurn = G.bonusTurn === 0;
  const isMyTurn    = G.phase === 'play' && (G.activePlayer === 0 || isBonusTurn);
  const iCanPlay    = (G.activePlayer === 0 || isBonusTurn) && hasAnyPlay(human.hand, G.rows);
  const iCanPass    = G.activePlayer === 0 && !isBonusTurn && !iCanPlay;

  // ── Pöytä: yksi rivi per maa ────────────────────────────────
  // Näytetään vain pinon nykyinen huippukortti: [ylin ala-pino] [7] [ylin ylä-pino]
  // Ala-pinon huippu = pienin pelattu arvo (6→5→4→3→2→A)
  // Ylä-pinon huippu = suurin pelattu arvo (8→9→10→J→Q→K)
  const CARD_H = 30;
  const CARD_W = 48;

  const rankFromVal = v => {
    if (v === 1)  return 'A';
    if (v <= 10)  return String(v);
    return ['J', 'Q', 'K'][v - 11];
  };

  const StackRow = ({ suit }) => {
    const row = G.rows[suit];
    const sc  = suitColor(suit);
    // ♠ = #1a1a1a on näkymätön tummalla taustalla → vaaleansiniharmaa tiileissä
    const tc  = suit === '♠' ? '#8899bb' : sc;

    // Ala-pinon tila
    const lowerActive   = row.active && row.low  <= 6;
    const lowerPlayable = row.active && row.low  === 7;          // voi pelata 6:n
    const lowerRank     = row.active && row.low  <= 6 ? rankFromVal(row.low) : '6';

    // Ylä-pinon tila (8 vaatii 6 ensin)
    const upperActive   = row.active && row.high >= 8;
    const upperPlayable = row.active && row.high === 7 && row.low <= 6;
    const upperRank     = row.active && row.high >= 8 ? rankFromVal(row.high) : '8';

    const tile = (rank, active, playable) => (
      <div style={{
        width: CARD_W, height: CARD_H, flexShrink: 0, borderRadius: 5,
        background: active   ? `${tc}44`
                  : playable ? 'rgba(201,168,76,0.15)'
                  :            'rgba(255,255,255,0.02)',
        border:    active   ? `1.5px solid ${tc}cc`
                  : playable ? `1.5px solid ${C.gold}bb`
                  :            `1.5px dashed ${C.gold}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700,
        color: active ? tc : playable ? C.gold : `${C.gold}33`,
      }}>{rank}</div>
    );

    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 15, color: sc, width: 18, flexShrink: 0, fontFamily: 'Georgia,serif' }}>{suit}</span>
        {tile(lowerRank, lowerActive, lowerPlayable)}
        <div style={{
          width: 44, height: CARD_H, flexShrink: 0, borderRadius: 6,
          background: row.active ? `${tc}44` : 'rgba(201,168,76,0.08)',
          border: `2px solid ${row.active ? tc + 'cc' : C.gold + '55'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700,
          color: row.active ? tc : C.gold,
        }}>7</div>
        {tile(upperRank, upperActive, upperPlayable)}
      </div>
    );
  };

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 620, margin: '0 auto', paddingBottom: 32 }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(13,33,24,0.95)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 12, minHeight: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, color: C.gold }}>♣</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }}>{msg}</p>
      </div>

      {/* Pelaajastatus */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {G.players.filter((_, i) => i !== 0).map(p => {
            const isActive = G.activePlayer === p.id;
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

      {/* Pöytä: pinot */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, marginBottom: 12 }}>
          PÖYTÄ · ala-pino [6→A] &nbsp;·&nbsp; [7] &nbsp;·&nbsp; ylä-pino [8→K]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SUITS.map(s => <StackRow key={s} suit={s} />)}
        </div>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginTop: 12, opacity: 0.6 }}>
          <span style={{ display: 'inline-block', width: 22, height: 10, background: 'rgba(201,168,76,0.13)', border: `1px solid ${C.gold}bb`, borderRadius: 2, marginRight: 5 }} />voi pelata &nbsp;·&nbsp;
          <span style={{ display: 'inline-block', width: 22, height: 10, background: 'rgba(255,255,255,0.015)', border: `1px dashed ${C.gold}22`, borderRadius: 2, marginRight: 5, marginLeft: 8 }} />lukittu (pelaa ensin toinen)
        </div>
      </div>

      {/* Viimeisin lyönti -badge — kiinteä 36px wrapper, ei nytkähtelyä */}
      <div style={{ height: 36, display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        {lastPlay && (
          <div key={lastPlay.card.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(13,22,18,0.95)',
              border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`,
              borderRadius: 12, padding: '5px 14px',
              animation: 'lastPlayFade 1.9s ease forwards',
              pointerEvents: 'none',
            }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>
              {lastPlay.name}
            </span>
            <span style={{
              background: '#f8f2e6', borderRadius: 4, padding: '1px 6px',
              fontSize: 13, fontWeight: 700, fontFamily: 'Georgia,serif',
              color: suitColor(lastPlay.card.s),
            }}>
              {lastPlay.card.r}{lastPlay.card.s}
            </span>
          </div>
        )}
      </div>

      {/* Bonusvuoro-banneri */}
      {isBonusTurn && (
        <div style={{ background: 'rgba(201,168,76,0.1)', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.gold, flex: 1 }}>Bonusvuoro! Voit pelata vielä yhden kortin tai lopettaa vuoron.</span>
          <button onClick={humanEndBonusTurn} style={{ background: 'transparent', border: `1px solid ${C.dim}55`, borderRadius: 8, padding: '7px 14px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Lopeta</button>
        </div>
      )}

      {/* Kortinanto-banneri */}
      {isGiving && (
        <div style={{ background: 'rgba(224,92,59,0.1)', border: `1px solid ${C.red}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 8 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.red }}>
            {G.players[G.givingCardTo].name} passaa — klikkaa kortti jonka haluat antaa.
          </span>
        </div>
      )}

      {/* Ohje */}
      {isMyTurn && !isBonusTurn && !isGiving && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, marginBottom: 8, fontStyle: 'italic' }}>
          {iCanPlay
            ? 'Valitse pelattava kortti (kultareuniset paikat) ja klikkaa Lyö.'
            : 'Herolla ei ole pelattavissa olevia kortteja — paina Passaa.'}
        </div>
      )}

      {/* Oma käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn || isGiving ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn || isGiving ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero{human.hand.length > 0 ? ` — ${korttia(human.hand.length)} kädessä` : ' — tyhjä! 🏆'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const isSel    = selCard?.id === c.id;
            const playable = (isMyTurn || isBonusTurn) && isPlayable(c, G.rows);
            const hl       = isGiving ? !isSel : (playable && !isSel);
            const dimmed   = isGiving ? false : ((isMyTurn || isBonusTurn) && !playable && !isSel);
            const onClick  = isGiving
              ? () => humanGiveCard(c)
              : (isMyTurn || isBonusTurn) ? () => humanSelect(c) : undefined;
            return (
              <Card key={c.id} card={c} large
                selected={isSel}
                highlight={!!hl}
                dim={!!dimmed}
                onClick={onClick}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>

      {/* Toiminnot */}
      <div style={{ minHeight: 52, display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {(isMyTurn || isBonusTurn) && !isGiving && (
          <>
            <button onClick={humanPlay} disabled={!selCard}
              style={{ background: selCard ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selCard ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selCard ? '#0d2118' : C.dim, fontSize: 13, cursor: selCard ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              Lyö {selCard ? lbl(selCard) : ''}
            </button>
            {!isBonusTurn && (
              <button onClick={humanPass} disabled={iCanPlay}
                style={{ background: iCanPass ? 'rgba(224,92,59,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${iCanPass ? C.red + '55' : C.panelBorder}`, borderRadius: 10, padding: '10px 18px', color: iCanPass ? C.red : C.dim, fontSize: 13, cursor: iCanPass ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
                Passaa
              </button>
            )}
            {selCard && (
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
      </div>

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flex: 1 }}>
          Jäljellä: {G.players.filter(p => p.hand.length > 0).length} pelaajaa ·
          Avaukset: {SUITS.filter(s => G.rows[s].active).length}/4
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
      <style>{`
        button:active { transform: scale(0.97); }
        @keyframes lastPlayFade {
          0%   { opacity: 0; transform: translateY(-4px); }
          12%  { opacity: 1; transform: translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
