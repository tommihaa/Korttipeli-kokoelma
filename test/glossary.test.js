// Termimoduulin testit: moottorin kontrakti (Kaanon/TERMIMODUULI.md) + datan eheys.
// Sisarkopio: SanaMix/test/terms.test.ts. Moottori on sama ja sen kontrakti on jaettu,
// joten kontraktiosuus pidetään tarkoituksella samanmuotoisena molemmissa repoissa.
// DATA ei ole jaettu (KÄSITTEISTÖ §0), joten eheysosuus on Jaon omaa.
import { describe, expect, it } from 'vitest';
import { SANASTO, TERM_SCHEMA_VERSION, splitWithGlossary } from '../src/shared/glossary.js';

const mk = (term, match) => ({ term, match, selitys: 'x', kategoria: 'perus' });

describe('splitWithGlossary (moottorin kontrakti)', () => {
  it('löytää täsmäosuman sanarajoilla, ei sanan sisältä', () => {
    const entries = [mk('Kasa', ['kasa'])];
    const hit = splitWithGlossary('kortti kasa pöydällä', entries);
    expect(hit.filter(p => p.isTerm).map(p => p.term)).toEqual(['Kasa']);
    // "kasaan" EI osu ilman vartalotähteä
    const miss = splitWithGlossary('kortit kasaan', entries);
    expect(miss.some(p => p.isTerm)).toBe(false);
  });

  it('vartalohaku (*) osuu taivutusmuotoihin, sanaraja kattaa ä/ö', () => {
    const entries = [mk('Hyökkäys', ['hyökkä*'])];
    const parts = splitWithGlossary('Vuorossa hyökkäystä odottava.', entries);
    const hit = parts.find(p => p.isTerm);
    expect(hit?.text).toBe('hyökkäystä');
    expect(hit?.term).toBe('Hyökkäys');
  });

  it('ei osu vartaloon keskellä sanaa (sanaraja vasemmalla)', () => {
    const entries = [mk('Puolustus', ['puolust*'])];
    const parts = splitWithGlossary('vastapuolustus kesti', entries);
    expect(parts.some(p => p.isTerm)).toBe(false);
  });

  it('pisin match voittaa', () => {
    const entries = [mk('Kakkonen', ['kakkonen']), mk('Kova kakkonen', ['kova kakkonen'])];
    const parts = splitWithGlossary('pelaa kova kakkonen heti', entries);
    const hits = parts.filter(p => p.isTerm);
    expect(hits).toHaveLength(1);
    expect(hits[0].term).toBe('Kova kakkonen');
  });

  it('tähti ei laske pituuteen: yhtä pitkä täsmämatch voittaa vartalon', () => {
    // 'kasa*' on 5 merkkiä mutta 4 merkkiä vartaloa, 'kasaa' on 5. Jos tähti
    // laskettaisiin, pituudet olisivat samat ja lajittelu jäisi alkuperäiseen
    // järjestykseen, jolloin osuma olisi Kasa.
    const entries = [mk('Kasa', ['kasa*']), mk('Kasaus', ['kasaa'])];
    const parts = splitWithGlossary('kortit kasaa nopeasti', entries);
    expect(parts.find(p => p.isTerm)?.term).toBe('Kasaus');
  });

  it('case-insensitive; palauttaa alkuperäisen kirjoitusasun ja kanonisen termin', () => {
    const entries = [mk('Mökki', ['mökki'])];
    const parts = splitWithGlossary('Mökki on pisteen arvoinen.', entries);
    const hit = parts.find(p => p.isTerm);
    expect(hit?.text).toBe('Mökki');
    expect(hit?.term).toBe('Mökki');
  });

  it('useampi osuma pilkotaan järjestyksessä ja välitekstit säilyvät', () => {
    const entries = [mk('Kasa', ['kasa']), mk('Pino', ['pino'])];
    const parts = splitWithGlossary('pino ja kasa', entries);
    expect(parts.map(p => p.text).join('')).toBe('pino ja kasa');
    expect(parts.filter(p => p.isTerm).map(p => p.term)).toEqual(['Pino', 'Kasa']);
  });

  it('tyhjä termistö → koko teksti yhtenä ei-termiosana', () => {
    expect(splitWithGlossary('mitä vain', [])).toEqual([{ text: 'mitä vain', isTerm: false }]);
  });
});

describe('SANASTO-data (eheys)', () => {
  it('termit ovat uniikkeja ja kentät täytetty', () => {
    const names = SANASTO.map(t => t.term);
    expect(new Set(names).size).toBe(names.length);
    for (const t of SANASTO) {
      expect(t.selitys.length).toBeGreaterThan(0);
      expect(t.match.length).toBeGreaterThan(0);
      expect(t.kategoria.length).toBeGreaterThan(0);
    }
  });

  it('sama match-merkkijono esiintyy vain kerran koko sanastossa', () => {
    // Kaksoiskappale on joko kuollut rivi (sama termi) tai kaksitulkintainen
    // osuma (eri termi): moottori antaa aina ensimmäisen, joten toinen ei näy.
    const all = SANASTO.flatMap(t => t.match.map(m => m.toLowerCase()));
    const dupes = all.filter((m, i) => all.indexOf(m) !== i);
    expect(dupes).toEqual([]);
  });

  it('jokaisella termillä on pelien osoitin: pelit tai pelitLabel', () => {
    for (const t of SANASTO) {
      const hasList = Array.isArray(t.pelit) && t.pelit.length > 0;
      expect(hasList || typeof t.pelitLabel === 'string').toBe(true);
    }
  });

  it('skeemaversio on kirjattu', () => {
    expect(TERM_SCHEMA_VERSION).toBe(1);
  });
});

describe('sääntötekstien avaintermit osuvat pelidatalla', () => {
  it('poimintoja peleistä: moduulin todellinen käyttökohde', () => {
    // Katkelmia src/locales/fi.js:n ja PELI.md-tiedostojen teksteistä, ei keksittyjä.
    const texts = [
      'valitse pöytäkortteja, joiden summa + käsikorttisi = rakennelman arvo',
      'Vastustaja voi kähveltää rakennelmasi.',
      'Kaappaa oma rakennelmasi kortilla. Kukaan ei voi enää varastaa sitä.',
      'Kova kakkonen voi lyödä minkä tahansa kortin päälle paitsi kaatokortin.',
      'Puolustaja kaataa pöydän hyökkäyskortit valttimaan kortilla.',
      'Kasan kaksi päällimmäistä korttia ovat samaa arvoa: täsmäys.',
    ];
    const found = new Set(
      texts.flatMap(t => splitWithGlossary(t).filter(p => p.isTerm).map(p => p.term)),
    );
    for (const expected of ['Rakennelma', 'Kova kakkonen', 'Puolustus', 'Kaato', 'Valttimaa', 'Kasa', 'Täsmäys']) {
      expect(found).toContain(expected);
    }
  });
});
