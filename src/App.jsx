import { useState } from 'react';
import { C } from './shared/colors.js';
import Koputus from './games/Koputus.jsx';
import Lapsy from './games/Lapsy.jsx';
import Kultakala from './games/Kultakala.jsx';
import Maija from './games/Maija.jsx';
import Kasino from './games/Kasino.jsx';
import Moska from './games/Moska.jsx';
import Seiska from './games/Seiska.jsx';
import Ristiseiska from './games/Ristiseiska.jsx';
import Paskahousu from './games/Paskahousu.jsx';

const GAMES = [
  {
    id: 'koputus',
    name: 'Koputus',
    emoji: '🤜',
    desc: 'Muistipeli parilla twistillä',
    players: '2–4',
    diff: 'Keskitaso',
    diffColor: '#e0a93b',
    component: Koputus,
  },
  {
    id: 'lapsy',
    name: 'Läpsy',
    emoji: '👋',
    desc: 'Reaktiopeli',
    players: '2–4',
    diff: 'Helppo',
    diffColor: '#4caf7d',
    component: Lapsy,
  },
  {
    id: 'kultakala',
    name: 'Kultakala',
    emoji: '🐟',
    desc: 'Muistipeli, jos katsot niin vaihdat',
    players: '2–4',
    diff: 'Helppo',
    diffColor: '#4caf7d',
    component: Kultakala,
  },
  {
    id: 'maija',
    name: 'Maija',
    emoji: '♠',
    desc: 'Osittainen kaato on torjuntavoitto',
    players: '2–4',
    diff: 'Keskitaso',
    diffColor: '#e0a93b',
    component: Maija,
  },
  {
    id: 'kasino',
    name: 'Kasino',
    emoji: '🂺',
    desc: 'Kaappaa koko pöytä',
    players: '2–4',
    diff: 'Keskitaso',
    diffColor: '#e0a93b',
    component: Kasino,
  },
  {
    id: 'moska',
    name: 'Moska',
    emoji: '⚔️',
    desc: 'Hyökkäilyjä ja puolustusta, sitä on Moska',
    players: '2–4',
    diff: 'Vaativa',
    diffColor: '#e05c3b',
    component: Moska,
  },
  {
    id: 'seiska',
    name: 'Seiska',
    emoji: '7️⃣',
    desc: 'UNO-tyyppinen kilpajuoksu kortittomuuteen',
    players: '2–4',
    diff: 'Helppo',
    diffColor: '#4caf7d',
    component: Seiska,
  },
  {
    id: 'ristiseiska',
    name: 'Ristiseiska',
    emoji: '♣',
    desc: 'Kiusantekoa, korttipantteja ja kärsivällisyyttä',
    players: '3–4',
    diff: 'Helppo',
    diffColor: '#4caf7d',
    component: Ristiseiska,
  },
  {
    id: 'paskahousu',
    name: 'Paskahousu',
    emoji: '💩',
    desc: 'Laiturin versio - vain mustat kakkoset on kovia',
    players: '2–4',
    diff: 'Keskitaso',
    diffColor: '#e0a93b',
    component: Paskahousu,
  },
];

export default function App() {
  const [active, setActive] = useState(null);

  if (active) {
    const game = GAMES.find(g => g.id === active);
    const GameComponent = game.component;
    return (
      <div>
        <button
          onClick={() => setActive(null)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 100,
            background: 'rgba(13,33,24,0.92)', border: '1px solid #2a4a32',
            borderRadius: 9, padding: '6px 14px', color: C.dim,
            fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif',
          }}
        >
          ← Valikko
        </button>
        <GameComponent />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460 }}>
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => setActive(g.id)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.panelBorder}`,
              borderRadius: 14, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = C.gold + '55'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = C.panelBorder; }}
          >
            <span style={{ fontSize: 28, flexShrink: 0, minWidth: 36, textAlign: 'center' }}>{g.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 3 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif' }}>{g.desc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: g.diffColor, fontFamily: 'sans-serif', marginBottom: 2 }}>{g.diff}</div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif' }}>{g.players} pelaa</div>
            </div>
          </button>
        ))}
      </div>

      <p style={{ color: C.dim, fontSize: 11, fontFamily: 'sans-serif', opacity: 0.5, letterSpacing: 1 }}>
        Hero + tekoäly · Opetustila
      </p>
    </div>
  );
}
