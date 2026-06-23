import { C } from './colors.js';
import { useT } from './i18n.jsx';

// Pysyvä, näkyvä "Nyt sinun vuorosi — <toiminto>" -kehote pelinäkymän yläosaan.
// Kertoo aina (myös vapaassa tilassa, ei vain opetustilassa) että on ihmisen vuoro ja
// mikä on perustoiminto. Tapahtumaviestit (msg-laatikko) jatkavat tilanteen kertomista.
// show = ihmisen vuoro & peli odottaa hänen syötettään; action = lyhyt sääntötarkka ohje.
export default function TurnPrompt({ show, action }) {
  const t = useT();
  if (!show || !action) return null;
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        margin: '0 auto 8px', padding: '7px 14px', maxWidth: 420,
        border: `1px solid ${C.gold}66`, borderRadius: 10, background: `${C.gold}14`,
        fontFamily: 'sans-serif', fontSize: 13, color: C.gold, textAlign: 'center', lineHeight: 1.35,
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0 }}>👉</span>
      <span><strong style={{ fontWeight: 700 }}>{t('ui.turn.yours')}</strong> {action}</span>
    </div>
  );
}
