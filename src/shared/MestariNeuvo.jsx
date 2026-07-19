import { C } from './colors.js';
import { useT } from './i18n.jsx';

// Kysy Mestarilta neuvoa: pillinappi + vastauskupla. Neuvo lasketaan pelikohtaisella
// puhtaalla getAdvice-funktiolla (aina 'hard'-taso, vain julkista tietoa — botit eivät
// kurki, joten sama logiikka toimii reilusti Heron näkökulmasta). Violetti = Mestarin väri.

export function AdviceButton({ onClick }) {
  const t = useT();
  return (
    <button onClick={onClick}
      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${C.botMode}66`,
        background: 'transparent', color: C.botMode, cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0 }}>
      🧙 {t('ui.advice.ask')}
    </button>
  );
}

export function AdviceBubble({ text, onDismiss }) {
  const t = useT();
  if (!text) return null;
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        margin: '0 auto 8px', padding: '7px 14px', maxWidth: 420,
        border: `1px solid ${C.botMode}66`, borderRadius: 10, background: `${C.botMode}14`,
        fontFamily: 'sans-serif', fontSize: 13, color: C.botMode, textAlign: 'center', lineHeight: 1.35,
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0 }}>🧙</span>
      <span><strong style={{ fontWeight: 700 }}>{t('ui.advice.from')}</strong> {text}</span>
      <button onClick={onDismiss} aria-label={t('ui.info.close')}
        style={{ background: 'transparent', border: 'none', color: C.botMode, cursor: 'pointer',
          fontSize: 13, padding: '0 2px', flexShrink: 0, fontFamily: 'sans-serif' }}>
        ✕
      </button>
    </div>
  );
}
