import { useState, useEffect } from 'react';
import { C } from './shared/colors.js';

/**
 * Admin Dashboard — näyttää kaikki kerätyt Epic/Legendary momentit
 */
export default function Admin() {
  const [moments, setMoments] = useState([]);
  const [filterGame, setFilterGame] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');

  // Haetaan momentit localStoragesta (pelit tallentavat sinne)
  useEffect(() => {
    const stored = localStorage.getItem('_JAKO_MOMENTS_') || '[]';
    try {
      setMoments(JSON.parse(stored));
    } catch {
      setMoments([]);
    }
  }, []);

  // Suodata
  const filtered = moments.filter(m => {
    if (filterGame !== 'all' && m.game !== filterGame) return false;
    if (filterRarity !== 'all' && m.rarity !== filterRarity) return false;
    return true;
  });

  const games = [...new Set(moments.map(m => m.game))];
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  const rarityColor = r => ({
    common: '#8b8b8b',
    uncommon: '#3dd68d',
    rare: '#3b82f6',
    epic: '#a78bfa',
    legendary: '#FF9500',
  }[r] || '#c9a84c');

  const rarityLabel = r => ({
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  }[r] || r);

  const momentTypeLabel = t => ({
    defense_success: 'Onnistunut puolustus',
    difficult_defense: 'Vaikea puolustus',
    legendary_defense: 'Legendaarinen puolustus',
    epic_knock: 'Koputus',
    legendary_reaction: 'Viimeinen reaktio',
    epic_score: 'Kasino',
    epic_fast_slap: 'Salamannopea reaktio',
    epic_high_value_swap: 'Muisti loistaa',
    epic_defense_win: 'Vahva puolustus',
  }[t] || t);

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Georgia,serif',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        marginBottom: 30,
      }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 'bold',
          color: C.gold,
          margin: '0 0 10px 0',
        }}>
          ✨ Momentit — Admin Dashboard
        </h1>
        <p style={{ color: C.dim, margin: 0 }}>
          {moments.length} momenttia kerätty | {filtered.length} näkyvissä
        </p>
      </div>

      {/* Suodattimet */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        marginBottom: 20,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {/* Peli-suodatin */}
        <div>
          <label style={{ color: C.gold, fontSize: 12, fontWeight: 'bold' }}>
            PELI
          </label>
          <select
            value={filterGame}
            onChange={e => setFilterGame(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${C.panelBorder}`,
              color: C.text,
              padding: '8px 12px',
              borderRadius: 6,
              fontFamily: 'inherit',
              fontSize: 12,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            <option value="all">Kaikki ({games.length})</option>
            {games.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Rarity-suodatin - värilliset painikkeet */}
        <div>
          <label style={{ color: C.gold, fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}>
            RARITY
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterRarity('all')}
              style={{
                padding: '6px 12px',
                background: filterRarity === 'all' ? 'rgba(201,168,76,0.4)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${filterRarity === 'all' ? C.gold : C.panelBorder}`,
                color: filterRarity === 'all' ? C.gold : C.dim,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              Kaikki
            </button>
            {rarities.map(r => (
              <button
                key={r}
                onClick={() => setFilterRarity(r)}
                style={{
                  padding: '6px 12px',
                  background: filterRarity === r ? `${rarityColor(r)}33` : `${rarityColor(r)}11`,
                  border: `1px solid ${filterRarity === r ? rarityColor(r) : rarityColor(r) + '44'}`,
                  color: filterRarity === r ? rarityColor(r) : rarityColor(r) + '99',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  textTransform: 'capitalize',
                }}
              >
                {rarityLabel(r)}
              </button>
            ))}
          </div>
        </div>

        {/* Clear button */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => {
              if (window.confirm('Poista kaikki momentit?')) {
                localStorage.removeItem('_JAKO_MOMENTS_');
                setMoments([]);
              }
            }}
            style={{
              background: 'rgba(224, 92, 59, 0.2)',
              border: `1px solid ${C.red}`,
              color: C.red,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: 20,
            }}
          >
            🗑 Tyhjennä
          </button>
        </div>
      </div>

      {/* Taulukko */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        overflowX: 'auto',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: C.dim,
          }}>
            Ei momentteja suodattimen mukaan.
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.panelBorder}` }}>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 8px',
                  color: C.gold,
                  fontWeight: 'bold',
                  fontSize: 11,
                }}>
                  🎮 PELI
                </th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 8px',
                  color: C.gold,
                  fontWeight: 'bold',
                  fontSize: 11,
                }}>
                  ⏱️ AIKA
                </th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 8px',
                  color: C.gold,
                  fontWeight: 'bold',
                  fontSize: 11,
                }}>
                  📝 TYYPPI
                </th>
                <th style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  color: C.gold,
                  fontWeight: 'bold',
                  fontSize: 11,
                }}>
                  ✨ RARITY
                </th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 8px',
                  color: C.gold,
                  fontWeight: 'bold',
                  fontSize: 11,
                }}>
                  💬 KOMMENTTI
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: `1px solid ${C.panelBorder}44`,
                    background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 8px' }}>
                    <strong>{m.game}</strong>
                  </td>
                  <td style={{ padding: '10px 8px', color: C.dim, fontSize: 12 }}>
                    {new Date(m.timestamp).toLocaleString('fi')}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>
                    {momentTypeLabel(m.momentType)}
                  </td>
                  <td style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                  }}>
                    <span style={{
                      background: `${rarityColor(m.rarity)}22`,
                      border: `1.5px solid ${rarityColor(m.rarity)}`,
                      color: rarityColor(m.rarity),
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 'bold',
                      display: 'inline-block',
                      textTransform: 'capitalize',
                    }}>
                      {rarityLabel(m.rarity)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: C.dim, fontSize: 12 }}>
                    {m.comment || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: 1200,
        margin: '40px auto 0',
        padding: '20px 0',
        borderTop: `1px solid ${C.panelBorder}`,
        color: C.dim,
        fontSize: 12,
        textAlign: 'center',
      }}>
        📊 Kerätty data pelianalysiin | Päivittyy reaaliajassa
      </div>
    </div>
  );
}
