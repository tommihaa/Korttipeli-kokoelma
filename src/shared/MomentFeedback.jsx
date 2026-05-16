import { useState } from 'react';

/**
 * MomentFeedback — Välitön palaute-ikkuna erikoishetkistä
 * Näkyy automaattisesti kun spesiaalimomentti havaitaan
 */
export default function MomentFeedback({
  moment,
  onClose,
  onRate
}) {
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');

  if (!moment) return null;

  const rareties = [
    { id: 'common', label: 'Common', color: '#8b8b8b', bg: 'rgba(139, 139, 139, 0.1)' },
    { id: 'uncommon', label: 'Uncommon', color: '#3dd68d', bg: 'rgba(61, 214, 141, 0.1)' },
    { id: 'rare', label: 'Rare', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'epic', label: 'Epic', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' },
    { id: 'legendary', label: 'Legendary', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)' },
  ];

  const handleRate = (rarity) => {
    // Tallenna localStorageen
    const feedback = {
      momentType: moment.type,
      game: moment.game,
      rarity: rarity,
      comment,
      timestamp: new Date().toISOString(),
      context: moment.context,
    };

    const stored = JSON.parse(localStorage.getItem('_JAKO_MOMENTS_') || '[]');
    stored.push(feedback);
    localStorage.setItem('_JAKO_MOMENTS_', JSON.stringify(stored));

    // Callback (jos halutaan näyttää viesti pelissä)
    onRate?.(feedback);

    // Auto-sulkeminen 500ms viiveellä
    setTimeout(() => onClose?.(), 500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        backgroundColor: '#1f5a3f',
        border: '3px solid #c9a84c',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
      }}>
        {/* Header */}
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#c9a84c',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          ✨ Erikoismomentti havaittu!
        </div>

        {/* Moment description */}
        <div style={{
          fontSize: '14px',
          color: '#f0e6cc',
          marginBottom: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '12px',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            {moment.title}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {moment.description}
          </div>
        </div>

        {/* Rarity selection */}
        <div style={{
          marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#c9a84c',
            marginBottom: '12px',
          }}>
            Kuinka harvinainen tämä oli?
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
          }}>
            {rareties.map(rarity => (
              <button
                key={rarity.id}
                onClick={() => handleRate(rarity.id)}
                style={{
                  padding: '12px 8px',
                  backgroundColor: selected === rarity.id ? rarity.color : rarity.bg,
                  border: `2px solid ${rarity.color}`,
                  color: selected === rarity.id ? '#1f5a3f' : rarity.color,
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 250ms ease-out',
                  opacity: 1,
                  boxShadow: selected === rarity.id
                    ? `0 0 16px ${rarity.color}99, inset 0 0 12px ${rarity.color}44`
                    : 'none',
                  transform: selected === rarity.id ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                {rarity.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div style={{
          marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#c9a84c',
            marginBottom: '8px',
          }}>
            Kommentti (vapaaehtoinen)
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Esim. 'Vaikea tilanne, onnistui epätodennäköisesti'..."
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #c9a84c',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              color: '#f0e6cc',
              fontFamily: 'inherit',
              fontSize: '12px',
              minHeight: '60px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => onClose?.()}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(160, 174, 160, 0.3)',
              border: '2px solid #a8b8a0',
              color: '#a8b8a0',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 150ms',
            }}
          >
            Ohita
          </button>
        </div>

        {/* Dev info */}
        <div style={{
          fontSize: '10px',
          color: '#a8b8a0',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(168, 184, 160, 0.3)',
          fontFamily: 'monospace',
        }}>
          <div>🎮 {moment.game} | {moment.type}</div>
          <div>⏱️ {new Date(moment.timestamp).toLocaleTimeString('fi')}</div>
        </div>
      </div>
    </div>
  );
}
