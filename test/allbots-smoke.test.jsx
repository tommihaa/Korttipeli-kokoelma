// @vitest-environment jsdom
//
// allBots-savutesti: ajaa jokaisen pelin bottikamppailun (kaikki pelaajat botteja)
// alusta loppuun jsdomissa fake-timereilla ja tarkistaa invariantit. EI determinismiä
// (pelit käyttävät Math.randomia korttien id:ssä ja jitterissä) — ajetaan useampi
// toisto per peli ilman siementä.
//
// RAJOITE (kirjattu tietoisesti): onSnapshot-framet sisältävät vain näkyvät zonet
// (players[].hand/cardCount + tableCards). Nostopakka ja keskuspino EIVÄT näy
// frameissa, joten korttien kokonaismäärää 52 ei voi todentaa. Tarkistetaan se mikä
// näkyy: cardCount === hand.length, ei negatiivisia, ei sama kortti-id kahdessa
// näkyvässä kädessä yhtä aikaa, näkyvien summa ≤ 52.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, within } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';

import Paskahousu from '../src/games/Paskahousu.jsx';
import Koputus from '../src/games/Koputus.jsx';
import Kultakala from '../src/games/Kultakala.jsx';
import Lapsy from '../src/games/Lapsy.jsx';
import Maija from '../src/games/Maija.jsx';
import Moska from '../src/games/Moska.jsx';
import Seiska from '../src/games/Seiska.jsx';
import Ristiseiska from '../src/games/Ristiseiska.jsx';
import Kasino from '../src/games/Kasino.jsx';

// Kasino tarvitsee `game`-propin (ainoa peli joka lukee sitä); muut jättävät huomiotta.
const MINIMAL_GAME = { id: 'kasino', minPlayers: 2 };

// Kasinon bottikatselutila EI etene automaattisesti kierrosten välillä (tietoinen
// UX-valinta, ks. Kasino.jsx ~rivi 393: katsoja klikkaa "Seuraava peli →" itse; vain
// pelin loppu ≥16p siirtyy automaattisesti). Peli tarvitsee ≥2 kierrosta 16 pisteeseen,
// joten savutesti klikkaa kierrosnapin puolestaan. `betweenRound` = suomenkielinen
// nappilabel (kieli pakotettu fi:hin test/setup.js:ssä).
const GAMES = [
  ['Paskahousu', Paskahousu, null],
  ['Koputus', Koputus, null],
  ['Kultakala', Kultakala, null],
  ['Lapsy', Lapsy, null],
  ['Maija', Maija, null],
  ['Moska', Moska, null],
  ['Seiska', Seiska, null],
  ['Ristiseiska', Ristiseiska, null],
  ['Kasino', Kasino, /Seuraava peli/i],
];

// Web Audio ei ole jsdomissa; äänet ovat pois (soundOn=false), mutta varmistetaan
// ettei mahdollinen actx()-kutsu kaada testiä.
beforeEach(() => {
  globalThis.AudioContext = class {
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    resume() {}
  };
  globalThis.webkitAudioContext = globalThis.AudioContext;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** Aja yksi bottikamppailu loppuun. Palauttaa { result, frames }. Heittää jos ei pääty.
 *  betweenRound = valinnainen regex nappiin jota klikataan kesken ajon (Kasino). */
async function runBotBattle(Component, betweenRound = null) {
  const frames = [];
  let result = null;
  const props = {
    game: MINIMAL_GAME,
    onResult: (r) => { result = r; },
    onSnapshot: (f) => { frames.push(f); },
    soundOn: false,
    seeAll: false,
    showCounts: true,
    showLastPlay: true,
    showIntention: false,
    isMobile: false,
    playerCount: 4,
    aiLevel: 'normal',
    onAiLevelChange: () => {},
  };

  let utils;
  await act(async () => {
    utils = render(<LangProvider><Component {...props} /></LangProvider>);
  });

  // Käynnistä bottikamppailu aloitusnäytön napista. Nappi tunnistetaan kieli-
  // riippumattomasti 🔮-emojista (jaettu ui.start.botBattle, sama kaikissa peleissä);
  // jsdomin navigator.language voi olla mikä tahansa, joten tekstiin ei voi sitoutua.
  const btn = utils.getByRole('button', { name: /🔮/ });
  await act(async () => { fireEvent.click(btn); });

  // Aja fake-timereita kunnes onResult laukeaa tai iteraatiovahti pysäyttää.
  const STEP_MS = 2600; // AI-viive allBots-tilassa ~2000ms + jitter
  const GUARD = 6000;
  for (let i = 0; i < GUARD && result === null; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(STEP_MS); });
    // Kierrosten välinen manuaalinen eteneminen (vain Kasino): klikkaa jos näkyvissä.
    if (betweenRound) {
      const btns = utils.queryAllByRole('button', { name: betweenRound });
      if (btns.length > 0) {
        await act(async () => { fireEvent.click(btns[0]); });
      }
    }
  }
  if (result === null) throw new Error('Bottikamppailu ei päättynyt vahdin sisällä');
  return { result, frames };
}

function checkFrameInvariants(frames, label) {
  for (const f of frames) {
    if (!Array.isArray(f.players)) continue;
    const idsThisFrame = new Set();
    let visibleTotal = 0;
    for (const p of f.players) {
      if (Array.isArray(p.hand)) {
        // cardCount vastaa käden pituutta.
        if (typeof p.cardCount === 'number') {
          expect(p.cardCount, `${label}: cardCount≠hand.length`).toBe(p.hand.length);
        }
        visibleTotal += p.hand.length;
        for (const c of p.hand) {
          if (c && c.id != null) {
            expect(idsThisFrame.has(c.id), `${label}: sama kortti kahdessa kädessä (${c.id})`).toBe(false);
            idsThisFrame.add(c.id);
          }
        }
      }
      if (typeof p.cardCount === 'number') {
        expect(p.cardCount, `${label}: negatiivinen cardCount`).toBeGreaterThanOrEqual(0);
      }
    }
    if (Array.isArray(f.tableCards)) visibleTotal += f.tableCards.length;
    expect(visibleTotal, `${label}: näkyviä kortteja > 52`).toBeLessThanOrEqual(52);
  }
}

function checkResultInvariants(result, label) {
  expect(result, `${label}: onResult ei antanut tulosta`).toBeTruthy();
  expect(Array.isArray(result.ranking), `${label}: ranking ei ole taulukko`).toBe(true);
  expect(result.ranking.length, `${label}: tyhjä ranking`).toBeGreaterThanOrEqual(2);
  // Sijoitukset: jokainen 1..n välillä ja voittaja (place 1) löytyy. Tasapelit
  // sallitaan (esim. Kasino/Koputus voivat tuottaa jaetun sijan), joten ei vaadita
  // aukotonta 1..n-permutaatiota.
  const n = result.ranking.length;
  const places = result.ranking.map((r) => r.place);
  for (const pl of places) {
    expect(Number.isInteger(pl), `${label}: sijoitus ei ole kokonaisluku (${pl})`).toBe(true);
    expect(pl, `${label}: sijoitus ${pl} ei ole välillä 1..${n}`).toBeGreaterThanOrEqual(1);
    expect(pl, `${label}: sijoitus ${pl} ei ole välillä 1..${n}`).toBeLessThanOrEqual(n);
  }
  expect(places, `${label}: ei voittajaa (place 1)`).toContain(1);
}

describe('allBots-savutesti — bottikamppailu päättyy ja invariantit pitävät', () => {
  const REPEATS = 3;
  for (const [name, Component, betweenRound] of GAMES) {
    // Kasino ajaa useita kierroksia per peli → raskaampi, isompi aikaraja.
    const timeout = name === 'Kasino' ? 60_000 : 20_000;
    it(`${name}: ${REPEATS} bottikamppailua loppuun ilman poikkeuksia`, async () => {
      for (let r = 0; r < REPEATS; r++) {
        const label = `${name}#${r}`;
        const { result, frames } = await runBotBattle(Component, betweenRound);
        checkResultInvariants(result, label);
        checkFrameInvariants(frames, label);
        cleanup();
      }
    }, timeout);
  }
});
