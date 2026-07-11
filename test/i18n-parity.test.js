import { describe, it, expect } from 'vitest';
import { LANGS } from '../src/shared/i18n.jsx';

// Kaikki 23 localea suoraan (ei import.meta.glob-polkua). fi = totuuden lähde;
// puuttuva avain putoaa fi-fallbackiin (suunniteltu ominaisuus) → PEHMEÄ raportti.
import { fi } from '../src/locales/fi.js';
import { en } from '../src/locales/en.js';
import { sv } from '../src/locales/sv.js';
import { no } from '../src/locales/no.js';
import { da } from '../src/locales/da.js';
import { is } from '../src/locales/is.js';
import { de } from '../src/locales/de.js';
import { fr } from '../src/locales/fr.js';
import { es } from '../src/locales/es.js';
import { it as itLoc } from '../src/locales/it.js';
import { uk } from '../src/locales/uk.js';
import { ru } from '../src/locales/ru.js';
import { el } from '../src/locales/el.js';
import { pl } from '../src/locales/pl.js';
import { et } from '../src/locales/et.js';
import { pt } from '../src/locales/pt.js';
import { krl } from '../src/locales/krl.js';
import { se } from '../src/locales/se.js';
import { rom } from '../src/locales/rom.js';
import { la } from '../src/locales/la.js';
import { cs } from '../src/locales/cs.js';
import { hu } from '../src/locales/hu.js';
import { ro } from '../src/locales/ro.js';

const LOCALES = {
  fi, en, sv, no, da, is, de, fr, es, it: itLoc, uk, ru, el, pl, et, pt,
  krl, se, rom, la, cs, hu, ro,
};

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Litistä sisäkkäinen objekti path→arvo -leaf-kartaksi (funktiot/taulukot = leafeja). */
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) flatten(v, path, out);
    else out.set(path, v);
  }
  return out;
}

/** {name}-tyyliset paikkamerkit merkkijonosta. */
function placeholders(str) {
  return new Set([...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
}

const fiFlat = flatten(fi);
const CODES = Object.keys(LOCALES).filter((c) => c !== 'fi');

// Käännöskohtaiset nimiavaruudet joita fi-locale EI tarkoituksella sisällä, joten
// niitä ei lasketa "kuolleiksi avaimiksi" (fi ei ole niiden totuuden lähde):
//   - glossary.sanasto.* : suomen termit ovat src/shared/glossary.js:ssä
//   - glossary.merkisto.* : suomen merkistö on App.jsx:ssä
//   - games.*.altName     : pelien erisnimet ovat suomea → fi ei tarvitse altNamea
const isLocaleOnlyByDesign = (key) =>
  key.startsWith('glossary.sanasto.') ||
  key.startsWith('glossary.merkisto.') ||
  /^games\.[a-z]+\.altName$/.test(key);

describe('i18n LANGS ↔ locale-tiedostot', () => {
  it('jokaista LANGS-koodia vastaa locale ja päinvastoin', () => {
    const langCodes = new Set(LANGS.map((l) => l.code));
    const localeCodes = new Set(Object.keys(LOCALES));
    expect(langCodes).toEqual(localeCodes);
    expect(LANGS.length).toBe(23);
  });
});

describe('i18n parity — kovat säännöt (per locale)', () => {
  for (const code of CODES) {
    const locFlat = flatten(LOCALES[code]);

    it(`${code}: ei kuolleita avaimia (avain jota fi:ssä ei ole)`, () => {
      const dead = [...locFlat.keys()].filter(
        (k) => !fiFlat.has(k) && !isLocaleOnlyByDesign(k),
      );
      expect(dead, `kuolleet avaimet ${code}: ${dead.join(', ')}`).toEqual([]);
    });

    it(`${code}: ei tyhjiä string-arvoja`, () => {
      const empties = [...locFlat.entries()]
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => k);
      expect(empties, `tyhjät ${code}: ${empties.join(', ')}`).toEqual([]);
    });

    it(`${code}: paikkamerkit täsmäävät fi:hin jaetuilla avaimilla`, () => {
      const mismatches = [];
      for (const [k, v] of locFlat) {
        const fv = fiFlat.get(k);
        if (typeof v === 'string' && typeof fv === 'string') {
          const a = placeholders(fv);
          const b = placeholders(v);
          if (a.size !== b.size || [...a].some((p) => !b.has(p))) {
            mismatches.push(`${k} (fi:{${[...a]}} vs ${code}:{${[...b]}})`);
          }
        }
      }
      expect(mismatches, mismatches.join('; ')).toEqual([]);
    });

    it(`${code}: funktioarvot pysyvät funktioina (tyyppisopimus)`, () => {
      const typeBreaks = [];
      for (const [k, v] of locFlat) {
        const fv = fiFlat.get(k);
        if (typeof fv === 'function' && typeof v !== 'function') {
          typeBreaks.push(`${k} (fi=function, ${code}=${typeof v})`);
        }
      }
      expect(typeBreaks, typeBreaks.join('; ')).toEqual([]);
    });
  }
});

describe('i18n parity — puuttuvat avaimet (PEHMEÄ, fallback fi:hin on tarkoituksellinen)', () => {
  it('raportoi kattavuuden per locale (ei failaa fallbackista)', () => {
    const total = fiFlat.size;
    const report = [];
    for (const code of CODES) {
      const locFlat = flatten(LOCALES[code]);
      const missing = [...fiFlat.keys()].filter((k) => !locFlat.has(k)).length;
      const pct = Math.round((100 * (total - missing)) / total);
      report.push(`${code}: ${total - missing}/${total} (${pct}%)`);
    }
    // Näkyviin ajolokista; ei assertiota kattavuudelle (fallback on suunniteltu).
    console.log('i18n-kattavuus fi:hin nähden:\n  ' + report.join('\n  '));
    expect(total).toBeGreaterThan(0);
  });
});
