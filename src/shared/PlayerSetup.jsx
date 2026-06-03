import { C } from './colors.js';
import { useT } from './i18n.jsx';

export default function PlayerSetup({ slots, onChange, playerNames = [], maxHumans = 1 }) {
  const t = useT();
  function toggle(i, field) {
    const next = slots.map((s, idx) => idx === i ? { ...s, [field]: !s[field] } : s);
    onChange(next);
  }

  function setName(i, name) {
    const next = slots.map((s, idx) => idx === i ? { ...s, name } : s);
    onChange(next);
  }

  function setHuman(i, isHuman) {
    const next = slots.map((s, idx) => {
      if (idx !== i) return s;
      return { ...s, isHuman, name: isHuman ? s.name : '' };
    });
    onChange(next);
  }

  const activeCount = slots.filter(s => s.active).length;

  // Laske bottinimi näyttöä varten (ei sekoiteta — vain esikatselu)
  let botPreviewIdx = 0;
  const slotsWithPreview = slots.map(slot => ({
    ...slot,
    previewName: !slot.isHuman && playerNames.length > 0
      ? playerNames[botPreviewIdx++ % playerNames.length]
      : null,
  }));

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {slotsWithPreview.map((slot, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          opacity: slot.active ? 1 : 0.38,
          transition: 'opacity 0.2s',
        }}>
          {/* Checkbox — onko mukana */}
          <button
            onClick={() => {
              if (slot.active && activeCount <= 2) return;
              toggle(i, 'active');
            }}
            title={slot.active ? t('ui.setup.remove') : t('ui.setup.add')}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: slot.active ? C.gold : 'rgba(255,255,255,0.06)',
              border: `2px solid ${slot.active ? C.gold : 'rgba(255,255,255,0.18)'}`,
              color: slot.active ? '#0d2118' : 'rgba(255,255,255,0.3)',
              fontSize: 16, fontWeight: 900, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {slot.active ? '✓' : ''}
          </button>

          {/* Ihminen / Botti toggle — näytetään vain jos pelaaja voi olla ihminen */}
          {i < maxHumans ? (
            <div style={{
              display: 'flex', borderRadius: 8, overflow: 'hidden',
              border: `1.5px solid rgba(255,255,255,0.13)`,
              flexShrink: 0,
              pointerEvents: slot.active ? 'auto' : 'none',
            }}>
              {[t('ui.setup.human'), t('ui.setup.bot')].map((label, j) => {
                const isSelected = j === 0 ? slot.isHuman : !slot.isHuman;
                return (
                  <button
                    key={label}
                    onClick={() => setHuman(i, j === 0)}
                    style={{
                      padding: '6px 13px',
                      fontSize: 13, fontFamily: 'sans-serif',
                      background: isSelected ? 'rgba(201,168,76,0.22)' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? C.gold : 'rgba(255,255,255,0.45)',
                      border: 'none', cursor: 'pointer',
                      fontWeight: isSelected ? 700 : 400,
                      borderRight: j === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '6px 13px', borderRadius: 8, flexShrink: 0,
              border: `1.5px solid rgba(255,255,255,0.08)`,
              background: 'rgba(201,168,76,0.08)',
              color: 'rgba(201,168,76,0.5)', fontSize: 13, fontFamily: 'sans-serif',
            }}>
              {t('ui.setup.bot')}
            </div>
          )}

          {/* Nimi tai autonimi */}
          {slot.isHuman ? (
            <input
              type="text"
              value={slot.name}
              maxLength={16}
              placeholder={t('ui.setup.playerN', { n: i + 1 })}
              onChange={e => setName(i, e.target.value)}
              disabled={!slot.active}
              style={{
                flex: 1, padding: '7px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: `1.5px solid rgba(255,255,255,0.14)`,
                borderRadius: 8, color: '#e8dcc8',
                fontSize: 14, fontFamily: 'Georgia,serif',
                minWidth: 0,
              }}
            />
          ) : (
            <div style={{
              flex: 1, padding: '7px 12px',
              color: 'rgba(255,255,255,0.32)',
              fontSize: 13, fontFamily: 'sans-serif',
              fontStyle: 'italic',
            }}>
              {slot.active ? (slot.previewName || t('ui.setup.botN', { n: i + 1 })) : '—'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Muodosta pelaajarakenne PlayerSetup-sloteista.
 *  playerNames: App.jsx:n valitsema nimipoolilasta (sekoitetaan satunnaisesti). */
export function slotsToPlayers(slots, playerNames = []) {
  const pool = [...playerNames];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let botIdx = 0;
  return slots
    .filter(s => s.active)
    .map((s, i) => ({
      name: s.isHuman
        ? (s.name.trim() || `Pelaaja ${i + 1}`)
        : (pool[botIdx++ % Math.max(pool.length, 1)] || `Botti ${i + 1}`),
      isHuman: s.isHuman,
    }));
}
