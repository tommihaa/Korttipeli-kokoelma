// ── i18n (kevyt custom-ratkaisu, ei npm-riippuvuuksia) ─────────────────────────
// Java-analogia: tämä on projektin ResourceBundle. LOCALES = messages_xx.properties,
// t(key, params) = bundle.getString(key) + MessageFormat, LangProvider = se DI/konteksti
// joka injektoi aktiivisen bundlen komponenteille.
//
// Käyttö:
//   const t = useT();
//   t('ui.info.close')                    → "✕ Sulje" / "✕ Close"
//   t('moska.attack', { player, cards })  → interpoloitu merkkijono
//
// Locale-arvo voi olla joko merkkijono ({param}-paikkamerkit) tai funktio (params) => string.
// Kielivalinta TALLENNETAAN (preferenssipoikkeus no-storage-linjaan, ks. shared/storage.js):
// jos käyttäjä on aiemmin valinnut kielen, se palautetaan; muuten detektoidaan selaimesta.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadPref, savePref } from './storage.js';
import { fi } from '../locales/fi.js';

// Vain fallback-kieli (fi) kulkee päädibundlessa. Muut 16 kieltä ovat omia laiskoja
// chunkkeja: import.meta.glob antaa loader-funktiot, ja Vite splittaa kunkin tiedoston
// omaksi tiedostokseen buildissa. Java-analogia: ResourceBundle.getBundle(locale) —
// bundle haetaan classpathilta vasta kun kieli aktivoidaan, ei kaikkia käynnistyksessä.
const LOCALES = { fi };
const localeLoaders = import.meta.glob(['../locales/*.js', '!../locales/fi.js']);

// Lataa kielen sanakirjan LOCALES-välimuistiin. tr() pysyy synkronisena:
// kunnes lataus valmistuu, käännökset putoavat fi-fallbackiin (resolve → undefined).
async function loadLocale(code) {
  if (LOCALES[code]) return;
  const loader = localeLoaders[`../locales/${code}.js`];
  if (!loader) return;
  const mod = await loader();
  LOCALES[code] = mod[code];
}

const FALLBACK = 'fi'; // suomi on totuuden lähde — puuttuva avain putoaa tähän

// Valikossa näytettävät kielet. Liput piirretään SVG:nä App.jsx:n <Flag code>
// -komponentissa (emojiliput eivät renderöidy Windowsilla), joten tässä code/label/name.
// status = käännösten/pelinimien varmennustaso:
//   'native'   = suomi (lähdekieli) tai natiivipuhujan vahvistama
//   'auto'     = web-haulla varmistetut pelinimet (Claude), ei vielä natiivitarkistusta
//   'untested' = ei vielä varmistettu (kuvailevia altName-nimiä, odottaa tarkistusta)
// Valikon kielivalitsin ryhmittelee: 'native'+'auto' → Testatut, 'untested' → Testaamattomat.
export const LANGS = [
  { code: 'fi', label: 'FI', name: 'Suomi',       status: 'native' },
  { code: 'en', label: 'EN', name: 'English',     status: 'auto' },
  { code: 'sv', label: 'SV', name: 'Svenska',     status: 'auto' },
  { code: 'no', label: 'NO', name: 'Norsk',       status: 'auto' },
  { code: 'da', label: 'DA', name: 'Dansk',       status: 'auto' },
  { code: 'is', label: 'IS', name: 'Íslenska',    status: 'auto' },
  { code: 'de', label: 'DE', name: 'Deutsch',     status: 'auto' },
  { code: 'fr', label: 'FR', name: 'Français',    status: 'auto' },
  { code: 'es', label: 'ES', name: 'Español',     status: 'auto' },
  { code: 'it', label: 'IT', name: 'Italiano',    status: 'auto' },
  { code: 'uk', label: 'UK', name: 'Українська',  status: 'auto' },
  { code: 'ru', label: 'RU', name: 'Русский',     status: 'auto' },
  { code: 'el', label: 'EL', name: 'Ελληνικά',    status: 'untested' },
  { code: 'pl', label: 'PL', name: 'Polski',      status: 'auto' },
  { code: 'et', label: 'ET', name: 'Eesti',       status: 'auto' },
  { code: 'pt', label: 'PT', name: 'Português',   status: 'auto' },
  { code: 'krl', label: 'KRL', name: 'Karjala',   status: 'untested' },
];

function detectLang() {
  if (typeof navigator !== 'undefined') {
    const l = navigator.language || '';
    if (/^sv/i.test(l)) return 'sv';
    if (/^n[bno]/i.test(l)) return 'no';   // nb / nn / no
    if (/^da/i.test(l)) return 'da';
    if (/^is/i.test(l)) return 'is';
    if (/^de/i.test(l)) return 'de';
    if (/^fr/i.test(l)) return 'fr';
    if (/^es/i.test(l)) return 'es';
    if (/^it/i.test(l)) return 'it';
    if (/^uk/i.test(l)) return 'uk';
    if (/^ru/i.test(l)) return 'ru';
    if (/^el/i.test(l)) return 'el';
    if (/^pl/i.test(l)) return 'pl';
    if (/^et/i.test(l)) return 'et';
    if (/^pt/i.test(l)) return 'pt';
    if (/^krl/i.test(l)) return 'krl';
    if (/^en/i.test(l)) return 'en';
  }
  return FALLBACK;
}

// Pistepolku-haku: resolve(dict, 'ui.info.close') → dict.ui.info.close
function resolve(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

// {name} → params.name. Tuntematon paikkamerkki jätetään ennalleen.
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
}

// ── Moduulitason aktiivinen kieli ─────────────────────────────────────────────
// Java-analogia: tämä on staattinen Locale.getDefault()-kenttä. Sovelluksessa on aina
// vain yksi aktiivinen kieli, joten moduulimuuttuja riittää. LangProvider pitää tämän
// synkassa Reactin tilan kanssa, jolloin hook-vapaa koodi (tapahtumalokin M-katalogit,
// helpers.js:n taivutusapurit) voi kääntää ilman että lang pujotellaan jokaiseen kutsuun.
// Alkukieli: tallennettu valinta (jos kelvollinen koodi) voittaa selaindetektoinnin.
function initialLang() {
  const saved = loadPref('lang', null);
  if (saved && LANGS.some(l => l.code === saved)) return saved;
  return detectLang();
}
let currentLang = initialLang();
export function getLang() { return currentLang; }

// Hook-vapaa käännösfunktio — käytä moduulitason koodissa (M-katalogit, helpers).
// Komponenteissa käytä useT():tä, joka triggeröi uudelleenrenderöinnin kielen vaihtuessa.
export function tr(key, params) {
  let val = resolve(LOCALES[currentLang], key);
  if (val === undefined && currentLang !== FALLBACK) val = resolve(LOCALES[FALLBACK], key);
  if (val === undefined) return key;
  if (typeof val === 'function') return val(params || {});
  if (typeof val === 'string') return interpolate(val, params);
  return val;
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(currentLang);
  // Alkukieli voi asua lazy-chunkissa: ensirender menee fi-fallbackilla, ja kun
  // sanakirja on ladattu, setLoaded triggeröi re-renderin jolloin tr() löytää tekstit.
  const [, setLoaded] = useState(false);
  useEffect(() => { loadLocale(currentLang).then(() => setLoaded(true)).catch(() => {}); }, []);
  // Kielen vaihto: sanakirja ladataan ENNEN aktivointia, jottei UI välähdä fallbackia.
  // Jos chunkin haku epäonnistuu (esim. offline), kieli ei vaihdu — preferenssi on
  // silti tallessa ja lataus onnistuu seuraavalla käynnillä.
  const setLang = useCallback((l) => {
    savePref('lang', l);
    loadLocale(l).then(() => { currentLang = l; setLangState(l); }).catch(() => {});
  }, []);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within <LangProvider>');
  return ctx;
}

// Palauttaa t()-funktion sidottuna aktiiviseen kieleen.
// lang-riippuvuus varmistaa että komponentti renderöi uudelleen kielen vaihtuessa;
// itse käännös tehdään moduulitason tr():llä (yksi totuuden lähde).
export function useT() {
  const { lang } = useLang();
  return useCallback((key, params) => tr(key, params), [lang]);
}
