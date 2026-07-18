// @vitest-environment jsdom
//
// Botbench — bottien voimamittari: pelaa tasoa A vastaan taso B (istuimet vuorotellen
// ABAB / BABA) N peliä per peli ja tulostaa voittoprosentit + keskisijoitukset.
// Perustuu allbots-smoke.test.jsx:n headless-ajoon; vaatii pelien botLevels-propin
// (istuinkohtainen AI-taso).
//
// EI aja osana `npm test` -ajoa: suite skipataan ilman BOTBENCH-ympäristömuuttujaa.
// Ajo (PowerShell):
//   $env:BOTBENCH='1'; npx vitest run test/botbench.test.jsx; Remove-Item Env:BOTBENCH
// Valinnaiset:
//   BOTBENCH_N      pelejä per pari (oletus 20)
//   BOTBENCH_PAIRS  esim. 'hard:beginner,hard:normal' (oletus kaikki kolme paria)
//   BOTBENCH_GAMES  esim. 'Moska,Kasino' (oletus kaikki 9)
//   BOTBENCH_OUT    polku johon tulosrivit appendataan JSON-riveinä (valinnainen)
//
// Determinismi: Math.random korvataan siemennetyllä PRNG:llä per peliajokerta
// (siemen = peli+pari+ajoindeksi), joten sama konfiguraatio tuottaa samat pelit.
// Istumaharha: aloittaja/istumajärjestys vaihtelee arrangementin parillisuudella.

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { appendFileSync } from 'node:fs';
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

const MINIMAL_GAME = { id: 'kasino', minPlayers: 2 };

// [nimi, komponentti, kierrosten välinen nappi (vain Kasino, ks. smoke-testi)]
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

const RUN   = !!process.env.BOTBENCH;
const N     = parseInt(process.env.BOTBENCH_N || '20', 10);
const PAIRS = (process.env.BOTBENCH_PAIRS || 'hard:beginner,hard:normal,normal:beginner')
  .split(',').map(s => s.trim().split(':'));
const ONLY  = process.env.BOTBENCH_GAMES
  ? new Set(process.env.BOTBENCH_GAMES.split(',').map(s => s.trim()))
  : null;
const OUT   = process.env.BOTBENCH_OUT || null;

// ── Siemennetty PRNG (mulberry32 + FNV-1a-siemen merkkijonosta) ──────────────
function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let t0 = seed >>> 0;
  return function () {
    let t = (t0 += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

/** Aja yksi bottikamppailu istuinkohtaisilla tasoilla. Palauttaa { result, frames }. */
async function runBotBattle(Component, betweenRound, botLevels) {
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
    playerCount: botLevels.length,
    aiLevel: 'normal',
    botLevels,
    onAiLevelChange: () => {},
  };

  let utils;
  await act(async () => {
    utils = render(<LangProvider><Component {...props} /></LangProvider>);
  });

  const btn = utils.getByRole('button', { name: /🔮/ });
  await act(async () => { fireEvent.click(btn); });

  const STEP_MS = 2600;
  const GUARD = 6000;
  for (let i = 0; i < GUARD && result === null; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(STEP_MS); });
    if (betweenRound) {
      const btns = utils.queryAllByRole('button', { name: betweenRound });
      if (btns.length > 0) {
        await act(async () => { fireEvent.click(btns[0]); });
      }
    }
  }
  // result === null = peli ei päättynyt vahdin sisällä (pattitilanne) — kirjataan
  // tuloksena, ei kaatumisena: päättymättömyys on itsessään mittaustulos.
  return { result, frames };
}

/** Yhdistä rankingin nimet istuimiin ensimmäisen pelaajia sisältävän framen kautta. */
function seatNamesFrom(frames) {
  const f = frames.find(fr => Array.isArray(fr.players) && fr.players.length > 0);
  return f ? f.players.map(p => p.name) : null;
}

const RESULTS = [];

function reportLine(r) {
  const pct = (x, n) => n ? `${Math.round((100 * x) / n)}%` : '—';
  const line =
    `BOTBENCH ${r.game.padEnd(11)} ${r.a}:${r.b}  n=${r.n}  ` +
    `${r.a} voitti ${pct(r.winsA + r.ties / 2, r.n)} (${r.winsA}+${r.ties} tasan)  ` +
    `keskisija ${r.a}=${r.meanA?.toFixed(2) ?? '—'} ${r.b}=${r.meanB?.toFixed(2) ?? '—'}` +
    (r.unmapped ? `  HUOM ${r.unmapped} peliä ei voitu tulkita` : '') +
    (r.stalled ? `  HUOM ${r.stalled} peliä jäi kesken (patti)` : '');
  console.log(line);
  if (OUT) { try { appendFileSync(OUT, JSON.stringify(r) + '\n'); } catch { /* ei kaadeta ajoa */ } }
}

(RUN ? describe : describe.skip)('botbench — tasoparien voimamittaus', () => {
  for (const [name, Component, betweenRound] of GAMES) {
    if (ONLY && !ONLY.has(name)) continue;
    for (const [A, B] of PAIRS) {
      // ~2-10 s / peli headless-ajossa; Kasino moninkertainen (useita kierroksia).
      const timeout = (name === 'Kasino' ? 60_000 : 25_000) * N + 60_000;
      it(`${name}: ${A} vs ${B} (${N} peliä)`, async () => {
        const stats = { winsA: 0, winsB: 0, ties: 0, unmapped: 0, stalled: 0,
          placeSumA: 0, placeCntA: 0, placeSumB: 0, placeCntB: 0 };
        for (let r = 0; r < N; r++) {
          // ABAB / BABA — tasaa istuma- ja aloitusedun
          const arrangement = Array.from({ length: 4 }, (_, i) => ((i + r) % 2 === 0 ? A : B));
          const origRandom = Math.random;
          Math.random = mulberry32(strSeed(`${name}|${A}:${B}|${r}`));
          let result, frames;
          try {
            ({ result, frames } = await runBotBattle(Component, betweenRound, arrangement));
          } finally {
            Math.random = origRandom;
          }
          if (result === null) { stats.stalled++; cleanup(); continue; }
          const seatNames = seatNamesFrom(frames);
          const levelOf = (entryName) => {
            const seat = seatNames ? seatNames.indexOf(entryName) : -1;
            return seat >= 0 ? arrangement[seat] : null;
          };
          const mapped = result.ranking.map(e => ({ ...e, level: levelOf(e.name) }));
          if (mapped.some(e => e.level === null)) { stats.unmapped++; cleanup(); continue; }
          for (const e of mapped) {
            if (e.level === A) { stats.placeSumA += e.place; stats.placeCntA++; }
            else               { stats.placeSumB += e.place; stats.placeCntB++; }
          }
          const winnerLevels = new Set(mapped.filter(e => e.place === 1).map(e => e.level));
          if (winnerLevels.size > 1) stats.ties++;
          else if (winnerLevels.has(A)) stats.winsA++;
          else stats.winsB++;
          cleanup();
        }
        const rec = { game: name, a: A, b: B, n: N - stats.unmapped - stats.stalled,
          winsA: stats.winsA, winsB: stats.winsB, ties: stats.ties,
          unmapped: stats.unmapped, stalled: stats.stalled,
          meanA: stats.placeCntA ? stats.placeSumA / stats.placeCntA : null,
          meanB: stats.placeCntB ? stats.placeSumB / stats.placeCntB : null };
        RESULTS.push(rec);
        reportLine(rec);
        // Mittari ei ota kantaa kumpi taso on parempi — se raportoi. Ainoa vaatimus:
        // pelejä saatiin tulkittua (istuin→taso-kytkentä toimii).
        expect(rec.n, `${name}: yhtään peliä ei voitu tulkita`).toBeGreaterThan(0);
      }, timeout);
    }
  }

  afterAll(() => {
    if (!RESULTS.length) return;
    console.log('\nBOTBENCH-YHTEENVETO (voitto-% sisältää puolikkaat tasapeleistä)');
    for (const r of RESULTS) {
      const wr = r.n ? Math.round((100 * (r.winsA + r.ties / 2)) / r.n) : 0;
      console.log(`  ${r.game.padEnd(11)} ${r.a} vs ${r.b}: ${wr}% (n=${r.n})`);
    }
  });
});
