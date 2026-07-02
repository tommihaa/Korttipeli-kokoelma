export const BACKS = {
  ilves: {
    label: 'Ilves',
    bg: '#0d2810',
    border: '#2a5a20',
    render: (w, h) => (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 5 }}>
        <rect width={w} height={h} fill="#0d2810" />
        <rect x="2" y="2" width={w - 4} height={h - 4} fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.6" rx="3" />
        <rect x="4" y="4" width={w - 8} height={h - 8} fill="none" stroke="#2a5a20" strokeWidth="0.4" rx="2" />
        <ellipse cx={w / 2} cy={h / 2} rx={w * 0.28} ry={h * 0.2} fill="none" stroke="#4a8a30" strokeWidth="0.8" opacity="0.7" />
        <ellipse cx={w / 2} cy={h / 2} rx={w * 0.16} ry={h * 0.11} fill="#1a4018" stroke="#c9a84c" strokeWidth="0.7" opacity="0.8" />
        {[[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2" fill="#c9a84c" opacity="0.45" />
        ))}
        <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize="11" fill="#4a8a30" opacity="0.6" fontFamily="Georgia">⊕</text>
      </svg>
    ),
  },
  karhu: {
    label: 'Karhu',
    bg: '#3a1e08',
    border: '#6a3a12',
    render: (w, h) => (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 5 }}>
        <rect width={w} height={h} fill="#3a1e08" />
        <rect x="2" y="2" width={w - 4} height={h - 4} fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.5" rx="3" />
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.26} fill="#2a1206" stroke="#8a5020" strokeWidth="1" opacity="0.9" />
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.15} fill="#3a1e08" stroke="#c9a84c" strokeWidth="0.7" opacity="0.7" />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], i) => (
          <ellipse key={i} cx={w / 2 + dx * w * 0.3} cy={h / 2 + dy * h * 0.22} rx="2.5" ry="2" fill="#8a5020" opacity="0.4" />
        ))}
        <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize="11" fill="#8a5020" opacity="0.7" fontFamily="Georgia">❧</text>
      </svg>
    ),
  },
  korppi: {
    label: 'Korppi',
    bg: '#0a0a18',
    border: '#1a1a35',
    render: (w, h) => (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 5 }}>
        <rect width={w} height={h} fill="#0a0a18" />
        <rect x="2" y="2" width={w - 4} height={h - 4} fill="none" stroke="#4a4a8a" strokeWidth="0.8" opacity="0.7" rx="3" />
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.28} fill="none" stroke="#2a2a6a" strokeWidth="0.7" opacity="0.6" />
        <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize="13" fill="#4a4a9a" opacity="0.7" fontFamily="Georgia">ᚷ</text>
        {[[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]].map(([cx, cy], i) => (
          <text key={i} x={cx} y={cy + 3} textAnchor="middle" fontSize="7" fill="#3a3a7a" opacity="0.5" fontFamily="Georgia">✦</text>
        ))}
      </svg>
    ),
  },
};
