export const C = {
  bg: '#1f5a3f',
  gold: '#c9a84c',
  text: '#f0e6cc',
  dim: '#a8b8a0',
  red: '#e05c3b',
  blue: '#5ba8d4',
  panelBorder: '#2a4a32',
  card: '#f8f2e6',
  tikki: '#4caf7d',
  build: '#9b59b6',
  maija: '#8b1a1a',
  trump: '#4a8a30',
};

export const SUIT_COLOR = {
  '♠': '#1a1a1a',
  '♥': '#cc2222',
  '♦': '#ff8c42',
  '♣': '#4caf7d',
};

// Tummalle taustalle (#1f5a3f) — SUIT_COLOR:n värit uppoavat tummaan vihreään
export const SUIT_COLOR_DARK = {
  '♠': '#c8c4d4',
  '♥': '#ff6666',
  '♦': '#ffb060',
  '♣': '#5de08a',
};

export const suitColor = s => SUIT_COLOR[s] || '#1a1a2e';
