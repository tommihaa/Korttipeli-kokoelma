import { useState, useRef, useEffect } from 'react';
import { C, suitColor } from '../shared/colors.js';
import { SUITS, RANKS, isRed, lbl, korttia, kortin, shuffle } from '../shared/helpers.js';
import { BACKS } from '../shared/BACKS.jsx';
import { tone, noise } from '../shared/audio.js';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';

// A=14 for combat comparisons — different from shared helpers (A=1)
const VAL = { A:14,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13 };

const isMaija = c => c && c.r === 'Q' && c.s === '♠';

function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v:VAL[r], id:`${r}${s}_${Math.random()}` }))));
}

function canBeat(attCard, defCard, trump) {
  if (isMaija(defCard)) return false;
  if (isMaija(attCard)) return false;
  if (defCard.s === attCard.s && defCard.v > attCard.v) return true;
  if (defCard.s === trump && attCard.s !== trump) return true;
  if (defCard.s === trump && attCard.s === trump && defCard.v > attCard.v) return true;
  return false;
}

const SFX = {
  play:  () => { noise(0.04,0.07,1200); tone(600,0.05,0.1,'sine'); },
  beat:  () => { tone(440,0.08,0.2,'triangle'); tone(660,0.12,0.18,'triangle',0.06); },
  take:  () => { tone(200,0.3,0.18,'sawtooth'); noise(0.2,0.12,500,0.05); },
  maija: () => { [180,150,120].forEach((f,i) => tone(f,0.5,0.2,'sawtooth',i*0.2)); },
  win:   () => { [523,659,784,1047].forEach((f,i) => tone(f,i===3?0.5:0.1,0.22,'triangle',i*0.11)); },
};

// ── Kortti ──────────────────────────────────────────────────────────
function Card({ card, small, highlight, dim, selected, onClick, backStyle, faceDown }) {
  const [h, setH] = useState(false);
  const w = small ? 44 : 58, ht = small ? 60 : 80;
  const back = backStyle || BACKS.ilves;
  const clickable = !!onClick;
  const mjBorder = card && isMaija(card);

  if (faceDown) return (
    <div style={{ width:w, height:ht, borderRadius:7, position:'relative', overflow:'hidden',
      flexShrink:0, border:`1px solid ${back.border}` }}>
      {back.render(w, ht)}
    </div>
  );

  const borderCol = mjBorder ? C.maija : selected ? C.blue : highlight ? C.gold : back.border;
  const shadow = selected ? '0 0 14px rgba(91,168,212,0.6)' :
                 highlight ? '0 0 14px rgba(201,168,76,0.6)' :
                 mjBorder ? '0 0 10px rgba(139,26,26,0.5)' :
                 h && clickable ? '0 6px 16px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.3)';

  return (
    <div onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width:w, height:ht, borderRadius:7, flexShrink:0,
        background:C.card, border:`2px solid ${borderCol}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:clickable ? 'pointer' : 'default',
        transform:`${h && clickable ? 'translateY(-5px) scale(1.06)' : 'none'} ${selected ? 'translateY(-8px)' : ''}`,
        transition:'transform 0.15s,box-shadow 0.15s',
        boxShadow:shadow, opacity:dim ? 0.35 : 1,
      }}>
      <div style={{ textAlign:'center', fontFamily:'Georgia,serif', lineHeight:1.1,
        pointerEvents:'none', color:mjBorder ? C.maija : suitColor(card.s) }}>
        <div style={{ fontSize:small ? 12 : 16, fontWeight:700 }}>{card.r}</div>
        <div style={{ fontSize:small ? 13 : 19 }}>{card.s}</div>
        {mjBorder && <div style={{ fontSize:8, color:C.maija, letterSpacing:0.5 }}>MAIJA</div>}
      </div>
    </div>
  );
}

const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
    return sd !== 0 ? sd : a.v - b.v;
  });
}

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
function shuffledAINames() {
  const a = [...AI_NAMES];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Alustus ─────────────────────────────────────────────────────────
function initGame(nPlayers) {
  const aiNames = shuffledAINames();
  let deck = newDeck();
  let trumpIdx = deck.length - 1;
  while (deck[trumpIdx].s === '♠') {
    deck = shuffle(deck);
    trumpIdx = deck.length - 1;
  }
  const trump = deck[trumpIdx].s;
  const trumpCard = deck[trumpIdx];
  const players = Array.from({ length:nPlayers }, (_,i) => ({
    id:i, name:i===0 ? 'Hero' : aiNames[i-1], isHuman:i===0,
    hand:deck.splice(0, 5),
  }));
  return { players, deck, trump, trumpCard, discard:[],
    attackerIdx:0, defenderIdx:1 };
}

// ── Pääkomponentti ──────────────────────────────────────────────────
export default function Maija({ onResult, hints = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true }) {
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(3);
  const [soundOn, setSnd] = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G, setG] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [table, setTable] = useState([]);
  const [selectedCards, setSel] = useState([]);
  const [selDefTargetIdx, setSelDefTargetIdx] = useState(null);
  const [msg, setMsg_] = useState('');
  const [log, setLog] = useState([]);
  const [logOpen, setLO] = useState(hints);
  const [debugOpen, setDebug] = useState(initSeeAll);
  const [finished, setFinished] = useState([]);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);

  const gRef = useRef(null);
  const phaseRef = useRef('idle');
  const prevDeckRef = useRef(null);
  const tableRef = useRef([]);
  const aiTmr = useRef(null);
  const logRef = useRef([]);
  const sndRef = useRef(false);
  const finRef = useRef([]);

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { tableRef.current = table; }, [table]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { finRef.current = finished; }, [finished]);
  useEffect(() => () => clearTimeout(aiTmr.current), []);
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  function addLog(m) {
    setMsg_(m);
    const e = { t:new Date().toLocaleTimeString('fi', { hour:'2-digit', minute:'2-digit', second:'2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }

  function startGame() {
    clearTimeout(aiTmr.current);
    const g = initGame(nP);
    setG(g); gRef.current = g;
    setPhase('attacking'); phaseRef.current = 'attacking';
    setTable([]); tableRef.current = [];
    setSel([]); setSelDefTargetIdx(null);
    setFinished([]); finRef.current = [];
    logRef.current = []; setLog([]); setPakaAnim(false);
    const trumpLabel = g.trump==='♥' ? '♥ Hertta' : g.trump==='♦' ? '♦ Ruutu' : g.trump==='♣' ? '♣ Risti' : '?';
    addLog(`Peli alkaa! Valttimaa: ${trumpLabel}. ${g.players[g.attackerIdx].name} hyökkää.`);
    setScreen('game');
    setShuffling(true);
    aiTmr.current = setTimeout(() => maybeAIAttack(g), 3100 + Math.random() * 400);
  }

  function drawHand(g, playerIdx) {
    const need = 5 - g.players[playerIdx].hand.length;
    if (need <= 0 || !g.deck.length) return g;
    const drawn = g.deck.slice(0, Math.min(need, g.deck.length));
    const players = g.players.map((p,i) => i===playerIdx ? { ...p, hand:[...p.hand, ...drawn] } : p);
    return { ...g, players, deck:g.deck.slice(drawn.length) };
  }

  function checkWinners(g, fin) {
    const newFin = [...fin];
    g.players.forEach((p, i) => {
      if (!newFin.includes(i) && p.hand.length===0 && g.deck.length===0) {
        newFin.push(i);
        addLog(`${p.id===0 ? 'Pääsit eroon kaikista korteistasi' : `${p.name} pääsi eroon kaikista korteistaan`} — sijoitus ${newFin.length}!`);
      }
    });
    const active = g.players.filter((_, i) => !newFin.includes(i));
    if (active.length <= 1) {
      if (active.length === 1) {
        const loser = active[0];
        const isMaijaPlayer = loser.hand.some(isMaija);
        if (sndRef.current) SFX.maija();
        addLog(`${loser.name} jäi ${isMaijaPlayer ? 'patakuningattaren kanssa — ' : ''}Maijana!`);
      }
      onResult?.(active.length === 0 || active[0].id !== 0);
      setPhase('gameover'); phaseRef.current = 'gameover';
      setFinished(newFin); finRef.current = newFin;
      setTimeout(() => setScreen('gameover'), 1800);
      return { done:true, fin:newFin };
    }
    return { done:false, fin:newFin };
  }

  function nextAttDef(g, skipDefender, fin) {
    const nPl = g.players.length;
    let newAtt, newDef;
    if (!skipDefender) {
      newAtt = g.defenderIdx;
      while (fin.includes(newAtt)) newAtt = (newAtt + 1) % nPl;
    } else {
      newAtt = (g.defenderIdx + 1) % nPl;
      while (fin.includes(newAtt)) newAtt = (newAtt + 1) % nPl;
    }
    newDef = (newAtt + 1) % nPl;
    while (fin.includes(newDef) || newDef === newAtt) newDef = (newDef + 1) % nPl;
    return { newAtt, newDef };
  }

  function advanceRound(g, fin, skipDefender) {
    const { newAtt, newDef } = nextAttDef(g, skipDefender, fin);
    const g4 = { ...g, attackerIdx:newAtt, defenderIdx:newDef };
    setG(g4); gRef.current = g4;
    setTable([]); tableRef.current = [];
    setSel([]); setSelDefTargetIdx(null);
    setPhase('attacking'); phaseRef.current = 'attacking';
    setFinished(fin); finRef.current = fin;
    addLog(`${g4.players[newAtt].name} hyökkää — ${g4.players[newDef].name} puolustaa.`);
    aiTmr.current = setTimeout(() => maybeAIAttack(g4), 1800);
  }

  function resolveDefenseWin(g, tbl, fin) {
    const allCards = tbl.flatMap(r => [r.att, r.def]);
    let g2 = { ...g, discard:[...g.discard, ...allCards] };
    g2 = drawHand(g2, g.defenderIdx);
    g2 = drawHand(g2, g.attackerIdx);
    const { done, fin:newFin } = checkWinners(g2, fin);
    if (done) return;
    advanceRound(g2, newFin, false);
  }

  function resolveDefenseLoss(g, tbl, fin) {
    const unbeaten = tbl.filter(r => !r.def).map(r => r.att);
    const beaten = tbl.filter(r => r.def).flatMap(r => [r.att, r.def]);
    const players = g.players.map((p,i) => i===g.defenderIdx ? { ...p, hand:[...p.hand, ...unbeaten] } : p);
    let g2 = { ...g, players, discard:[...g.discard, ...beaten] };
    if (sndRef.current) SFX.take();
    const who = g.players[g.defenderIdx].id===0 ? 'Nostit' : `${g.players[g.defenderIdx].name} nosti`;
    const detail = beaten.length > 0 ? ` (${beaten.length / 2 | 0} kaatoa poistopakkaan)` : '';
    addLog(`${who} ${kortin(unbeaten.length)} kaatamatta jääneistä${detail}.`);
    g2 = drawHand(g2, g2.attackerIdx);
    const { done, fin:newFin } = checkWinners(g2, fin);
    if (done) return;
    advanceRound(g2, newFin, true);
  }

  function maybeAIAttack(g) {
    if (!g) g = gRef.current;
    if (!g || phaseRef.current !== 'attacking') return;
    if (g.players[g.attackerIdx].isHuman) return;
    aiTmr.current = setTimeout(() => {
      const g2 = gRef.current;
      const hand = g2.players[g2.attackerIdx].hand;
      const defHandSize = g2.players[g2.defenderIdx].hand.length;
      if (!hand.length) { resolveDefenseWin(g2, [], finRef.current); return; }
      const maija = hand.find(isMaija);
      const bySuit = {};
      hand.forEach(c => {
        if (!isMaija(c) && c.s !== g2.trump) {
          if (!bySuit[c.s]) bySuit[c.s] = [];
          bySuit[c.s].push(c);
        }
      });
      if (!Object.keys(bySuit).length) {
        hand.forEach(c => { if (!isMaija(c)) { if (!bySuit[c.s]) bySuit[c.s] = []; bySuit[c.s].push(c); } });
      }
      const suits = Object.values(bySuit).sort((a,b) => b.length - a.length);
      let toPlay = (suits[0] || []).slice(0, Math.min((suits[0] || []).length, defHandSize));
      if (maija && (toPlay[0]?.s === '♠' || g2.deck.length === 0)) {
        toPlay = hand.filter(c => c.s === '♠').slice(0, defHandSize);
      }
      if (!toPlay.length) { toPlay = maija ? [maija] : [hand[0]]; }
      doAttack(g2, toPlay);
    }, 1200 + Math.random() * 400);
  }

  function doAttack(g, cards) {
    if (sndRef.current) SFX.play();
    const attName = g.players[g.attackerIdx];
    addLog(`${attName.id===0 ? 'Löit' : `${attName.name} löi`}: ${cards.map(lbl).join(', ')}.`);
    const players = g.players.map((p,i) => i===g.attackerIdx
      ? { ...p, hand:p.hand.filter(c => !cards.find(x => x.id===c.id)) } : p);
    const tbl = cards.map(c => ({ att:c, def:null }));
    let g2 = { ...g, players };
    g2 = drawHand(g2, g.attackerIdx);
    setG(g2); gRef.current = g2;
    setTable(tbl); tableRef.current = tbl;
    setSel([]);
    setPhase('defending'); phaseRef.current = 'defending';
    const defName = g2.players[g.defenderIdx];
    addLog(`${defName.name} puolustaa — ${korttia(tbl.length)} kaadettavana.`);
    if (tbl.some(r => isMaija(r.att))) {
      addLog('Maija pöydällä — puolustajan on nostettava se käteen!');
    }
    aiTmr.current = setTimeout(() => maybeAIDefend(g2, tbl), 1000 + Math.random() * 400);
  }

  function maybeAIDefend(g, tbl) {
    if (!g) g = gRef.current;
    if (!g || phaseRef.current !== 'defending') return;
    if (g.players[g.defenderIdx].isHuman) return;
    aiTmr.current = setTimeout(() => {
      const g2 = gRef.current;
      const tbl2 = tableRef.current;
      const defender = g2.players[g2.defenderIdx];
      let hand = [...defender.hand];

      const canBeatAll = (() => {
        let tmp = [...hand];
        for (const row of tbl2) {
          if (row.def) continue;
          const best = tmp.filter(c => canBeat(row.att, c, g2.trump)).sort((a,b) => a.v - b.v);
          if (!best.length) return false;
          tmp = tmp.filter(c => c.id !== best[0].id);
        }
        return true;
      })();

      const newTbl = tbl2.map(row => {
        if (row.def) return row;
        const nonT = hand.filter(c => c.s !== g2.trump && canBeat(row.att, c, g2.trump)).sort((a,b) => a.v - b.v);
        const trp  = hand.filter(c => c.s === g2.trump && canBeat(row.att, c, g2.trump)).sort((a,b) => a.v - b.v);
        const chosen = canBeatAll ? (nonT[0] || trp[0]) : nonT[0];
        if (!chosen) return row;
        hand = hand.filter(c => c.id !== chosen.id);
        if (sndRef.current) SFX.beat();
        return { ...row, def:chosen };
      });

      const players = g2.players.map((p,i) => i===g2.defenderIdx ? { ...p, hand } : p);
      setTable(newTbl); tableRef.current = newTbl;
      const unbeaten = newTbl.filter(r => !r.def);
      if (unbeaten.length === 0) {
        addLog(g2.players[g2.defenderIdx].id===0 ? 'Kaadoit kaikki!' : `${g2.players[g2.defenderIdx].name} kaataa kaikki!`);
        if (sndRef.current) SFX.win();
        setTimeout(() => resolveDefenseWin({ ...g2, players }, newTbl, finRef.current), 2200);
      } else {
        const n = g2.players[g2.defenderIdx];
        addLog(n.id===0
          ? `Et kaada kaikkia — nostat ${kortin(unbeaten.length)}.`
          : `${n.name} kaataa ${newTbl.length - unbeaten.length}/${newTbl.length} — nostaa ${kortin(unbeaten.length)}.`);
        setTimeout(() => resolveDefenseLoss({ ...g2, players }, newTbl, finRef.current), 1500);
      }
    }, 1000 + Math.random() * 400);
  }

  function humanToggleCard(card) {
    if (phase !== 'attacking' || G.attackerIdx !== 0) return;
    const hand = G.players[0].hand;
    const alreadySel = selectedCards.find(c => c.id === card.id);
    if (alreadySel) {
      setSel(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length === 0) {
      setSel(hand.filter(c => c.s === card.s));
    } else if (selectedCards[0].s === card.s) {
      setSel(prev => [...prev, card]);
    }
  }

  function humanAttack() {
    if (!selectedCards.length) return;
    const g = gRef.current;
    if (selectedCards.length > g.players[g.defenderIdx].hand.length) {
      addLog('Liikaa kortteja — puolustajalla ei riitä käsi kaatamaan.'); return;
    }
    doAttack(g, selectedCards);
  }

  // 1. Valitse ensin pöytäkortti
  function humanSelectDefTarget(idx) {
    if (phase !== 'defending' || G.defenderIdx !== 0) return;
    const row = table[idx];
    if (row.def) return; // jo kaadettu
    setSelDefTargetIdx(prev => prev === idx ? null : idx);
  }

  // 2. Sitten valitse käsikortti
  function humanBeatWithCard(card) {
    if (phase !== 'defending' || G.defenderIdx !== 0 || selDefTargetIdx === null) return;
    if (isMaija(card)) { addLog('Patakuningatar ei kelpaa kaatokortiksi!'); return; }
    const g = gRef.current;
    const row = table[selDefTargetIdx];
    if (!canBeat(row.att, card, g.trump)) {
      addLog(`${lbl(card)} ei kaada ${lbl(row.att)} — liian pieni tai väärä maa.`); return;
    }
    if (sndRef.current) SFX.beat();
    addLog(`Kaadoit ${lbl(row.att)} kortilla ${lbl(card)}.`);
    const newTbl = table.map((r, i) => i === selDefTargetIdx ? { ...r, def: card } : r);
    const players = g.players.map((p, i) => i === 0 ? { ...p, hand: p.hand.filter(c => c.id !== card.id) } : p);
    const g2 = { ...g, players };
    setG(g2); gRef.current = g2;
    setTable(newTbl); tableRef.current = newTbl;
    setSelDefTargetIdx(null);
    if (newTbl.every(r => r.def)) {
      addLog('Kaadoit kaikki! Hyökkäät seuraavaksi.');
      if (sndRef.current) SFX.win();
      setTimeout(() => resolveDefenseWin(g2, newTbl, finRef.current), 1200);
    }
  }

  function humanTakeAll() {
    if (phase !== 'defending' || G.defenderIdx !== 0) return;
    resolveDefenseLoss(gRef.current, tableRef.current, finRef.current);
  }

  // ── Pelaajien valinta ────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background:C.bg, minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:28, padding:24,
      fontFamily:'Georgia,serif', color:C.text }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:13, letterSpacing:8, color:C.gold, opacity:0.6, marginBottom:8 }}>🂭</div>
        <h1 style={{ fontSize:52, letterSpacing:12, margin:0,
          background:`linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>MAIJA</h1>
        <p style={{ color:C.dim, fontSize:13, fontStyle:'italic', marginTop:8 }}>Patakuningatar on Maija</p>
      </div>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:C.dim, fontFamily:'sans-serif', fontSize:11, marginBottom:12, letterSpacing:2 }}>PELAAJIA</p>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          {[2,3,4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width:54, height:54, borderRadius:10,
              cursor:'pointer', fontSize:20, fontWeight:700, fontFamily:'Georgia,serif',
              border:`2px solid ${nP===n ? C.gold : '#2a4a32'}`,
              background:nP===n ? C.gold+'18' : 'transparent',
              color:nP===n ? C.gold : C.dim, transition:'all 0.2s' }}>{n}</button>
          ))}
        </div>
        <p style={{ color:C.dim, fontFamily:'sans-serif', fontSize:11, marginTop:10, opacity:0.6 }}>
          Hero + {nP-1} tekoäly{nP===2 ? '' : 'ä'}
        </p>
      </div>
      <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`,
        borderRadius:14, padding:'14px 18px', maxWidth:320,
        fontFamily:'sans-serif', fontSize:12, color:C.dim, lineHeight:1.7 }}>
        <span style={{ color:C.gold, fontWeight:700 }}>Muista</span><br/>
        Patakuningatar <span style={{ color:C.maija, fontWeight:700 }}>♛</span> ei kelpaa kaatokortiksi.
        Valttimaa pakan pohjasta. Ensimmäisestä eroon päässyt voittaa — viimeiselle jää Maija.
      </div>
      <button onClick={startGame} style={{ background:`linear-gradient(135deg,${C.gold},#a07830)`,
        border:'none', borderRadius:14, padding:'14px 44px', color:'#0d2118',
        fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif', letterSpacing:2 }}>
        Aloita →
      </button>
    </div>
  );

  // ── Peli päättyi ────────────────────────────────────────────────
  if (screen === 'gameover' && G) {
    const sorted = [...G.players].map((p, i) => {
      const rank = finished.indexOf(i);
      const isLoser = !finished.includes(i);
      return { ...p, rank:isLoser ? G.players.length : rank + 1 };
    }).sort((a,b) => a.rank - b.rank);
    return (
      <div style={{ background:C.bg, minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:20, padding:24,
        fontFamily:'Georgia,serif', color:C.text }}>
        <h1 style={{ fontSize:28, letterSpacing:8, color:C.gold, margin:0 }}>PELI PÄÄTTYI</h1>
        <div style={{ width:'100%', maxWidth:440, display:'flex', flexDirection:'column', gap:8 }}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ borderRadius:12, padding:'12px 16px', display:'flex',
              alignItems:'center', gap:12,
              background:i===0 ? C.gold+'14' : p.rank===G.players.length ? C.maija+'14' : 'rgba(255,255,255,0.02)',
              border:`1px solid ${i===0 ? C.gold+'55' : p.rank===G.players.length ? C.maija+'55' : C.panelBorder}` }}>
              <span style={{ fontSize:20 }}>{i===0 ? '🏆' : p.rank===G.players.length ? '🂭' : '🎯'}</span>
              <span style={{ fontFamily:'sans-serif', fontSize:14, flex:1,
                color:i===0 ? C.gold : p.rank===G.players.length ? C.maija : C.text }}>{p.name}</span>
              <span style={{ fontFamily:'sans-serif', fontSize:12, color:C.dim }}>
                {p.rank===G.players.length ? 'Maija' : `${p.rank}. sija`}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={startGame} style={{ background:`linear-gradient(135deg,${C.gold},#a07830)`,
            border:'none', borderRadius:12, padding:'12px 32px', color:'#0d2118',
            fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>Uusi peli →</button>
          <button onClick={() => setScreen('select')} style={{ background:'transparent',
            border:`1px solid ${C.gold}55`, borderRadius:12, padding:'12px 24px',
            color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>← Vaihda pelaajia</button>
        </div>
      </div>
    );
  }

  if (!G) return null;

  const isHumanAttacker = G.attackerIdx === 0 && phase === 'attacking';
  const isHumanDefender = G.defenderIdx === 0 && phase === 'defending';
  const unbeaten = table.filter(r => !r.def);
  const selDefTargetRow = selDefTargetIdx !== null ? table[selDefTargetIdx] : null;

  return (
    <div style={{ background:C.bg, fontFamily:'Georgia,serif', color:C.text,
      padding:'14px 16px', maxWidth:560, margin:'0 auto', paddingBottom:32 }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Viestikupla */}
      <div style={{ background:'linear-gradient(135deg,#09192a,#071420)', border:`1px solid ${C.blue}40`,
        borderRadius:14, padding:'12px 16px', marginBottom:12,
        height:68, overflow:'hidden', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:15, flexShrink:0 }}>🂭</span>
        <p style={{ margin:0, fontFamily:'sans-serif', fontSize:13, lineHeight:1.55, color:'#b5d5e5' }}>{msg}</p>
      </div>

      {/* Valtti + pakka */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          {G.deck.length > 0 && (
            <div style={{ position:'relative', width:44, height:60 }}>
              {G.deck.length > 2 && (
                <div style={{ position:'absolute', top:0, left:0, width:44, height:60,
                  borderRadius:6, background:BACKS[cardBack].bg, border:`1px solid ${BACKS[cardBack].border}`,
                  transform:'rotate(-5deg) translate(-4px,3px)', transformOrigin:'bottom center', opacity:0.55 }}>
                  {BACKS[cardBack].render(44, 60)}
                </div>
              )}
              {G.deck.length > 1 && (
                <div style={{ position:'absolute', top:0, left:0, width:44, height:60,
                  borderRadius:6, background:BACKS[cardBack].bg, border:`1px solid ${BACKS[cardBack].border}`,
                  transform:'rotate(-2.5deg) translate(-2px,1.5px)', transformOrigin:'bottom center', opacity:0.75 }}>
                  {BACKS[cardBack].render(44, 60)}
                </div>
              )}
              <div style={{ position:'absolute', top:0, left:0, width:44, height:60,
                borderRadius:6, overflow:'hidden', border:`1px solid ${BACKS[cardBack].border}`, zIndex:10 }}>
                {BACKS[cardBack].render(44, 60)}
              </div>
            </div>
          )}
          {G.trumpCard && (
            <div style={{ position:'absolute', bottom:-18, left:-8, width:60, height:44,
              borderRadius:6, background:C.card, border:`2px solid ${C.trump}`,
              boxShadow:`0 0 10px rgba(74,138,48,0.4)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              transform:'rotate(90deg)', transformOrigin:'center center', zIndex:10 }}>
              <div style={{ textAlign:'center', color:isRed(G.trumpCard.s) ? '#b83030' : '#1a1a2e',
                fontFamily:'Georgia,serif', lineHeight:1, transform:'rotate(-90deg)' }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{G.trumpCard.r}</span>
                <span style={{ fontSize:15, display:'block' }}>{G.trumpCard.s}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginLeft:G.trumpCard ? 30 : 4, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ padding:'4px 12px', borderRadius:20, background:C.trump+'22',
            border:`1px solid ${C.trump}88`, fontFamily:'sans-serif', fontSize:12, color:C.trump }}>
            Valtti: {G.trump}
          </div>
          <div style={{ padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,0.03)',
            border:`1px solid ${G.deck.length===0 ? C.red+'55' : C.panelBorder}`,
            fontFamily:'sans-serif', fontSize:12,
            color:G.deck.length===0 ? C.red : C.dim,
            fontWeight:G.deck.length===0 ? 700 : 400,
            animation:pakaAnim ? 'pakaFlash 2.5s ease forwards' : undefined }}>
            {G.deck.length===0 ? 'PAKKA TYHJÄ' : `${korttia(G.deck.length)} jäljellä`}
          </div>
          <div style={{ padding:'4px 12px', borderRadius:20, background:`${C.maija}18`,
            border:`1px solid ${C.maija}55`, fontFamily:'sans-serif', fontSize:12, color:C.maija }}>
            Q♠ = Maija
          </div>
        </div>
      </div>

      {/* Muut pelaajat */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {G.players.filter((_, i) => i !== 0).map(p => {
          const isAtt = G.attackerIdx === p.id;
          const isDef = G.defenderIdx === p.id;
          return (
            <div key={p.id} style={{ flex:1, minWidth:90, background:'rgba(255,255,255,0.03)',
              border:`1px solid ${isAtt ? C.red+'66' : isDef ? C.blue+'66' : C.panelBorder}`,
              borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ fontFamily:'sans-serif', fontSize:11,
                color:isAtt ? C.red : isDef ? C.blue : C.dim, marginBottom:5 }}>
                🤖 {p.name} {isAtt ? '⚔️' : isDef ? '🛡️' : ''}
              </div>
              <div style={{ display:'flex', gap:2, justifyContent:'center', flexWrap:'wrap' }}>
                {debugOpen
                  ? p.hand.map((c,ci) => <Card key={ci} card={c} small backStyle={BACKS[cardBack]}/>)
                  : [...Array(p.hand.length)].map((_,ci) => (
                      <Card key={ci} card={{ s:'♠',r:'?',v:0,id:`back${ci}` }} small
                        backStyle={BACKS[cardBack]} faceDown/>
                    ))
                }
              </div>
              <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, marginTop:4 }}>
                {korttia(p.hand.length)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pöytä */}
      <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.panelBorder}`,
        borderRadius:14, padding:'12px 14px', marginBottom:12, height:200, overflow:'hidden' }}>
        <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, marginBottom:8, letterSpacing:1.5 }}>
          PÖYTÄ — {phase==='attacking' ? 'hyökkäys' : 'puolustus'}
        </div>
        {table.length === 0
          ? <div style={{ textAlign:'center', color:C.dim, fontFamily:'sans-serif', fontSize:12,
              opacity:0.5, paddingTop:40 }}>
              {phase === 'attacking' ? 'Valitse kortit kädestä ja lyö' : 'Odota...'}
            </div>
          : <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-start' }}>
              {table.map((row, i) => {
                const isTarget = selDefTargetIdx === i;
                const canBeTarget = isHumanDefender && !row.def && selDefTargetIdx === null;
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <Card card={row.att} small
                      dim={!!row.def}
                      selected={isTarget}
                      highlight={canBeTarget}
                      onClick={isHumanDefender && !row.def ? () => humanSelectDefTarget(i) : undefined}
                      backStyle={BACKS[cardBack]}/>
                    {row.def
                      ? <Card card={row.def} small backStyle={BACKS[cardBack]}/>
                      : <div style={{ width:44, height:60, borderRadius:6,
                          border:`1.5px dashed ${C.panelBorder}`, opacity:0.3 }}/>
                    }
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* Ihmispelaajan käsi */}
      <div style={{ background:'rgba(255,255,255,0.02)',
        border:`2px solid ${(isHumanAttacker || isHumanDefender) ? C.gold+'44' : C.panelBorder}`,
        borderRadius:14, padding:'12px 14px', marginBottom:12, transition:'border-color 0.2s' }}>
        <div style={{ fontFamily:'sans-serif', fontSize:12,
          color:(isHumanAttacker || isHumanDefender) ? C.gold : C.dim, marginBottom:8 }}>
          👤 Hero {G.attackerIdx===0 ? '⚔️' : G.defenderIdx===0 ? '🛡️' : ''}
          {isHumanAttacker && <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>— valitse saman maan kortit ja lyö</span>}
          {isHumanDefender && !selDefTargetRow && <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>— valitse ensin pöytäkortti, jonka haluat kaataa</span>}
          {isHumanDefender && selDefTargetRow && <span style={{ color:C.gold, fontSize:11, marginLeft:8 }}>— valitse käsikorttisi, jolla kaadoat {lbl(selDefTargetRow.att)}</span>}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {sortHand(G.players[0].hand).map(c => {
            const isSel = !!selectedCards.find(x => x.id === c.id);
            const wrongSuit = isHumanAttacker && selectedCards.length > 0 && c.s !== selectedCards[0].s;
            const canBeatTarget = isHumanDefender && selDefTargetRow && canBeat(selDefTargetRow.att, c, G.trump) && !isMaija(c);
            const defDimmed = isHumanDefender && selDefTargetRow && !canBeatTarget;
            return (
              <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <Card card={c}
                  selected={isSel}
                  highlight={!!canBeatTarget}
                  dim={wrongSuit || !!defDimmed}
                  onClick={isHumanAttacker ? () => humanToggleCard(c)
                    : (isHumanDefender && selDefTargetRow) ? () => humanBeatWithCard(c)
                    : undefined}
                  backStyle={BACKS[cardBack]}/>
                {isMaija(c) && <span style={{ fontSize:8, color:C.maija, fontFamily:'sans-serif' }}>⚠</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toimintopainikkeet */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', minHeight:44, alignItems:'center', marginBottom:10 }}>
        {isHumanAttacker && selectedCards.length > 0 && (
          <>
            <button onClick={humanAttack} style={{ background:`linear-gradient(135deg,${C.red},#8a1500)`,
              border:'none', borderRadius:9, padding:'10px 20px', color:C.text,
              fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>
              Lyö {selectedCards.length > 1 ? `${selectedCards.length} korttia` : 'kortti'} ⚔️
            </button>
            <button onClick={() => setSel([])} style={{ background:'transparent',
              border:`1px solid ${C.dim}66`, borderRadius:9, padding:'10px 16px',
              color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>Peruuta</button>
          </>
        )}
        {isHumanDefender && (
          <>
            {selDefTargetIdx !== null && (
              <button onClick={() => setSelDefTargetIdx(null)} style={{ background:'transparent',
                border:`1px solid ${C.dim}66`, borderRadius:9, padding:'10px 16px',
                color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>Peruuta valinta</button>
            )}
            {unbeaten.length > 0 && table.some(r => r.def) && (
              <button onClick={humanTakeAll} style={{ background:'transparent',
                border:`1px solid ${C.gold}88`, borderRadius:9, padding:'10px 20px',
                color:C.gold, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>
                Ota loput ({unbeaten.length}) 🛡️
              </button>
            )}
            {unbeaten.length === table.length && (
              <button onClick={humanTakeAll} style={{ background:'transparent',
                border:`1px solid ${C.red}88`, borderRadius:9, padding:'10px 20px',
                color:C.red, fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:'Georgia,serif', marginLeft:'auto' }}>
                Ota kaikki 🛡️
              </button>
            )}
          </>
        )}
      </div>

      {/* Tilarivi */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', paddingTop:10,
        borderTop:`1px solid ${C.panelBorder}`, alignItems:'center', marginBottom:12 }}>
        {G.players.map((p, i) => (
          <div key={p.id} style={{ fontFamily:'sans-serif', fontSize:11, padding:'4px 10px', borderRadius:16,
            border:`1px solid ${G.attackerIdx===i ? C.red+'55' : G.defenderIdx===i ? C.blue+'55' : C.panelBorder}`,
            color:G.attackerIdx===i ? C.red : G.defenderIdx===i ? C.blue : C.dim,
            background:G.attackerIdx===i ? C.red+'08' : G.defenderIdx===i ? C.blue+'08' : 'transparent' }}>
            {p.name} {G.attackerIdx===i ? '⚔' : G.defenderIdx===i ? '🛡' : ''} {korttia(p.hand.length)}
          </div>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:4, alignItems:'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize:10, padding:'3px 8px', borderRadius:12,
            border:`1px solid ${soundOn ? C.gold+'55' : C.panelBorder}`,
            background:'transparent', color:soundOn ? C.gold : C.dim, cursor:'pointer', fontFamily:'sans-serif' }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize:10, padding:'3px 8px', borderRadius:12,
            border:'1px solid #2a4a32', background:'transparent', color:C.dim,
            cursor:'pointer', fontFamily:'sans-serif' }}>
            {debugOpen ? '🙈' : '🔍'}
          </button>
        </div>
      </div>

      {/* Loki */}
      <div style={{ border:`1px solid ${C.panelBorder}`, borderRadius:10, overflow:'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width:'100%', background:'rgba(255,255,255,0.02)',
          border:'none', padding:'6px 14px', display:'flex', alignItems:'center',
          gap:8, cursor:'pointer', color:C.dim }}>
          <span style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:1.5, flex:1, textAlign:'left' }}>
            TAPAHTUMALOKI
          </span>
          <span style={{ fontSize:12, transition:'transform 0.2s', transform:logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div style={{ maxHeight:240, overflowY:'auto' }}>
            {log.map((e, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'4px 14px',
                borderTop:`1px solid rgba(42,74,50,0.4)`,
                background:i===0 ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                <span style={{ fontSize:10, color:C.dim, fontFamily:'monospace', flexShrink:0, marginTop:1 }}>{e.t}</span>
                <span style={{ fontSize:12, color:i===0 ? '#c0d8c8' : '#8aaa90', fontFamily:'sans-serif', lineHeight:1.5 }}>{e.m}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        button:active{transform:scale(0.97)}
        @keyframes pakaFlash{0%{opacity:0.4;letter-spacing:1.5px}12%{opacity:1;letter-spacing:3px;text-shadow:0 0 14px rgba(224,92,59,0.9),0 0 30px rgba(224,92,59,0.5)}40%{opacity:1;letter-spacing:2px;text-shadow:0 0 8px rgba(224,92,59,0.5)}70%{opacity:1;letter-spacing:1.5px;text-shadow:none}100%{opacity:1}}
      `}</style>
    </div>
  );
}
