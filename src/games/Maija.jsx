import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GroupPicker from '../shared/GroupPicker.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { SUITS, RANKS, isRed, lbl, korttia, kortin, shuffle, cardName, sortHand as sortHandBy } from '../shared/helpers.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import PoytaPanel from '../shared/PoytaPanel.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';

// A=14 for combat comparisons — different from shared helpers (A=1)
const VAL = { A:14,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13 };

const isMaija = c => c && c.r === 'Q' && c.s === '♠';

// Q♠-minikortti (sama ulkoasu kuin valikon CardIcon, App.jsx) — korvaa Unicode-
// korttiglyyfin 🂭, joka renderöityy monella laitteella tofu-laatikkona. s = skaala.
const QCard = ({ s = 1 }) => (
  <span style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    width:26*s, height:34*s, background:'#f6efdd', borderRadius:Math.max(3, 4*s), lineHeight:1.05,
    boxShadow:'0 1px 3px rgba(0,0,0,0.4)', fontFamily:'Georgia,serif', flexShrink:0, verticalAlign:'middle' }}>
    <span style={{ fontSize:13*s, fontWeight:700, color:'#1a1a1a' }}>Q</span>
    <span style={{ fontSize:13*s, color:'#1a1a1a' }}>♠</span>
  </span>
);
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

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

// ── AI-päätöslogiikka (puhtaat funktiot) ─────────────────────────────
// Irrotettu runAIAttack/runAIDefendista, jotta sama logiikka ajaa botit ja Heron
// neuvon. Vain julkista tietoa (oma käsi, pöytä, poistopakka, valtti). Ei satunnaisuutta.

// Hyökkäys: palauttaa pelattavan korttitaulukon (saman maan ryhmä, Maija-dumppi
// priorisoituna, Mestarin valttihyökkäys pakan tyhjennyttyä).
function maijaPickAttack(hand, trump, defHandSize, discard, deckEmpty, level) {
  const maija = hand.find(isMaija);
  const treatsMaijaAsNormal = level === 'beginner';
  const bySuit = {};
  hand.forEach(c => {
    if ((treatsMaijaAsNormal || !isMaija(c)) && c.s !== trump) {
      if (!bySuit[c.s]) bySuit[c.s] = [];
      bySuit[c.s].push(c);
    }
  });
  if (!Object.keys(bySuit).length) {
    hand.forEach(c => { if (treatsMaijaAsNormal || !isMaija(c)) { if (!bySuit[c.s]) bySuit[c.s] = []; bySuit[c.s].push(c); } });
  }
  const suits = Object.values(bySuit).sort((a, b) => b.length - a.length);
  suits.forEach(grp => grp.sort((a, b) => level === 'beginner' ? b.v - a.v : a.v - b.v));
  let toPlay = (suits[0] || []).slice(0, Math.min((suits[0] || []).length, defHandSize));

  if (deckEmpty && !maija && level === 'hard') {
    const myTrumps = hand.filter(c => c.s === trump && !isMaija(c));
    const trumpsDiscarded = discard.filter(c => c.s === trump).length;
    const trumpsElsewhere = 13 - trumpsDiscarded - myTrumps.length;
    if (myTrumps.length >= 2 && trumpsElsewhere <= 3) {
      toPlay = [...myTrumps].sort((a, b) => a.v - b.v).slice(0, defHandSize);
    }
  }
  if (maija && level !== 'beginner') {
    const otherSpades = hand.filter(c => c.s === '♠' && !isMaija(c)).sort((a, b) => a.v - b.v);
    toPlay = [maija, ...otherSpades].slice(0, defHandSize);
  }
  if (!toPlay.length) { toPlay = maija ? [maija] : [hand[0]]; }
  return toPlay;
}

// Puolustus: palauttaa { decisions, canBeatAll }. decisions = [{ ri, card }] siinä
// järjestyksessä kuin kaadot kannattaa tehdä (Mestari: tärkeimmät ensin). Tyhjä
// decisions = ei pysty kaatamaan mitään. Sivuvaikutukset (SFX) jäävät kutsujalle.
function maijaPickDefense(hand0, table, trump, deckEmpty, level) {
  let hand = [...hand0];

  const canBeatAll = (() => {
    let tmp = [...hand];
    for (const row of table) {
      if (row.def) continue;
      const best = tmp.filter(c => canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
      if (!best.length) return false;
      tmp = tmp.filter(c => c.id !== best[0].id);
    }
    return true;
  })();

  let trumpsNeeded = 0;
  {
    let tmp = [...hand];
    for (const row of table) {
      if (row.def) continue;
      const nonT2 = tmp.filter(c => c.s !== trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
      if (nonT2.length) { tmp = tmp.filter(c => c.id !== nonT2[0].id); }
      else {
        const trp2 = tmp.filter(c => c.s === trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
        if (trp2.length) { trumpsNeeded++; tmp = tmp.filter(c => c.id !== trp2[0].id); }
      }
    }
  }
  const cardsOnTable = table.filter(r => !r.def).length;
  let usesTrumpToBeat = canBeatAll;
  if (canBeatAll && trumpsNeeded > 0) {
    if (level === 'normal') usesTrumpToBeat = deckEmpty || cardsOnTable >= 3;
    else if (level === 'hard') usesTrumpToBeat = deckEmpty || cardsOnTable >= 2;
  }

  const rowOrder = [...table.keys()];
  if (level === 'hard') {
    const weight = (row) => row.def ? -1 : (isMaija(row.att) ? 100 : row.att.v);
    rowOrder.sort((a, b) => weight(table[b]) - weight(table[a]));
  }
  const decisions = [];
  for (const ri of rowOrder) {
    const row = table[ri];
    if (row.def) continue;
    const nonT = hand.filter(c => c.s !== trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
    const trp  = hand.filter(c => c.s === trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
    let chosen;
    if (canBeatAll && level === 'beginner') {
      chosen = [...nonT, ...trp].sort((a, b) => a.v - b.v)[0];
    } else {
      chosen = usesTrumpToBeat ? (nonT[0] || trp[0]) : nonT[0];
    }
    if (!chosen) continue;
    hand = hand.filter(c => c.id !== chosen.id);
    decisions.push({ ri, card: chosen });
  }
  return { decisions, canBeatAll };
}

// Mestarin neuvo Herolle (pelaaja 0): hard-tason logiikka, vain julkinen tieto.
// Palauttaa { type, cards?/card?, target? } — type vastaa games.maija.advice.* -avainta.
export function getAdvice(g, phase, table) {
  if (!g) return null;
  if (phase === 'attacking' && g.attackerIdx === 0) {
    const hand = g.players[0].hand;
    if (!hand.length) return null;
    const defHandSize = g.players[g.defenderIdx].hand.length;
    const toPlay = maijaPickAttack(hand, g.trump, defHandSize, g.discard, g.deck.length === 0, 'hard');
    if (!toPlay.length) return null;
    if (toPlay.some(isMaija)) return { type: 'attackMaija', cards: toPlay };
    // Valttihyökkäys (pakka tyhjä, valtteja vähissä muualla) on oma neuvonsa: silloin
    // valtteja EI säästetä puolustukseen, joten perusneuvon lupaus ei päde.
    const allTrumps = toPlay.every(c => c.s === g.trump);
    return { type: allTrumps ? 'attackTrumps' : 'attack', cards: toPlay };
  }
  if (phase === 'defending' && g.defenderIdx === 0) {
    if (!table) return null;
    const { decisions } = maijaPickDefense(g.players[0].hand, table, g.trump, g.deck.length === 0, 'hard');
    if (!decisions.length) return { type: 'take' };
    const first = decisions[0];
    return { type: 'beat', card: first.card, target: table[first.ri].att };
  }
  return null;
}


// ── Kortti ──────────────────────────────────────────────────────────
function Card({ card, small, xsmall, highlight, advice, dim, selected, onClick, backStyle, faceDown }) {
  const [h, setH] = useState(false);
  const w = xsmall ? 38 : small ? 44 : 58, ht = xsmall ? 52 : small ? 60 : 80;
  const back = backStyle || BACKS.ilves;
  const clickable = !!onClick;
  const mjBorder = card && isMaija(card);

  if (faceDown) return (
    <div aria-hidden="true" style={{ width:w, height:ht, borderRadius:7, position:'relative', overflow:'hidden',
      flexShrink:0, border:`1px solid ${back.border}` }}>
      {back.render(w, ht)}
    </div>
  );

  const a11y = clickable
    ? { role:'button', tabIndex:0, 'aria-label':cardName(card),
        onKeyDown:e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } }
    : { role:'img', 'aria-label':cardName(card) };

  const borderCol = selected ? C.blue : advice ? C.botMode : mjBorder ? C.maija : highlight ? C.gold : back.border;
  const shadow = selected ? '0 0 14px rgba(91,168,212,0.6)' :
                 advice ? '0 0 0 3px #c084fc, 0 0 26px 6px rgba(192,132,252,0.85)' :
                 highlight ? '0 0 14px rgba(201,168,76,0.6)' :
                 mjBorder ? '0 0 10px rgba(139,26,26,0.5)' :
                 h && clickable ? '0 6px 16px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.3)';

  return (
    <div {...a11y} onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width:w, height:ht, borderRadius:7, flexShrink:0,
        background:C.card, border:`2px solid ${borderCol}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:clickable ? 'pointer' : 'default',
        transform:`${h && clickable ? 'translateY(-5px) scale(1.06)' : advice && !selected ? 'translateY(-6px) scale(1.04)' : 'none'} ${selected ? 'translateY(-8px)' : ''}`,
        transition:'transform 0.15s,box-shadow 0.15s',
        boxShadow:shadow, opacity:dim ? 0.35 : 1,
        animation: advice ? 'advicePulse 1.4s ease-in-out infinite' : undefined,
      }}>
      <div style={{ textAlign:'center', fontFamily:'Georgia,serif', lineHeight:1.1,
        pointerEvents:'none', color:mjBorder ? C.maija : SUIT_COLOR[card.s] }}>
        <div style={{ fontSize:xsmall ? 11 : small ? 12 : 16, fontWeight:700 }}>{card.r}</div>
        <div style={{ fontSize:xsmall ? 12 : small ? 13 : 19 }}>{card.s}</div>
        {mjBorder && <div style={{ fontSize:8, color:C.maija, letterSpacing:0.5 }}>MAIJA</div>}
      </div>
    </div>
  );
}

const sortHand = hand => sortHandBy(hand, c => c.v);

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
const shuffledAINames = pool => shuffle(pool || AI_NAMES);

// ── Alustus ─────────────────────────────────────────────────────────
function initGame(nPlayers, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  let deck = newDeck();
  let trumpIdx = deck.length - 1;
  while (deck[trumpIdx].s === '♠') {
    deck = shuffle(deck);
    trumpIdx = deck.length - 1;
  }
  const trump = deck[trumpIdx].s;
  const trumpCard = deck[trumpIdx];
  const players = Array.from({ length:nPlayers }, (_,i) => ({
    id:i, name:i===0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i-1],
    isHuman: allBots ? false : i===0,
    hand:deck.splice(0, 5),
  }));
  return { players, deck, trump, trumpCard, discard:[],
    attackerIdx:0, defenderIdx:1 };
}

// ── Pääkomponentti ──────────────────────────────────────────────────
import { useT } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

export default function Maija({ onResult, showLog = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(playerCount);
  const [soundOn, setSnd] = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G, setG] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [table, setTable] = useState([]);
  const [selectedCards, setSel] = useState([]);
  const [selDefTargetIdx, setSelDefTargetIdx] = useState(null);
  const [msg, setMsg_] = useState('');
  const [log, setLog] = useState([]);
  const [logOpen, setLO] = useState(showLog);
  const [debugOpen, setDebug] = useState(initSeeAll);
  const [finished, setFinished] = useState([]);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);
  const [allBots, setAllBots]             = useState(false);
  const [paused, setPaused]               = useState(false);
  const [aiDelayMs, setAiDelayMs]         = useState(2000);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [pendingResult, setPendingResult] = useState(null);
  const [advice, setAdvice]               = useState(null); // { text, cardIds, targetId } | null

  const gRef = useRef(null);
  const phaseRef = useRef('idle');
  const prevDeckRef = useRef(null);
  const tableRef = useRef([]);
  const logRef = useRef([]);
  const sndRef     = useRef(false);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const finRef = useRef([]);
  const lastPlayTmr = useRef(null);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });

  useEffect(() => { gRef.current = G; }, [G]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { tableRef.current = table; }, [table]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  // neuvo vanhenee tilamuutoksesta; phase ja table ovat G:n ulkopuolisia useStateja
  useEffect(() => { setAdvice(null); }, [G, phase, table]);

  function askAdvice() {
    const g = gRef.current;
    if (!g) return;
    const a = getAdvice(g, phaseRef.current, tableRef.current);
    if (!a) return;
    const card = a.card || a.cards?.[0];
    setAdvice({
      text: t('games.maija.advice.' + a.type, {
        cards: a.cards ? a.cards.map(lbl).join(', ') : undefined,
        card:  card ? lbl(card) : undefined,
        target: a.target ? lbl(a.target) : undefined,
      }),
      cardIds: a.card ? [a.card.id] : (a.cards ? a.cards.map(c => c.id) : []),
      targetId: a.target ? a.target.id : null,
    });
  }
  useEffect(() => { finRef.current = finished; }, [finished]);
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
    if (allBotsRef.current && onSnapshot && gRef.current) {
      const g = gRef.current;
      onSnapshot({ step: logRef.current.length, logText: m,
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: null })),
        tableCards: (g.discard ?? []).slice(-3), extraText: g.trump ? `Valtti: ${g.trump}` : null });
    }
  }


  const M = {
    gameStart: (trumpCard, attacker, defender) => t('games.maija.msg.gameStart', {
      trump: `<span style="color:${SUIT_COLOR[trumpCard.s]}">${trumpCard.s}</span>`, attacker, defender,
    }),
    finishedGame: (name, rank) => rank === 1
      ? t('games.maija.msg.finishedWin', { name })
      : t('games.maija.msg.finishedOut', { name }),
    maija: (name, hadMaija) => t(hadMaija ? 'games.maija.msg.maijaQ' : 'games.maija.msg.maija', { name }),
    newAttack: (attacker, defender) => t('games.maija.msg.newAttack', { attacker, defender }),
    defendTake: (name, unbeatenCount, detail) => t('games.maija.msg.defendTake', { name, cards: kortin(unbeatenCount), detail }),
    aiAttack: (name, cards) => t('games.maija.msg.aiAttack', { name, cards }),
    aiDefense: (name, count) => t('games.maija.msg.aiDefense', { name, cards: korttia(count) }),
    maijaWarning: t('games.maija.msg.maijaWarning'),
    defenderWinRound: (name) => t('games.maija.msg.defenderWinRound', { name }),
    defenderWinRoundNext: t('games.maija.msg.defenderWinRoundNext'),
    tooManyCards: t('games.maija.msg.tooManyCards'),
    maijaNotValid: t('games.maija.msg.maijaNotValid'),
    cardTooSmall: (defCard, attCard) => t('games.maija.msg.cardTooSmall', { defCard, attCard }),
    beatWith: (attCard, defCard) => t('games.maija.msg.beatWith', { attCard, defCard }),
  };

  function flashLastPlay(name, cards, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: Array.isArray(cards) ? cards : [cards], isHuman });
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
    setPhase('attacking'); phaseRef.current = 'attacking';
    setTable([]); tableRef.current = [];
    setSel([]); setSelDefTargetIdx(null);
    setFinished([]); finRef.current = [];
    logRef.current = []; setLog([]); setPakaAnim(false);
    addLog(M.gameStart(g.trumpCard, g.players[g.attackerIdx].name, g.players[g.defenderIdx].name));
    setScreen('game');
    setShuffling(true);
    aiTmr.current = tm(() => maybeAIAttack(g), 3100 + Math.random() * 400);
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
        addLog(M.finishedGame(p.name, newFin.length));
      }
    });
    const active = g.players.filter((_, i) => !newFin.includes(i));
    if (active.length <= 1) {
      if (active.length === 1) {
        const loser = active[0];
        const isMaijaPlayer = loser.hand.some(isMaija);
        if (sndRef.current) SFX.maija();
        addLog(M.maija(loser.name, isMaijaPlayer));
      }
      const fullFin = [...newFin, ...active.map(p => p.id)];
      const ranking = fullFin.map((idx, pos) => ({
        name: g.players[idx].name, place: pos + 1, isHuman: g.players[idx].isHuman,
      }));
      setPhase('gameover'); phaseRef.current = 'gameover';
      setFinished(newFin); finRef.current = newFin;
      if (allBotsRef.current) { tm(() => onResult?.({ ranking }), 1800); }
      else { tm(() => onResult?.({ ranking }), 1800); }
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
    addLog(M.newAttack(g4.players[newAtt].name, g4.players[newDef].name));
    aiTmr.current = tm(() => maybeAIAttack(g4), 1800);
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
    const detail = beaten.length > 0 ? t('games.maija.msg.beatDetail', { n: beaten.length >> 1 }) : '';
    addLog(M.defendTake(g.players[g.defenderIdx].name, unbeaten.length, detail));
    g2 = drawHand(g2, g2.attackerIdx);
    const { done, fin:newFin } = checkWinners(g2, fin);
    if (done) return;
    advanceRound(g2, newFin, true);
  }

  function maybeAIAttack(g) {
    if (!g) g = gRef.current;
    if (!g || phaseRef.current !== 'attacking') return;
    if (g.players[g.attackerIdx].isHuman) return;
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 1200;
    const schedAttack = () => {
      if (pausedRef.current) { tm(schedAttack, 300); return; }
      const g2 = gRef.current;
      runAIAttack(g2);
    };
    aiTmr.current = tm(schedAttack, baseDelay + Math.random() * 400);
  }

  function runAIAttack(g2) {
    if (!g2) return;
    {
      const hand = g2.players[g2.attackerIdx].hand;
      const defHandSize = g2.players[g2.defenderIdx].hand.length;
      if (!hand.length) { resolveDefenseWin(g2, [], finRef.current); return; }
      // Kyvykkyysporras (ei satunnaiskohinaa):
      //   Oppipoika: pelaa ISOT kortit ensin (haluaa "voittaa" kierroksia) eikä
      //              suunnittele Maijan dumppausta — muttei myöskään pelkää sitä
      //   Kisälli:   pienimmät ensin + Maija-prioriteetti
      //   Mestari:   + valttilaskenta pakan loputtua
      // Päätöslogiikka moduulitason maijaPickAttack-funktiossa (jaettu Heron neuvon kanssa).
      const atkLevel = botLevelsRef.current?.[g2.attackerIdx] ?? aiLevelRef.current;
      const toPlay = maijaPickAttack(hand, g2.trump, defHandSize, g2.discard, g2.deck.length === 0, atkLevel);
      if (initShowIntention) {
        const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
        setIntention({ playerIdx: g2.attackerIdx, cards: toPlay });
        aiTmr.current = tm(() => { setIntention(null); doAttack(g2, toPlay); }, intentionMs);
        return;
      }
      doAttack(g2, toPlay);
    }
  }

  function doAttack(g, cards) {
    if (sndRef.current) SFX.play();
    const attName = g.players[g.attackerIdx];
    const msg = M.aiAttack(attName.name, cards.map(lblColored).join(', '));
    addLog(msg);
    flashLastPlay(attName.name, cards, attName.isHuman);
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
    addLog(M.aiDefense(defName.name, tbl.length));
    if (tbl.some(r => isMaija(r.att))) {
      addLog(M.maijaWarning);
    }
    aiTmr.current = tm(() => maybeAIDefend(g2, tbl), 1000 + Math.random() * 400);
  }

  function maybeAIDefend(g, tbl) {
    if (!g) g = gRef.current;
    if (!g || phaseRef.current !== 'defending') return;
    if (g.players[g.defenderIdx].isHuman) return;
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 1000;
    const schedDefend = () => {
      if (pausedRef.current) { tm(schedDefend, 300); return; }
      const g2 = gRef.current;
      const tbl2 = tableRef.current;
      runAIDefend(g2, tbl2);
    };
    aiTmr.current = tm(schedDefend, baseDelay + Math.random() * 400);
  }

  function runAIDefend(g2, tbl2) {
    if (!g2 || !tbl2) return;
    const defender = g2.players[g2.defenderIdx];
      const defLevel = botLevelsRef.current?.[g2.defenderIdx] ?? aiLevelRef.current;
      // Kaatopäätökset moduulitason maijaPickDefense-funktiossa (jaettu Heron neuvon
      // kanssa): valttiepäröinti, Mestarin tärkeysjärjestys ja osittaiskaato mukana.
      const { decisions } = maijaPickDefense(defender.hand, tbl2, g2.trump, g2.deck.length === 0, defLevel);
      const decMap    = new Map(decisions.map(d => [d.ri, d.card]));
      const chosenIds = new Set(decisions.map(d => d.card.id));
      const hand      = defender.hand.filter(c => !chosenIds.has(c.id));
      if (sndRef.current) decisions.forEach(() => SFX.beat());
      const newTbl = tbl2.map((row, ri) => decMap.has(ri) ? { ...row, def: decMap.get(ri) } : row);

      const players = g2.players.map((p,i) => i===g2.defenderIdx ? { ...p, hand } : p);
      setTable(newTbl); tableRef.current = newTbl;
      const unbeaten = newTbl.filter(r => !r.def);
      if (unbeaten.length === 0) {
        const defName = g2.players[g2.defenderIdx];
        const beaten = newTbl.length;
        addLog(M.defenderWinRound(defName.name));
        if (sndRef.current) SFX.fanfare();
        tm(() => resolveDefenseWin({ ...g2, players }, newTbl, finRef.current), 2200);
      } else {
        const n = g2.players[g2.defenderIdx];
        addLog(t('games.maija.msg.aiPartialBeat', { name: n.name, beat: newTbl.length - unbeaten.length, total: newTbl.length, cards: kortin(unbeaten.length) }));
        tm(() => resolveDefenseLoss({ ...g2, players }, newTbl, finRef.current), 1500);
      }
  }

  function humanToggleCard(card) {
    if (phase !== 'attacking' || G.attackerIdx !== 0) return;
    const hand = G.players[0].hand;
    const alreadySel = selectedCards.find(c => c.id === card.id);
    if (alreadySel) {
      setSel(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length === 0) {
      setSel([card]);
    } else if (selectedCards[0].s === card.s) {
      setSel(prev => [...prev, card]);
    }
  }

  function humanAttack() {
    if (!selectedCards.length) return;
    const g = gRef.current;
    if (selectedCards.length > g.players[g.defenderIdx].hand.length) {
      addLog(M.tooManyCards); return;
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
    if (isMaija(card)) { addLog(M.maijaNotValid); return; }
    const g = gRef.current;
    const row = table[selDefTargetIdx];
    if (!canBeat(row.att, card, g.trump)) {
      addLog(M.cardTooSmall(lblColored(card), lblColored(row.att))); return;
    }
    if (sndRef.current) SFX.beat();
    addLog(M.beatWith(lblColored(row.att), lblColored(card)));
    const newTbl = table.map((r, i) => i === selDefTargetIdx ? { ...r, def: card } : r);
    const players = g.players.map((p, i) => i === 0 ? { ...p, hand: p.hand.filter(c => c.id !== card.id) } : p);
    const g2 = { ...g, players };
    setG(g2); gRef.current = g2;
    setTable(newTbl); tableRef.current = newTbl;
    setSelDefTargetIdx(null);
    if (newTbl.every(r => r.def)) {
      addLog(M.defenderWinRoundNext);
      if (sndRef.current) SFX.fanfare();
      tm(() => resolveDefenseWin(g2, newTbl, finRef.current), 1200);
    }
  }

  function humanTakeAll() {
    if (phase !== 'defending' || G.defenderIdx !== 0) return;
    resolveDefenseLoss(gRef.current, tableRef.current, finRef.current);
  }

  // ── Pelaajien valinta ────────────────────────────────────────────
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <div style={{ background:C.bg, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', gap:28, paddingTop:isMobile ? 24 : 32, fontFamily:'Georgia,serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:8 }}><QCard s={2} /></div>
        <h1 style={{ fontSize:52, letterSpacing:12, margin:0, background:`linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>MAIJA</h1>
        <div style={{ display:'flex', gap:10, justifyContent:'center', fontSize:16, marginTop:8 }}>
          <span style={{ color:SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color:SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color:SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color:SUIT_COLOR['♣'] }}>♣</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:16, alignItems:'center' }}>
        <p style={{ color:C.dim, fontFamily:'sans-serif', fontSize:11, margin:0, letterSpacing:2 }}>{t('ui.start.players')}</p>
        <div style={{ display:'flex', gap:10 }}>
          {[2,3,4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width:54, height:54, borderRadius:10, cursor:'pointer', fontSize:20, fontWeight:700, fontFamily:'Georgia,serif', border:`2px solid ${nP===n ? C.gold : '#2a4a32'}`, background:nP===n ? C.gold+'18' : 'transparent', color:nP===n ? C.gold : C.dim, transition:'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>
      <GroupPicker value={playerGroup} onChange={onPlayerGroupChange} />
      <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
        <button onClick={() => startGame()} style={{ background:`linear-gradient(135deg,${C.gold},#a07830)`, border:'none', borderRadius:14, padding:'14px 44px', color:'#0d2118', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif', letterSpacing:2 }}>{t('ui.start.begin')}</button>
        <button onClick={startBotBattle} style={{ background:'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border:'none', borderRadius:14, padding:'10px 32px', color:'#f0e6ff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          {t('ui.start.botBattle')}
          <span style={{ fontSize:11, fontWeight:400, opacity:0.8 }}>{t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}</span>
        </button>
      </div>
    </div>
  );

  // ── Peli päättyi ────────────────────────────────────────────────
  if (screen === 'gameover' && G && !allBotsRef.current) {
    const sorted = [...G.players].map((p, i) => {
      const rank = finished.indexOf(i);
      const isLoser = !finished.includes(i);
      return { ...p, rank:isLoser ? G.players.length : rank + 1 };
    }).sort((a,b) => a.rank - b.rank);
    return (
      <div style={{ background:C.bg, minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:20, padding:isMobile ? '24px 12px' : 24,
        fontFamily:'Georgia,serif', color:C.text }}>
        <h1 style={{ fontSize:28, letterSpacing:8, color:C.gold, margin:0 }}>{t('ui.result.title')}</h1>
        <div style={{ width:'100%', maxWidth:440, display:'flex', flexDirection:'column', gap:8 }}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ borderRadius:12, padding:'12px 16px', display:'flex',
              alignItems:'center', gap:12,
              background:i===0 ? C.gold+'14' : p.rank===G.players.length ? C.maija+'14' : 'rgba(255,255,255,0.02)',
              border:`1px solid ${i===0 ? C.gold+'55' : p.rank===G.players.length ? C.maija+'55' : C.panelBorder}` }}>
              <span style={{ fontSize:20, display:'inline-flex', alignItems:'center' }}>{i===0 ? '🏆' : p.rank===G.players.length ? <QCard s={0.8} /> : '🎯'}</span>
              <span style={{ fontFamily:'sans-serif', fontSize:14, flex:1,
                color:i===0 ? C.gold : p.rank===G.players.length ? C.maija : C.text }}>{p.name}</span>
              <span style={{ fontFamily:'sans-serif', fontSize:12, color:C.dim }}>
                {p.rank===G.players.length ? 'Maija' : t('ui.result.place', { n: p.rank })}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
          {allBots ? (<>
            <button onClick={startBotBattle} style={{ background:'linear-gradient(135deg,#7B2FBE,#5a1f8a)', border:'none', borderRadius:12, padding:'12px 32px', color:'#f0d0ff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.result.newWatch')}</button>
            {pendingResult && <button onClick={() => { onResult?.(pendingResult); setPendingResult(null); }} style={{ background:`linear-gradient(135deg,${C.gold},#a07830)`, border:'none', borderRadius:12, padding:'12px 32px', color:'#0d2118', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.result.results')}</button>}
          </>) : (<>
            <button onClick={() => startGame()} style={{ background:`linear-gradient(135deg,${C.gold},#a07830)`,
              border:'none', borderRadius:12, padding:'12px 32px', color:'#0d2118',
              fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.result.newGame')}</button>
            <button onClick={() => setScreen('select')} style={{ background:'transparent',
              border:`1px solid ${C.gold}55`, borderRadius:12, padding:'12px 24px',
              color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.start.changePlayers')}</button>
          </>)}
        </div>
      </div>
    );
  }

  if (!G) return null;

  const isHumanAttacker = G.attackerIdx === 0 && phase === 'attacking' && !allBots;
  const isHumanDefender = G.defenderIdx === 0 && phase === 'defending' && !allBots;
  const unbeaten = table.filter(r => !r.def);
  const selDefTargetRow = selDefTargetIdx !== null ? table[selDefTargetIdx] : null;

  return (
    <div style={{ background:C.bg, fontFamily:'Georgia,serif', color:C.text,
      padding: isMobile ? '6px 8px' : '14px 16px', maxWidth:560, margin:'0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <TurnPrompt show={isHumanAttacker || isHumanDefender} action={t(isHumanAttacker ? 'ui.turn.maijaAttack' : 'ui.turn.maijaDefend')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />

      {/* Viestikupla */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`,
        borderRadius:14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12,
        minHeight: isMobile ? 44 : 60, display:'flex', alignItems:'center', gap:10 }}>
        <QCard s={0.7} />
        <p style={{ margin:0, fontFamily:'sans-serif', fontSize:13, lineHeight:1.55, color:C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Valtti */}
      <div style={{ display:'flex', gap:6, marginBottom: isMobile ? 4 : 10, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20, border:`1px solid ${C.trump}55`, background:`${C.trump}0d` }}>
          <span style={{ fontFamily:'sans-serif', fontSize:11, color:C.dim }}>{t('ui.shared.trump')}</span>
          <span style={{ fontSize:18, color:SUIT_COLOR[G.trump], fontWeight:700 }}>{G.trump}</span>
          {G.trumpCard && <Card card={G.trumpCard} small backStyle={BACKS[cardBack]} />}
        </div>
      </div>

      {/* Muut pelaajat */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 10 }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => {
                const isAtt = G.attackerIdx === p.id;
                const isDef = G.defenderIdx === p.id;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isAtt ? C.red + '66' : isDef ? C.blue + '66' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px' }}>
                    <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: isAtt ? C.red : isDef ? C.blue : C.dim }}>
                      {isAtt ? '⚔️' : isDef ? '🛡️' : '🤖'} {p.name.slice(0, 8)}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                      {sortHand(p.hand).map(c => {
                        const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                        return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]} selected={isIntended} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          : (
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => {
                const isAtt = G.attackerIdx === p.id;
                const isDef = G.defenderIdx === p.id;
                return (
                  <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isAtt ? C.red + '66' : isDef ? C.blue + '66' : C.panelBorder}`, borderRadius: 10, padding: '7px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isAtt ? C.red : isDef ? C.blue : C.dim, marginBottom: 4 }}>
                      {isAtt ? '⚔️' : isDef ? '🛡️' : '🤖'} {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {debugOpen
                        ? p.hand.map(c => {
                            const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                            return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]} selected={isIntended} />;
                          })
                        : p.hand.map((_, ci) => <div key={ci} style={{ width: 22, height: 33, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Pöytä */}
      <PoytaPanel isMobile={isMobile}
        minHeight={{ m: 170, t: 220 }}
        title={<span>{t('ui.shared.tableLabel')} — {phase==='attacking' ? t('games.maija.ui.phaseAtk') : t('games.maija.ui.phaseDef')}</span>}
        right={<PakkaCount count={G.deck.length} flash={pakaAnim} />}>
        {table.length === 0
          ? <div style={{ textAlign:'center', color:C.dim, fontFamily:'sans-serif', fontSize:12,
              opacity:0.5, paddingTop:40 }}>
              {isHumanAttacker ? t('games.maija.ui.attackHint') : t('ui.shared.wait')}
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
                      advice={advice?.targetId === row.att.id}
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
      </PoytaPanel>

      {/* Viimeisin siirto — kelluva, ei varaa korkeutta */}
      <div style={{ position: 'relative', height: 0 }}>
        {lastPlay && (
          <div key={lastPlay.cards[0].id} style={{ position: 'absolute', bottom: 4, left: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,22,18,0.95)', border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`, borderRadius: 12, padding: '4px 12px', animation: 'lastPlayFade 1.9s ease forwards', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>{lastPlay.name}</span>
            {lastPlay.cards.map(c => (
              <span key={c.id} style={{ background: '#f8f2e6', borderRadius: 4, padding: '1px 5px', fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif', color: SUIT_COLOR[c.s] }}>{c.r}{c.s}</span>
            ))}
          </div>
        )}
      </div>

      {!allBots && (<>
      {/* Pelaaja 0 (ihminen tai botti katselutilassa) */}
      <div style={{ background:'rgba(255,255,255,0.02)',
        border:`2px solid ${(isHumanAttacker || isHumanDefender) ? C.gold+'44' : C.panelBorder}`,
        borderRadius:14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 12, transition:'border-color 0.2s' }}>
        <div style={{ fontFamily:'sans-serif', fontSize:12,
          color:(isHumanAttacker || isHumanDefender) ? C.gold : C.dim, marginBottom:8 }}>
          {allBots ? '🤖' : '👤'} {G.players[0].name} {G.attackerIdx===0 ? '⚔️' : G.defenderIdx===0 ? '🛡️' : ''}
          {!allBots && isHumanAttacker && <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>{t('games.maija.ui.attackHint2')}</span>}
          {!allBots && isHumanDefender && !selDefTargetRow && <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>{t('games.maija.ui.defendHint1')}</span>}
          {!allBots && isHumanDefender && selDefTargetRow && <span style={{ color:C.gold, fontSize:11, marginLeft:8 }}>{t('games.maija.ui.defendHint2', { card: lbl(selDefTargetRow.att) })}</span>}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {sortHand(G.players[0].hand).map(c => {
            const isSel = !!selectedCards.find(x => x.id === c.id);
            const wrongSuit = isHumanAttacker && selectedCards.length > 0 && c.s !== selectedCards[0].s;
            const canBeatTarget = isHumanDefender && selDefTargetRow && canBeat(selDefTargetRow.att, c, G.trump) && !isMaija(c);
            const defDimmed = isHumanDefender && selDefTargetRow && !canBeatTarget;
            const isAdv     = !isSel && !!advice?.cardIds?.includes(c.id);
            // Mestarin neuvo päällä: kaikki muu himmenee, jotta osoitettu kortti erottuu
            const dimmed    = advice?.cardIds?.length ? !isAdv : (wrongSuit || !!defDimmed);
            return (
              <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <Card card={c}
                  small={isMobile}
                  selected={isSel}
                  highlight={!!canBeatTarget}
                  advice={isAdv}
                  dim={!!dimmed}
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
      </>)}

      {/* Bottien taistelu -ohjauspaneeli */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Toimintopainikkeet */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', minHeight:allBots ? 0 : 44, alignItems:'center', marginBottom:10 }}>
        {!allBots && isHumanAttacker && selectedCards.length > 0 && (
          <>
            <button onClick={humanAttack} style={{ background:`linear-gradient(135deg,${C.red},#8a1500)`,
              border:'none', borderRadius:9, padding:'10px 20px', color:C.text,
              fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>
              {t('ui.action.play')} {selectedCards.length > 1 ? t('ui.action.cards', { n: selectedCards.length }) : t('ui.action.card')} ⚔️
            </button>
            <button onClick={() => setSel([])} style={{ background:'transparent',
              border:`1px solid ${C.dim}66`, borderRadius:9, padding:'10px 16px',
              color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.action.cancel')}</button>
          </>
        )}
        {!allBots && isHumanDefender && (
          <>
            {selDefTargetIdx !== null && (
              <button onClick={() => setSelDefTargetIdx(null)} style={{ background:'transparent',
                border:`1px solid ${C.dim}66`, borderRadius:9, padding:'10px 16px',
                color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.action.cancelSelection')}</button>
            )}
            {unbeaten.length > 0 && table.some(r => r.def) && (
              <button onClick={humanTakeAll} style={{ background:'transparent',
                border:`1px solid ${C.gold}88`, borderRadius:9, padding:'10px 20px',
                color:C.gold, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>
                {t('games.maija.ui.takeRest', { n: unbeaten.length })}
              </button>
            )}
            {unbeaten.length === table.length && (
              <button onClick={humanTakeAll} style={{ background:'transparent',
                border:`1px solid ${C.red}88`, borderRadius:9, padding:'10px 20px',
                color:C.red, fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:'Georgia,serif' }}>
                {t('games.maija.ui.takeAll')}
              </button>
            )}
          </>
        )}
        {!allBots && (isHumanAttacker || isHumanDefender) && <AdviceButton onClick={askAdvice} />}
      </div>

      {/* Tilarivi */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', paddingTop:10,
        borderTop:`1px solid ${C.panelBorder}`, alignItems:'center', marginBottom:12 }}>
        <span style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, flex:1 }}><span style={{ color:C.gold, fontWeight:700 }}>{t('ui.shared.goal')}</span> {t('games.maija.ui.goal')}</span>
        <button onClick={() => setSnd(s => !s)} style={{ fontSize:11, padding:'5px 10px', borderRadius:12,
          border:`1px solid ${soundOn ? C.gold+'55' : C.panelBorder}`,
          background:'transparent', color:soundOn ? C.gold : C.dim, cursor:'pointer', fontFamily:'sans-serif' }}>
          {soundOn ? '🔊' : '🔇'} {t('ui.shared.sound')}
        </button>
        <button onClick={() => setDebug(d => !d)} style={{ fontSize:11, padding:'5px 10px', borderRadius:12,
          border:`1px solid ${debugOpen ? C.gold+'55' : '#2a4a32'}`, background:'transparent',
          color:debugOpen ? C.gold : C.dim, cursor:'pointer', fontFamily:'sans-serif' }}>
          {debugOpen ? '🙈' : '🔍'} {t('ui.shared.openCards')}
        </button>
      </div>

      {/* Katselutila: pending result overlay */}
      {allBots && pendingResult && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, zIndex:300 }}>
          <div style={{ background:'#1a0a2e', border:'2px solid rgba(123,47,190,0.7)', borderRadius:20, padding:'32px 40px', display:'flex', flexDirection:'column', alignItems:'center', gap:14, maxWidth:360 }}>
            <QCard s={1.3} />
            <span style={{ fontFamily:'Georgia,serif', fontSize:20, color:C.botMode, letterSpacing:4 }}>{t('ui.result.watchEnded')}</span>
            {pendingResult.ranking.map((p, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', width:'100%' }}>
                <span style={{ fontSize:16, display:'inline-flex', alignItems:'center' }}>{i===0 ? '🏆' : i===pendingResult.ranking.length-1 ? <QCard s={0.65} /> : '🎯'}</span>
                <span style={{ fontFamily:'sans-serif', fontSize:13, color:i===0 ? C.botMode : C.botModeDim, flex:1 }}>{p.name}</span>
                <span style={{ fontFamily:'monospace', fontSize:12, color:i===0 ? C.botMode : C.botModeDimmer }}>{t('ui.result.place', { n: p.place })}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button onClick={startBotBattle} style={{ background:'linear-gradient(135deg,#7B2FBE,#5a1f8a)', border:'none', borderRadius:12, padding:'11px 24px', color:'#f0d0ff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.result.newShort')}</button>
              <button onClick={() => { onResult?.(pendingResult); setPendingResult(null); }} style={{ background:`linear-gradient(135deg,${C.gold},#a07830)`, border:'none', borderRadius:12, padding:'11px 24px', color:'#0d2118', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.result.results')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Loki */}
      <div style={{ border:`1px solid ${C.panelBorder}`, borderRadius:10, overflow:'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width:'100%', background:'rgba(255,255,255,0.02)',
          border:'none', padding:'6px 14px', display:'flex', alignItems:'center',
          gap:8, cursor:'pointer', color:C.dim }}>
          <span style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:1.5, flex:1, textAlign:'left' }}>
            {t('ui.shared.logTitle')}
          </span>
          <span style={{ fontSize:12, transition:'transform 0.2s', transform:logOpen ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {logOpen && (
          <div>
            {log.map((e, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'4px 14px',
                borderTop:`1px solid rgba(42,74,50,0.4)`,
                background:i===0 ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                <span style={{ fontSize:10, color:C.dim, fontFamily:'monospace', flexShrink:0, marginTop:1 }}>{e.t}</span>
                <span style={{ fontSize:12, color:i===0 ? '#c0d8c8' : '#8aaa90', fontFamily:'sans-serif', lineHeight:1.5 }} dangerouslySetInnerHTML={{ __html: e.m }}></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        button:active{transform:scale(0.97)}
        @keyframes lastPlayFade{0%{opacity:0;transform:translateY(-4px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}
      `}</style>
    </div>
  );
}
