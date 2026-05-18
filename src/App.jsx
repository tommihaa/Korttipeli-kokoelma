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

const LAITURI_SPECIAL = ['Antti','Arto','Janus','Jens','Jokke','Jukka','Kirsi','Markku','Marko','Markus','Marviel','Mika','Mikael','Osku','Rebekka','Sanna','Sari','Simo','Tarja','Teemu'];
const ONNEN_JUMALAT   = ['Vortumna','Loki','Fortuna','Tykhe','Tommi Palleroine'];

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
  { id: 'koputus',    name: 'Koputus',    emoji: '🤜',  desc: 'Muistipeli yllätysmomentein: pelaa täsmäävä pöytäkorttisi pöydän keskelle tai muuta koputtaneen suunnitelmat vaihtamalla hänelle kuvakortti!', players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Koputus,    maxWidth: 560, pakka: 'taydennetty' },
  { id: 'maija',      name: 'Maija',      emoji: '♠',   desc: 'Osittainen kaato – sehän on torjuntavoitto! Mutta vuoro meni. Täyskaato päästää hyökkäämään.',        players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Maija,      maxWidth: 560, pakka: 'taydennetty' },
  { id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',  desc: <>Lähes se perinteinen paskahousu kuudella kortilla. <span style={{color:SUIT_COLOR['♦']}}>2♦</span> <span style={{color:SUIT_COLOR['♥']}}>2♥</span>{' arvo 2 · '}<span style={{color:SUIT_COLOR['♠']}}>2♠</span> <span style={{color:SUIT_COLOR['♣']}}>2♣</span>{' kovia'}</>, players: '2–4', diff: 'Keskitaso', diffColor: '#e0a93b', component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true },
  { id: 'moska',      name: 'Moska',      emoji: '⚔️', desc: 'Totaalinen korttisota: hyökkää, siirrä, puolusta ja muista iskeä kylkeen.',  players: '2–4', diff: 'Vaativa',   diffColor: '#e05c3b', component: Moska,      maxWidth: 580, pakka: 'taydennetty' },
];

const mkStats = () => Object.fromEntries(GAMES.map(g => [g.id, { played: 0, wins: 0 }]));

function InfoBox({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      width: '100%',
      border: `1px solid ${C.panelBorder}`,
      borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: C.dim, fontFamily: 'Georgia,serif', fontSize: 13,
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

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
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${C.panelBorder}`,
      borderRadius: 14,
      overflow: 'hidden',
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
        <button
          onClick={e => { e.stopPropagation(); setShowDesc(v => !v); }}
          style={{
            flexShrink: 0, background: 'transparent', border: `1px solid ${C.panelBorder}`,
            borderRadius: 6, width: 24, height: 24, fontSize: 11, cursor: 'pointer',
            color: showDesc ? C.gold : C.dim, fontFamily: 'sans-serif', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ℹ
        </button>
      </button>
      {showDesc && (
        <div style={{ padding: '0 16px 10px 60px', fontSize: 12, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.5 }}>
          {g.desc}
        </div>
      )}
    </div>
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
  const [playerGroup, setPlayerGroup] = useState('laituri');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const playerPool = playerGroup === 'laituri' ? LAITURI_SPECIAL : ONNEN_JUMALAT;

  function recordResult(gameId, heroWon) {
    setStats(prev => ({
      ...prev,
      [gameId]: { played: prev[gameId].played + 1, wins: prev[gameId].wins + (heroWon ? 1 : 0) },
    }));
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
          isMobile={isMobile}
          playerNames={playerPool}
          onResult={(heroWon) => recordResult(active, heroWon)}
        />
      </div>
    );
  }

  return (
    <div style={{
      background: '#0d2118', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? 10 : 16, padding: isMobile ? '16px 12px' : '32px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 4, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: isMobile ? 8 : 14 }}>
        <h1 style={{
          fontSize: isMobile ? 32 : 48, letterSpacing: isMobile ? 6 : 12, margin: 0,
          background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          JAKO<span style={{ fontSize: isMobile ? 15 : 22, verticalAlign: 'super', letterSpacing: 2 }}>52</span>
        </h1>
        <span style={{ display: 'flex', gap: isMobile ? 4 : 6, fontSize: isMobile ? 14 : 20, opacity: 0.85 }}>
          <span style={{ color: '#d0cfc8' }}>♠</span>
          <span style={{ color: SUIT_COLOR['♥'] }}>♥</span>
          <span style={{ color: SUIT_COLOR['♦'] }}>♦</span>
          <span style={{ color: SUIT_COLOR['♣'] }}>♣</span>
        </span>
      </div>

      <div style={{
        background: '#1a3a28',
        borderRadius: 16,
        padding: isMobile ? '14px 12px' : '20px 20px',
        width: '100%',
        maxWidth: isMobile ? '100%' : 900,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {GAMES.map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={setActive} />)}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 460, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <InfoBox title="Tommin kokoelma">
          <p style={{ margin: '0 0 8px', color: C.dim, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif' }}>
            Moi, tässä on lahjani sinulle seurapelien ystävälle, lisää korttipelejä.
          </p>
          <p style={{ margin: 0, color: C.dim, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif' }}>
            Yritin opettaa tälle sääntöjä, mut kun joku menee vikaan, niin laita mailia{' '}
            <a href="mailto:no.jopas@gmail.com" style={{ color: C.gold }}>no.jopas@gmail.com</a>
            {' '}— T. Tommi H
          </p>
        </InfoBox>

        <InfoBox title="Oletusasetukset ⚙" defaultOpen={false}>
          <p style={{ margin: '0 0 8px', fontSize: 10, color: C.dim, fontFamily: 'sans-serif', opacity: 0.5, letterSpacing: 0.5 }}>
            Muutettavissa myös pelin aikana.
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
        </InfoBox>

        <InfoBox title="Pelaajat 👥" defaultOpen={false}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            Vastustajat arvotaan valitusta ryhmästä.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { key: 'laituri', label: '🏖 Laituri-special', pool: LAITURI_SPECIAL },
              { key: 'jumalat', label: '⚡ Onnen jumalat', pool: ONNEN_JUMALAT },
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
        </InfoBox>
      </div>

      {/* Admin Momentit — piilotettu toistaiseksi */}

    </div>
  );
}
