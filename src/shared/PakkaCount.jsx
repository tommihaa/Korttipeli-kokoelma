import { C } from './colors.js';

// Yksi kanoninen "pakka ehtyi" -välähdys (korvaa pelikohtaiset pakaFlash-duplikaatit).
// Injektoidaan kerran <head>:iin moduulin latautuessa — eri nimi (pakkaFlash) kuin
// pelien vanhat pakaFlash-määritykset, joten törmäystä ei synny.
const FLASH_ID = 'pakkacount-flash-kf';
if (typeof document !== 'undefined' && !document.getElementById(FLASH_ID)) {
  const el = document.createElement('style');
  el.id = FLASH_ID;
  el.textContent =
    '@keyframes pakkaFlash{0%{color:inherit}' +
    '20%{color:#e05c3b;font-weight:700;transform:scale(1.15)}' +
    '60%{color:#e05c3b;font-weight:700}100%{color:#e05c3b;font-weight:700}}';
  document.head.appendChild(el);
}

// Yhtenäinen pakan lukumäärä kaikissa ei-jaetuissa peleissä.
//   variant="header" → "PAKKA — 12 korttia" / "PAKKA — TYHJÄ!"  (Pöydän otsikkorivi)
//   variant="count"  → "12 korttia" / "TYHJÄ!"                  (pinkan alapuolelle)
//   variant="number" → "12" / "TYHJÄ!"                          (korttilaatikon sisään)
// empty: ohittaa oletuksen (count === 0) — esim. Seiska, jossa lyöntipakka täydentää pakkaa.
// flash: true käynnistää välähdyksen kun pakka juuri ehtyi.
// style: ulkoasun säätö (fontSize, fontFamily, marginit) kutsupaikan mukaan.
export default function PakkaCount({ count, empty, flash = false, variant = 'header', style }) {
  const isEmpty = empty === undefined ? count === 0 : empty;
  const text =
    variant === 'header' ? (isEmpty ? 'PAKKA — TYHJÄ!' : `PAKKA — ${count} korttia`)
    : variant === 'number' ? (isEmpty ? 'TYHJÄ!' : `${count}`)
    : (isEmpty ? 'TYHJÄ!' : `${count} korttia`);
  return (
    <span style={{
      color: isEmpty ? C.red : C.dim,
      fontWeight: isEmpty ? 700 : 400,
      animation: flash ? 'pakkaFlash 2.5s ease forwards' : undefined,
      ...style,
    }}>
      {text}
    </span>
  );
}
