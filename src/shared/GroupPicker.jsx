import { C } from './colors.js';
import { useT } from './i18n.jsx';
import { NAME_GROUPS } from './playerGroups.js';

// Aloitusnäytön vastustajaryhmän valitsin. Sama valinta kuin Asetukset → Pelaajat,
// mutta tuotu pelin pystytyksen yhteyteen ("ketkä pelaavat" yhdessä paikassa).
// value = playerGroup-avain, onChange(key) päivittää App-tilan → playerNames-propi
// virkistyy reaktiivisesti. Kompakti: napit kietoutuvat usealle riville pienellä näytöllä.
export default function GroupPicker({ value, onChange }) {
  const t = useT();
  if (!onChange) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', maxWidth: 360, width: '100%' }}>
      <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>
        {t('ui.start.opponents')}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {NAME_GROUPS.map(({ key, pool }) => {
          const active = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                padding: '6px 10px', borderRadius: 9, cursor: 'pointer',
                fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.2,
                background: active ? C.gold + '18' : 'transparent',
                border: `2px solid ${active ? C.gold : '#2a4a32'}`,
                color: active ? C.gold : C.dim, transition: 'all 0.2s',
              }}
            >
              {t('ui.settings.groups.' + key)}
              <div style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>{t('ui.settings.namesCount', { n: pool.length })}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
