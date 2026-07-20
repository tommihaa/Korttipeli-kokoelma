import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import GroupPicker from '../shared/GroupPicker.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, shuffle, SUITS, RANKS, VAL, aiShouldFumble, truncName, sortHand as sortHandBy } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import { useStickySetting } from '../shared/storage.js';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import PoytaPanel from '../shared/PoytaPanel.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';

// ── Ristiseiska ─────────────────────────────────────────────────
// Järjestys per maa: 7 → 6 → 8 → ala-pino (5,4,3,2,A) + ylä-pino (9,T,J,Q,K)
// 5 vaatii 8 ensin, 8 vaatii 6 ensin (kiusanteko)
// A kaataa ala-pinon (bonusvuoro), K kaataa ylä-pinon (bonusvuoro)

const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
const shuffledAINames = pool => shuffle(pool || AI_NAMES);

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

// Kuvaa pelatun kortin vaikutus (kiusanteko-mekaniikka: 5 vaatii 8:n, 8 vaatii 6:n).
function playEffect(v) {
  if (v === 7) return tr('games.ristiseiska.effect.open');
  if (v === 6) return tr('games.ristiseiska.effect.lowerNotYet');
  if (v === 8) return tr('games.ristiseiska.effect.openBoth');
  return v <= 5 ? tr('games.ristiseiska.effect.toLower') : tr('games.ristiseiska.effect.toUpper');
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

// Sääntövariaatio (aloitusnäytöltä): randomPantti=false (vakio) → antaja valitsee panttikortin;
// true → kortti arvotaan antajan kädestä (koskee myös ihmistä). Antaja säilyy samana (edeltävä pelaaja).
const DEFAULT_RULES = { randomPantti: false };

function initGame(nP, pool, allBots = false, rules = DEFAULT_RULES) {
  const aiNames = shuffledAINames(pool);
  const deck = mkDeck();
  const per   = Math.floor(52 / nP);
  const extra = 52 % nP; // ylijäävät kortit jaetaan yksi kerrallaan, ettei mikään kortti jää jakamatta
  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0,
    hand: deck.splice(0, per + (i < extra ? 1 : 0)),
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
    rules,
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
  for (let i = 1; i < n; i++) {
    const idx = (from - i + n) % n;
    if (!finished.includes(idx) && players[idx].hand.length > 1) return idx;
  }
  return -1;
}

const sortHand = hand => sortHandBy(hand, c => RANK_VAL[c.r]);

// Montako korttia käsikorteista on samaa maata kuin annettu kortti
function suitCount(hand, suit) { return hand.filter(c => c.s === suit).length; }

const rankFromVal = v => {
  if (v === 1)  return 'A';
  if (v <= 10)  return String(v);
  return ['J', 'Q', 'K'][v - 11];
};

// Yksi maan pinorivi (ala-pino + 7 + ylä-pino). Module-scopessa ettei React remounttaa
// koko pinoriviä (ja siten CSS-hehkuja/-transitioneja) joka pelinäytön renderillä.
function StackRow({ suit, G, isMobile, cardBack, t }) {
  const row = G.rows[suit];
  const cW = isMobile ? 46 : 60;
  const cH = isMobile ? 52 : 85;
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
    <div style={{ position: 'relative', width: cW, height: cH, flexShrink: 0 }}>
      {/* Pino näkyy pinnalla olevana korttina */}
      <div style={{
        position: 'absolute', width: cW, height: cH, borderRadius: 6,
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
    <div style={{ width: cW, height: cH, flexShrink: 0, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.gold}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontWeight: 700, color: `${C.gold}33`, opacity: 0.5, boxShadow: lowerPlayable ? `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88` : undefined }}>
      <div style={{ fontSize: 16 }}>6</div>
      <div style={{ fontSize: 12 }}>{suit}</div>
    </div>
  );

  // Näytä ylä-pino (pelattuna tai seisova)
  const upperPile = upperActive ? (
    <div style={{ position: 'relative', width: cW, height: cH, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', width: cW, height: cH, borderRadius: 6,
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
    <div style={{ width: cW, height: cH, flexShrink: 0, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.gold}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontWeight: 700, color: `${C.gold}33`, opacity: 0.5, boxShadow: upperPlayable ? `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88` : undefined }}>
      <div style={{ fontSize: 16 }}>8</div>
      <div style={{ fontSize: 12 }}>{suit}</div>
    </div>
  );

  // Aputext: näytä pelattavat kortit väreillä
  let helpText = '';
  let helpElements = null;
  if (!row.active) {
    // Vain ♣7 voidaan pelata ensin, sitten muut 7:t
    if (suit === '♣' || G.rows['♣'].active) {
      helpElements = (
        <>
          {t('games.ristiseiska.ui.playPrompt')}{' '}
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
          {t('games.ristiseiska.ui.playPrompt')}{' '}
          {playable.map((r, i) => (
            <span key={i} style={{ color: tc }}>
              {r}{suit}
              {i < playable.length - 1 ? ', ' : ''}
            </span>
          ))}
        </>
      );
    } else if (lowerComplete && upperComplete) {
      helpText = t('games.ristiseiska.ui.pilesBeaten');
    } else if (lowerCast && upperCast) {
      helpText = t('games.ristiseiska.ui.pilesOpen');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        {upperPile}
        {row.active ? (
          <div style={{
            width: cW, height: cH, flexShrink: 0, borderRadius: 6,
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
            width: cW, height: cH, flexShrink: 0, borderRadius: 6,
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
}

// Kuinka monen kortin päässä kortti on pelattavaksi (0 = pelattavissa nyt)
function distanceToPlay(card, rows) {
  const row = rows[card.s];
  if (!row.active) return 99;
  const v = rv(card);
  if (v < row.low) return row.low - v;
  if (v > row.high) return v - row.high;
  return 0;
}

// AI: seiskat ensin (priorisoi maa jossa on eniten omia kortteja),
// porttikortteja (6 ja 8) pihdetään strategisesti, muuten pienin arvo.
function aiBestCard(hand, rows, level = 'normal') {
  const valid = hand.filter(c => isPlayable(c, rows));
  if (!valid.length) return null;

  const sevens = valid.filter(c => c.r === '7');
  if (sevens.length) {
    return sevens.sort((a, b) => suitCount(hand, b.s) - suitCount(hand, a.s))[0];
  }

  const isHard = level === 'hard';

  // Normal: pidättele porttia aina kun samaa maata on useampi → pakotettu passaus
  // Hard/Super: pidättele vain jos kädessä on hyvä panttikandidaatti samaa maata
  //   (distanceToPlay ≥ 3) — muuten pelaa portti auki, sillä muut saman maan kortit
  //   ovat jo lähellä pelattavaksi eikä panttina siirtäminen tuo etua.
  const nonGates = valid.filter(c => {
    if (c.r !== '6' && c.r !== '8') return true;
    const cnt = suitCount(hand, c.s);
    if (!isHard) {
      // Normal: pidättele jos samaa maata on useampi (cnt > 1), muuten pelaa
      return cnt <= 1;
    }
    // Mestari (hard): porttikortti on placeholder — pihtaa se niin kauan kuin
    // kädessä on huonoja kortteja joista haluaa päästä eroon panttina.
    // Huono kortti = kaukana pelattavuudesta (dist ≥ 3), mistä maasta tahansa.
    // cnt = 1 (vain tämä portti maassa) → pidättele silti: puhdas blokkaus.
    const hasAnyBadCard = hand.some(
      other => other.id !== c.id && distanceToPlay(other, rows) >= 3
    );
    return !hasAnyBadCard; // pelaa portti jos kaikki muut kortit lähellä pelattavuutta
  });

  const pool = nonGates.length ? nonGates : valid;
  return [...pool].sort((a, b) => rv(a) - rv(b))[0];
}

// Korttipanttiin annetaan huonoin kortti: kauimpana pelattavuudesta,
// toissijainen kriteeri: maa jossa on vähiten omia kortteja (yksinäinen kortti)
function aiWorstCard(hand, rows) {
  return [...hand].sort((a, b) => {
    const da = distanceToPlay(a, rows), db = distanceToPlay(b, rows);
    if (db !== da) return db - da;
    return suitCount(hand, a.s) - suitCount(hand, b.s);
  })[0];
}

// Mestarin neuvo Herolle: sama päätöslogiikka kuin hard-botilla, vain julkista tietoa.
// Palauttaa { type, card? } — type vastaa games.ristiseiska.advice.* -avainta.
export function getAdvice(g) {
  const hero = g.players[0];
  if (g.givingCardTo !== null && g.givingPlayerIdx === 0) {
    const card = aiWorstCard(hero.hand, g.rows);
    return card ? { type: 'give', card } : null;
  }
  const card = aiBestCard(hero.hand, g.rows, 'hard');
  if (!card) return g.bonusTurn === 0 ? { type: 'bonusEnd' } : { type: 'pass' };
  return { type: card.r === '7' ? 'playSeven' : 'play', card };
}

// ── Komponentti ─────────────────────────────────────────────────
import { useT, tr } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

export default function Ristiseiska({ onResult, showLog = true, soundOn: initSoundOn = true, seeAll: initSeeAll = false, showCounts = true, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(playerCount);
  const [rules,    setRules]   = useStickySetting('ristiseiska:rules', DEFAULT_RULES); // sääntövalinta muistetaan
  const [soundOn,  setSnd]     = useState(initSoundOn);
  const cardBack = 'ilves';
  const [G,        setG]       = useState(null);
  const [msg,      setMsg_]    = useState('');
  const [log,      setLog]     = useState([]);
  const [logOpen,  setLO]      = useState(showLog);
  const [selCard,  setSel]     = useState(null);
  const [debugOpen,setDebug]   = useState(initSeeAll);
  const [shuffling, setShuffling] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);
  const [allBots, setAllBots]             = useState(false);
  const [paused, setPaused]               = useState(false);
  const [aiDelayMs, setAiDelayMs]         = useState(2000);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [pendingResult, setPendingResult] = useState(null);
  const [advice, setAdvice]               = useState(null); // { text, cardIds } | null

  const gRef       = useRef(null);
  const lastPlayTmr = useRef(null);
  const logRef     = useRef([]);
  const sndRef     = useRef(true);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedAI, guard } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });

  useEffect(() => { gRef.current = G; },        [G]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { setAdvice(null); },          [G]); // neuvo vanhenee jokaisesta tilamuutoksesta

  function askAdvice() {
    const g = gRef.current;
    if (!g) return;
    const a = getAdvice(g);
    if (!a) return;
    setAdvice({
      text: t('games.ristiseiska.advice.' + a.type, a.card ? { card: lbl(a.card) } : undefined),
      cardIds: a.card ? [a.card.id] : [],
    });
  }

  function addLog(m) {
    setMsg_(m);
    const e = { t: new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), m };
    logRef.current = [e, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
    if (allBotsRef.current && onSnapshot && gRef.current) {
      const g = gRef.current;
      onSnapshot({ step: logRef.current.length, logText: m,
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: null })),
        tableCards: [], extraText: null });
    }
  }

  function flashLastPlay(name, card, isHuman = false) {
    setLastPlay({ name, card, isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function setGS(g) { setG(g); gRef.current = g; }

  const M = {
    gameStart:  (starter, card) => t('games.ristiseiska.msg.gameStart', { starter, card }),
    yourTurn:   canPlay => canPlay ? t('games.ristiseiska.msg.yourTurn') : t('games.ristiseiska.msg.yourTurnNoPlay'),
    turnOf:     name => t('games.ristiseiska.msg.turnOf', { name }),
    played:     (isH, name, card, effect) => t('games.ristiseiska.msg.played', { name, card, effect }),
    won:        (isH, name, rank) => rank === 1 ? t('games.ristiseiska.msg.winTop', { name }) : t('games.ristiseiska.msg.winPlace', { name, rank }),
    aiBonus:    (name, suit, pile) => t('games.ristiseiska.msg.aiBonus', { name, suit, pile }),
    humanBonus: (suit, pile) => t('games.ristiseiska.msg.humanBonus', { suit, pile }),
    passFirst:  (isH, name) => t('games.ristiseiska.msg.passFirst', { name }),
    passGiveMe: (isH, name) => t('games.ristiseiska.msg.passGiveMe', { name }),
    passGive:   (isH, name, giverH, giverName, card) => t('games.ristiseiska.msg.passGive', { name, giverName, card }),
    passGiveRandom: (isH, name, giverH, giverName, card) => t('games.ristiseiska.msg.passGiveRandom', { name, giverName, card }),
    passOnly:   (isH, name) => t('games.ristiseiska.msg.passOnly', { name }),
    badCard:    t('games.ristiseiska.msg.badCard'),
    cantPass:   t('games.ristiseiska.msg.cantPass'),
    humanGives: (card, receiver) => t('games.ristiseiska.msg.humanGives', { card, receiver }),
  };

  function startGame(forcedCount, allBotsMode = false) {
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    pausedRef.current = false; setPaused(false);
    setPendingResult(null);
    clearTimeout(aiTmr.current);
    const count = forcedCount ?? nP;
    const g = initGame(count, playerNames, allBotsMode, rules);
    logRef.current = []; setLog([]); setSel(null); setLastPlay(null);
    setGS(g);
    const s = g.players[g.activePlayer];
    addLog(M.gameStart(s.name, lblColored({ r: '7', s: '♣' })));
    setScreen('game');
    setShuffling(true);
    if (!s.isHuman) aiTmr.current = tm(guard(() => runAI(g)), 3100);
  }

  function startBotBattle() {
    aiLevelRef.current = aiLevel;
    onAiLevelChange?.(aiLevel);
    aiDelayRef.current = 2000; setAiDelayMs(2000);
    setDebug(true);
    startGame(nP, true);
  }
  function togglePause() { pausedRef.current = !pausedRef.current; setPaused(p => !p); }

  // ── Vuoron vaihto ───────────────────────────────────────────
  function advanceTurnRS(g, fromIdx) {
    const nextIdx = nextActive(g.players, fromIdx, g.finished);
    if (nextIdx === -1) return;
    const turnCount = g.turnCount + 1;
    const firstRoundDone = g.firstRoundDone || turnCount >= g.players.length;
    const g2 = { ...g, activePlayer: nextIdx, turnCount, firstRoundDone };
    setGS(g2);
    if (!g.players[nextIdx].isHuman) {
      addLog(M.turnOf(g.players[nextIdx].name));
      const d = allBotsRef.current ? aiDelayRef.current : 1100;
      aiTmr.current = tm(() => {
        if (pausedRef.current) { const w = () => { if (!pausedRef.current) runAI(g2); else tm(w, 300); }; w(); return; }
        runAI(g2);
      }, d + Math.random() * 400);
    } else {
      const canPlay = hasAnyPlay(g.players[nextIdx].hand, g2.rows);
      addLog(M.yourTurn(canPlay));
    }
  }

  // ── Lyönti ──────────────────────────────────────────────────
  function doPlay(g, playerIdx, card) {
    const p   = g.players[playerIdx];
    const isH = p.isHuman;
    const v   = rv(card);

    if (sndRef.current) SFX.play();
    addLog(M.played(isH, p.name, lblColored(card), playEffect(v)));
    flashLastPlay(p.name, card, isH);

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
      addLog(M.won(isH, p.name, finished.length));
      if (sndRef.current) SFX.capture();
      if (isH && sndRef.current) tm(() => SFX.fanfare(), 300);
    }

    const remaining = players.filter((_, i) => !finished.includes(i));
    if (remaining.length <= 1) {
      remaining.forEach(pl => { if (!finished.includes(pl.id)) finished.push(pl.id); });
      const ranking = finished.map((idx, pos) => ({
        name: players[idx].name, place: pos + 1, isHuman: players[idx].isHuman && !allBotsRef.current,
      }));
      setGS({ ...g, players, rows, finished, phase: 'gameover' });
      if (allBotsRef.current) { tm(() => onResult?.({ ranking }), 800); }
      else { onResult?.({ ranking }); }
      return;
    }

    // A kaataa ala-pinon, K kaataa ylä-pinon → jatkaa (ei bonusta jos kortit loppuivat)
    const gaveBonus = (v === 1 || v === 13) && !finished.includes(playerIdx);
    const g2 = { ...g, players, rows, finished, bonusTurn: gaveBonus ? playerIdx : null };
    if (gaveBonus) {
      setGS(g2);
      const suitGen = t('games.ristiseiska.suitGen.' + card.s);
      const pileName = t(v === 1 ? 'games.ristiseiska.pile.lower' : 'games.ristiseiska.pile.upper');
      if (!p.isHuman) {
        addLog(M.aiBonus(p.name, suitGen, pileName));
        aiTmr.current = tm(guard(() => runAI(g2)), 900);
      } else {
        addLog(M.humanBonus(suitGen, pileName));
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
      if (sndRef.current) SFX.leave();
      addLog(M.passFirst(isH, p.name));
      advanceTurnRS({ ...g }, playerIdx);
      return;
    }

    const giverIdx = prevWithCards(g.players, playerIdx, g.finished);
    const randomPantti = g.rules?.randomPantti;

    // Vakiosääntö: ihminen antajana valitsee itse panttikortin (pysähdytään valintaan).
    // Satunnais-variaatiossa kortti arvotaan myös ihmiseltä → valintavaihe ohitetaan.
    if (!randomPantti && giverIdx !== -1 && g.players[giverIdx].isHuman) {
      const g2 = { ...g, givingCardTo: playerIdx, givingPlayerIdx: giverIdx };
      setGS(g2);
      addLog(M.passGiveMe(isH, p.name));
      return;
    }

    let players = g.players;
    if (giverIdx !== -1) {
      const giver = g.players[giverIdx];
      const randomCard = giver.hand[Math.floor(Math.random() * giver.hand.length)];
      // Satunnais-variaatio: aina arvottu kortti (kuka tahansa antaja).
      // Vakio: strategisesti huonoin — AI:n aloittelija-virhe antaa silti satunnaisen.
      const toGive = randomPantti
        ? randomCard
        : (!giver.isHuman && aiShouldFumble(botLevelsRef.current?.[giverIdx] ?? aiLevelRef.current)) ? randomCard
        : aiWorstCard(giver.hand, g.rows);
      players = g.players.map((pl, i) => {
        if (i === giverIdx)  return { ...pl, hand: pl.hand.filter(c => c.id !== toGive.id) };
        if (i === playerIdx) return { ...pl, hand: [...pl.hand, toGive] };
        return pl;
      });
      if (sndRef.current) SFX.leave();
      addLog((randomPantti ? M.passGiveRandom : M.passGive)(isH, p.name, giver.isHuman, giver.name, lblColored(toGive)));
      if (sndRef.current) SFX.take();
    } else {
      addLog(M.passOnly(isH, p.name));
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

    const level = botLevelsRef.current?.[activePlayer] ?? aiLevelRef.current;

    if (bonusTurn !== null && bonusTurn === activePlayer) {
      const g2 = { ...gRef.current, bonusTurn: null };
      const card = aiBestCard(p.hand, rows, level);
      if (card) {
        if (initShowIntention) {
          const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
          setIntention({ playerIdx: activePlayer, cards: [card] });
          aiTmr.current = tm(() => { setIntention(null); doPlay(g2, activePlayer, card); }, intentionMs);
        } else {
          doPlay(g2, activePlayer, card);
        }
      } else {
        advanceTurnRS(g2, activePlayer);
      }
      return;
    }

    const card = aiBestCard(p.hand, rows, level);
    let bestCard = card;

    if (bestCard) {
      if (bestCard.r === '7') {
        // Aloittelija-virhe: avaa seiskan väärään maahan — valitsee huonoimman maan
        if (aiShouldFumble(level)) {
          const sevens = p.hand.filter(c => c.r === '7' && isPlayable(c, rows));
          if (sevens.length > 1) {
            bestCard = sevens.sort((a, b) => suitCount(p.hand, a.s) - suitCount(p.hand, b.s))[0];
          }
        }
      } else if (bestCard.r !== '6' && bestCard.r !== '8') {
        // Aloittelija-virhe: pelaa porttikortin jota älykäs AI pidättelisi
        if (aiShouldFumble(level)) {
          const allValid = p.hand.filter(c => isPlayable(c, rows));
          const heldGate = allValid.find(c => (c.r === '6' || c.r === '8') && suitCount(p.hand, c.s) > 1);
          if (heldGate) bestCard = heldGate;
        }
      }
    }

    if (bestCard) {
      if (initShowIntention) {
        const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
        setIntention({ playerIdx: activePlayer, cards: [bestCard] });
        aiTmr.current = tm(() => { setIntention(null); doPlay(gRef.current, activePlayer, bestCard); }, intentionMs);
      } else {
        doPlay(gRef.current, activePlayer, bestCard);
      }
    } else {
      doPass(gRef.current, activePlayer);
    }
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
      addLog(M.badCard);
      return;
    }
    const card = selCard; setSel(null);
    doPlay(g, 0, card);
  }

  function humanPass() {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    if (hasAnyPlay(G.players[0].hand, G.rows)) {
      addLog(M.cantPass);
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

  function humanGiveCard() {
    const g = gRef.current;
    const card = selCard;
    if (!g || g.givingCardTo === null || !card) return;
    const receiverIdx = g.givingCardTo;
    const players = g.players.map((pl, i) => {
      if (i === 0)           return { ...pl, hand: pl.hand.filter(c => c.id !== card.id) };
      if (i === receiverIdx) return { ...pl, hand: [...pl.hand, card] };
      return pl;
    });
    addLog(M.humanGives(lblColored(card), g.players[receiverIdx].name));
    setSel(null);
    const g2 = { ...g, players, givingCardTo: null, givingPlayerIdx: null };
    advanceTurnRS(g2, receiverIdx);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => { if (G?.phase === 'gameover') window.scrollTo(0, 0); }, [G?.phase]);

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8, color: SUIT_COLOR['♣'] }}>♣</div>
        <h1 style={{ fontSize: isMobile ? 24 : 52, letterSpacing: isMobile ? 3 : 12, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>RISTISEISKA</h1>
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
          {[3, 4].map(n => (
            <button key={n} onClick={() => setNP(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${nP === n ? C.gold : '#2a4a32'}`, background: nP === n ? C.gold + '18' : 'transparent', color: nP === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>
      <GroupPicker value={playerGroup} onChange={onPlayerGroupChange} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: isMobile ? 300 : 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5 }}>{t('games.ristiseiska.opts.pantti')}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[t('games.ristiseiska.opts.chosen'), false], [t('games.ristiseiska.opts.random'), true]].map(([lab, val]) => {
              const active = rules.randomPantti === val;
              return (
                <button key={lab} onClick={() => setRules(r => ({ ...r, randomPantti: val }))}
                  style={{ minWidth: 40, height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${active ? C.gold : '#2a4a32'}`, background: active ? C.gold + '18' : 'transparent', color: active ? C.gold : C.dim, transition: 'all 0.2s' }}>
                  {lab}
                </button>
              );
            })}
          </div>
        </div>
        <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, opacity: 0.75, lineHeight: 1.4 }}>
          {rules.randomPantti
            ? t('games.ristiseiska.opts.hintRandom')
            : t('games.ristiseiska.opts.hintChosen')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button onClick={() => startGame()} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>{t('ui.start.begin')}</button>
        <button onClick={startBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {t('ui.start.botBattle')}
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}</span>
        </button>
      </div>
    </div>
  );

  // ── Gameover ────────────────────────────────────────────────
  if (screen === 'game' && G?.phase === 'gameover' && !allBotsRef.current) {
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

  const human       = G.players[0];
  const isGiving    = G.givingCardTo !== null && G.givingPlayerIdx === 0;
  const isBonusTurn = G.bonusTurn === 0;
  const isMyTurn    = G.phase === 'play' && (G.activePlayer === 0 || isBonusTurn) && !allBots;
  const iCanPlay    = (G.activePlayer === 0 || isBonusTurn) && hasAnyPlay(human.hand, G.rows);
  const iCanPass    = G.activePlayer === 0 && !isBonusTurn && !iCanPlay;

  // ── Pöytä: yksi rivi per maa ────────────────────────────────
  // Näytetään vain pinon nykyinen huippukortti: [ylin ala-pino] [7] [ylin ylä-pino]
  // Ala-pinon huippu = pienin pelattu arvo (6→5→4→3→2→A)
  // Ylä-pinon huippu = suurin pelattu arvo (8→9→10→J→Q→K)
  const CARD_H = 30;
  const CARD_W = 48;

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 620, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <TurnPrompt show={isMyTurn} action={t('ui.turn.ristiseiska')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, color: C.gold }}>♣</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* AI-kädet — viuhka */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 8 }}>
          {G.players.filter((_, i) => allBots || i !== 0).map(p => {
            const isActive = G.activePlayer === p.id;
            const isDone   = G.finished.includes(p.id);
            const rank     = isDone ? G.finished.indexOf(p.id) + 1 : null;
            const count = p.hand.length;
            const cw = 20, ch = 30, ov = 10;
            const fanW = count > 0 ? cw + Math.max(0, count - 1) * ov : cw;
            const canHighlight = allBots && isActive && G.phase === 'play' && !isDone;
            const playableSet = canHighlight ? new Set(p.hand.filter(c => isPlayable(c, G.rows)).map(c => c.id)) : null;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 10, background: isActive ? `${C.gold}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, opacity: isDone ? 0.45 : 1 }}>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, minWidth: 70, flexShrink: 0 }}>
                  {isActive ? '► ' : '🤖 '}{truncName(p.name)}
                  {isDone && <span style={{ color: C.gold, marginLeft: 4 }}>({rank}.)</span>}
                </span>
                {debugOpen ? (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {sortHand(p.hand).map(c => {
                      const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                      const isPlayable_ = playableSet?.has(c.id);
                      return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]}
                        selected={isIntended}
                        highlight={!isIntended && !!isPlayable_}
                        dim={!isIntended && playableSet !== null && !isPlayable_}
                      />;
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

      {/* Pöytä: pinot */}
      <PoytaPanel isMobile={isMobile} minHeight={null}
        title={<span>{t('games.ristiseiska.ui.towers')} · {t('games.ristiseiska.ui.lowerShort')} [6→A] &nbsp;·&nbsp; [7] &nbsp;·&nbsp; {t('games.ristiseiska.ui.upperShort')} [8→K]</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 6 : 16 }}>
          {SUITS.map(s => <StackRow key={s} suit={s} G={G} isMobile={isMobile} cardBack={cardBack} t={t} />)}
        </div>
      </PoytaPanel>

      {/* Viimeisin lyönti -badge — kiinteä 36px wrapper, ei nytkähtelyä */}
      <div style={{ position: 'relative', height: 0 }}>
        {showLastPlay && lastPlay && (
          <div key={lastPlay.card.id}
            style={{
              position: 'absolute', bottom: 4, left: 0, zIndex: 5,
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


      {!allBots && (<>
      {/* Oma käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn || isGiving ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 10px' : '12px 14px', marginBottom: isMobile ? 6 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn || isGiving ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero{human.hand.length === 0 ? ` — ${t('ui.shared.emptyHandWin')}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const isSel    = selCard?.id === c.id;
            const playable = (isMyTurn || isBonusTurn) && isPlayable(c, G.rows);
            const hl       = isGiving ? !isSel : (playable && !isSel);
            const isAdv    = !isSel && !!advice?.cardIds?.includes(c.id);
            // Mestarin neuvo päällä: kaikki muu himmenee, jotta osoitettu kortti erottuu
            const dimmed   = advice?.cardIds?.length
              ? !isAdv
              : isGiving ? false : ((isMyTurn || isBonusTurn) && !playable && !isSel);
            const onClick  = isGiving
              ? () => setSel(prev => prev?.id === c.id ? null : c)
              : (isMyTurn || isBonusTurn) ? () => humanSelect(c) : undefined;
            return (
              <Card key={c.id} card={c} small={!isMobile} xsmall={isMobile}
                selected={isSel}
                highlight={!!hl}
                advice={isAdv}
                dim={!!dimmed}
                onClick={onClick}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>
      </>)}

      {/* Toiminnot */}
      <div style={{ minHeight: isMobile ? 36 : 52, display: 'flex', gap: 8, marginBottom: isMobile ? 6 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {(isMyTurn || isBonusTurn) && !isGiving && (
          <>
            <button onClick={humanPlay} disabled={!selCard}
              style={{ background: selCard ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selCard ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selCard ? '#0d2118' : C.dim, fontSize: 13, cursor: selCard ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              {t('ui.action.play')} {selCard ? lbl(selCard) : ''}
            </button>
            {!isBonusTurn && (
              <button onClick={humanPass} disabled={iCanPlay}
                style={{ background: iCanPass ? 'rgba(224,92,59,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${iCanPass ? C.red + '55' : C.panelBorder}`, borderRadius: 10, padding: '10px 18px', color: iCanPass ? C.red : C.dim, fontSize: 13, cursor: iCanPass ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
                {t('ui.action.pass')}
              </button>
            )}
            {isBonusTurn && (
              <button onClick={humanEndBonusTurn} style={{ background: 'transparent', border: `1px solid ${C.dim}55`, borderRadius: 10, padding: '10px 16px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('games.ristiseiska.ui.dontContinue')}</button>
            )}
            {selCard && (
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {isGiving && (
          <>
            <button onClick={humanGiveCard} disabled={!selCard}
              style={{ background: selCard ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selCard ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selCard ? '#0d2118' : C.dim, fontSize: 13, cursor: selCard ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              {t('ui.action.give')} {selCard ? lbl(selCard) : t('ui.action.card')}
            </button>
            {selCard && (
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {(isMyTurn || isGiving) && <AdviceButton onClick={askAdvice} />}
      </div>

      {/* Tilapalkki */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: isMobile ? 4 : 10, borderTop: `1px solid ${C.panelBorder}`, alignItems: 'center', marginBottom: isMobile ? 6 : 10 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}>
          <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('ui.shared.firstOutWins')} · {t('games.ristiseiska.ui.openings')} {SUITS.filter(s => G.rows[s].active).length}/4
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setSnd(s => !s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${soundOn ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: soundOn ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{soundOn ? '🔊' : '🔇'} {t('ui.shared.sound')}</button>
          <button onClick={() => setDebug(d => !d)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${debugOpen ? C.gold + '55' : '#2a4a32'}`, background: 'transparent', color: debugOpen ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{debugOpen ? '🙈' : '🔍'} {t('ui.shared.openCards')}</button>
        </div>
      </div>

      {allBots && G?.phase !== 'gameover' && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {pendingResult && allBots && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,22,18,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 100, padding: 24 }}>
          <div style={{ fontSize: 32 }}>🔮</div>
          <h2 style={{ color: C.gold, fontFamily: 'Georgia,serif', margin: 0, letterSpacing: 4 }}>{t('ui.shared.spectatorEnded')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
            {pendingResult.ranking.map((r, i) => {
              const medals = ['🥇','🥈','🥉','4️⃣'];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12, background: i === 0 ? C.gold + '14' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? C.gold + '55' : C.panelBorder}` }}>
                  <span style={{ fontSize: 18 }}>{medals[i] || ''}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 14, flex: 1, color: i === 0 ? C.gold : C.dim }}>{r.name}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={startBotBattle} style={{ padding: '12px 28px', borderRadius: 12, background: 'rgba(123,47,190,0.3)', border: '1px solid rgba(123,47,190,0.5)', color: '#f0e6ff', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>🔮 Uusi katselutila</button>
            <button onClick={() => onResult?.(pendingResult)} style={{ padding: '12px 28px', borderRadius: 12, background: `linear-gradient(135deg,#e8c96a,${C.gold})`, border: 'none', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>Tulokset →</button>
          </div>
        </div>
      )}

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
