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
// Kielivalintaa EI tallenneta (tietoinen no-storage-sääntö) — detektoidaan selaimesta,
// vaihto elää istunnon ajan useStatessa.
import { createContext, useContext, useState, useCallback } from 'react';
import { fi } from '../locales/fi.js';
import { en } from '../locales/en.js';

const LOCALES = { fi, en };
const FALLBACK = 'fi'; // suomi on totuuden lähde — puuttuva avain putoaa tähän

// Valikossa/Info-paneelissa näytettävät kielet. Lisää tähän kun sv/ru tulevat.
export const LANGS = [
  { code: 'fi', label: 'FI', name: 'Suomi' },
  { code: 'en', label: 'EN', name: 'English' },
];

function detectLang() {
  if (typeof navigator !== 'undefined' && /^en/i.test(navigator.language || '')) return 'en';
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
let currentLang = detectLang();
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
  const setLang = useCallback((l) => { currentLang = l; setLangState(l); }, []);
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
