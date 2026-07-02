// FanStack — viuhkamainen pinon visuaali
// Näyttää 1–3 korttia päällekkäin pienellä kierrolla, jolloin pino näyttää paksulta.
//
// Props:
//   count      — pinossa olevien korttien määrä (number)
//   w, h       — kortin leveys ja korkeus pikseleinä
//   backStyle  — BACKS-objekti { bg, border, render }
//   borderColor — reunaväri päällimmäiselle kortille (optional, default = backStyle.border)
//   topCard    — JSX joka renderöidään päällimmäisen kortin sisälle (optional)
//   onClick    — klikkikäsittelijä (optional)
//   empty      — jos true, näytetään tyhjä paikka (optional)
//   glowColor  — CSS-väri hehkulle (optional)

export default function FanStack({ count, w, h, backStyle, borderColor, topCard, onClick, empty, glowColor }) {
  const br = Math.round(w * 0.1);
  const bc = borderColor || backStyle?.border || '#2a4a32';

  if (empty || !count) return (
    <div style={{
      width: w, height: h, borderRadius: br, flexShrink: 0,
      border: '1.5px dashed #1a3a22', opacity: 0.3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} />
  );

  // Määritä montako ghost-korttia näytetään
  const ghosts = count >= 3 ? 2 : count >= 2 ? 1 : 0;

  const ghostStyles = [
    { rotate: '-5deg', tx: '-4px', ty: '3px', opacity: 0.55 },
    { rotate: '-2.5deg', tx: '-2px', ty: '1.5px', opacity: 0.75 },
  ];

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', width: w, height: h, flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Ghost-kortit taustalle */}
      {ghostStyles.slice(0, ghosts).map((gs, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, left: 0, width: w, height: h,
          borderRadius: br, overflow: 'hidden',
          background: backStyle?.bg || '#0d2810',
          border: `1px solid ${bc}`,
          transform: `rotate(${gs.rotate}) translate(${gs.tx}, ${gs.ty})`,
          transformOrigin: 'bottom center',
          opacity: gs.opacity,
          zIndex: i,
        }}>
          {backStyle?.render(w, h)}
        </div>
      ))}

      {/* Päällimmäinen kortti */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: w, height: h,
        borderRadius: br, overflow: 'hidden',
        background: topCard ? '#f8f2e6' : (backStyle?.bg || '#0d2810'),
        border: `2px solid ${bc}`,
        boxShadow: glowColor
          ? `0 0 14px ${glowColor}88, 0 2px 8px rgba(0,0,0,0.35)`
          : '0 2px 8px rgba(0,0,0,0.35)',
        zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.2s',
      }}>
        {topCard || (backStyle && backStyle.render(w, h))}
      </div>
    </div>
  );
}
