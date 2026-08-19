// Kasinon kierroksen pistelasku (KASINO.md › Pisteet, vakiosäännöt linjattu
// 18.8.2026): eniten kortteja 3, eniten patoja 1, ♦10 = 2, ♠2 = 1, jokainen ässä 1,
// yhteensä 11 per kierros; enemmistöpisteet jäävät tasapelissä jakamatta, ja
// tikkipisteet saa vain jos jollakulla toisella on tikkejä vähemmän
// (docs/PELIKANONIT.md löydös 9). scoreRound on nostettu komponentista moduulitasolle
// ja exportattu sauman takia: ilman sitä pistetaulukkoa ei voisi testata pelaamatta
// kierrosta läpi jsdomissa.
import { describe, it, expect } from 'vitest';
import { scoreRound } from '../src/games/Kasino.jsx';

const kortti = (r, s) => ({ r, s });
const pelaaja = (captured, tikkiCount = 0) => ({ captured, tikkiCount });

// Roskakortteja jotka eivät osu erikoiskortteihin (ei A, ei ♦10, ei ♠2).
const roskat = (n, s = '♣') =>
  Array.from({ length: n }, (_, i) => kortti(String(3 + (i % 6)), s));

describe('Kasino: scoreRound, vakiosääntöjen pistetaulukko', () => {
  it('kierroksesta jaetaan 11 pistettä kun enemmistöt eivät mene tasan', () => {
    // p0: eniten kortteja (8), eniten patoja (4), ♦10, ♠2 ja kaikki neljä ässää.
    const p0 = pelaaja([
      kortti('10', '♦'), kortti('2', '♠'),
      kortti('A', '♣'), kortti('A', '♦'), kortti('A', '♥'), kortti('A', '♠'),
      kortti('5', '♠'), kortti('6', '♠'),
    ]);
    const p1 = pelaaja(roskat(2));
    const [r0, r1] = scoreRound({ players: [p0, p1] });
    expect(r0.roundPts).toBe(11); // 3 + 1 + 2 + 1 + 4
    expect(r1.roundPts).toBe(0);
  });

  it('korttienemmistö on 3 pistettä ja patojen enemmistö 1', () => {
    const p0 = pelaaja(roskat(3, '♣'));                    // eniten kortteja, ei patoja
    const p1 = pelaaja([kortti('5', '♠'), kortti('6', '♥')]); // vähemmän kortteja, eniten patoja
    const [r0, r1] = scoreRound({ players: [p0, p1] });
    expect(r0.roundPts).toBe(3);
    expect(r1.roundPts).toBe(1);
  });

  it('tasaenemmistössä pisteet jäävät jakamatta', () => {
    const p0 = pelaaja([kortti('5', '♠'), kortti('6', '♥')]);
    const p1 = pelaaja([kortti('7', '♠'), kortti('8', '♥')]);
    const [r0, r1] = scoreRound({ players: [p0, p1] });
    expect(r0.roundPts).toBe(0);
    expect(r1.roundPts).toBe(0);
    expect(r0.isInCardsTie).toBe(true);
    expect(r0.isInSpadesTie).toBe(true);
  });

  it('tikkipisteet saa vain jos jollakulla toisella on tikkejä vähemmän', () => {
    const p0 = pelaaja(roskat(3), 2);
    const p1 = pelaaja(roskat(2), 1);
    const [r0, r1] = scoreRound({ players: [p0, p1] });
    expect(r0.tikkiPts).toBe(2); // p1:llä vähemmän → p0 saa tikkinsä
    expect(r1.tikkiPts).toBe(0); // kenelläkään ei vähemmän kuin 1
  });

  it('tasatikeillä kukaan ei saa tikkipisteitä', () => {
    const p0 = pelaaja(roskat(3), 2);
    const p1 = pelaaja(roskat(2), 2);
    const [r0, r1] = scoreRound({ players: [p0, p1] });
    expect(r0.tikkiPts).toBe(0);
    expect(r1.tikkiPts).toBe(0);
  });
});
