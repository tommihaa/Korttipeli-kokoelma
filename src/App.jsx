import { useState, useEffect } from 'react';
import { C, SUIT_COLOR } from './shared/colors.js';
import GameResult from './shared/GameResult.jsx';

/* eslint-disable no-undef */
const APP_VERSION = __APP_VERSION__;
const BUILD_DATE  = __BUILD_DATE__;
/* eslint-enable no-undef */
const MAILTO = `mailto:no.jopas@gmail.com?subject=${encodeURIComponent(`Version ${APP_VERSION}, Deploy ${BUILD_DATE}, Jako52 palaute`)}`;
import Koputus from './games/Koputus.jsx';
import Lapsy from './games/Lapsy.jsx';
import Kultakala from './games/Kultakala.jsx';
import Maija from './games/Maija.jsx';
import Kasino from './games/Kasino.jsx';
import Moska from './games/Moska.jsx';
import Seiska from './games/Seiska.jsx';
import Ristiseiska from './games/Ristiseiska.jsx';
import Paskahousu from './games/Paskahousu.jsx';
import Admin from './Admin.jsx';

const LAITURI_SPECIAL  = ['Antti','Arto','Arttu','Janus','Jens','Jokke','Jukka','Kirsi','Markku','Marko','Markus','Marviel','Mika','Mikael','Osku','Rebekka','Sanna','Sari','Simo','Sune','Tarja','Teemu'];
const ONNEN_JUMALAT    = ['Vortumna','Loki','Fortuna','Tykhe','Tommi Palleroine'];
const IHMISTEN_PUOLUE  = ['Hannes','Päivi','Regina','Tapani (DI)','Topi-Petteri'];
const KANSA            = ['Astraalitason tirehtööri','Boomer','Jonne','Justiina','Karen','Kukkahattutäti','Lumihiutale','NPC','Rane','Random','Setämies','Veeti'];

const GAMES = [
  {
    id: 'kultakala', name: 'Kultakala', emoji: '🐟',
    desc: 'Muistipeli, jos katsot niin vaihdat',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Kultakala, maxWidth: 560, pakka: 'taydennetty',
    rules: [
      '1 tuntematon + 5 pöytäkorttia — pienin pistemäärä voittaa',
      'Nosta pakasta tai poistopakasta',
      'Vaihda nostettu huonompaan tai hylkää poistopakkaan',
      'Pakka loppuu → kaikki paljastetaan ja pisteet lasketaan',
    ],
  },
  {
    id: 'lapsy', name: 'Läpsy', emoji: '👋',
    desc: 'Reaktiopeli',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Lapsy, maxWidth: 520, pakka: 'jaettu',
    rules: [
      'Lyö pinnaan kun pinnojen päälimmäiset kortit täsmäävät',
      'Oikein → voitat koko pinon',
      'Väärin → anna 2 korttia kyseiseen pinnaan',
      'Kortittomuus voittaa',
    ],
  },
  {
    id: 'ristiseiska', name: 'Ristiseiska', emoji: '♣',
    desc: 'Kiusantekoa, korttipantteja ja kärsivällisyyttä',
    players: '3–4', minPlayers: 3, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Ristiseiska, maxWidth: 620, pakka: 'jaettu',
    rules: [
      '7♣ aloittaa — muut 7:t avaavat maan',
      'Pelaa viereinen numero tai avaa uusi maa 7:llä',
      'Ei sovi → maksa pantti pöytään',
      'Eniten pantteja → häviää',
    ],
  },
  {
    id: 'seiska', name: 'Seiska', emoji: '7️⃣',
    desc: 'UNO-tyyppinen kilpajuoksu kortittomuuteen',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Seiska, maxWidth: 580, pakka: 'kierratetty', suosikki: true,
    rules: [
      'Lyö sama maa (1 kerralla) TAI sama arvo (useampi kerralla)',
      'Ei sovi → nosta max 3 korttia, pelaa heti jos löytyy',
      '7 → valitse vaadittu maa',
      'A → bonusvuoro saman maan kortilla',
      '1 kortti → huuda LAPPU tai vastustajat saavat +5',
    ],
  },
  {
    id: 'kasino', name: 'Kasino', emoji: '🂺',
    desc: 'Kaappaa koko pöytä',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Kasino, maxWidth: 560, pakka: 'taydennetty', suosikki: true,
    rules: [
      'Laske pöytäkortteja kortillasi täsmäävään summaan — kaappaa',
      'Tai jätä kortti pöytään — muut voivat käyttää sitä summiin',
      'Mokki: kaappaa kaikki pöydältä → 3 lisäpistettä',
      'Ensimmäisenä 16+ pistettä voittaa',
    ],
  },
  {
    id: 'koputus', name: 'Koputus', emoji: '🤜',
    desc: 'Muistipeli yllätysmomentein',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Koputus, maxWidth: 560, pakka: 'taydennetty',
    rules: [
      'Muistele pöytäkorttisi arvo — ne ovat piilossa',
      'Löydät täsmäparin käsikortillesi → molemmat pois pelistä',
      'Koputus käynnistää viimeisen kierroksen',
      'Pienin pistemäärä paljastuksessa voittaa',
    ],
  },
  {
    id: 'maija', name: 'Maija', emoji: '🂭',
    desc: 'Osittainen kaato — torjuntavoitto. Täyskaato — hyökkäät.',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Maija, maxWidth: 560, pakka: 'taydennetty',
    rules: [
      'Hyökkääjä lyö kortteja — puolustaja torjuu',
      'Torju samalla maalla korkeammalla tai trumpilla',
      'Täyskaato → sinä hyökkäät seuraavaksi',
      'Q♠ = Maija — ei voi torjua eikä torju muita',
    ],
  },
  {
    id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',
    desc: <>Lähes se perinteinen paskahousu kuudella kortilla. <span style={{color:SUIT_COLOR['♦']}}>2♦</span> <span style={{color:SUIT_COLOR['♥']}}>2♥</span>{' arvo 2 · '}<span style={{color:SUIT_COLOR['♠']}}>2♠</span> <span style={{color:SUIT_COLOR['♣']}}>2♣</span>{' kovia'}</>,
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true,
    rules: [
      'Pelaa sama tai suurempi arvo edelliseen',
      '2♦ / 2♥ nollaa pakka (arvo 2) — 2♠ / 2♣ nollaa (kova)',
      'Neljä samaa → pakkonollaus',
      'Viimeisenä yksin kortitoin = Paskahousu, häviät',
    ],
  },
  {
    id: 'moska', name: 'Moska', emoji: '⚔️',
    desc: 'Totaalinen korttisota: hyökkää, siirrä, puolusta ja muista iskeä kylkeen.',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Vaativa', diffColor: '#e05c3b',
    component: Moska, maxWidth: 580, pakka: 'taydennetty',
    rules: [
      'Hyökkääjä lyö kortteja — puolustaja torjuu tai nostaa kaikki',
      'Torju samalla maalla korkeammalla tai trumpilla',
      'Sivuhyökkäys: lisää sama arvo pöytään',
      'Trumppi paljastetaan jaossa — se on voimakkain maa',
    ],
  },
];

const mkStats = () => Object.fromEntries(GAMES.map(g => [g.id, { played: 0, wins: 0 }]));

function StatBadge({ s }) {
  if (!s || s.played === 0) return null;
  const pct = Math.round(s.wins / s.played * 100);
  const color = pct >= 60 ? '#4caf7d' : pct >= 40 ? '#c9a84c' : '#e05c3b';
  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 10, color, marginTop: 2, letterSpacing: 0.5 }}>
      {s.wins}V / {s.played}P · {pct}%
    </div>
  );
}

function GameBtn({ g, stats, onSelect }) {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: 'none',
      borderRadius: 14,
      overflow: 'hidden',
      borderLeft: `4px solid ${g.diffColor}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
    }}>
      <button
        onClick={() => onSelect(g.id)}
        style={{
          background: 'transparent', border: 'none',
          padding: '14px 12px 14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', textAlign: 'left', width: '100%',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 26, flexShrink: 0, minWidth: 32, textAlign: 'center' }}>{g.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{g.name}</div>
          <StatBadge s={stats[g.id]} />
        </div>
        <span
          onClick={e => { e.stopPropagation(); setShowDesc(v => !v); }}
          style={{
            flexShrink: 0, border: `1px solid ${C.panelBorder}`,
            borderRadius: 6, width: 24, height: 24, fontSize: 11, cursor: 'pointer',
            color: showDesc ? C.gold : C.dim, fontFamily: 'sans-serif', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >ℹ</span>
      </button>
      {showDesc && (
        <div style={{ padding: '0 16px 10px 60px', fontSize: 12, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.5 }}>
          {g.desc}
        </div>
      )}
    </div>
  );
}

function GameHeader({ title, onBack, gearBtn, isMobile }) {
  const btnBase = {
    background: 'rgba(13,33,24,0.92)', borderRadius: 9,
    padding: isMobile ? '9px 16px' : '10px 20px', cursor: 'pointer', fontFamily: 'Georgia,serif',
    border: '1px solid #2a4a32', color: C.dim, fontSize: isMobile ? 13 : 14,
  };
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(13,33,24,0.95)',
      borderBottom: '1px solid #2a4a32',
      padding: isMobile ? '10px 8px' : '14px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={onBack} style={{ ...btnBase, flexShrink: 0, position: 'absolute', left: 8 }}>
          ← Valikko
        </button>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: isMobile ? 12 : 14, color: C.text, letterSpacing: 1 }}>
          {title}
        </div>
        <div style={{ position: 'absolute', right: 8 }}>{gearBtn}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive]         = useState(null);
  const [playerCount, setPlayerCount] = useState(4);
  const [showAdmin, setShowAdmin]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats]           = useState(mkStats);
  const [showLog, setShowLog]       = useState(() => window.innerWidth >= 600);
  const [soundOn, setSoundOn]       = useState(true);
  const [seeAll, setSeeAll]         = useState(false);
  const [showCounts, setShowCounts] = useState(true);
  const [showPlayHints, setShowPlayHints] = useState(true);
  const [teachMode, setTeachMode]   = useState(false);
  const [showLastPlay, setShowLastPlay] = useState(true);
  const [showNextBtn, setShowNextBtn]   = useState(true);
  const [aiLevel, setAiLevel]           = useState('normal'); // 'beginner' | 'normal' | 'hard'
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 600);
  const [playerGroup, setPlayerGroup] = useState(() => {
    const groups = ['laituri', 'jumalat', 'puolue', 'kansa'];
    return groups[Math.floor(Math.random() * groups.length)];
  });
  const [resultData, setResultData] = useState(null);   // {ranking, revealCards?, scoreBreakdown?}
  const [gameKey, setGameKey]       = useState(0);       // increment → remount game

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (active) window.history.pushState(null, '');
    window.scrollTo(0, 0);
  }, [active]);

  useEffect(() => {
    const handlePop = () => setActive(null);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const playerPool = playerGroup === 'laituri' ? LAITURI_SPECIAL
    : playerGroup === 'jumalat'  ? ONNEN_JUMALAT
    : playerGroup === 'puolue'   ? IHMISTEN_PUOLUE
    : KANSA;

  function selectGame(id) {
    setActive(id);
  }

  function recordResult(gameId, heroWon) {
    setStats(prev => ({
      ...prev,
      [gameId]: { played: prev[gameId].played + 1, wins: prev[gameId].wins + (heroWon ? 1 : 0) },
    }));
  }

  function handleGameResult(gameId, result) {
    // result = {ranking, revealCards?, scoreBreakdown?}
    const heroWon = result.ranking.find(r => r.isHuman)?.place === 1;
    recordResult(gameId, heroWon);
    setResultData(result);
  }

  if (showAdmin) {
    return (
      <div>
        <button
          onClick={() => setShowAdmin(false)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 300,
            background: 'rgba(13,33,24,0.92)', border: '1px solid #2a4a32',
            color: C.dim, padding: '6px 14px', borderRadius: 9,
            fontSize: 12, fontFamily: 'Georgia,serif', cursor: 'pointer',
          }}
        >
          ← Päävalikko
        </button>
        <Admin />
      </div>
    );
  }

  const gearBtn = (
    <button
      onClick={() => setShowSettings(v => !v)}
      style={{
        background: 'transparent', border: `1px solid ${showSettings ? C.gold : C.panelBorder}`,
        color: showSettings ? C.gold : C.dim, borderRadius: 9, padding: '9px 12px',
        fontSize: 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label="Asetukset"
    >⚙</button>
  );

  const settingsPanel = showSettings && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '16px 12px' : '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>⚙ Asetukset</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >✕ Sulje</button>
        </div>

        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 10, opacity: 0.8 }}>Tommin korttipelikokoelma</div>
          {[
            'Hei ja tervetuloa sinä korttipelien ystävä!',
            'Näin opettavan sovelluksen tarpeelliseksi, koska haluan lisää pelikavereita! Aina ei ole aikaa, opettajaa, virtaa tai pelaajia – korttipelisovelluksella on siis kysyntää, varsinkin kun korttipeleillä ei ole tekijänoikeuksia ja tarjontaa rajoittaa lukuisat paikalliset säännöt.',
            'Nyt siis olkoon Tommin Standardi!',
            'Tässä siulle yhdeksän peliä vaihe vaiheelta neuvottuna lukuisin toistoin opittaviksi. Yritin opettaa sovellukselle sääntövivahteeni ja pelilogiikkaani, mutta saattaa siellä joku bugikin olla mukana.',
            'Kiitos ja kumarrus,\nTommi Haanranta',
          ].map((t, i) => (
            <p key={i} style={{ margin: '0 0 8px', color: C.text, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>{t}</p>
          ))}
          <a href={MAILTO} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
            color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
            border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
          }}>✉ Lähetä risut ja ruusut</a>
        </div>

        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 10, opacity: 0.8 }}>Peliasetukset</div>
          {[
            { label: 'Tapahtumaloki auki',                                                   val: showLog,       set: setShowLog       },
            { label: 'Äänet',                                                                 val: soundOn,       set: setSoundOn       },
            { label: 'Cheat Mode (Hero näkee kaikki pöytä- ja käsikortit)',                    val: seeAll,        set: setSeeAll        },
            { label: 'Korttimäärät näkyvillä (nosto-, kaato-, poistopakan koot)',             val: showCounts,    set: setShowCounts    },
            { label: 'Pelattavat kortit näkyvillä (näytä mitä voi pelata)',                   val: showPlayHints, set: setShowPlayHints },
            { label: 'Näytä viimeisin siirto (kelluva kortti-indikaattori)',                   val: showLastPlay,  set: setShowLastPlay  },
            { label: 'Pysähdy näyttämään kaappauksen / kierroksen yksityiskohdat (Kasino, Moska)', val: showNextBtn, set: setShowNextBtn },
          ].map(({ label, val, set }) => (
            <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', cursor: 'pointer' }}>
              <input
                type="checkbox" checked={val} onChange={() => set(v => !v)}
                style={{ accentColor: C.gold, width: 14, height: 14, marginTop: 1, flexShrink: 0 }}
              />
              <span style={{ fontSize: isMobile ? 11 : 12, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>{label}</span>
            </label>
          ))}
        </div>

        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 10, opacity: 0.8 }}>Tekoälyn taso 🤖</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[
              { key: 'beginner', label: 'Aloittelija', desc: 'tekee virheitä, voitettavissa' },
              { key: 'normal',   label: 'Normaali',    desc: 'pelaa hyvin, mokaa joskus' },
              { key: 'hard',     label: 'Vaativa',     desc: 'täysi strategia' },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setAiLevel(key)}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'sans-serif', fontSize: 12,
                  background: aiLevel === key ? `${C.gold}22` : 'transparent',
                  border: `1px solid ${aiLevel === key ? C.gold : C.panelBorder}`,
                  color: aiLevel === key ? C.gold : C.dim,
                  transition: 'all 0.15s',
                }}
              >
                {label}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 10, opacity: 0.8 }}>Pelaajat 👥</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 3, color: C.dim, opacity: 0.7 }}>PELAAJIA</span>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  border: `2px solid ${playerCount === n ? C.gold : C.panelBorder}`,
                  background: playerCount === n ? `${C.gold}18` : 'transparent',
                  color: playerCount === n ? C.gold : C.dim,
                  fontSize: 18, cursor: 'pointer',
                  fontFamily: 'Georgia,serif', transition: 'all 0.15s',
                }}
              >{n}</button>
            ))}
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            Vastustajat arvotaan valitusta ryhmästä.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'laituri', label: '🏖 Laiturin tyypit',  pool: LAITURI_SPECIAL  },
              { key: 'jumalat', label: '⚡ Onnen jumalat',    pool: ONNEN_JUMALAT    },
              { key: 'puolue',  label: '🗳 Ihmisten puolue',  pool: IHMISTEN_PUOLUE  },
              { key: 'kansa',   label: '🧑‍🤝‍🧑 Kansa',           pool: KANSA            },
            ].map(({ key, label, pool }) => (
              <button
                key={key}
                onClick={() => setPlayerGroup(key)}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'sans-serif', fontSize: 12,
                  background: playerGroup === key ? `${C.gold}22` : 'transparent',
                  border: `1px solid ${playerGroup === key ? C.gold : C.panelBorder}`,
                  color: playerGroup === key ? C.gold : C.dim,
                  transition: 'all 0.15s',
                }}
              >
                {label}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{pool.length} nimeä</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.8, opacity: 0.7 }}>
            {playerPool.join(' · ')}
          </div>
        </div>
      </div>
    </div>
  );

  if (active) {
    const game = GAMES.find(g => g.id === active);
    const GameComponent = game.component;
    const maxW = isMobile ? 'calc(100vw - 20px)' : game.maxWidth;

    // Tulosruutu pelin jälkeen
    if (resultData) {
      return (
        <GameResult
          ranking={resultData.ranking}
          revealCards={resultData.revealCards}
          scoreBreakdown={resultData.scoreBreakdown}
          isMobile={isMobile}
          onNewGame={() => { setResultData(null); setGameKey(k => k + 1); }}
          onMenu={() => { setResultData(null); setActive(null); }}
        />
      );
    }

    return (
      <div style={{ maxWidth: maxW, margin: '0 auto' }}>
        {settingsPanel}
        <GameHeader title={game.name} onBack={() => { setResultData(null); setActive(null); }} gearBtn={gearBtn} isMobile={isMobile} />
        <GameComponent
          key={gameKey}
          game={game}
          hints={showLog}
          soundOn={soundOn}
          seeAll={seeAll}
          showCounts={showCounts}
          showPlayHints={showPlayHints}
          teachMode={teachMode}
          showLastPlay={showLastPlay}
          isMobile={isMobile}
          playerCount={Math.max(playerCount, game.minPlayers)}
          playerNames={playerPool}
          showNextBtn={showNextBtn}
          aiLevel={aiLevel}
          onResult={(result) => handleGameResult(active, result)}
        />
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? 10 : 16, padding: isMobile ? '16px 12px' : '32px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      {settingsPanel}

      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: isMobile ? '100%' : 900, marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 8 : 14 }}>
          <h1 style={{
            fontSize: isMobile ? 32 : 48, letterSpacing: isMobile ? 6 : 12, margin: 0,
            background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            JAKO<span style={{ fontSize: isMobile ? 15 : 22, verticalAlign: 'super', letterSpacing: 2 }}>52</span>
          </h1>
        </div>
        <div style={{ position: 'absolute', right: 0 }}>{gearBtn}</div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 900,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {GAMES.map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={selectGame} />)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.dim, opacity: 0.35, fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
        v{APP_VERSION} · {BUILD_DATE}
      </div>
    </div>
  );
}
