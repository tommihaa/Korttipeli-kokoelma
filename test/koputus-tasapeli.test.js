// Koputuksen sijoitusavain (KOPUTUS.md › Pelin loppu): pienin pistesumma voittaa,
// ja tasatilanteessa vähempi kortteja omannut voittaa. Toissijainen avain puuttui
// koodista 18.8.2026 asti (docs/PELIKANONIT.md löydös 2), joten tämä testi on
// olemassa kiinnittämään sen. pRank on exportattu sauman takia: ilman sitä ainoa
// tapa testata sääntöä olisi pelata peli loppuun jsdomissa.
import { describe, it, expect } from 'vitest';
import { pRank } from '../src/games/Koputus.jsx';

// Pelaajan kortit ovat {v}-olioita tai null (tyhjä paikka).
const pelaaja = (...arvot) => ({ cards: arvot.map(v => (v === null ? null : { v })) });

describe('Koputus: sijoitusavain pRank', () => {
  it('pienempi pistesumma voittaa', () => {
    const a = pelaaja(2, 3);      // 5 pistettä
    const b = pelaaja(10, 10);    // 20 pistettä
    expect(pRank(a, b)).toBeLessThan(0);
    expect(pRank(b, a)).toBeGreaterThan(0);
  });

  it('tasapisteillä vähemmän kortteja omannut voittaa', () => {
    const a = pelaaja(5, 5);      // 10 pistettä, 2 korttia
    const b = pelaaja(10);        // 10 pistettä, 1 kortti
    expect(pRank(b, a)).toBeLessThan(0);
    expect(pRank(a, b)).toBeGreaterThan(0);
  });

  it('null-paikka ei ole kortti eikä pistettä', () => {
    const a = pelaaja(5, 5, null); // 10 pistettä, 2 korttia
    const b = pelaaja(4, 6);       // 10 pistettä, 2 korttia
    expect(pRank(a, b)).toBe(0);
  });
});
