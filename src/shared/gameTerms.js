// Standardisoidut termit kaikille peleille
export const TERMS = {
  HAND_CARDS: 'käsikortit',      // omia kortteja, joista pelaaja valitsee
  TABLE_CARDS: 'pöytäkortit',    // pöydällä olevat kortit (näkyviä)
  DRAW_PILE: 'nostopakka',        // josta nostetaan uusia kortteja
  DISCARD_PILE: 'poistopakka',    // johon heitetään/vaihdetaan kortit
  PILE: 'pino',                   // järjestyksessä lyödyt käsikortit
  DECK: 'pakka',                  // koko korttipakka
  PILE_IN_CENTER: 'kasa',         // Paskahousu: keskellä oleva pelattava kasa
  TRUMP: 'valtti',                // valttimaa (esim. Moska)
};

// Standard message builder — käytetään mallin pohjana
export const buildMessages = () => ({
  yourTurn: (name) => `${name} vuoro`,
  playerTurn: (name) => `${name} miettii...`,

  // Korttien nosto ja vaihdot
  drawnCard: (card, lbl, source) => {
    const from = source === 'draw' ? 'nostopakasta' : 'poistopakasta';
    return `Nostit ${lbl} ${from}`;
  },
  swapped: (card, lbl) => `Vaihdoit — ${lbl} poistopakkaan`,
  discarded: (card, lbl) => `Heitit ${lbl} poistopakkaan`,

  // Pelitilan viestit
  gameStarting: 'Peli alkaa!',
  gameOver: 'Peli päättyi!',
  winner: (name) => `${name} voitti!`,

  // Yleiset viestit
  cardPlayed: (card, lbl) => `${lbl} pelattiin`,
  invalid: 'Korttia ei voi pelata',
  noMoves: 'Ei pelikelpoisia kortteja',
});
