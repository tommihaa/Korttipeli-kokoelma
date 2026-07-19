import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GroupPicker from '../shared/GroupPicker.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, SUITS, RANKS, VAL, aiShouldFumble, truncName, sortHand as sortHandBy } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import HandoffScreen from '../shared/HandoffScreen.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import PlayerSetup, { slotsToPlayers } from '../shared/PlayerSetup.jsx';

// ── Seiska ─────────────────────────────────────────────────────
const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';
const coloredSuit = s => `<span style="color:${SUIT_COLOR[s]}">${s}</span>`;
const SUIT_SYMS = ['♠', '♥', '♦', '♣'];

function mkDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({
    s, r, v: VAL[r], id: `${r}${s}_${Math.random()}`,
  }))));
}

// Voidaanko yksittäinen kortti lyödä
function canSingle(card, discardTop, reqSuit, isLast) {
  if (card.r === '7' && isLast)            return false;
  if (card.r === 'A' && isLast)            return false;
  if (card.r === '7')                      return true;
  const suit = reqSuit || discardTop.s;
  if (card.s === suit)                     return true;
  if (!reqSuit && card.r === discardTop.r) return true;
  return false;
}

// Voidaanko korttiryhmä lyödä
function canGroup(cards, discardTop, reqSuit, handSize) {
  if (!cards.length) return false;
  if (cards.length === 1) return canSingle(cards[0], discardTop, reqSuit, handSize === 1);
  if (cards[0].r === '7' || cards[0].r === 'A') return false;
  if (cards.some(c => c.r !== cards[0].r)) return false;
  return cards.some(c => canSingle(c, discardTop, reqSuit, false));
}

function validSingles(hand, discardTop, reqSuit) {
  return hand.filter(c => canSingle(c, discardTop, reqSuit, hand.length === 1));
}

// playerDefs: [{name, isHuman}, ...]
function mkInitState(playerDefs) {
  let deck = mkDeck();
  const players = playerDefs.map((def, i) => ({
    id: i, name: def.name, isHuman: def.isHuman,
    hand: deck.splice(0, 7),
  }));
  // 7:t ja ässät eivät kelpaa aloituskortiksi — hylätyt kortit palaavat pakan pohjalle, eivät katoa
  const rejected = [];
  let top = deck.shift();
  while ((top.r === '7' || top.r === 'A') && deck.length > 0) {
    rejected.push(top);
    top = deck.shift();
  }
  if (rejected.length) deck = [...deck, ...rejected];
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

function aiBestPlay(hand, discardTop, reqSuit, opponents = []) {
  // Ryhmitä kortit arvon mukaan (ei 7/A — ne eivät salli ryhmälyöntiä)
  const byRank = {};
  for (const c of hand) {
    if (c.r === '7' || c.r === 'A') continue;
    if (!byRank[c.r]) byRank[c.r] = [];
    byRank[c.r].push(c);
  }
  // Etsi suurin ryhmä, josta vähintään yksi kortti käy (canGroup tarkistaa tämän)
  let bestMulti = null;
  for (const cards of Object.values(byRank)) {
    if (cards.length > 1 && canGroup(cards, discardTop, reqSuit, hand.length)) {
      if (!bestMulti || cards.length > bestMulti.length) bestMulti = cards;
    }
  }
  if (bestMulti) {
    // Yhdistävä kortti (matching suit) ensin — se tulee alimmaiseksi pinoon
    const suit = reqSuit || discardTop.s;
    const ci = bestMulti.findIndex(c => c.s === suit);
    if (ci > 0) bestMulti = [bestMulti[ci], ...bestMulti.slice(0, ci), ...bestMulti.slice(ci + 1)];

    // Säästä pari: pelaa ryhmä vain jos se tyhjentää / lappuuttaa käden,
    // tai jos saman maan yksittäistä korttia ei ole PARIN ULKOPUOLELLA
    // (esim. ♠3+♦3 -pari: ♠3 itse on yhdistävä kortti, ei "ulkopuolinen vaihtoehto")
    const newHandSize = hand.length - bestMulti.length;
    if (newHandSize <= 1) return bestMulti; // voitto tai lappu — aina ryhmä
    const directMatchOutsidePair = validSingles(hand, discardTop, reqSuit)
      .filter(c => c.r !== '7' && c.s === (reqSuit || discardTop.s) && !bestMulti.find(b => b.id === c.id));
    if (!directMatchOutsidePair.length) return bestMulti; // parin oma kortti on ainoa match — pelaa pari
    // Maanvaihto: jos ryhmälyönti vaihtaa maan sellaiseksi jota on enemmän kädessä → pelaa ryhmä
    const effectiveSuit = bestMulti[bestMulti.length - 1].s;
    const currentSuit   = reqSuit || discardTop.s;
    if (effectiveSuit !== currentSuit) {
      const remaining    = hand.filter(c => !bestMulti.find(b => b.id === c.id));
      const newSuitCount = remaining.filter(c => c.s === effectiveSuit).length;
      const curSuitCount = remaining.filter(c => c.s === currentSuit).length;
      if (newSuitCount > curSuitCount) return bestMulti; // maanvaihto hyödyllinen — pelaa pari
    }
    // muuten: saman maan kortti löytyy muualta — säästä pari, pelaa yksittäinen
  }

  const singles = validSingles(hand, discardTop, reqSuit);
  if (!singles.length) return null;
  const non7 = singles.filter(c => c.r !== '7');
  if (!non7.length) return [singles[0]];

  // Suosi ässää jos joku vastustaja on lähellä voittoa (≤ 2 korttia) —
  // ässärangaistus nostattaa heidät ja ässäbonusvuoro antaa jatkaa itse
  const dangerousOpponent = opponents.some(p => p.hand.length <= 2);
  if (dangerousOpponent) {
    const ace = non7.find(c => c.r === 'A');
    if (ace) return [ace];
  }

  // 3–5 korttia: suosi siirtoa joka jättää mahdollisimman suuren saman arvon ryhmän
  // (3 kädessä → jätä pari, 4 kädessä → jätä kolmoset, 5 kädessä → jätä nelonen)
  if (hand.length >= 3 && hand.length <= 5) {
    const targetSize = hand.length - 1;
    const leaveGroup = non7.filter(c => {
      const rest = hand.filter(h => h.id !== c.id);
      const rankCounts = {};
      for (const h of rest) rankCounts[h.r] = (rankCounts[h.r] || 0) + 1;
      return Object.values(rankCounts).some(count => count >= targetSize);
    });
    if (leaveGroup.length) return [leaveGroup[0]];
  }

  // Suosi korttia jolla ei ole paria kädessä — säästää parin myöhempään yhdistelmälyöntiin
  // (esim. pelaa ♥3 eikä ♥9 kun kädessä on myös ♠9)
  const nonPair = non7.filter(c => hand.filter(h => h.r === c.r).length === 1);
  return [nonPair.length ? nonPair[0] : non7[0]];
}

function aiSuit(hand) {
  const cnt = {};
  SUIT_SYMS.forEach(s => { cnt[s] = hand.filter(c => c.s === s).length; });
  return SUIT_SYMS.reduce((a, b) => cnt[a] >= cnt[b] ? a : b);
}

// Ässäbonusvuoron päätös — irrotettu runAI:sta puhtaaksi funktioksi, jotta sama
// logiikka ajaa botit ja Heron neuvon. rand-parametri säilyttää normal-tason
// Math.random-kutsujärjestyksen ennallaan (hard ei kutsu randia oikosulun takia).
function aiAceBonusDecision(hand, players, activePlayer, finished, aceBonusSuit, level, rand = Math.random) {
  const isHard = level === 'hard';
  // Bonuskortti: ässän maa, ei 7 eikä A (kettinkiässä pysytään siistinä)
  const bonusCard = hand.find(c => c.s === aceBonusSuit && c.r !== '7' && c.r !== 'A');
  // Ryhmä: bonuskortti + saman arvon kortit muilla mailla (pari/kolmoset/neloset)
  const bonusGroup = bonusCard
    ? hand.filter(c => c.r === bonusCard.r && c.r !== '7' && c.r !== 'A')
    : [];
  const applyLogic = level !== 'beginner' && (level !== 'normal' || rand() < 0.5);
  const threshold  = isHard ? 2 : 3;
  let useBonus;
  if (!bonusCard) {
    useBonus = false;
  } else if (hand.length === 1) {
    useBonus = true; // voittava siirto — aina pelataan
  } else if (bonusGroup.length >= 2) {
    useBonus = true; // pari tai enemmän — aina kannattaa pelata ryhmänä
  } else if (!applyLogic) {
    useBonus = true;
  } else {
    const anyoneAtOne = players.some(
      (pl, i) => i !== activePlayer && !finished.includes(i) && pl.hand.length === 1
    );
    useBonus = !anyoneAtOne && (hand.length - 1) <= threshold;
  }
  return { useBonus, bonusGroup };
}

// Mestarin ässänvalinta: kun useampi ässä käy, valitse se jonka maata on kädessä
// eniten muita kortteja (bonusvuoro hyödyttää eniten).
function pickBestAce(hand, discardTop, reqSuit) {
  const validAces = validSingles(hand, discardTop, reqSuit).filter(c => c.r === 'A');
  if (validAces.length <= 1) return validAces[0] || null;
  return validAces.reduce((best, ace) => {
    const f  = hand.filter(c => c.id !== ace.id  && c.s === ace.s  && c.r !== '7').length;
    const fb = hand.filter(c => c.id !== best.id && c.s === best.s && c.r !== '7').length;
    return f > fb ? ace : best;
  });
}

// Mestarin neuvo Herolle: sama päätöslogiikka kuin hard-botilla, vain julkista tietoa.
// Palauttaa { type, cards?, suit? } — type vastaa games.seiska.advice.* -avainta.
export function getAdvice(g) {
  const idx = g.activePlayer;
  const p = g.players[idx];
  if (!p) return null;
  if (g.aceBonus !== null) {
    const { useBonus, bonusGroup } = aiAceBonusDecision(p.hand, g.players, idx, g.finished, g.aceBonus, 'hard');
    return useBonus ? { type: 'aceBonusPlay', cards: bonusGroup } : { type: 'aceBonusSkip' };
  }
  const opponents = g.players.filter((pl, i) => i !== idx && !g.finished.includes(i));
  let play = aiBestPlay(p.hand, g.discardTop, g.reqSuit, opponents);
  if (play && play.length === 1 && play[0].r === 'A') {
    const bestAce = pickBestAce(p.hand, g.discardTop, g.reqSuit);
    if (bestAce) play = [bestAce];
  }
  if (!play) return g.drawsThisTurn < 3 ? { type: 'draw' } : { type: 'endTurn' };
  if (play.length === 1 && play[0].r === '7') {
    return { type: 'playSeven', cards: play, suit: aiSuit(p.hand.filter(c => c.id !== play[0].id)) };
  }
  if (play.length === 1 && play[0].r === 'A') return { type: 'playAce', cards: play };
  return { type: 'play', cards: play };
}

const sortHand = hand => sortHandBy(hand, c => c.v);

function initSlots(count) {
  return [
    { name: 'Hero', isHuman: true,  active: count >= 1 },
    { name: '',     isHuman: false, active: count >= 2 },
    { name: '',     isHuman: false, active: count >= 3 },
    { name: '',     isHuman: false, active: count >= 4 },
  ];
}

// ── Komponentti ─────────────────────────────────────────────────
import { useT } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

export default function Seiska({ onResult, showLog = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen,      setScreen]  = useState('select');
  const [playerSlots, setPlayerSlots] = useState(() => initSlots(playerCount));
  const [nP, setNP] = useState(playerCount);
  const [handoff,     setHandoff] = useState(null); // null | { name }
  const [soundOn,     setSnd]     = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G,           setG]       = useState(null);
  const [msg,         setMsg_]    = useState('');
  const [log,         setLog]     = useState([]);
  const [logOpen,     setLO]      = useState(showLog);
  const [selected,    setSel]     = useState([]);
  const [debugOpen,   setDebug]   = useState(initSeeAll);
  const [pakaAnim,    setPakaAnim] = useState(false);
  const [jpId,        setJP]      = useState(null);
  const [shuffling,   setShuffling] = useState(false);
  const [lastPlay,    setLastPlay] = useState(null);
  const [lappuSecsLeft, setLappuSecsLeft] = useState(null);
  const [paused,    setPaused]   = useState(false);
  const [aiDelayMs, setAiDelayMs] = useState(1200);
  const [intention, setIntention] = useState(null); // { playerIdx, cards } | null
  const [pendingResult, setPendingResult] = useState(null); // { ranking } — odottaa käyttäjän "Tulokset →" -klikkiä
  const [advice, setAdvice] = useState(null); // { text, cardIds } | null

  const gRef   = useRef(null);
  const logRef = useRef([]);
  const sndRef = useRef(true);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const prevDeckRef  = useRef(null);
  const prevRCRef    = useRef(0);
  const lastPlayTmr  = useRef(null);
  const pendingFnRef = useRef(null);
  const { aiTmr, tmrs, pausedRef, aiDelayRef, tm } =
    useAIScheduler({ defaultDelay: 1200, extraTimerRefs: [lastPlayTmr] });
  // AI-siirtoajastin (pysähtyy Tauko-tilassa) — Seiskan oma pending-fn-mekanismi:
  // säilyttää vain VIIMEISIMMÄN odottavan siirron ja jatkaa sen togglePausessa
  // (eri semantiikka kuin hookin schedAI-recursive-wait; ks. useAIScheduler).
  const aiTm = (fn, ms) => {
    const id = setTimeout(() => {
      tmrs.current.delete(id);
      if (pausedRef.current) { pendingFnRef.current = fn; return; }
      fn();
    }, ms);
    tmrs.current.add(id);
    return id;
  };

  useEffect(() => { gRef.current = G; },        [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { setAdvice(null); },          [G]); // neuvo vanhenee jokaisesta tilamuutoksesta

  function askAdvice() {
    const g = gRef.current;
    if (!g) return;
    const a = getAdvice(g);
    if (!a) return;
    const params = {
      cards: a.cards ? a.cards.map(lbl).join(', ') : undefined,
      card: a.cards?.[0] ? lbl(a.cards[0]) : undefined,
      n: a.cards?.length,
      suit: a.suit,
    };
    setAdvice({
      text: t('games.seiska.advice.' + a.type, params),
      cardIds: a.cards ? a.cards.map(c => c.id) : [],
    });
  }

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

  // Lappu-ajastin näkyy vain kun aktiivinen pelaaja on ihminen
  useEffect(() => {
    const idx = G?.pendingLappu;
    if (idx === null || idx === undefined || !G?.players?.[idx]?.isHuman) {
      setLappuSecsLeft(null); return;
    }
    setLappuSecsLeft(4);
    const iv = setInterval(() => setLappuSecsLeft(s => s !== null && s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(iv);
  }, [G?.pendingLappu]);

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
    if (onSnapshot && gRef.current?.players.every(p => !p.isHuman)) {
      const g = gRef.current;
      onSnapshot({ step: logRef.current.length, logText: m,
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: null })),
        tableCards: g.discardTop ? [g.discardTop] : [], extraText: null });
    }
  }

  function setGS(g) { setG(g); gRef.current = g; }

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (!next && pendingFnRef.current) {
      const fn = pendingFnRef.current;
      pendingFnRef.current = null;
      fn();
    }
  }

  function changeDelay(delta) {
    const next = Math.max(200, Math.min(3000, aiDelayRef.current + delta));
    aiDelayRef.current = next;
    setAiDelayMs(next);
  }

  const M = {
    gameStart:    card => t('games.seiska.msg.gameStart', { card }),
    turnOf:       name => t('games.seiska.msg.turnOf', { name }),
    yourTurnSuit: cl => t('games.seiska.msg.yourTurnSuit', { cl }),
    aceDrawn:     (isH, name, card) => t('games.seiska.msg.aceDrawn', { name, card }),
    forgotLappu:  (name, count) => t('games.seiska.msg.forgotLappu', { name, count }),
    played:       (isH, name, cards) => t('games.seiska.msg.played', { name, cards }),
    won:          (isH, name, rank) => rank === 1 ? t('games.seiska.msg.winTop', { name }) : t('games.seiska.msg.winPlace', { name, rank }),
    sevenPlayed:  (isH, name, suit) => t('games.seiska.msg.sevenPlayed', { name, suit: coloredSuit(suit) }),
    sevenOnSeven: (isH, name, suit) => t('games.seiska.msg.sevenOnSeven', { name, suit: coloredSuit(suit) }),
    chooseSuit:   t('games.seiska.msg.chooseSuit'),
    lappu:        name => t('games.seiska.msg.lappu', { name }),
    aceBonus:     (isH, name, suit) => t('games.seiska.msg.aceBonus', { name, suit: coloredSuit(suit) }),
    reshuffle:    t('games.seiska.msg.reshuffle'),
    deckEmpty:    t('games.seiska.msg.deckEmpty'),
    aiDraws:      (name, card) => card ? t('games.seiska.msg.aiDraws', { name, card }) : t('games.seiska.msg.aiDrawsNoCard', { name }),
    aiDrawFail:   (name, card) => card ? t('games.seiska.msg.aiDrawFail', { name, card }) : t('games.seiska.msg.aiDrawFailNoCard', { name }),
    aiDrawsGone:  (name, card) => card ? t('games.seiska.msg.aiDrawsGone', { name, card }) : t('games.seiska.msg.aiDrawsGoneNoCard', { name }),
    humanDraws:   card => t('games.seiska.msg.humanDraws', { card }),
    drawnPlayable:(card, left) => t('games.seiska.msg.drawnPlayable', { card, left }),
    draws3Used:   t('games.seiska.msg.draws3Used'),
    drawnNoGood:  (card, left) => t('games.seiska.msg.drawnNoGood', { card, left }),
    wrongSuit:    t('games.seiska.msg.wrongSuit'),
    badCards:     t('games.seiska.msg.badCards'),
    suitSelected: suit => t('games.seiska.msg.suitSelected', { suit: coloredSuit(suit) }),
    lappuSelf:    t('games.seiska.msg.lappuSelf'),
  };

  function flashLastPlay(name, cards, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: Array.isArray(cards) ? cards : [cards], isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function startGame(forcedSlots) {
    clearTimeout(aiTmr.current);
    prevRCRef.current = 0;
    pausedRef.current = false; setPaused(false); pendingFnRef.current = null; setIntention(null);
    const playerDefs = slotsToPlayers(forcedSlots || playerSlots, playerNames);
    const g = mkInitState(playerDefs);
    logRef.current = []; setLog([]); setSel([]); setPakaAnim(false); setHandoff(null);
    setGS(g);
    addLog(M.gameStart(lblColored(g.discardTop)));
    if (g.players.every(p => !p.isHuman)) {
      aiDelayRef.current = 3000;
      setAiDelayMs(3000);
      addLog(t('games.seiska.msg.spectatorMode'));
    }
    setScreen('game');
    setShuffling(true);
    const firstPlayer = g.players[g.activePlayer];
    const multiHuman = g.players.filter(p => p.isHuman).length >= 2;
    if (!firstPlayer.isHuman) {
      aiTmr.current = aiTm(() => runAI(g), 3100);
    } else {
      addLog(M.turnOf(firstPlayer.name));
      if (multiHuman) {
        setHandoff({ name: firstPlayer.name });
      } else {
        addLog(M.yourTurnSuit(t('games.seiska.msg.clSimple', { suit: coloredSuit(g.discardTop.s), rank: g.discardTop.r })));
      }
    }
  }

  function startBotBattle() {
    aiLevelRef.current = aiLevel;
    onAiLevelChange?.(aiLevel);
    aiDelayRef.current = 2000; setAiDelayMs(2000);
    setDebug(true);
    const slots = Array(nP).fill(null).map((_, i) => ({ name: '', isHuman: false, active: true }));
    startGame(slots);
  }

  // ── Ässärangaistus: muut nostavat kortin ────────────────────
  function applyAcePenalty(g, fromIdx) {
    let g2 = reshuffleIfNeeded(g);
    let deck = [...g2.deck];
    const drew = new Set();
    const players = g2.players.map((p, i) => {
      if (i === fromIdx || g2.finished.includes(i)) return p;
      if (!deck.length) return p;
      const drawn = deck.shift();
      drew.add(i);
      addLog(M.aceDrawn(p.isHuman, p.name, lblColored(drawn)));
      return { ...p, hand: [...p.hand, drawn] };
    });
    // Nostanut pelaaja sai +1 kortin (käsi > 1) → poista lappuSaid-joukosta,
    // jotta häneltä kysytään Lappu uudelleen kun hän pelaa itsensä takaisin yhteen korttiin.
    const lappuSaid = new Set([...g2.lappuSaid].filter(id => !drew.has(id)));
    return { ...g2, players, deck, lappuSaid };
  }

  // ── Lappu-tarkistus ennen seuraavaa vuoroa ──────────────────
  function applyLappu(g) {
    if (g.pendingLappu === null || g.lappuSaid.has(g.pendingLappu)) {
      return { ...g, pendingLappu: null };
    }
    let g2 = reshuffleIfNeeded(g);
    const pen = g2.deck.slice(0, 3);
    g2 = {
      ...g2,
      deck: g2.deck.slice(pen.length),
      players: g2.players.map((p, i) => i !== g.pendingLappu ? p
        : { ...p, hand: [...p.hand, ...pen] }),
      // Sakotettu pelaaja EI ole ilmoittanut Lappua ja saa nyt +3 korttia (käsi > 1).
      // Älä merkitse häntä lappuSaid-joukkoon — muuten häneltä ei enää koskaan kysytä
      // Lappua kun hän pelaa itsensä takaisin yhteen korttiin.
      lappuSaid: new Set([...g2.lappuSaid].filter(id => id !== g.pendingLappu)),
      pendingLappu: null,
    };
    if (sndRef.current) SFX.take();
    addLog(M.forgotLappu(g.players[g.pendingLappu].name, pen.length));
    return g2;
  }

  // ── Vuoron vaihto ───────────────────────────────────────────
  function advanceTurn(g, fromIdx) {
    let g2 = applyLappu(g);
    const nextIdx = nextActive(g2.players, fromIdx, g2.finished);
    if (nextIdx === -1) return;
    const g3 = { ...g2, activePlayer: nextIdx, drawsThisTurn: 0 };
    setGS(g3);
    const nextPlayer = g3.players[nextIdx];
    const multiHuman = g3.players.filter(p => p.isHuman).length >= 2;
    if (!nextPlayer.isHuman) {
      aiTmr.current = aiTm(() => runAI(g3), aiDelayRef.current + Math.random() * 400);
    } else {
      addLog(M.turnOf(nextPlayer.name));
      if (multiHuman) {
        setHandoff({ name: nextPlayer.name });
      } else {
        const cl = g3.reqSuit
          ? t('games.seiska.msg.clReqSuit', { suit: coloredSuit(g3.reqSuit) })
          : t('games.seiska.msg.clNormal', { suit: coloredSuit(g3.discardTop.s), rank: g3.discardTop.r });
        addLog(M.yourTurnSuit(cl));
      }
    }
  }

  // ── Peittokuva kuitattu → vuoro alkaa ───────────────────────
  function onHandoffReady() {
    setHandoff(null);
    const g = gRef.current;
    if (!g) return;
    const cl = g.reqSuit
      ? t('games.seiska.msg.clReqSuit', { suit: coloredSuit(g.reqSuit) })
      : t('games.seiska.msg.clNormal', { suit: coloredSuit(g.discardTop.s), rank: g.discardTop.r });
    addLog(M.yourTurnSuit(cl));
  }

  // ── Lyönti ──────────────────────────────────────────────────
  function doPlay(g, playerIdx, cards, suitChoice, fromDraw = false) {
    const p     = g.players[playerIdx];
    const card  = cards[cards.length - 1];
    const isH   = p.isHuman;

    if (sndRef.current) SFX.play();
    // Kirjaa jokainen lyönti kortteineen — myös 7 ja A (niiden erikoisviesti tulee
    // lisärivinä perään). Ryhmässä nuoli osoittaa päällimmäiseksi jäävän kortin,
    // jotta seuraavan siirron laillisuus on luettavissa Lokista.
    if (!fromDraw) {
      const shown = cards.length > 1
        ? `${cards.map(lblColored).join(' ')} → ${lblColored(card)}`
        : lblColored(card);
      addLog(M.played(isH, p.name, shown));
    }
    flashLastPlay(isH ? p.name : p.name, cards, isH);

    // Poista kädestä
    let players = g.players.map((pl, i) => i !== playerIdx ? pl
      : { ...pl, hand: pl.hand.filter(c => !cards.find(sc => sc.id === c.id)) });
    const newHand = players[playerIdx].hand;

    // Tarkista voitto
    let finished = [...g.finished];
    let gameOver = false;
    if (newHand.length === 0 && !finished.includes(playerIdx)) {
      finished = [...finished, playerIdx];
      addLog(M.won(isH, p.name, finished.length));
      if (sndRef.current) SFX.capture();
      if (isH && sndRef.current) tm(() => SFX.fanfare(), 300);
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
      const ranking = finished.map((idx, pos) => ({
        name: g2.players[idx].name, place: pos + 1, isHuman: g2.players[idx].isHuman,
      }));
      const isBotBattle = g2.players.every(p => !p.isHuman);
      if (isBotBattle) {
        tm(() => onResult?.({ ranking }), 800);
      } else {
        setPendingResult({ ranking });
      }
      setGS({ ...g2, phase: 'finished' });
      if (sndRef.current) tm(() => SFX.fanfare(), 600);
      return;
    }

    setJP(card.id);
    tm(() => setJP(null), 2200);

    // Seiska: valitse maa
    if (card.r === '7') {
      const newDiscard = { ...g2, discardTop: card, discardPile: [...g2.discardPile, ...cards], reqSuit: null, finished };
      const pendLappu = (newHand.length === 1 && !g2.lappuSaid.has(playerIdx)) ? playerIdx : g2.pendingLappu;
      if (g2.reqSuit !== null) {
        const suit = card.s;
        addLog(M.sevenOnSeven(isH, p.name, suit));
        g2 = { ...newDiscard, reqSuit: suit, pendingLappu: pendLappu };
      } else if (!suitChoice && p.isHuman) {
        setGS({ ...newDiscard, phase: 'awaiting_suit', pendingLappu: null });
        addLog(M.chooseSuit);
        return;
      } else {
        const suit = suitChoice || aiSuit(newHand);
        if (!suitChoice) addLog(M.sevenPlayed(isH, p.name, suit));
        g2 = { ...newDiscard, reqSuit: suit, pendingLappu: pendLappu };
      }
    } else {
      g2 = { ...g2, discardTop: card, discardPile: [...g2.discardPile, ...cards], reqSuit: null };
    }

    // Ässä: bonusvuoro
    if (card.r === 'A') {
      g2 = { ...g2, aceBonus: card.s };
      if (newHand.length === 1 && !g2.lappuSaid.has(playerIdx) && !finished.includes(playerIdx)) {
        if (!p.isHuman) {
          const effectiveLevel = botLevelsRef.current?.[playerIdx] ?? (g2.players.every(pl => !pl.isHuman) ? 'hard' : aiLevelRef.current);
          if (aiShouldFumble(effectiveLevel)) {
            g2 = { ...g2, pendingLappu: playerIdx };
          } else {
            addLog(M.lappu(p.name));
            g2 = { ...g2, lappuSaid: new Set([...g2.lappuSaid, playerIdx]) };
          }
        }
      }
      addLog(M.aceBonus(isH, p.name, card.s));
      g2 = applyAcePenalty(g2, playerIdx); // kaanon (SEISKA.md): muut nostavat aina, myös bonusvuoron yhteydessä
      setGS(g2);
      if (!p.isHuman) aiTmr.current = aiTm(() => runAI(gRef.current), aiDelayRef.current + 400);
      return;
    }

    // Lappu
    if (newHand.length === 1 && !g2.lappuSaid.has(playerIdx) && !finished.includes(playerIdx)) {
      if (!p.isHuman) {
        const effectiveLevel2 = botLevelsRef.current?.[playerIdx] ?? (g2.players.every(pl => !pl.isHuman) ? 'hard' : aiLevelRef.current);
        if (aiShouldFumble(effectiveLevel2)) {
          g2 = { ...g2, pendingLappu: playerIdx };
          advanceTurn(g2, playerIdx);
        } else {
          addLog(M.lappu(p.name));
          g2 = { ...g2, lappuSaid: new Set([...g2.lappuSaid, playerIdx]) };
          advanceTurn(g2, playerIdx);
        }
      } else {
        g2 = { ...g2, pendingLappu: playerIdx };
        setGS(g2);
        tm(() => advanceTurn(gRef.current, playerIdx), 4000);
      }
    } else {
      advanceTurn(g2, playerIdx);
    }
  }

  // ── Nosto ───────────────────────────────────────────────────
  function doDraw(g, playerIdx) {
    let g2 = reshuffleIfNeeded(g);
    if (g2.reshuffleCount !== (g.reshuffleCount || 0)) {
      addLog(M.reshuffle);
      if (sndRef.current) SFX.swap();
    }
    if (!g2.deck.length) {
      addLog(M.deckEmpty);
      advanceTurn(g2, playerIdx);
      return;
    }
    const [drawn, ...deck] = g2.deck;
    if (sndRef.current) SFX.flip();
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
      const wd = Math.max(300, aiDelayRef.current * 0.6); // nostoketjun viive skaalautuu tahdin mukana
      if (valid) {
        addLog(M.aiDraws(pName, debugOpen ? lblColored(drawn) : null));
        // Valitse paras siirto KOKO kädestä — ei vain nostettua korttia. Tärkeä
        // erikoistapaus: jos kädessä on pelattava ässä ja loppukäsi on yhtä arvoa
        // (ässän maata), pelaa ässä ensin → ässäbonus jatkaa lopuilla → käsi tyhjäksi.
        // (Ässällä ei voi mennä ulos viimeisenä, joten ässä kannattaa pelata ennen muita.)
        const opponents = g2.players.filter((pl, i) => i !== playerIdx && !g2.finished.includes(i));
        let best = aiBestPlay(hand, g2.discardTop, g2.reqSuit, opponents) || [drawn];
        const aceWin = validSingles(hand, g2.discardTop, g2.reqSuit)
          .filter(c => c.r === 'A')
          .find(ace => {
            const rest  = hand.filter(c => c.id !== ace.id);
            const ranks = new Set(rest.map(c => c.r));
            return rest.length > 0 && ranks.size === 1
              && rest.some(c => c.s === ace.s && c.r !== '7' && c.r !== 'A');
          });
        if (aceWin) best = [aceWin];
        const playSuit = best[0].r === '7' ? aiSuit(hand.filter(c => c.id !== best[0].id)) : null;
        // Näytä aiottu siirto ennen lyöntiä (skaalautuu tahdin mukana)
        if (initShowIntention) {
          const intentionMs = Math.min(2500, Math.max(800, aiDelayRef.current * 0.7));
          setIntention({ playerIdx, cards: best });
          aiTmr.current = aiTm(() => {
            setIntention(null);
            doPlay(gRef.current, playerIdx, best, playSuit);
          }, intentionMs);
        } else {
          doPlay(gRef.current, playerIdx, best, playSuit);
        }
      } else {
        // Nostettu kortti ei käy — tarkista onko koko käteen nyt pelattava kortti
        // (esim. 7 tai A joka ei käynyt viimeisenä kortina, mutta käy nyt kun käsi kasvoi)
        const handPlay = aiBestPlay(hand, g2.discardTop, g2.reqSuit);
        if (handPlay) {
          addLog(M.aiDrawFail(pName, lblColored(drawn)));
          aiTmr.current = aiTm(() => runAI(gRef.current), wd);
        } else if (draws < 3) {
          addLog(M.aiDrawFail(pName, lblColored(drawn)));
          aiTmr.current = aiTm(() => doDraw(gRef.current, playerIdx), wd);
        } else {
          addLog(M.aiDrawsGone(pName, lblColored(drawn)));
          aiTmr.current = aiTm(() => advanceTurn(gRef.current, playerIdx), wd);
        }
      }
    } else {
      addLog(M.humanDraws(lblColored(drawn)));
      if (valid) {
        addLog(M.drawnPlayable(lblColored(drawn), 3 - draws));
      } else if (draws >= 3) {
        addLog(M.draws3Used);
        tm(() => advanceTurn(gRef.current, playerIdx), 900);
      } else {
        addLog(M.drawnNoGood(lblColored(drawn), 3 - draws));
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
    // Katsomotilassa (kaikki botteja) käytetään aina Mestari-tasoa (hard)
    const level  = botLevelsRef.current?.[activePlayer] ?? (players.every(pl => !pl.isHuman) ? 'hard' : aiLevelRef.current);
    const isHard = level === 'hard';

    // ── Ässä-bonusvuoro ─────────────────────────────────────
    if (aceBonus !== null) {
      const { useBonus, bonusGroup } =
        aiAceBonusDecision(p.hand, players, activePlayer, g.finished, aceBonus, level);
      if (useBonus) {
        doPlay({ ...gRef.current, aceBonus: null }, activePlayer, bonusGroup, null);
      } else {
        // Rangaistus jo jaettu ässän lyöntihetkellä — tässä vain suljetaan bonusvuoro.
        advanceTurn({ ...gRef.current, aceBonus: null }, activePlayer);
      }
      return;
    }

    addLog(M.turnOf(p.name));
    const opponents = players.filter((pl, i) => i !== activePlayer && !g.finished.includes(i));
    const bestPlay = aiBestPlay(p.hand, discardTop, reqSuit, opponents);

    const playIsOnlySeven = bestPlay && bestPlay.length === 1 && bestPlay[0].r === '7';
    if (playIsOnlySeven && drawsThisTurn < 3 && aiShouldFumble(level)) {
      doDraw(gRef.current, activePlayer);
      return;
    }

    // Ryhmäfumble vain jos siirto ei vie pois pelistä — voittavaa ryhmää ei unohdeta koskaan
    const isWinningGroup = bestPlay && bestPlay.length === p.hand.length;
    let play = (bestPlay && bestPlay.length > 1 && !isWinningGroup && aiShouldFumble(level))
      ? [bestPlay[0]]
      : bestPlay;

    if (play && play.length === 1 && play[0].r === 'A' && isHard) {
      const bestAce = pickBestAce(p.hand, discardTop, reqSuit);
      if (bestAce) play = [bestAce];
    }

    if (play) {
      const suit = play[0].r === '7'
        ? aiSuit(p.hand.filter(c => c.id !== play[0].id))
        : null;
      // Näytä aikomus ennen lyöntiä (skaalautuu tahdin mukana)
      if (initShowIntention) {
        const intentionMs = Math.min(2500, Math.max(800, aiDelayRef.current * 0.7));
        setIntention({ playerIdx: activePlayer, cards: play });
        aiTmr.current = aiTm(() => {
          setIntention(null);
          doPlay(gRef.current, activePlayer, play, suit);
        }, intentionMs);
      } else {
        doPlay(gRef.current, activePlayer, play, suit);
      }
    } else if (drawsThisTurn < 3) {
      doDraw(gRef.current, activePlayer);
    } else {
      advanceTurn(gRef.current, activePlayer);
    }
  }

  // ── Ihmistoiminnot (käyttää G.activePlayer, ei hardkoodattua 0) ─
  function humanToggle(card) {
    if (!G || G.phase !== 'play' || !G.players[G.activePlayer]?.isHuman || handoff) return;
    if (G.aceBonus !== null) {
      if (card.r === '7' || card.r === 'A') return;
      setSel(prev => {
        const has = prev.find(c => c.id === card.id);
        if (has) return prev.filter(c => c.id !== card.id);
        if (prev.length === 0) return card.s === G.aceBonus ? [card] : prev; // ensimmäinen: oltava oikea maa
        return card.r === prev[0].r ? [...prev, card] : prev; // lisäkortti: sama arvo
      });
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
    const idx = g.activePlayer;
    if (g.aceBonus !== null) {
      if (selected[0]?.s !== g.aceBonus) { addLog(M.wrongSuit); return; }
      const cards = [...selected]; setSel([]);
      doPlay({ ...g, aceBonus: null }, idx, cards, null);
      return;
    }
    if (!canGroup(selected, g.discardTop, g.reqSuit, g.players[idx].hand.length)) {
      addLog(M.badCards);
      return;
    }
    const cards = [...selected]; setSel([]);
    doPlay(g, idx, cards, null);
  }

  function humanSkipAceBonus() {
    const g = gRef.current;
    if (!g || g.aceBonus === null) return;
    const idx = g.activePlayer;
    setSel([]);
    // Rangaistus jo jaettu ässän lyöntihetkellä — tässä vain suljetaan bonusvuoro.
    const g2 = { ...g, aceBonus: null };
    const newHand = g2.players[idx].hand;
    if (newHand.length === 1 && !g2.lappuSaid.has(idx)) {
      setGS({ ...g2, pendingLappu: idx });
      tm(() => advanceTurn(gRef.current, idx), 4000);
    } else {
      advanceTurn(g2, idx);
    }
  }

  function humanChooseSuit(suit) {
    const g = gRef.current;
    if (!g || g.phase !== 'awaiting_suit') return;
    const idx = g.activePlayer;
    addLog(M.suitSelected(suit));
    const newHand = g.players[idx].hand;
    if (newHand.length === 1 && !g.lappuSaid.has(idx)) {
      const g2 = { ...g, reqSuit: suit, phase: 'play', pendingLappu: idx };
      setGS(g2);
      tm(() => advanceTurn(gRef.current, idx), 4000);
    } else {
      advanceTurn({ ...g, reqSuit: suit, phase: 'play' }, idx);
    }
  }

  function humanDraw() {
    if (!G || G.phase !== 'play' || !G.players[G.activePlayer]?.isHuman || handoff) return;
    doDraw(gRef.current, G.activePlayer);
  }

  function humanLappu() {
    const g = gRef.current;
    if (!g) return;
    const idx = g.activePlayer;
    setGS({ ...g, lappuSaid: new Set([...g.lappuSaid, idx]), pendingLappu: null });
    addLog(M.lappuSelf);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => { if (G?.phase === 'gameover') window.scrollTo(0, 0); }, [G?.phase]);

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>7️⃣</div>
        <h1 style={{ fontSize: 52, letterSpacing: 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SEISKA</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8 }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>{t('ui.start.players')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>
      <GroupPicker value={playerGroup} onChange={onPlayerGroupChange} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={() => {
          const slots = Array(4).fill(null).map((_, i) => ({ name: i === 0 ? 'Hero' : '', isHuman: i === 0, active: i < nP }));
          startGame(slots);
        }} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>{t('ui.start.begin')}</button>
        <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {t('ui.start.botBattle')}
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}</span>
        </button>
      </div>
    </div>
  );

  // ── Gameover ────────────────────────────────────────────────
  if (screen === 'game' && G?.phase === 'gameover' && !allBots) {
    const { finished, players } = G;
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: isMobile ? '24px 12px' : 24, fontFamily: 'Georgia,serif', color: C.text }}>
        <h1 style={{ fontSize: 28, letterSpacing: 8, color: C.gold, margin: 0 }}>{t('ui.result.title')}</h1>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {finished.map((pid, i) => {
            const p = players[pid];
            const isFirst = i === 0, isLast = i === finished.length - 1;
            return (
              <div key={pid} style={{ borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: isFirst ? C.gold + '14' : 'rgba(255,255,255,0.02)', border: `1px solid ${isFirst ? C.gold + '55' : C.panelBorder}` }}>
                <span style={{ fontSize: 20 }}>{isFirst ? '🏆' : isLast ? '💀' : '🎯'}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: isFirst ? C.gold : C.text }}>{p.name}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim }}>{t('ui.result.place', { n: i + 1 })}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 12, padding: '12px 32px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('ui.result.newGame')}</button>
          <button onClick={() => setScreen('select')} style={{ background: 'transparent', border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 24px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('ui.start.changePlayers')}</button>
        </div>
      </div>
    );
  }

  if (!G) return null;

  // ── Peli-view ────────────────────────────────────────────────
  const activeP    = G.players[G.activePlayer];
  const humanIdx   = G.players.findIndex(p => p.isHuman);
  const multiHuman = G.players.filter(p => p.isHuman).length >= 2;
  const allBots    = G.players.every(p => !p.isHuman);
  // Yksipelaaja-tilassa näytetään aina ihmispelaajan käsi, vaikka botin vuoro
  const displayP      = (humanIdx >= 0 && !multiHuman) ? G.players[humanIdx] : activeP;
  const isMyTurn      = activeP?.isHuman && !handoff && (G.phase === 'play' || G.phase === 'awaiting_suit');
  const canAct        = isMyTurn && G.phase === 'play';
  // Katsomotila: valaistaan aktiivisen botin pelattavat kortit
  const spectatorAct  = !isMyTurn && G.phase === 'play' && displayP?.id === G.activePlayer;
  const hasValid  = canAct && validSingles(activeP.hand, G.discardTop, G.reqSuit).length > 0;
  const canDraw   = canAct && G.drawsThisTurn < 3 && G.aceBonus === null;
  const showLappu = activeP?.hand.length === 1
    && !G.lappuSaid.has(G.activePlayer)
    && G.pendingLappu === G.activePlayer
    && G.phase === 'play'
    && !handoff;

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      {/* Peittokuva (pass-and-play) */}
      {handoff && <HandoffScreen playerName={handoff.name} onReady={onHandoffReady} />}

      <TurnPrompt show={isMyTurn} action={t('ui.turn.seiska')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, color: C.gold }}>7</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Muut pelaajat — kortit selkäpuolella tai cheat-tilassa avattuina */}
      {G.players.filter((_, i) => allBots || i !== displayP?.id).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 8 }}>
          {G.players.filter((_, i) => allBots || i !== displayP?.id).map(p => {
            const isActive = p.id === G.activePlayer;
            const isDone   = G.finished.includes(p.id);
            const rank     = isDone ? G.finished.indexOf(p.id) + 1 : null;
            const hasLappu = G.lappuSaid.has(p.id) && p.hand.length === 1;
            const count = p.hand.length;
            const cw = 20, ch = 30, ov = 10;
            const fanW = count > 0 ? cw + Math.max(0, count - 1) * ov : cw;
            const icon = p.isHuman ? '👤 ' : '🤖 ';
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 10, background: isActive ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '33' : C.panelBorder}`, opacity: isDone ? 0.45 : 1 }}>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, minWidth: 70, flexShrink: 0 }}>
                  {isActive ? '► ' : ''}{icon}{truncName(p.name)}
                  {hasLappu && <span style={{ color: C.red, marginLeft: 4 }}>LAPPU</span>}
                  {isDone && <span style={{ color: C.gold, marginLeft: 4 }}>({rank}.)</span>}
                </span>
                {debugOpen ? (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0, paddingTop: 8 }}>
                    {p.hand.map(c => {
                      const isIntended = intention?.playerIdx === p.id
                        && intention.cards?.some(ic => ic.id === c.id);
                      const hlCard = !isIntended && isActive && allBots && G.phase === 'play'
                        && (G.aceBonus !== null
                          ? (c.s === G.aceBonus && c.r !== '7' && c.r !== 'A')
                          : canSingle(c, G.discardTop, G.reqSuit, p.hand.length === 1));
                      const mlCard = !isIntended && isActive && allBots && G.phase === 'play'
                        && G.aceBonus === null && c.r !== '7' && c.r !== 'A'
                        && !G.reqSuit && c.r === G.discardTop.r;
                      return (
                        <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]}
                          selected={isIntended}
                          highlight={hlCard || mlCard}
                          dim={!isIntended && isActive && allBots && G.phase === 'play' && !hlCard && !mlCard}
                        />
                      );
                    })}
                  </div>
                ) : isDone ? null : count === 0 ? null : (
                  <div style={{ position: 'relative', width: fanW, height: ch, flexShrink: 0 }}>
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} style={{ position: 'absolute', left: i * ov, top: 0, width: cw, height: ch, borderRadius: 3, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, zIndex: i, boxShadow: i === count - 1 ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pakka + lyöntipakka */}
      <div style={{ display: 'flex', gap: 16, marginBottom: isMobile ? 6 : 12, alignItems: 'center', padding: isMobile ? '8px 10px' : '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.deck')}</div>
          <div style={{ width: 60, height: 82, borderRadius: 7, background: BACKS[cardBack].bg, border: `2px solid ${BACKS[cardBack].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PakkaCount variant="number" count={G.deck.length}
              empty={G.deck.length === 0 && G.discardPile.length <= 1} flash={pakaAnim}
              style={{ fontFamily: 'sans-serif', fontSize: 11 }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, marginBottom: 5, letterSpacing: 1.5 }}>{t('games.seiska.ui.playPile')}</div>
          <Card card={G.discardTop} large={!isMobile} justPlaced={G.discardTop?.id === jpId} backStyle={BACKS[cardBack]} />
        </div>
        {G.reqSuit && (
          <div style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(201,168,76,0.1)', border: `2px solid ${C.gold}66`, textAlign: 'center' }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, marginBottom: 4, letterSpacing: 1.5 }}>{t('games.seiska.ui.requiredSuit')}</div>
            <div style={{ fontSize: isMobile ? 32 : 48, color: SUIT_COLOR[G.reqSuit], lineHeight: 1 }}>{G.reqSuit}</div>
          </div>
        )}
        {G.drawsThisTurn > 0 && (
          <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.blue }}>
            Nostoja: {G.drawsThisTurn}/3
          </div>
        )}
      </div>

      {/* Suit-valitsin (seiskan jälkeen) */}
      {G.phase === 'awaiting_suit' && activeP?.isHuman && !handoff && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${C.gold}44`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.gold, marginBottom: 10 }}>{t('games.seiska.ui.chooseSuitLabel')}</div>
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
      {G.aceBonus !== null && activeP?.isHuman && !handoff && (
        <div style={{ background: 'rgba(91,168,212,0.1)', border: `1px solid ${C.blue}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 30, color: SUIT_COLOR[G.aceBonus], lineHeight: 1 }}>{G.aceBonus}</span>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.text, flex: 1 }}>{t('games.seiska.ui.aceBonusHint', { suit: G.aceBonus })}</span>
          <button onClick={humanSkipAceBonus} style={{ background: 'transparent', border: `1px solid ${C.dim}55`, borderRadius: 8, padding: '7px 14px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('ui.action.end')}</button>
        </div>
      )}

      {/* Lappu-banneri */}
      {showLappu && (
        <div style={{ background: 'rgba(224,92,59,0.12)', border: `1px solid ${C.red}55`, borderRadius: 12, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.red, flex: 1 }}>{t('games.seiska.ui.lappuPrompt')}</span>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: lappuSecsLeft <= 1 ? '#ff4444' : C.red, minWidth: 24, textAlign: 'center', transition: 'color 0.3s' }}>{lappuSecsLeft ?? 4}</span>
          <button onClick={humanLappu} style={{ background: C.red, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>LAPPU!</button>
        </div>
      )}

      {/* Viimeisin siirto */}
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

      {/* Aktiivinen pelaaja — käsi (piilotetaan katsomotilassa, botti-kortit yläosassa) */}
      {!allBots && (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          {displayP?.isHuman ? '👤' : '🤖'} {displayP?.name}
          {displayP?.hand.length > 0
            ? ` — ${korttia(displayP.hand.length)} ${t('ui.shared.inHand')}`
            : ` — ${t('ui.shared.emptyHandWin')}`}
          {G.lappuSaid.has(displayP?.id) && displayP?.hand.length === 1 && <span style={{ color: C.gold, marginLeft: 8 }}>LAPPU</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: isMobile ? 90 : 216 }}>
          {sortHand(displayP?.hand ?? []).map(c => {
            const isSel   = !!selected.find(s => s.id === c.id);
            const single  = canAct
              ? (G.aceBonus !== null
                  ? (c.s === G.aceBonus && c.r !== '7' && c.r !== 'A')
                  : canSingle(c, G.discardTop, G.reqSuit, activeP.hand.length === 1))
              : spectatorAct && (G.aceBonus !== null
                  ? (c.s === G.aceBonus && c.r !== '7' && c.r !== 'A')
                  : canSingle(c, G.discardTop, G.reqSuit, displayP.hand.length === 1));
            const multi   = canAct
              ? (c.r !== '7' && c.r !== 'A' && (G.aceBonus !== null
                  ? selected.length > 0 && c.r === selected[0].r && !isSel  // aceBonus: lisätään samaa arvoa
                  : selected.length > 0
                    ? c.r === selected[0].r && !isSel
                    : !G.reqSuit && c.r === G.discardTop.r))
              : (spectatorAct && G.aceBonus === null && c.r !== '7' && c.r !== 'A'
                  && !G.reqSuit && c.r === G.discardTop.r);
            const hl      = !isSel && (canAct
              ? (selected.length > 0 ? multi : (single || multi))
              : (single || multi));
            const dimmed  = canAct
              ? (!isSel && (selected.length > 0 ? !multi : (!single && !multi)))
              : (spectatorAct && !isSel && !single && !multi);
            return (
              <Card key={c.id} card={c} large={!isMobile} small={isMobile}
                selected={isSel}
                highlight={!!hl}
                advice={!isSel && canAct && !!advice?.cardIds?.includes(c.id)}
                dim={!!dimmed}
                onClick={canAct ? () => humanToggle(c) : undefined}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>
      )}

      {/* Bottien taistelu -hallintapalkki */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Toiminnot */}
      <div style={{ minHeight: isMobile ? 36 : 52, display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Katsomo-säätimet — näytetään botin vuorolla (ei allBots-tilassa, se on erillisessä palkissa) */}
        {!isMyTurn && !allBots && G.phase === 'play' && G.players.some(p => !p.isHuman) && (
          <>
            <button onClick={togglePause} style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 8, fontFamily: 'sans-serif',
              border: `1px solid ${paused ? C.gold + '55' : C.panelBorder}`,
              background: paused ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
              color: paused ? C.gold : C.dim, cursor: 'pointer',
            }}>
              {paused ? '▶ Jatka' : '⏸ Tauko'}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, opacity: 0.7 }}>tahti:</span>
              <button onClick={() => changeDelay(-500)} disabled={aiDelayMs <= 200} style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 8, fontFamily: 'sans-serif',
                border: `1px solid ${C.panelBorder}`, background: 'rgba(255,255,255,0.04)',
                color: aiDelayMs <= 200 ? 'rgba(255,255,255,0.15)' : C.dim,
                cursor: aiDelayMs <= 200 ? 'default' : 'pointer',
              }}>−0.5s</button>
              <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.text, minWidth: 30, textAlign: 'center' }}>
                {(aiDelayMs / 1000).toFixed(1)}s
              </span>
              <button onClick={() => changeDelay(+500)} disabled={aiDelayMs >= 3000} style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 8, fontFamily: 'sans-serif',
                border: `1px solid ${C.panelBorder}`, background: 'rgba(255,255,255,0.04)',
                color: aiDelayMs >= 3000 ? 'rgba(255,255,255,0.15)' : C.dim,
                cursor: aiDelayMs >= 3000 ? 'default' : 'pointer',
              }}>+0.5s</button>
            </span>
          </>
        )}
        {pendingResult && (
          <button
            onClick={() => onResult?.(pendingResult)}
            style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            Tulokset →
          </button>
        )}
        {canAct && (
          <>
            {selected.length > 0 && (
              <>
                <button onClick={humanPlay}
                  style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 20px', color: '#0d2118', fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                  {t('ui.action.play')} ({selected.map(lbl).join(', ')})
                </button>
                <button onClick={() => setSel([])} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </>
            )}
            {!selected.length && canDraw && (
              <button onClick={humanDraw}
                style={{ background: 'rgba(91,168,212,0.12)', border: `1px solid ${C.blue}55`, borderRadius: 10, padding: '10px 18px', color: C.blue, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                {t('ui.action.draw')} ({3 - G.drawsThisTurn} {t('ui.action.left')})
              </button>
            )}
            <AdviceButton onClick={askAdvice} />
          </>
        )}
      </div>

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: isMobile ? 4 : 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: isMobile ? 4 : 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}>
          <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('ui.shared.firstOutWins')}
          {' · '}
          <span style={{
            color: G.deck.length === 0 && G.discardPile.length <= 1 ? C.red : 'inherit',
            fontWeight: G.deck.length === 0 && G.discardPile.length <= 1 ? 700 : 'inherit',
            animation: pakaAnim ? 'pakkaFlash 2.5s ease forwards' : undefined }}>
            {G.deck.length === 0 && G.discardPile.length <= 1 ? t('games.seiska.ui.deckEmpty') : t('games.seiska.ui.deckCount', { n: G.deck.length })}
          </span>
          {' · '}{G.reqSuit ? t('games.seiska.ui.required', { suit: G.reqSuit }) : t('games.seiska.ui.topCard', { card: lbl(G.discardTop) })}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'} {t('ui.shared.sound')}</button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'} {t('ui.shared.openCards')}</button>
        </div>
      </div>

      {/* Loki */}
      <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setLO(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>{t('ui.shared.logTitle')}</span>
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


      <style>{`button:active{transform:scale(0.97)}@keyframes lastPlayFade{0%{opacity:0;transform:translateY(-4px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}`}</style>
    </div>
  );
}
