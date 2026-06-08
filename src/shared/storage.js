// ── Kevyt preferenssitallennus (localStorage) ──────────────────────────────────
// TIETOINEN POIKKEUS no-storage-linjaan: vain käyttäjän PREFERENSSIT (kieli + äänet)
// persistoidaan. Pelitila, cheat-/näkyvyystoggle­t ja edistyminen EIVÄT tallennu —
// "karvalakki" säilyy siellä missä se on tärkeää. Ei henkilötietoa → ei suostumusbanneria.
//
// Java-analogia: tämä on ohut Preferences-fasadi (kuin java.util.prefs.Preferences),
// joka nielee poikkeukset hiljaa — jos selain estää storagen (privaattitila, kiintiö
// täynnä), sovellus jatkaa istuntotilassa kaatumatta.

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
