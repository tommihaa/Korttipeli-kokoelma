import { useState, useRef, useEffect } from 'react';
import { C, suitColor } from '../shared/colors.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, SUITS, RANKS, VAL } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';

// ── Ristiseiska ─────────────────────────────────────────────────
// Korttijärjestys jonossa: A(1)‑2‑3‑4‑5‑6‑[7]‑8‑9‑10‑J‑Q‑K(13)

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames() {
  const a = [...AI_NAMES];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// VAL: A=1, 2..10 nimellisarvo, J=11, Q=12, K=13

const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VAL   = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

function rv(card) { return RANK_VAL[card.r]; }

// Onko kortti pelattavissa nykyisessä pöytätilassa
function isPlayable(card, rows) {
  const row = rows[card.s];
  const v   = rv(card);
  if (!row.active) return v === 7;                    // avaa jono seiskalla
  if (v === row.low  - 1) {
    if (v === 5) return row.high >= 8;                // 5 vaatii, että 7,6,8 kaikki pöydässä
    return true;
  }
  if (v === row.high + 1) {
    if (v === 9) return row.low <= 6;                 // 9 vaatii, että 7,8,6 kaikki pöydässä
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

  // Aloittaja: ♣7 haltija
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

// Edellinen aktiivinen pelaaja jolla >1 kortti (passaus-rangaistuksen antaja)
function prevWithCards(players, from, finished) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from - i + n) % n;
    if (!finished.includes(idx) && players[idx].hand.length > 1) return idx;
  }
  return -1;
}

// AI valitsee parhaan kortin: 7 ensin (avaa jonon), sitten alin/korkein arvo
function aiBestCard(hand, rows) {
  const valid = hand.filter(c => isPlayable(c, rows));
  if (!valid.length) return null;
  // Priorisoi: seiskat ensin (avaa jonon), sitten pienin arvo
  const sevens = valid.filter(c => c.r === '7');
  if (sevens.length) return sevens[0];
  valid.sort((a, b) => rv(a) - rv(b));
  return valid[0];
}

// ── Komponentti ─────────────────────────────────────────────────
export default function Ristiseiska() {
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(4);
  const [soundOn,  setSnd]     = useState(true);
  const [cardBack, setCB]      = useState('ilves');
  const [G,        setG]       = useState(null);
  const [msg,      setMsg_]    = useState('');
  const [log,      setLog]     = useState([]);
  const [logOpen,  setLO]      = useState(true);
  const [selCard,  setSel]     = useState(null);
  const [debugOpen,setDebug]   = useState(false);

  const gRef   = useRef(null);
  const aiTmr  = useRef(null);
  const logRef = useRef([]);
  const sndRef = useRef(true);

  useEffect(() => { gRef.current = G; },        [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => () => clearTimeout(aiTmr.current), []);

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function setGS(g) { setG(g); gRef.current = g; }

  function startGame() {
    clearTimeout(aiTmr.current);
    const g = initGame(nP);
    logRef.current = []; setLog([]); setSel(null);
    setGS(g);
    const s = g.players[g.activePlayer];
    addLog(`Ristiseiska alkaa! ${s.name} aloittaa ♣7:llä.`);
    setScreen('game');
    if (!s.isHuman) aiTmr.current = setTimeout(() => runAI(g), 1200);
  }

  // ── Vuoron vaihto ───────────────────────────────────────────
  function advanceTurnRS(g, fromIdx) {
    const nextIdx = nextActive(g.players, fromIdx, g.finished);
    if (nextIdx === -1) return;
    const g2 = { ...g, activePlayer: nextIdx };
    setGS(g2);
    if (!g.players[nextIdx].isHuman) {
      aiTmr.current = setTimeout(() => runAI(g2), 1100 + Math.random() * 400);
    } else {
      addLog('Sinun vuorosi.');
    }
  }

  // ── Lyönti ──────────────────────────────────────────────────
  function doPlay(g, playerIdx, card) {
    const p     = g.players[playerIdx];
    const pname = p.name;
    const v     = rv(card);

    if (sndRef.current) SFX.flip();
    addLog(`${pname}: ${lbl(card)}`);

    // Päivitä jono
    const rows = { ...g.rows };
    const row  = rows[card.s];
    if (!row.active) {
      rows[card.s] = { active: true, low: 7, high: 7 };
    } else if (v === row.low - 1) {
      rows[card.s] = { ...row, low: v };
    } else {
      rows[card.s] = { ...row, high: v };
    }

    // Poista kädestä
    let players = g.players.map((pl, i) => i !== playerIdx ? pl
      : { ...pl, hand: pl.hand.filter(c => c.id !== card.id) });

    // Tarkista voitto
    let finished = [...g.finished];
    if (players[playerIdx].hand.length === 0 && !finished.includes(playerIdx)) {
      finished = [...finished, playerIdx];
      addLog(`${pname} voittaa! 🏆`);
      if (sndRef.current) SFX.capture();
    }

    // Peli päättyy kun kaikki (tai kaikki paitsi yksi) ovat valmiit
    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      remaining.forEach(pl => { if (!finished.includes(pl.id)) finished.push(pl.id); });
      setGS({ ...g, players, rows, finished, phase: 'gameover' });
      return;
    }

    // Bonusvuoro: A kaataa alajonon (v=1) tai K huipentaa yläjonon (v=13)
    const gaveBonus = v === 1 || v === 13;
    const g2 = { ...g, players, rows, finished, bonusTurn: gaveBonus ? playerIdx : null };
    if (gaveBonus) {
      setGS(g2);
      if (!p.isHuman) {
        addLog(`${pname}: ${v === 1 ? 'Ässä' : 'Kuningas'} — bonusvuoro!`);
        aiTmr.current = setTimeout(() => runAI(g2), 900);
      } else {
        addLog(`${v === 1 ? 'Ässä' : 'Kuningas'} — saat bonusvuoron! Lyö vielä yksi kortti tai lopeta.`);
      }
      return;
    }

    advanceTurnRS(g2, playerIdx);
  }

  // ── Passaus ─────────────────────────────────────────────────
  function doPass(g, playerIdx) {
    const p     = g.players[playerIdx];
    const pname = p.name;

    const giverIdx = prevWithCards(g.players, playerIdx, g.finished);

    if (giverIdx !== -1 && g.players[giverIdx].isHuman) {
      // Ihminen valitsee itse minkä antaa
      const g2 = { ...g, givingCardTo: playerIdx, givingPlayerIdx: giverIdx };
      setGS(g2);
      addLog(`${pname} passaa — valitse kortti annettavaksi.`);
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
      addLog(`${pname} passaa — ${giver.name} antaa ${lbl(toGive)}.`);
    } else {
      addLog(`${pname} passaa.`);
    }

    const g2 = { ...g, players };
    advanceTurnRS(g2, playerIdx);
  }

  // ── AI ──────────────────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const { activePlayer, players, rows, bonusTurn } = g;
    const p = players[activePlayer];
    if (!p || p.isHuman) return;

    // Bonusvuoro: AI pelaa ylimääräisen kortin jos mahdollista
    if (bonusTurn !== null && bonusTurn === activePlayer) {
      const g2 = { ...gRef.current, bonusTurn: null };
      const card = aiBestCard(p.hand, rows);
      if (card) {
        doPlay(g2, activePlayer, card);
      } else {
        advanceTurnRS(g2, activePlayer);
      }
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
      addLog('Hero: pelattavissa oleva kortti — passata ei voi.');
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
    addLog(`Annoit ${lbl(card)} pelaajalle ${g.players[receiverIdx].name}.`);
    const g2 = { ...g, players, givingCardTo: null, givingPlayerIdx: null };
    advanceTurnRS(g2, receiverIdx);
  }

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: 8, color: C.gold, opacity: 0.6, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
        <h1 style={{ fontSize: 42, letterSpacing: 10, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>RISTISEISKA</h1>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 8 }}>Rakenna neljä jonoa A→K · Aloita ♣7:llä</p>
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
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '14px 18px', maxWidth: 400, fontFamily: 'sans-serif', fontSize: 12, color: C.dim, lineHeight: 1.9 }}>
        <span style={{ color: C.gold, fontWeight: 700 }}>Säännöt</span><br />
        ♣7 haltija aloittaa · Pöytään rakentuu neljä jonoa (A→K)<br />
        Lyö 7 (avaa jono), sitten 6 tai 8, sitten ääripäähän jatkuvasti<br />
        Ei sovi → passaa, edellinen pelaaja (&gt;1 korttia) antaa sinulle kortin<br />
        <span style={{ color: C.gold }}>Ensimmäinen joka tyhjentää kätensä voittaa</span>
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

  // ── Pöytä-renderi: neljä jonoa ──────────────────────────────
  const TableRow = ({ suit }) => {
    const row   = G.rows[suit];
    const sc    = suitColor(suit);
    return (
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <span style={{ fontSize: 15, color: sc, minWidth: 20, flexShrink: 0 }}>{suit}</span>
        {RANK_ORDER.map((r, idx) => {
          const v       = RANK_VAL[r];
          const placed  = row.active && v >= row.low && v <= row.high;
          const isNext  = row.active
            ? (v === row.low - 1 && (v !== 5 || row.high >= 8)) ||
              (v === row.high + 1 && (v !== 9 || row.low <= 6))
            : (r === '7');
          const isSeven = r === '7';
          return (
            <div key={r} style={{
              width: 28, height: 38, borderRadius: 4, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Georgia,serif', fontSize: 11, fontWeight: isSeven ? 700 : 400,
              background: placed
                ? (isSeven ? sc : `${sc}22`)
                : isNext ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
              border: placed
                ? `1.5px solid ${sc}99`
                : isNext ? `1.5px solid ${C.gold}66` : `1px solid rgba(42,74,50,0.4)`,
              color: placed ? (isSeven ? '#fff' : sc) : isNext ? C.gold : '#2a4a32',
              opacity: placed || isNext ? 1 : (!row.active ? 0.25 : (v < row.low - 1 || v > row.high + 1) ? 0.25 : 1),
            }}>
              {r}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: '14px 16px', maxWidth: 620, margin: '0 auto', paddingBottom: 32 }}>

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

      {/* Pöytä: neljä jonoa */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, marginBottom: 10 }}>PÖYTÄ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SUITS.map(s => <TableRow key={s} suit={s} />)}
        </div>
        <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginTop: 8, opacity: 0.6 }}>
          <span style={{ display: 'inline-block', width: 28, height: 10, background: 'rgba(201,168,76,0.15)', border: `1px solid ${C.gold}44`, borderRadius: 2, marginRight: 4 }} />seuraava pelattavissa
        </div>
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
          {human.hand.map(c => {
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
          Jonot: {SUITS.filter(s => G.rows[s].active).length}/4 auki
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Object.entries(BACKS).map(([key, b]) => (
            <button key={key} onClick={() => setCB(key)} title={b.label}
              style={{ width: 18, height: 25, borderRadius: 3, cursor: 'pointer', padding: 0, overflow: 'hidden', background: b.bg, border: `2px solid ${cardBack === key ? C.gold : b.border}`, transition: 'all 0.15s', transform: cardBack === key ? 'scale(1.2)' : 'none', flexShrink: 0 }} />
          ))}
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
      <style>{`button:active{transform:scale(0.97)}`}</style>
    </div>
  );
}
