export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const VAL   = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

export const isRed    = s => s === '♥' || s === '♦';
// Lyhentää nimen korttirivejä varten — estää pitkiä nimiä työntämästä kortteja ulos
export const truncName = (name, len = 8) => name && name.length > len ? name.slice(0, len) + '…' : (name || '');
export const lbl    = c => c ? `${c.r}${c.s}` : '—';
export const korttia = n => n === 1 ? '1 kortti' : `${n} korttia`;
export const kortin  = n => n === 1 ? '1 kortin' : `${n} korttia`;

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: VAL[r], id: `${r}${s}_${Math.random()}` }))));
}

// AI:n vaikeustaso: noise = todennäköisyys että AI valitsee satunnaisen sallitun
// siirron strategisen sijaan. Käytetään kaikissa peleissä yhtenäisesti.
//   beginner  — 50% virheitä, oppilaalle voitettavissa
//   normal    — 15% virheitä, ihmismäisiä möhläyksiä
//   hard      — 0% virheitä, täysi nykyinen strategia
export function aiNoise(aiLevel) {
  if (aiLevel === 'beginner') return 0.5;
  if (aiLevel === 'normal')   return 0.15;
  return 0;
}
export function aiShouldFumble(aiLevel) {
  return Math.random() < aiNoise(aiLevel);
}
