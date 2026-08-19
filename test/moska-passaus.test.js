// Moskan siirtämisen (passaamisen) ehdot (MOSKA.md › Siirtämisen ehdot): kuusi
// ehtoa, samat ihmiselle ja boteille. Ennen 18.8.2026 ehdot oli kirjoitettu
// kolmesti eivätkä versiot vastanneet toisiaan (docs/PELIKANONIT.md löydös 5);
// yhtenäistetty moskaCanPassiin, ja tämä testi kiinnittää jokaisen ehdon erikseen.
// moskaCanPass on exportattu sauman takia: ilman sitä laillisuussääntöä ei voisi
// testata pelaamatta peliä läpi jsdomissa.
import { describe, it, expect } from 'vitest';
import { moskaCanPass } from '../src/games/Moska.jsx';

const kortti = (r, s) => ({ r, s, v: Number(r) || 0 });

// Lähtötila jossa kaikki kuusi ehtoa täyttyvät: 0 on päähyökkääjä, 1 puolustaja
// jolla on samaa vahvuutta kädessä, 2 on vapaa vastaanottajaksi.
function tila() {
  return {
    defender: 1,
    primaryAtk: 0,
    attackers: [0],
    passChain: [],
    table: [{ atk: kortti('6', '♣') }],
    players: [
      { hand: [], rank: null },
      { hand: [kortti('6', '♦')], rank: null },
      { hand: [], rank: null },
      { hand: [], rank: null },
    ],
  };
}

describe('Moska: moskaCanPass, kuusi ehtoa', () => {
  it('kaikkien ehtojen täyttyessä saa siirtää', () => {
    expect(moskaCanPass(tila(), 1)).toBe(true);
  });

  it('vain puolustaja voi siirtää', () => {
    expect(moskaCanPass(tila(), 0)).toBe(false);
  });

  it('ehto 1: kaadettu kortti estää siirron', () => {
    const g = tila();
    g.table[0].def = kortti('7', '♣');
    expect(moskaCanPass(g, 1)).toBe(false);
  });

  it('ehto 2: kaksi eri vahvuutta pöydässä estää siirron', () => {
    const g = tila();
    g.table.push({ atk: kortti('7', '♥') });
    expect(moskaCanPass(g, 1)).toBe(false);
  });

  it('ehto 3: ilman samaa vahvuutta kädessä ei voi siirtää', () => {
    const g = tila();
    g.players[1].hand = [kortti('9', '♦')];
    expect(moskaCanPass(g, 1)).toBe(false);
  });

  it('ehto 4: sama pelaaja ei siirrä kahdesti', () => {
    const g = tila();
    g.passChain = [1];
    expect(moskaCanPass(g, 1)).toBe(false);
  });

  it('ehto 5: kahdella aktiivisella ei siirretä', () => {
    const g = tila();
    g.players[2].rank = 1;
    g.players[3].rank = 2;
    expect(moskaCanPass(g, 1)).toBe(false);
  });

  it('ehto 6: siirto estyy jos vastaanottajaa ei löydy', () => {
    const g = tila();
    // Ainoat ehdokkaat 2 ja 3 ovat jo siirtäneet, eikä päähyökkääjä 0 kelpaa.
    g.passChain = [2, 3];
    expect(moskaCanPass(g, 1)).toBe(false);
  });
});
