import { useState } from 'react';
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

const PAKKA = {
  jaettu:     { badge: 'Kaikki jaetaan',  label: 'Kaikki kortit jaetaan käsikorteiksi',                              icon: '🃏', color: '#4caf7d' },
  taydennetty:{ badge: 'Täydennetään',    label: 'Käsikortteja täydennetään',                                        icon: '📦', color: '#c9a84c' },
  kierratetty:{ badge: 'Pakka kierrää',   label: 'Nostopakkaa jaetaan poistopakasta, kunnes joku pääsee korteistaan', icon: '🔄', color: '#7ab3e0' },
};

const GAMES = [
  { id: 'lapsy',      name: 'Läpsy',      emoji: '👋',  desc: 'Reaktiopeli',                               players: '2–4', diff: 'Helppo',    diffColor: '#4caf7d', component: Lapsy,      maxWidth: 520, pakka: 'jaettu'      },
  { id: 'kultakala',  name: 'Kultakala',  emoji: '🐟',  desc: 'Muistipeli, jos katsot niin vaihdat',       players: '2–4', diff: 'Helppo',    diffColor: '#4caf7d', component: Kultakala,  maxWidth: 560, pakka: 'taydennetty' },
  { id: 'ristiseiska',name: 'Ristiseiska',emoji: '♣',   desc: 'Kiusantekoa, korttipantteja ja kärsivällisyyttä', players: '3–4', diff: 'Helppo', diffColor: '#4caf7d', component: Ristiseiska, maxWidth: 620, pakka: 'jaettu' },
  { id: 'koputus',    name: 'Koputus',    emoji: '🤜',  desc: 'Muistipeli parilla twistillä',              players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Koputus,    maxWidth: 560, pakka: 'taydennetty' },
  { id: 'maija',      name: 'Maija',      emoji: '♠',   desc: 'Osittainen kaato on torjuntavoitto',        players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Maija,      maxWidth: 560, pakka: 'taydennetty' },
  { id: 'moska',      name: 'Moska',      emoji: '⚔️', desc: 'Hyökkäilyjä ja puolustusta, sitä on Moska',  players: '2–4', diff: 'Vaativa',   diffColor: '#e05c3b', component: Moska,      maxWidth: 580, pakka: 'taydennetty' },
  { id: 'seiska',     name: 'Seiska',     emoji: '7️⃣', desc: 'UNO-tyyppinen kilpajuoksu kortittomuuteen',  players: '2–4', diff: 'Helppo',    diffColor: '#4caf7d', component: Seiska,     maxWidth: 580, pakka: 'kierratetty', suosikki: true },
  { id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',  desc: <><span style={{color:SUIT_COLOR['♦']}}>2♦</span> <span style={{color:SUIT_COLOR['♥']}}>2♥</span>{' arvo 2 · '}<span style={{color:'#9090b8'}}>2♠</span> <span style={{color:SUIT_COLOR['♣']}}>2♣</span>{' kovia'}</>, players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true },
  { id: 'kasino',     name: 'Kasino',     emoji: '🂺',  desc: 'Kaappaa koko pöytä',                        players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Kasino,     maxWidth: 560, pakka: 'taydennetty', suosikki: true },
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
        <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: p ? 4 : 0 }}>{g.players} pelaa</div>
        {p && <div style={{ fontSize: 10, color: p.color, fontFamily: 'sans-serif', opacity: 0.8 }}>{p.icon} {p.badge}</div>}
      </div>
    </button>
  );
}

export default function App() {
  const [active, setActive]         = useState(null);
  const [stats, setStats]           = useState(mkStats);
  const [showLog, setShowLog]       = useState(true);
  const [soundOn, setSoundOn]       = useState(true);
  const [seeAll, setSeeAll]         = useState(false);
  const [showCounts, setShowCounts] = useState(true);

  function recordResult(gameId, heroWon) {
    setStats(prev => ({
      ...prev,
      [gameId]: { played: prev[gameId].played + 1, wins: prev[gameId].wins + (heroWon ? 1 : 0) },
    }));
  }

  if (active) {
    const game = GAMES.find(g => g.id === active);
    const GameComponent = game.component;
    const btnBase = {
      background: 'rgba(13,33,24,0.92)', borderRadius: 9,
      padding: '6px 14px', cursor: 'pointer', fontFamily: 'Georgia,serif',
    };
    return (
      <div style={{ maxWidth: game.maxWidth, margin: '0 auto' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 200,
          height: 44,
          background: 'rgba(13,33,24,0.95)',
          borderBottom: '1px solid #2a4a32',
          display: 'flex', alignItems: 'center',
        }}>
          <button onClick={() => setActive(null)} style={{ ...btnBase, border: '1px solid #2a4a32', color: C.dim, fontSize: 12, flexShrink: 0, margin: '0 8px' }}>
            ← Valikko
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Georgia,serif', fontSize: 14, color: C.text, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{game.emoji}</span>
            <span>{game.name}</span>
          </div>
          {/* tasapainotuselementti oikealle puolelle */}
          <div style={{ width: 90, flexShrink: 0 }} />
        </div>

        <GameComponent
          hints={showLog}
          soundOn={soundOn}
          seeAll={seeAll}
          showCounts={showCounts}
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
      gap: 32, padding: '40px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 8, color: C.gold, opacity: 0.55, marginBottom: 10 }}>
          ♠ ♥ ♦ ♣
        </div>
        <h1 style={{
          fontSize: 48, letterSpacing: 12, margin: 0,
          background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          JAKO
        </h1>
        <p style={{ color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 8 }}>
          Tommin kokoelma - perinteiset korttipelit aina mukanasi.
        </p>
      </div>

      <div style={{
        width: '100%', maxWidth: 460,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        padding: '12px 18px',
      }}>
        {[
          { label: 'Tapahtumaloki auki',                                                   val: showLog,    set: setShowLog },
          { label: 'Äänet',                                                                 val: soundOn,    set: setSoundOn },
          { label: 'Läpinäkyvä pöytä (Hero näkee kaikki pöytä- ja käsikortit)',            val: seeAll,     set: setSeeAll },
          { label: 'Korttimäärät näkyvillä (nosto-, kaato-, poistopakan koot)',             val: showCounts, set: setShowCounts },
        ].map(({ label, val, set }) => (
          <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 0', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={val} onChange={() => set(v => !v)}
              style={{ accentColor: C.gold, width: 15, height: 15, marginTop: 1, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.4 }}>{label}</span>
          </label>
        ))}
        <p style={{ margin: '8px 0 0', fontSize: 11, color: C.dim, fontFamily: 'sans-serif', opacity: 0.5, letterSpacing: 0.5 }}>
          Oletukset — muutettavissa pelin aikana.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460 }}>
        {GAMES.filter(g => !g.suosikki).map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={setActive} />)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: C.panelBorder }} />
          <span style={{ fontSize: 10, color: C.gold, fontFamily: 'sans-serif', opacity: 0.7, letterSpacing: 1 }}>SUOSIKIT</span>
          <div style={{ flex: 1, height: 1, background: C.panelBorder }} />
        </div>
        {GAMES.filter(g => g.suosikki).map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={setActive} />)}
      </div>

      <p style={{ color: C.dim, fontSize: 11, fontFamily: 'sans-serif', opacity: 0.5, letterSpacing: 1 }}>
        Hero + tekoäly
      </p>
    </div>
  );
}
