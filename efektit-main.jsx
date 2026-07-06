import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LangProvider } from './src/shared/i18n.jsx';
import { SFX, setTheme } from './src/shared/audio.js';
import { SFX_CATALOG } from './src/shared/sfxCatalog.js';
import Card from './src/shared/Card.jsx';
import PakkaCount from './src/shared/PakkaCount.jsx';
import FanStack from './src/shared/FanStack.jsx';
import { BACKS } from './src/shared/BACKS.jsx';

// reactPulse/slotFlash ovat pelikohtaisia @keyframes-injektioita (Koputus.jsx, Moska.jsx)
// — Card.jsx viittaa niihin nimellä mutta ei omista niitä. Kopioitu tänne muuttumattomana,
// jotta demo toimii ilman että 9 pelitiedostoa koskettaisiin (ks. suunnitelma).
const KEYFRAMES = `
  @keyframes reactPulse{0%,100%{border-color:#e05c3b;box-shadow:0 0 8px rgba(224,92,59,0.4)}50%{border-color:#ff7a5a;box-shadow:0 0 16px rgba(224,92,59,0.7)}}
  @keyframes slotFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9),0 0 18px rgba(201,168,76,0.6)}60%{box-shadow:0 0 0 2px rgba(201,168,76,0.5),0 0 10px rgba(201,168,76,0.3)}100%{box-shadow:none}}
`;

const buttonStyle = {
  padding: '12px 14px', border: '1px solid #3a7050', borderRadius: 8, background: '#164a34',
  color: 'inherit', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left',
};
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, maxWidth: '60rem' };

function Efektit() {
  const [theme, setThemeState] = useState('oletus');
  const [muted, setMuted] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [reactHL, setReactHL] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);
  const [flash, setFlash] = useState(false);
  const [glow, setGlow] = useState(false);

  const chooseTheme = (t) => { setTheme(t); setThemeState(t); };
  const mute = () => setMuted(true);
  const flashPakka = () => { setFlash(true); setTimeout(() => setFlash(false), 2600); };
  const flashPlaced = () => { setJustPlaced(true); setTimeout(() => setJustPlaced(false), 2300); };

  return (
    <div>
      <style>{KEYFRAMES}</style>
      <h1 style={{ fontSize: '1.3rem' }}>Jako · efektit</h1>
      <p style={{ color: '#c8dfd0', maxWidth: '40rem' }}>
        Jokainen nappi soittaa yhden pelitilanteen äänen tai näyttää yhden visuaalisen
        efektin. Pysyvä kehitystyökalu — ei kuulu peliin eikä tuotantobuildiin.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0 20px' }}>
        <strong>Ääniteema:</strong>
        <button style={{ ...buttonStyle, background: theme === 'oletus' ? '#3a7050' : '#164a34' }} onClick={() => chooseTheme('oletus')}>Oletus</button>
        <button style={{ ...buttonStyle, background: theme === 'torvi-kannel' ? '#3a7050' : '#164a34' }} onClick={() => chooseTheme('torvi-kannel')}>Torvi &amp; kantele</button>
        <button style={{ ...buttonStyle, background: '#6a2f2f', borderColor: '#8a4a4a', fontWeight: 600 }} onClick={mute}>
          🔇 Hiljennä{muted ? ' (mykistetty)' : ''}
        </button>
      </div>

      <h2 style={{ fontSize: '1rem', color: '#c8dfd0' }}>Äänet (respektoi yllä valittua teemaa)</h2>
      <div style={gridStyle}>
        {SFX_CATALOG.map(([fn, label]) => (
          <button key={fn} style={buttonStyle} disabled={muted} onClick={() => !muted && SFX[fn]()}>
            <b style={{ display: 'block', marginBottom: 2 }}>{label}</b>
            <small style={{ color: '#a8c8b4' }}>{fn}()</small>
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', color: '#c8dfd0' }}>Visuaaliset efektit</h2>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 10 }}>
        <div>
          <p style={{ color: '#a8c8b4', fontSize: '0.85rem' }}>Card: highlight / reactHL / justPlaced</p>
          <Card card={{ r: 'A', s: '♠' }} highlight={highlight} reactHL={reactHL} justPlaced={justPlaced} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button style={buttonStyle} onClick={() => setHighlight((v) => !v)}>Highlight</button>
            <button style={buttonStyle} onClick={() => setReactHL((v) => !v)}>React-pulssi</button>
            <button style={buttonStyle} onClick={flashPlaced}>Just placed -väläys</button>
          </div>
        </div>
        <div>
          <p style={{ color: '#a8c8b4', fontSize: '0.85rem' }}>PakkaCount: väläys (pakka ehtyi)</p>
          <div style={{ width: 60, height: 82, borderRadius: 7, background: BACKS.ilves.bg, border: `2px solid ${BACKS.ilves.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PakkaCount variant="number" count={12} flash={flash} style={{ fontFamily: 'sans-serif', fontSize: 14 }} />
          </div>
          <button style={{ ...buttonStyle, marginTop: 8 }} onClick={flashPakka}>Väläytä</button>
        </div>
        <div>
          <p style={{ color: '#a8c8b4', fontSize: '0.85rem' }}>FanStack: pinon hehku</p>
          <FanStack count={3} w={66} h={90} backStyle={BACKS.ilves} glowColor={glow ? '#c9a84c' : undefined} />
          <button style={{ ...buttonStyle, marginTop: 8 }} onClick={() => setGlow((v) => !v)}>Hehku</button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <Efektit />
    </LangProvider>
  </StrictMode>,
);
