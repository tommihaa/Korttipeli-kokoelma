export const C = {
  bg: '#1f5a3f',
  gold: '#c9a84c',
  text: '#f0e6cc',
  dim: '#a8b8a0',
  dimAA: '#cdd8c4',          // saavutettava dim — läpäisee 4.5:1 12px-tekstinä bg:llä (#1f5a3f) ja korteilla (#2a6249); käytä pienissä labeleissa joissa C.dim putoaa kontrastista (Lighthouse a11y)
  red: '#e05c3b',
  blue: '#5ba8d4',
  panelBorder: '#2a4a32',
  card: '#f8f2e6',
  tikki: '#4caf7d',
  build: '#9b59b6',
  maija: '#8b1a1a',
  trump: '#4a8a30',
  botMode: '#c084fc',       // Bottien Taistelu / katselutila — pääväri
  botModeDim: '#9b6dc4',    // katselutila — himmeämpi (labelit, ei-voittajat)
  botModeDimmer: '#6b4a9a', // katselutila — himmein (sija-/pistemerkinnät)
};

import { loadPref } from './storage.js';

// Kaksi palettia: neliväri (oletus) ja perinteinen kaksiväri (♠♣ musta, ♥♦ punainen).
// SUIT_COLOR/SUIT_COLOR_DARK ovat mutatoituvia — setTwoColorDeck vaihtaa sisällön
// paikallaan, joten pelien suorat SUIT_COLOR[s]-luvut seuraavat asetusta ilman propseja
// (sama idea kuin i18n:n moduulitason tr()). Asetuksen vaihto App.jsx:ssä aiheuttaa
// joka tapauksessa re-renderin, joten näkymä päivittyy heti.
const FOUR_COLOR      = { '♠': '#1a1a1a', '♥': '#cc2222', '♦': '#ff8c42', '♣': '#4caf7d' };
const TWO_COLOR       = { '♠': '#1a1a1a', '♥': '#cc2222', '♦': '#cc2222', '♣': '#1a1a1a' };
// Tummalle taustalle (#1f5a3f) — vaaleiden korttipohjien värit uppoavat tummaan vihreään
const FOUR_COLOR_DARK = { '♠': '#c8c4d4', '♥': '#ff6666', '♦': '#ffb060', '♣': '#5de08a' };
const TWO_COLOR_DARK  = { '♠': '#c8c4d4', '♥': '#ff6666', '♦': '#ff6666', '♣': '#c8c4d4' };

export const SUIT_COLOR      = { ...FOUR_COLOR };
export const SUIT_COLOR_DARK = { ...FOUR_COLOR_DARK };

export function setTwoColorDeck(on) {
  Object.assign(SUIT_COLOR,      on ? TWO_COLOR      : FOUR_COLOR);
  Object.assign(SUIT_COLOR_DARK, on ? TWO_COLOR_DARK : FOUR_COLOR_DARK);
}

// Tallennettu preferenssi voimaan heti moduulin latautuessa (ennen ensimmäistä renderiä)
setTwoColorDeck(loadPref('twoColorDeck', false));

export const suitColor = s => SUIT_COLOR[s] || '#1a1a2e';
