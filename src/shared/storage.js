// ── Kevyt preferenssitallennus (localStorage) ──────────────────────────────────
// Käyttäjän ASETUKSET persistoidaan pääsääntöisesti (kieli, äänet, pakan väritila,
// näkyvyystoggle­t, AI-taso, nimiryhmä sekä pelikohtaiset sääntövalinnat). Lupa laajentaa
// annettu 2026-06-19. POIKKEUS: cheat-tila `seeAll` ei tallennu — se nollautuu joka
// latauksessa, jottei peli jää huomaamatta huijaustilaan. Pelitila ja edistyminen (stats)
// eivät myöskään tallennu. Ei henkilötietoa → ei suostumusbanneria.
//
// Java-analogia: tämä on ohut Preferences-fasadi (kuin java.util.prefs.Preferences),
// joka nielee poikkeukset hiljaa — jos selain estää storagen (privaattitila, kiintiö
// täynnä), sovellus jatkaa istuntotilassa kaatumatta.

import { useState, useEffect } from 'react';

const PREFIX = 'jako:';

// Lukee tallennetun arvon. Palauttaa fallbackin jos avainta ei ole tai storage ei toimi.
export function loadPref(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Kirjoittaa arvon. Epäonnistuminen (privaattitila/kiintiö) niellään hiljaa.
export function savePref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage ei käytettävissä — jatketaan istuntotilassa */
  }
}

// Kuin useState, mutta arvo persistoituu localStorageen savePref/loadPref-parin kautta.
// fallback voi olla arvo TAI funktio (kuten useState) — laiska oletus lasketaan vain kerran.
// Käytössä asetustoggleille, AI-tasolle, nimiryhmälle ja pelikohtaisille säännöille.
export function useStickySetting(key, fallback) {
  const [value, setValue] = useState(() =>
    loadPref(key, typeof fallback === 'function' ? fallback() : fallback));
  useEffect(() => { savePref(key, value); }, [key, value]);
  return [value, setValue];
}
