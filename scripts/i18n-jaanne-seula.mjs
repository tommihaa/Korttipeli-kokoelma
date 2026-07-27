// Kääntämätön jäänne -seula: locale-arvo joka on merkki merkiltä sama kuin fi:ssä.
//
// Ajo repojuuresta:
//   node scripts/i18n-jaanne-seula.mjs
//
// MIKSI TÄMÄ ON SKRIPTI EIKÄ TESTI. Tulos ei ole ratkaistavissa koneellisesti.
// Karjala ja viro ovat suomen lähisukukieliä, joten identtinen arvo voi olla
// aitoa kieltä eikä jäänne (viron `Anna`, `Ei`, `oma`, `ja` ovat oikeaa viroa).
// Erottelu vaatisi natiivipuhujan, mikä on pysyväistilassa oleva päätös
// (natiivitarkistus, 13.6.2026). Failaava testi väittäisi siis tietävänsä
// enemmän kuin tietää.
//
// MITÄ TÄMÄ EI KATA, koska `test/i18n-parity.test.js` kattaa sen jo kovina
// sääntöinä: kuolleet avaimet, tyhjät string-arvot, paikkamerkkien täsmäys,
// funktioarvojen tyyppisopimus ja puuttuvien avainten kattavuusraportti.
// Tämä skripti on olemassa vain sitä yhtä luokkaa varten joka jää niiden väliin.
//
// LUE TULOS POIKKEAMANA, ÄLÄ RIVILISTANA. Yksittäinen osuma ei ole väite
// virheestä. Merkitsevä signaali on locale joka erottuu muista: ensimmäisessä
// ajossa 27.7.2026 krl oli 16,5 % kun seuraava oli 3,7 % ja mediaani noin 1,5 %.
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const DIR = resolve(process.argv[2] ?? 'src/locales');

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Litistä sisäkkäinen objekti path→arvo -kartaksi. Sama muoto kuin parity-testissä. */
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) flatten(v, path, out);
    else out.set(path, v);
  }
  return out;
}

// Identtisyys on laillista, jos arvossa ei ole yhtään kirjainta (emoji, numero,
// paikkamerkki) tai jos avain on erisnimi. altName on tarkoituksella
// kulttuurivastine eikä käännös.
const hasLetters = (s) => /\p{L}/u.test(s);
const legitKey = (key) => /altName$/.test(key) || /\.name$/.test(key);

const files = readdirSync(DIR).filter((f) => f.endsWith('.js'));
const locales = {};
for (const f of files) {
  const code = f.replace(/\.js$/, '');
  const mod = await import(pathToFileURL(join(DIR, f)).href);
  locales[code] = mod[code] ?? Object.values(mod)[0];
}

const fiFlat = flatten(locales.fi);
const rows = [];

for (const [code, loc] of Object.entries(locales)) {
  if (code === 'fi') continue;
  const flat = flatten(loc);
  let shared = 0;
  const hits = [];
  for (const [key, val] of flat) {
    if (typeof val !== 'string') continue;
    const src = fiFlat.get(key);
    if (typeof src !== 'string') continue;
    shared++;
    if (val !== src) continue;
    if (!hasLetters(val)) continue;
    if (legitKey(key)) continue;
    hits.push({ key, val });
  }
  rows.push({ code, shared, hits });
}

rows.sort((a, b) => b.hits.length - a.hits.length);

console.log('locale  jaanne/jaettu  osuus');
for (const r of rows) {
  const pct = ((r.hits.length / r.shared) * 100).toFixed(1);
  console.log(`${r.code.padEnd(6)} ${String(r.hits.length).padStart(5)}/${r.shared}  ${pct.padStart(5)} %`);
}

console.log('\n=== osumat (poikkeama edella) ===');
for (const r of rows) {
  if (!r.hits.length) continue;
  console.log(`\n--- ${r.code} (${r.hits.length}) ---`);
  for (const h of r.hits) {
    console.log(`  ${h.key}\n      ${JSON.stringify(h.val).slice(0, 120)}`);
  }
}
