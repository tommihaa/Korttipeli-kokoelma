import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, SUITS, RANKS, VAL } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import MomentFeedback from '../shared/MomentFeedback.jsx';

// ── Ristiseiska ─────────────────────────────────────────────────
// Järjestys per maa: 7 → 6 → 8 → ala-pino (5,4,3,2,A) + ylä-pino (9,T,J,Q,K)
// 5 vaatii 8 ensin, 8 vaatii 6 ensin (kiusanteko)
// A kaataa ala-pinon (bonusvuoro), K kaataa ylä-pinon (bonusvuoro)

const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

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
export default function Ristiseiska({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showPlayHints = true, teachMode = true }) {
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
  const [currentMoment, setCurrentMoment] = useState(null);

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
    addLog(`Ristiseiska alkaa! ${s.name} aloittaa ${lblColored({ r: '7', s: '♣' })}:llä.`);
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
    addLog(`${isH ? 'Sinä' : p.name}: ${lblColored(card)}`);
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
      addLog(`${isH ? 'Veit voiton' : `${p.name} vei voiton`}! 🏆🎉`);
      if (sndRef.current) SFX.capture();
    }

    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      remaining.forEach(pl => { if (!finished.includes(pl.id)) finished.push(pl.id); });
      onResult?.(finished[0] === 0);
      setGS({ ...g, players, rows, finished, phase: 'gameover' });
      return;
    }

    // A kaataa ala-pinon, K kaataa ylä-pinon → jatkaa
    const gaveBonus = v === 1 || v === 13;
    const g2 = { ...g, players, rows, finished, bonusTurn: gaveBonus ? playerIdx : null };
    if (gaveBonus) {
      setGS(g2);
      const suitName = { '♠': 'Pata', '♥': 'Sydän', '♦': 'Ruutu', '♣': 'Risti' }[card.s];
      const pileName = v === 1 ? 'ala-pinon' : 'ylä-pinon';
      if (!p.isHuman) {
        addLog(`${p.name}: Kaatoi ${suitName}n ${pileName} — voi jatkaa!`);
        aiTmr.current = setTimeout(() => runAI(g2), 900);
      } else {
        addLog(`Kaadoit ${suitName}n ${pileName}. Saat jatkaa - jos voit ja haluat.`);
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
      addLog(`${isH ? 'Sinä passaat' : `${p.name} passaa`} — ${giver.isHuman ? 'sinä annat' : `${giver.name} antaa`} ${lblColored(toGive)}.`);
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
    addLog(`Sinä annat ${lblColored(card)} pelaajalle ${g.players[receiverIdx].name}.`);
    const g2 = { ...g, players, givingCardTo: null, givingPlayerIdx: null };
    advanceTurnRS(g2, receiverIdx);
  }

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8, color: SUIT_COLOR['♣'] }}>♣</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>RISTISEISKA</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8, marginBottom: 6 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', margin: '0', marginBottom: 6 }}>Rakenna neljä pinoa · Aloita ♣7:llä</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>PELAAJIA</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[3, 4].map(n => (
              <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt lyhyesti</span><br />
        Pöytäkortit pelataan maittain kaksi pinoa per maa. Ensin 7, sitten sen alapuolelle 6 ja seuraavaksi seiskan yläpuolelle 8. Ala-pino 6 päälle 5,4,3,2 ja A kaataa. Ylä-pino järjestys 8,9,T,J,Q ja K kaataa. Passaus vain kun ei kortti käy. Ensimmäinen kortiton voittaa.
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

  const StackRow = ({ suit, showPlayHints }) => {
    const row = G.rows[suit];
    const sc  = suitColor(suit);
    // ♠ = #1a1a1a on näkymätön tummalla taustalla → käytetään vaalempaa mustaa
    const tc  = suit === '♠' ? '#333333' : sc;

    // Ala-pinon tila
    const lowerActive   = row.active && row.low  <= 6;
    const lowerPlayable = row.active && row.low  === 7;          // voi pelata 6:n
    const lowerRank     = row.active && row.low  <= 6 ? rankFromVal(row.low) : '6';
    const lowerCast     = row.low < 6;
    const lowerComplete = lowerCast && row.low === 1;

    // Ylä-pinon tila (8 vaatii 6 ensin)
    const upperActive   = row.active && row.high >= 8;
    const upperPlayable = row.active && row.high === 7 && row.low <= 6;
    const upperRank     = row.active && row.high >= 8 ? rankFromVal(row.high) : '8';
    const upperCast     = row.high > 8;
    const upperComplete = upperCast && row.high === 13;

    // 7 hehkuu: ♣7 alussa, muut 7:t kun ♣ on aktivoitu
    const sevenIsNext = !row.active && (suit === '♣' || G.rows['♣'].active);

    // Näytä ala-pino (pelattuna tai seisova)
    const lowerPile = lowerActive ? (
      <div style={{ position: 'relative', width: 60, height: 85, flexShrink: 0 }}>
        {/* Pino näkyy pinnalla olevana korttina */}
        <div style={{
          position: 'absolute', width: 60, height: 85, borderRadius: 6,
          background: lowerComplete ? BACKS[cardBack].bg : '#f8f2e6',
          border: `2px solid ${lowerComplete ? BACKS[cardBack].border : tc}`,
          left: 0, top: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Georgia,serif', fontWeight: 700, color: tc,
        }}>
          {!lowerComplete && (
            <>
              <div style={{ fontSize: 20 }}>{lowerRank}</div>
              <div style={{ fontSize: 16 }}>{suit}</div>
            </>
          )}
        </div>
      </div>
    ) : (
      <div style={{ width: 60, height: 85, flexShrink: 0, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.gold}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontWeight: 700, color: `${C.gold}33`, opacity: 0.5, boxShadow: lowerPlayable ? `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88` : undefined }}>
        <div style={{ fontSize: 16 }}>6</div>
        <div style={{ fontSize: 12 }}>{suit}</div>
      </div>
    );

    // Näytä ylä-pino (pelattuna tai seisova)
    const upperPile = upperActive ? (
      <div style={{ position: 'relative', width: 60, height: 85, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', width: 60, height: 85, borderRadius: 6,
          background: upperComplete ? BACKS[cardBack].bg : '#f8f2e6',
          border: `2px solid ${upperComplete ? BACKS[cardBack].border : tc}`,
          left: 0, top: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Georgia,serif', fontWeight: 700, color: tc,
        }}>
          {!upperComplete && (
            <>
              <div style={{ fontSize: 20 }}>{upperRank}</div>
              <div style={{ fontSize: 16 }}>{suit}</div>
            </>
          )}
        </div>
      </div>
    ) : (
      <div style={{ width: 60, height: 85, flexShrink: 0, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.gold}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontWeight: 700, color: `${C.gold}33`, opacity: 0.5, boxShadow: upperPlayable ? `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88` : undefined }}>
        <div style={{ fontSize: 16 }}>8</div>
        <div style={{ fontSize: 12 }}>{suit}</div>
      </div>
    );

    // Aputext: näytä tila tai pelattavat kortit (väreillä, jos showPlayHints)
    let helpText = '';
    let helpElements = null;
    if (showPlayHints) {
      if (!row.active) {
        // Vain ♣7 voidaan pelata ensin, sitten muut 7:t
        if (suit === '♣' || G.rows['♣'].active) {
          helpElements = (
            <>
              pelaa:{' '}
              <span style={{ color: tc }}>7{suit}</span>
            </>
          );
        }
      } else {
        const lowerCast = row.low < 6;
        const upperCast = row.high > 8;
        const playable = [];
        // Ala-pino: seuraava on row.low - 1
        if (row.low > 1) {
          const nextLower = row.low - 1;
          // 5 vaatii 8:n ensin
          if (nextLower !== 5 || row.high >= 8) {
            playable.push(rankFromVal(nextLower));
          }
        }
        // Ylä-pino: seuraava on row.high + 1
        if (row.high < 13) {
          const nextUpper = row.high + 1;
          // 8 vaatii 6:n ensin
          if (nextUpper !== 8 || row.low <= 6) {
            playable.push(rankFromVal(nextUpper));
          }
        }
        if (playable.length > 0) {
          helpElements = (
            <>
              pelaa:{' '}
              {playable.map((r, i) => (
                <span key={i} style={{ color: tc }}>
                  {r}{suit}
                  {i < playable.length - 1 ? ', ' : ''}
                </span>
              ))}
            </>
          );
        } else if (lowerComplete && upperComplete) {
          helpText = 'Tämän maan pinot on kaadettu';
        } else if (lowerCast && upperCast) {
          helpText = 'Tämän maan pinot on avattu';
        }
      }
    } else {
      // Näytä vain status (ei pelattavia kortteja)
      if (!row.active) {
        helpText = 'vaadittu: 7, 6, 8';
      } else {
        const lowerCast = row.low < 6;
        const upperCast = row.high > 8;
        if (lowerCast && upperCast) {
          helpText = 'molemmat kaadettu';
        } else if (lowerCast) {
          helpText = 'ala-pino kaadettu';
        } else if (upperCast) {
          helpText = 'ylä-pino kaadettu';
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          {upperPile}
          {row.active ? (
            <div style={{
              width: 60, height: 85, flexShrink: 0, borderRadius: 6,
              background: '#f8f2e6',
              border: `2px solid ${tc}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Georgia,serif', fontWeight: 700,
              color: tc,
              opacity: 1,
            }}>
              <div style={{ fontSize: 20 }}>7</div>
              <div style={{ fontSize: 16 }}>{suit}</div>
            </div>
          ) : (
            <div style={{
              width: 60, height: 85, flexShrink: 0, borderRadius: 6,
              background: 'rgba(255,255,255,0.02)',
              border: `1px dashed ${C.gold}44`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Georgia,serif', fontWeight: 700,
              color: `${C.gold}33`,
              opacity: 0.5,
              boxShadow: sevenIsNext ? (suit === '♣'
                ? `0 0 35px ${tc}ff, 0 0 60px ${tc}ff, inset 0 0 20px ${tc}aa`
                : `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88`)
                : undefined,
            }}>
              <div style={{ fontSize: 16 }}>7</div>
              <div style={{ fontSize: 12 }}>{suit}</div>
            </div>
          )}
          {lowerPile}
        </div>
        {(helpText || helpElements) && (
          <span style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', opacity: 0.7, textAlign: 'center' }}>
            {helpElements || helpText}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 620, margin: '0 auto', paddingBottom: 32 }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '12px 16px', marginBottom: 12, minHeight: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, color: C.gold }}>♣</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
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
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-start', flexWrap: 'nowrap', overflowX: 'auto' }}>
                  {debugOpen
                    ? p.hand.map(c => <Card key={c.id} card={c} small backStyle={BACKS[cardBack]} />)
                    : p.hand.map((_, ci) => <div key={ci} style={{ width: 22, height: 33, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, flexShrink: 0 }} />)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {SUITS.map(s => <StackRow key={s} suit={s} showPlayHints={showPlayHints} />)}
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

      {/* Jatkavuoro-banneri */}
      {isBonusTurn && (
        <div style={{ background: 'rgba(201,168,76,0.1)', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.gold, flex: 1 }}>Voit jatkaa! Pelaa vielä yksi kortti tai lopeta.</span>
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
            : 'Sinun vuorosi, mutta mikään korttisi ei käy, joten Passaa.'}
        </div>
      )}

      {/* Oma käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn || isGiving ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn || isGiving ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero{human.hand.length === 0 ? ' — tyhjä! 🏆' : ''}
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
          setMsg_('💾 Momentti tallennettu!');
          setCurrentMoment(null);
        }}
      />

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
