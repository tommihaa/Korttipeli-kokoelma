import { useState, useEffect } from 'react';
import { C, SUIT_COLOR } from './shared/colors.js';
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

const PAKKA = {
  jaettu:     { badge: 'Kaikki jaetaan',  label: 'Kaikki kortit jaetaan käsikorteiksi',                              icon: '🃏', color: '#4caf7d' },
  taydennetty:{ badge: 'Täydennetään',    label: 'Käsikortteja täydennetään',                                        icon: '📦', color: '#c9a84c' },
  kierratetty:{ badge: 'Pakka kierrää',   label: 'Nostopakkaa jaetaan poistopakasta, kunnes joku pääsee korteistaan', icon: '🔄', color: '#7ab3e0' },
};

const GAMES = [
  { id: 'kultakala',  name: 'Kultakala',  emoji: '🐟',  desc: 'Muistipeli, jos katsot niin vaihdat',       players: '2–4', diff: 'Helppo',    diffColor: '#4caf7d', component: Kultakala,  maxWidth: 560, pakka: 'taydennetty' },
  { id: 'lapsy',      name: 'Läpsy',      emoji: '👋',  desc: 'Reaktiopeli',                               players: '2–4', diff: 'Helppo',    diffColor: '#4caf7d', component: Lapsy,      maxWidth: 520, pakka: 'jaettu'      },
  { id: 'ristiseiska',name: 'Ristiseiska',emoji: '♣',   desc: 'Kiusantekoa, korttipantteja ja kärsivällisyyttä', players: '3–4', diff: 'Helppo', diffColor: '#4caf7d', component: Ristiseiska, maxWidth: 620, pakka: 'jaettu' },
  { id: 'seiska',     name: 'Seiska',     emoji: '7️⃣', desc: 'UNO-tyyppinen kilpajuoksu kortittomuuteen',  players: '2–4', diff: 'Helppo',    diffColor: '#4caf7d', component: Seiska,     maxWidth: 580, pakka: 'kierratetty', suosikki: true },
  { id: 'kasino',     name: 'Kasino',     emoji: '🂺',  desc: 'Kaappaa koko pöytä',                        players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Kasino,     maxWidth: 560, pakka: 'taydennetty', suosikki: true },
  { id: 'koputus',    name: 'Koputus',    emoji: '🤜',  desc: 'Muistipeli parilla twistillä',              players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Koputus,    maxWidth: 560, pakka: 'taydennetty' },
  { id: 'maija',      name: 'Maija',      emoji: '♠',   desc: 'Osittainen kaato on torjuntavoitto',        players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Maija,      maxWidth: 560, pakka: 'taydennetty' },
  { id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',  desc: <>Lähes se perinteinen paskahousu kuudella kortilla. <span style={{color:SUIT_COLOR['♦']}}>2♦</span> <span style={{color:SUIT_COLOR['♥']}}>2♥</span>{' arvo 2 · '}<span style={{color:SUIT_COLOR['♠']}}>2♠</span> <span style={{color:SUIT_COLOR['♣']}}>2♣</span>{' kovia'}</>, players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true },
  { id: 'moska',      name: 'Moska',      emoji: '⚔️', desc: 'Moskassa tulee lyödä lyötyä',  players: '2–4', diff: 'Vaativa',   diffColor: '#e05c3b', component: Moska,      maxWidth: 580, pakka: 'taydennetty' },
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
  const p = g.pakka ? PAKKA[g.pakka] : null;
  return (
    <button
      onClick={() => onSelect(g.id)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s',
        width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = C.gold + '55'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = C.panelBorder; }}
    >
      <span style={{ fontSize: 28, flexShrink: 0, minWidth: 36, textAlign: 'center' }}>{g.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 3 }}>{g.name}</div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif' }}>{g.desc}</div>
        <StatBadge s={stats[g.id]} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: g.diffColor, fontFamily: 'sans-serif', marginBottom: 2 }}>{g.diff}</div>
        <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif' }}>{g.players} pelaajaa</div>
      </div>
    </button>
  );
}

export default function App() {
  const [active, setActive]         = useState(null);
  const [showAdmin, setShowAdmin]   = useState(false);
  const [stats, setStats]           = useState(mkStats);
  const [showLog, setShowLog]       = useState(true);
  const [soundOn, setSoundOn]       = useState(true);
  const [seeAll, setSeeAll]         = useState(false);
  const [showCounts, setShowCounts] = useState(true);
  const [showPlayHints, setShowPlayHints] = useState(true);
  const [teachMode, setTeachMode]   = useState(true);
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function recordResult(gameId, heroWon) {
    setStats(prev => ({
      ...prev,
      [gameId]: { played: prev[gameId].played + 1, wins: prev[gameId].wins + (heroWon ? 1 : 0) },
    }));
  }

  // Admin dashboard
  if (showAdmin) {
    return (
      <div>
        <button
          onClick={() => setShowAdmin(false)}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 300,
            background: 'rgba(13,33,24,0.92)',
            border: '1px solid #2a4a32',
            color: C.dim,
            padding: '6px 14px',
            borderRadius: 9,
            fontSize: 12,
            fontFamily: 'Georgia,serif',
            cursor: 'pointer',
          }}
        >
          ← Päävalikko
        </button>
        <Admin />
      </div>
    );
  }

  if (active) {
    const game = GAMES.find(g => g.id === active);
    const GameComponent = game.component;
    const btnBase = {
      background: 'rgba(13,33,24,0.92)', borderRadius: 9,
      padding: '6px 14px', cursor: 'pointer', fontFamily: 'Georgia,serif',
    };
    const maxW = isMobile ? 'calc(100vw - 20px)' : game.maxWidth;
    return (
      <div style={{ maxWidth: maxW, margin: '0 auto' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: 'rgba(13,33,24,0.95)',
          borderBottom: '1px solid #2a4a32',
          padding: isMobile ? '8px 8px' : '12px 8px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setActive(null)} style={{ ...btnBase, border: '1px solid #2a4a32', color: C.dim, fontSize: 12, flexShrink: 0, margin: '0 8px', position: 'absolute', left: 8 }}>
              ← Valikko
            </button>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: isMobile ? 12 : 14, color: C.text, letterSpacing: 1 }}>
              {game.name}
            </div>
            <button
              onClick={() => setTeachMode(!teachMode)}
              style={{ ...btnBase, border: '1px solid #2a4a32', color: teachMode ? C.gold : C.dim, fontSize: 12, flexShrink: 0, margin: '0 8px', position: 'absolute', right: 8, transition: 'color 0.2s' }}
              title={teachMode ? "Opastava tila päällä" : "Opastava tila pois"}
            >
              {teachMode ? '🎓' : '🃏'}
            </button>
          </div>
        </div>

        <GameComponent
          game={game}
          hints={showLog}
          soundOn={soundOn}
          seeAll={seeAll}
          showCounts={showCounts}
          showPlayHints={showPlayHints}
          teachMode={teachMode}
          onResult={(heroWon) => recordResult(active, heroWon)}
        />
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: isMobile ? 16 : 32, padding: isMobile ? '20px 12px' : '40px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 8, opacity: 0.55, marginBottom: 10, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <span style={{ color: SUIT_COLOR['♠'] }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </div>
        <h1 style={{
          fontSize: isMobile ? 36 : 48, letterSpacing: isMobile ? 6 : 12, margin: 0,
          background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          JAKO
        </h1>
        <p style={{ color: C.dim, fontSize: isMobile ? 11 : 13, fontStyle: 'italic', marginTop: 8, lineHeight: 1.6 }}>
          Tommin valinnat korttipeleiksi<br />päiväkahveilta illanistujaisiin.<br />Näillä neuvoin ja toistoin opit<br />pelimekaniikat pienenkin ruudun ääressä.
        </p>
      </div>

      <div style={{
        width: '100%', maxWidth: isMobile ? '100%' : 460,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        padding: isMobile ? '8px 12px' : '12px 18px',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, color: C.dim, fontFamily: 'sans-serif', opacity: 0.5, letterSpacing: 0.5 }}>
          Oletukset — muutettavissa pelin aikana.
        </p>
        {[
          { label: 'Tapahtumaloki auki',                                                   val: showLog,    set: setShowLog },
          { label: 'Äänet',                                                                 val: soundOn,    set: setSoundOn },
          { label: 'Läpinäkyvä pöytä (Hero näkee kaikki pöytä- ja käsikortit)',            val: seeAll,     set: setSeeAll },
          { label: 'Korttimäärät näkyvillä (nosto-, kaato-, poistopakan koot)',             val: showCounts, set: setShowCounts },
          { label: 'Pelattavat kortit näkyvillä (näytä mitä voi pelata)',                   val: showPlayHints, set: setShowPlayHints },
          { label: 'Opastava tila (strategiatippejä)',                                       val: teachMode, set: setTeachMode },
        ].map(({ label, val, set }) => (
          <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={val} onChange={() => set(v => !v)}
              style={{ accentColor: C.gold, width: 14, height: 14, marginTop: 1, flexShrink: 0 }}
            />
            <span style={{ fontSize: isMobile ? 11 : 12, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.4 }}>{label}</span>
          </label>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 10,
        width: '100%',
        maxWidth: isMobile ? '100%' : 900,
      }}>
        {GAMES.map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={setActive} />)}
      </div>

      <div style={{
        marginTop: 20,
        padding: '12px 16px',
        background: 'rgba(201, 168, 76, 0.08)',
        border: `1px solid ${C.gold}44`,
        borderRadius: 8,
        textAlign: 'center',
      }}>
        <button
          onClick={() => setShowAdmin(true)}
          style={{
            background: `${C.gold}22`,
            border: `1px solid ${C.gold}`,
            color: C.gold,
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'Georgia,serif',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          ✨ Admin Momentit
        </button>
      </div>

      <p style={{ color: C.dim, fontSize: 11, fontFamily: 'sans-serif', opacity: 0.5, letterSpacing: 1 }}>
        Hero + tekoäly
      </p>
    </div>
  );
}
