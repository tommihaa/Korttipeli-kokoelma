import { C } from './colors.js';
import { useT } from './i18n.jsx';

export default function HandoffScreen({ playerName, onReady }) {
  const t = useT();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, padding: 24,
      fontFamily: 'Georgia,serif',
    }}>
      <div style={{ fontSize: 64, userSelect: 'none' }}>🃏</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 28, color: C.gold,
          letterSpacing: 4, marginBottom: 10,
          fontWeight: 700,
        }}>
          {playerName}
        </div>
        <div style={{
          fontSize: 15, color: '#8aaa90',
          fontFamily: 'sans-serif', letterSpacing: 1,
        }}>
          {t('ui.shared.yourTurn')}
        </div>
      </div>
      <button
        onClick={onReady}
        style={{
          background: `linear-gradient(135deg,#c9a84c,#a07830)`,
          border: 'none', borderRadius: 14,
          padding: '14px 44px',
          color: '#0d2118', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Georgia,serif',
          letterSpacing: 2, marginTop: 8,
        }}
      >
        {t('ui.shared.startTurn')}
      </button>
    </div>
  );
}
