export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const VAL   = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

export const isRed    = s => s === '♥' || s === '♦';
// Lyhentää nimen korttirivejä varten — estää pitkiä nimiä työntämästä kortteja ulos
export const truncName = (name, len = 8) => name && name.length > len ? name.slice(0, len) + '…' : (name || '');
export const lbl    = c => c ? `${c.r}${c.s}` : '—';
// Ruudunlukijalle: maa + arvo (esim. "pata 7" / "spades 7"). Lokalisoitu currentLangin mukaan.
import { getLang } from './i18n.jsx';
const SUIT_NAME = {
  fi: { '♠': 'pata',    '♥': 'hertta',  '♦': 'ruutu',     '♣': 'risti' },
  en: { '♠': 'spades',  '♥': 'hearts',  '♦': 'diamonds',  '♣': 'clubs' },
  sv: { '♠': 'spader',  '♥': 'hjärter', '♦': 'ruter',     '♣': 'klöver' },
  de: { '♠': 'Pik',     '♥': 'Herz',    '♦': 'Karo',      '♣': 'Kreuz' },
  no: { '♠': 'spar',    '♥': 'hjerter', '♦': 'ruter',     '♣': 'kløver' },
  da: { '♠': 'spar',    '♥': 'hjerter', '♦': 'ruder',     '♣': 'klør' },
  is: { '♠': 'spaði',   '♥': 'hjarta',  '♦': 'tígull',    '♣': 'lauf' },
  fr: { '♠': 'pique',   '♥': 'cœur',    '♦': 'carreau',   '♣': 'trèfle' },
  es: { '♠': 'picas',   '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' },
  it: { '♠': 'picche',  '♥': 'cuori',   '♦': 'quadri',    '♣': 'fiori' },
  uk: { '♠': 'піки',    '♥': 'черви',   '♦': 'бубни',     '♣': 'трефи' },
  ru: { '♠': 'пики',    '♥': 'черви',   '♦': 'бубны',     '♣': 'трефы' },
  el: { '♠': 'μπαστούνι', '♥': 'κούπα', '♦': 'καρό',      '♣': 'σπαθί' },
  pl: { '♠': 'pik',     '♥': 'kier',    '♦': 'karo',      '♣': 'trefl' },
  et: { '♠': 'poti',    '♥': 'ärtu',    '♦': 'ruutu',     '♣': 'risti' },
  pt: { '♠': 'espadas', '♥': 'copas',   '♦': 'ouros',     '♣': 'paus' },
  krl: { '♠': 'pata',   '♥': 'hertta',  '♦': 'ruutu',     '♣': 'risti' },
  se: { '♠': 'speađa',  '♥': 'váibmu',  '♦': 'ruvdu',     '♣': 'risti' },
  rom: { '♠': 'pika',   '♥': 'ilo',     '♦': 'karo',      '♣': 'treflo' },
  la: { '♠': 'pica',    '♥': 'cor',     '♦': 'rhombus',   '♣': 'trifolium' },
  cs: { '♠': 'piky',    '♥': 'srdce',   '♦': 'káry',      '♣': 'kříže' },
  hu: { '♠': 'pikk',    '♥': 'kőr',     '♦': 'káró',      '♣': 'treff' },
  ro: { '♠': 'pică',    '♥': 'cupă',    '♦': 'caro',      '♣': 'treflă' },
};
const RANK_NAME = {
  fi: { A: 'ässä', J: 'jätkä', Q: 'rouva', K: 'kuningas' },
  en: { A: 'ace',  J: 'jack',  Q: 'queen', K: 'king' },
  sv: { A: 'ess',  J: 'knekt', Q: 'dam',   K: 'kung' },
  de: { A: 'Ass',  J: 'Bube',  Q: 'Dame',  K: 'König' },
  no: { A: 'ess',  J: 'knekt', Q: 'dame',  K: 'konge' },
  da: { A: 'es',   J: 'knægt', Q: 'dame',  K: 'konge' },
  is: { A: 'ás',   J: 'gosi',  Q: 'drottning', K: 'kóngur' },
  fr: { A: 'as',   J: 'valet', Q: 'dame',  K: 'roi' },
  es: { A: 'as',   J: 'jota',  Q: 'reina', K: 'rey' },
  it: { A: 'asso', J: 'fante', Q: 'regina', K: 're' },
  uk: { A: 'туз',  J: 'валет', Q: 'дама',  K: 'король' },
  ru: { A: 'туз',  J: 'валет', Q: 'дама',  K: 'король' },
  el: { A: 'άσος', J: 'βαλές', Q: 'ντάμα', K: 'ρήγας' },
  pl: { A: 'as',   J: 'walet', Q: 'dama',  K: 'król' },
  et: { A: 'äss',  J: 'soldat', Q: 'emand', K: 'kuningas' },
  pt: { A: 'ás',   J: 'valete', Q: 'dama',  K: 'rei' },
  krl: { A: 'ässä', J: 'jätkä', Q: 'rouva', K: 'kuningas' },
  se: { A: 'áhssa', J: 'gánda', Q: 'dronnet', K: 'gonagas' },
  rom: { A: 'aso',  J: 'žandari', Q: 'krajica', K: 'kraj' },
  la: { A: 'as',    J: 'iuvenis', Q: 'regina', K: 'rex' },
  cs: { A: 'eso',   J: 'kluk',   Q: 'dáma',   K: 'král' },
  hu: { A: 'ász',   J: 'bubi',   Q: 'dáma',   K: 'király' },
  ro: { A: 'as',    J: 'valet',  Q: 'damă',   K: 'rege' },
};
const EMPTY = { fi: 'tyhjä', en: 'empty', sv: 'tomt', de: 'leer', no: 'tom', da: 'tom', is: 'tómt', fr: 'vide', es: 'vacío', it: 'vuoto', uk: 'пусто', ru: 'пусто', el: 'άδειο', pl: 'puste', et: 'tühi', pt: 'vazio', krl: 'tyhjä', se: 'gures', rom: 'nango', la: 'vacuus', cs: 'prázdné', hu: 'üres', ro: 'gol' };
// Slaavilaisten kielten 3-muotoinen monikko (1 / 2-4 / 5+).
const slavicPlural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
};
export const cardName = c => {
  const L = getLang();
  if (!c) return EMPTY[L] || EMPTY.fi;
  return `${SUIT_NAME[L][c.s] || ''} ${RANK_NAME[L][c.r] || c.r}`.trim();
};
// Taivutusapurit: suomessa partitiivi/genetiivi, muissa kielissä kieliopillinen monikko
// (ruotsin "kort" muuttumaton: ett kort / två kort; saksa: 1 Karte / n Karten).
// Korttimäärä lokalisoituna. korttia = partitiivi (suomi), kortin = genetiivi (suomi);
// muissa kielissä molemmat = kieliopillinen monikko.
function cardCount(n) {
  switch (getLang()) {
    case 'en': return n === 1 ? '1 card' : `${n} cards`;
    case 'sv': return `${n} kort`;
    case 'no': return `${n} kort`;
    case 'da': return `${n} kort`;
    case 'is': return `${n} spil`;
    case 'de': return n === 1 ? '1 Karte' : `${n} Karten`;
    case 'fr': return n === 1 ? '1 carte' : `${n} cartes`;
    case 'es': return n === 1 ? '1 carta' : `${n} cartas`;
    case 'it': return n === 1 ? '1 carta' : `${n} carte`;
    case 'uk': return `${n} ${slavicPlural(n, 'карта', 'карти', 'карт')}`;
    case 'ru': return `${n} ${slavicPlural(n, 'карта', 'карты', 'карт')}`;
    case 'el': return n === 1 ? '1 χαρτί' : `${n} χαρτιά`;
    case 'pl': return `${n} ${slavicPlural(n, 'karta', 'karty', 'kart')}`;
    case 'et': return n === 1 ? '1 kaart' : `${n} kaarti`;
    case 'pt': return n === 1 ? '1 carta' : `${n} cartas`;
    case 'krl': return n === 1 ? '1 kortti' : `${n} korttie`;
    case 'se':  return n === 1 ? '1 goarta' : `${n} goartta`;
    case 'rom': return n === 1 ? '1 karta' : `${n} karti`;
    case 'la':  return n === 1 ? '1 charta' : `${n} chartae`;
    case 'cs':  return `${n} ${slavicPlural(n, 'karta', 'karty', 'karet')}`;
    case 'hu':  return `${n} kártya`;
    case 'ro':  return n === 1 ? '1 carte' : `${n} cărți`;
    default:   return null; // fi hoidetaan kutsujassa (partitiivi/genetiivi eroaa)
  }
}
export const korttia = n => cardCount(n) ?? (n === 1 ? '1 kortti' : `${n} korttia`);
export const kortin  = n => cardCount(n) ?? (n === 1 ? '1 kortin' : `${n} korttia`);

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: VAL[r], id: `${r}${s}_${Math.random()}` }))));
}

// AI:n vaikeustaso: noise = todennäköisyys että AI valitsee satunnaisen sallitun
// siirron strategisen sijaan. Käytetään kaikissa peleissä yhtenäisesti.
//   beginner  — 50% virheitä, oppilaalle voitettavissa
//   normal    — 15% virheitä, ihmismäisiä möhläyksiä
//   hard      — 0% virheitä, täysi nykyinen strategia
export function aiNoise(aiLevel) {
  if (aiLevel === 'beginner') return 0.5;
  if (aiLevel === 'normal')   return 0.15;
  return 0;
}
export function aiShouldFumble(aiLevel) {
  return Math.random() < aiNoise(aiLevel);
}
