import { useState, useEffect, lazy, Suspense } from 'react';
import { C, SUIT_COLOR, SUIT_COLOR_DARK } from './shared/colors.js';
import GameResult from './shared/GameResult.jsx';
import Announcer from './shared/Announcer.jsx';
import { useT, useLang, LANGS } from './shared/i18n.jsx';
import { loadPref, savePref } from './shared/storage.js';

// Kuin useState, mutta arvo persistoituu localStorageen (preferenssipoikkeus, ks. storage.js).
// Käytössä vain äänille; pelitila ja cheat-toggle­t pysyvät tavallisessa useStatessa.
function useStickySetting(key, fallback) {
  const [value, setValue] = useState(() => loadPref(key, fallback));
  useEffect(() => { savePref(key, value); }, [key, value]);
  return [value, setValue];
}

/* eslint-disable no-undef */
const APP_VERSION = __APP_VERSION__;
const BUILD_DATE  = __BUILD_DATE__;
const BUILD_TIME  = __BUILD_TIME__;
/* eslint-enable no-undef */
// Google Forms -palautelomake. Versio + kieli esitäytetään URL-parametreilla (entry.*);
// vastaukset valuvat linkitettyyn Sheetiin. Arvosana + vapaa teksti jätetään pelaajan täytettäväksi.
function feedbackUrl(lang) {
  const base = 'https://docs.google.com/forms/d/e/1FAIpQLSfOV6KonFUGJ2VcG6BXITdY7WeXLTmfw5czQOMdDESWUTN5bg/viewform';
  const params = new URLSearchParams({
    'usp': 'pp_url',
    'entry.1663935268': `v${APP_VERSION} · ${BUILD_DATE} ${BUILD_TIME}`, // Versio-kenttä — sama leima kuin valikossa, esitäyttyy automaattisesti
    'entry.1066319749': lang,    // Kieli-kenttä
  });
  return `${base}?${params.toString()}`;
}
// Suora sähköpostipalaute (mailto) — Forms-lomakkeen rinnalla. EI kerää mitään: avaa pelaajan oman sähköpostin.
const MAILTO = `mailto:no.jopas@gmail.com?subject=${encodeURIComponent(`Jako ${APP_VERSION}, palaute`)}`;
// Ihmisten Puolue -ryhmän YouTube-soittolista (englanninkieliset tekstitykset). EI lokalisoitu.
const PUOLUE_YT = 'https://www.youtube.com/playlist?list=PL-vRZZ9yf7oqRYbSCXM4xlNvpNhhQktjz';
// Lahjoituslinkki (Ko-fi). Bränditeksti — kuten YouTube-linkki, EI lokalisoitu.
const KOFI = 'https://ko-fi.com/tommih';
// Jaettava pelin osoite (Web Share API / kopioi).
const SHARE_URL = 'https://tommi-jako.vercel.app';
// Ryhmäkohtaiset kuvaukset — tietoisesti EI käännetä, käyttäjän oma ääni, näytetään aina englanniksi.
const GROUP_BLURB = {
  laituri: 'I learned many of these games with this gang.',
  puolue:  'Ihmisten Puolue is strictly Finnish humor — until you understand it.',
  jumalat: 'I love backgammon, and to the gods of luck we pray.',
  kansa:   'Strictly Finnish archetypes.',
  meme:    'The discourse, in card form.',
};
// Goa'uld: tekojumalan julkeudet — satunnainen poimitaan aina kun ryhmä valitaan.
const GOAULD_TAUNTS = ['Kneel or fold.', 'You ante. We annex.', 'Bow. Then deal.', "Gods don't fold.", "We don't bluff. We reign."];
// Pelit ladataan laiskasti (code splitting) — kukin oma chunkkinsa, haetaan vasta
// kun peli avataan. Valikko ei enää kanna kaikkien 9 pelin koodia kerralla.
const Koputus = lazy(() => import('./games/Koputus.jsx'));
const Lapsy = lazy(() => import('./games/Lapsy.jsx'));
const Kultakala = lazy(() => import('./games/Kultakala.jsx'));
const Maija = lazy(() => import('./games/Maija.jsx'));
const Kasino = lazy(() => import('./games/Kasino.jsx'));
const Moska = lazy(() => import('./games/Moska.jsx'));
const Seiska = lazy(() => import('./games/Seiska.jsx'));
const Ristiseiska = lazy(() => import('./games/Ristiseiska.jsx'));
const Paskahousu = lazy(() => import('./games/Paskahousu.jsx'));

const LAITURI_SPECIAL  = ['Antti','Arto','Arttu','Janus','Jens','Jokke','Juuso','Jukka','Kirsi','Markku','Marko','Markus','Marviel','Mika','Mikael','Osku','Panja','Rebekka','Sanna','Sari','Simo','Sune','Tarja','Teemu','Tinja'];
const ONNEN_JUMALAT    = ['Vortumna','Loki','Fortuna','Tykhe','Onnetar','Macuilxochitl','Felicitas'];
const IHMISTEN_PUOLUE  = ['Hannes','Päivi','Regina','Tapani (DI)','Topi-Petteri'];
const KANSA            = ['Astraalitason tirehtööri','Jonne','Justiina','Kukkahattutäti','Lumihiutale','Rane','Setämies','Veeti'];
const MEME_GANG        = ['Karen','Boomer','Zoomer','NPC','Random','Vegan','Nihilist','Chad','Prepper','Edgelord','Hipster','Influencer','Lurker','Tryhard','Noob','Troll','Crypto Bro','Main Character','AFK'];
const GOAULD           = ['Ra','Apophis','Anubis','Ba\'al','Hathor','Cronus','Nirrti','Yu','Sokar','Osiris','Heru\'ur','Bastet','Camulus','Morrigan','Amaterasu','Svarog','Zipacna','Qetesh'];

// Pikkukortti-ikoni valikon ruutuun (esim. Maija = Q♠) — luettavampi kuin tumma Unicode-korttiglyyfi
const CardIcon = ({ rank, suit, suitColor = '#1a1a1a' }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 26, height: 34, background: '#f6efdd', borderRadius: 4, lineHeight: 1.05, boxShadow: '0 1px 3px rgba(0,0,0,0.4)', fontFamily: 'Georgia,serif' }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{rank}</span>
    <span style={{ fontSize: 13, color: suitColor }}>{suit}</span>
  </span>
);

const GAMES = [
  {
    id: 'kultakala', name: 'Kultakala', emoji: '🐟',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Kultakala, maxWidth: 560, pakka: 'taydennetty',
  },
  {
    id: 'lapsy', name: 'Läpsy', emoji: '👋',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Lapsy, maxWidth: 520, pakka: 'jaettu',
  },
  {
    id: 'ristiseiska', name: 'Ristiseiska', emoji: '♣',
    players: '3–4', minPlayers: 3, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Ristiseiska, maxWidth: 620, pakka: 'jaettu',
  },
  {
    id: 'seiska', name: 'Seiska', emoji: '7️⃣',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Seiska, maxWidth: 580, pakka: 'kierratetty', suosikki: true,
  },
  {
    id: 'kasino', name: 'Kasino', emoji: '🪙',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Kasino, maxWidth: 560, pakka: 'taydennetty', suosikki: true,
  },
  {
    id: 'koputus', name: 'Koputus', emoji: '🤜',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Koputus, maxWidth: 560, pakka: 'taydennetty',
  },
  {
    id: 'maija', name: 'Maija', emoji: <CardIcon rank="Q" suit="♠" />,
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Maija, maxWidth: 560, pakka: 'taydennetty',
  },
  {
    id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true,
  },
  {
    id: 'moska', name: 'Moska', emoji: '⚔️',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Vaativa', diffColor: '#e05c3b',
    component: Moska, maxWidth: 580, pakka: 'taydennetty',
  },
];

// ── Sanasto ──────────────────────────────────────────────────────────────────
// match[]:    merkkijonot joita haetaan säännöistä (case-insensitive), pisin ensin
// pelitLabel: ohittaa automaattisen pelinimilistan kun pelejä on monta
const SANASTO = [
  // ─ Perustermit ───────────────────────────────────────────────────────────
  { kategoria: 'perus', term: 'Maat',        match: ['pata','hertta','ruutu','risti','maata','maan'],                        emoji: '♠', selitys: 'Neljä maata: ♠ Pata · ♥ Hertta · ♦ Ruutu · ♣ Risti. Punaiset: ♥ ♦. Mustat: ♠ ♣. Maa ei yleensä ratkaise — arvo ratkaisee, paitsi valttipelissä.',                        pelitLabel: 'kaikki'                    },
  { kategoria: 'perus', term: 'Kuvakortti',  match: ['kuvakortti','kuvakorttia','kuvakortilla','kuvakorteilla','kuvakortit'], emoji: '👑', selitys: 'J (Jätkä), Q (Kuningatar), K (Kuningas). Usein erityisasemassa: Paskahousussa ei voi pelata alle seiskan päälle, Läpsyssä laukaisevat haasteen.',                          pelitLabel: 'useimmat'                  },
  { kategoria: 'perus', term: 'Ässä',        match: ['ässä','ässällä','ässiä','ässän','ässät'],                               emoji: '🂡', selitys: 'A — korkein tai erikoiskortti riippuen pelistä. Kasinossa +1 piste, Paskahousussa kaataa kuvakortteja (J/Q/K), Moskassa korkein arvo, Läpsyssä haastaa 4 kertaa.',           pelitLabel: 'useimmat'                  },
  { kategoria: 'perus', term: 'Jako',        match: ['jaetaan','jaettu','jako','jakaa','jaon'],                               emoji: '🤲', selitys: 'Pakan jakaminen pelaajille pelin alussa. 52 korttia, 4 maata, 13 arvoa per maa (2–10, J, Q, K, A). Jako määrää koko pelin lähtötilanteen.',                                    pelitLabel: 'kaikki'                    },
  // ─ Kortit ja erikoistilanteet ─────────────────────────────────────────────
  { kategoria: 'kortti', term: 'Mökki',         match: ['mökki','mokki','mökin','mökkejä'],                                emoji: '🏚', selitys: 'Koko pöydän tyhjennys yhdellä kaappauksella — antaa yhden lisäpisteen.',                                                          pelit: ['kasino']                       },
  { kategoria: 'kortti', term: 'Rakennelma',   match: ['rakennelma','rakennelman','rakennelmaa','rakennelmat','rakennelmia','rakennelmat'], emoji: '🔨', selitys: 'Valitset pöydältä kortteja ja lisäät oman käsikorttisi — niiden summa on rakennelman arvo. Sinulla täytyy olla kädessäsi toinen kortti samalla arvolla, jolla kaappaat rakennelman myöhemmin. Vastustaja voi varastaa rakennelman jos hänellä on saman arvoinen kortti.', pelit: ['kasino'] },
  { kategoria: 'kortti', term: 'Korttipantti',  match: ['korttipantti','korttipantteja','pantti','pantteja','panttia'],    emoji: '🎫', selitys: 'Rangaistuskortti, jonka saat edelliseltä pelaajalta, kun siulla ei ole käypää pelattavaa. Eniten korttipantteja saanut häviää.',    pelit: ['ristiseiska']                  },
  { kategoria: 'kortti', term: 'Maija',         match: ['maija'],                                                           emoji: '🂭', emojiStyle: { filter: 'grayscale(1) brightness(0.05)' }, selitys: 'Q♠ on tämän pelin ainoa erikoiskortti, se on vain nostettava.',                                                         pelit: ['maija']                        },
  { kategoria: 'kortti', term: 'Lappu',         match: ['lappu'],                                                           emoji: '📢', selitys: 'Jos siulla pelivuorosi päätteeksi on enää yksi kortti pienessä käessäsi, niin LAPPU ennenkuin seuraava pelaaja ehtii nostaa kortin! Seiskassa unohdettu lapun huuto tarkoittaa +3 korttia.',              pelit: ['seiska']                       },
  { kategoria: 'kortti', term: 'Kova kakkonen', match: ['kova kakkonen','kovat kakkoset'],                                 emoji: '♠',  selitys: '2♠ tai 2♣ — voi lyödä minkä tahansa ei-kaatokortin päälle.',                                                                       pelit: ['paskahousu']                   },
  { kategoria: 'kortti', term: 'Hyökkäys',      match: ['hyökkä*'],                                                        emoji: '⚔️', selitys: 'Hyökkääjä lyö käsikorttejaan pöytään puolustajan kaadettavaksi. Moskassa hyökkäys samanarvoisilla korteilla, Maijassa saman maan korteilla.',          pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Puolustus',     match: ['puolust*','torjuu','torjua','torju'],                              emoji: '🛡️', selitys: 'Puolustaja puolustautuu kaatamalla pöydän hyökkäyskortit saman maan isommalla kortilla tai valttimaan kortilla.',                                               pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Täyskaato',     match: ['täyskaato*'],                                                     emoji: '✅', selitys: 'Puolustaja kaatoi kaikki hyökkäykseen käytetyt kortit. Täydentää korttinsa viimeiseksi ja on seuraava hyökkääjä.',                                                pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Torjuntavoitto', match: ['torjuntavoitto*'],                                               emoji: '🔰', selitys: 'Puolustaja kaataa osan hyökkäykseen käytetyistä korteista ja nostaa loput. Seuraava pelaaja on hyökkääjä.',                                                   pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Kaato',         match: ['kaadetaan','kaataa','kaadat','kaato','kaatamalla'],                             emoji: '⬇️', selitys: 'Maijassa ja Moskassa sama asia kuin puolustus. Paskahousussa kaatokortteja ovat 10 (kymppi), A (ässä) ja neljä samanvahvuista (3–9, J, Q, K). Moskassa kaadetut kortit ovat poissa pelistä, vain jos puolustus onnistuu kaatamaan kaikki hyökkäykseen käytetyt kortit.',  pelit: ['maija','moska','paskahousu']   },
  { kategoria: 'kortti', term: 'Valttimaa',     match: ['valttimaa','valttimaan','valttikortilla','valttikortti','valtilla','valtit','valtti'],         emoji: '⭐', selitys: 'Pelin alussa pakan viimeinen jaettu kortti määrää valttimaan. Valttikortilla voi kaataa minkä tahansa ei-valttimaan kortin. Maijassa kaksi lisärajoitetta: valttimaa ei voi olla ♠ ja Q♠ on vain nostettava.', pelit: ['moska','maija']                },
  { kategoria: 'kortti', term: 'Täsmäys',      match: ['täsmäys','täsmäyksen','TÄSMÄYS'],                                  emoji: '👐', selitys: 'Kasan kaksi päällimmäistä korttia ovat samaa arvoa. Nopein läpsääjä voittaa koko kasan — väärä läpsäys sen sijaan lisää kortin kasaan.',                             pelit: ['lapsy']                        },
  { kategoria: 'kortti', term: 'Haaste',       match: ['haaste','haastaa','haasteen','haasteeseen','haastettiin'],                  emoji: '⚡', selitys: 'J/Q/K/A käännettäessä haastetaan seuraava: J=1 · Q=2 · K=3 · A=4 yritystä vastata J/Q/K/A:lla. Onnistunut vastaus siirtää haasteen eteenpäin. Epäonnistunut → haastaja voittaa kasan.', pelit: ['lapsy']                        },
  // ─ Alueet ja vyöhykkeet ───────────────────────────────────────────────────
  { kategoria: 'alue',   term: 'Käsi',          match: ['käsikorttisi','käsikortillesi','käsikortteja'],                   emoji: '🤚', selitys: 'Useimmissa peleissä pysyvä viuhka: jaetaan alussa, niistä valitaan pelattava. Koputuksessa ja Kultakalassa käsi on hyvin tilapäinen — yksi nostettu kortti, joka vuoron aikana vaihdetaan kentän korttiin tai heitetään poistopakkaan.',  pelitLabel: 'kaikki paitsi Koputus, Kultakala' },
  { kategoria: 'alue',   term: 'Kenttä',        match: ['kenttäsi','kentästäsi','kentältä','kenttään','kenttää','kenttä'], emoji: '🔲', selitys: 'Nurinpäin pöydälle eteesi jaetut kortit. Pelin aikana sinulle tulee mahdollisuuksia katsoa ja vaihtaa niitä parempiin. Koputuksessa ja Kultakalassa A on pienin ja paras.',  pelit: ['kultakala','koputus']          },
  { kategoria: 'alue',   term: 'Kasa',          match: ['kasaan','kasan','kasaa','kasasta','kasalla','kasalta','kasa'],   emoji: '📚', selitys: 'Pöydän keskelle kasautuva korttikeko. Läpsyssä sinne käännetään kortteja vuorotellen — voitetaan täsmäyksellä tai haastevoitolla. Paskahousussa siihen pelataan päälle, kaadetaan T/A tai neljällä samalla, muuten nostetaan.', pelit: ['lapsy','paskahousu']           },
  { kategoria: 'alue',   term: 'Yläpino',       match: ['yläpino','yläpinot','yläpinon','yläpinoon'],                      emoji: '⬆️', selitys: 'Nouseva pino: 8→9→10→J→Q→K. Avautuu kun maan sarja 7→6→8 on pelattu. K sulkee yläpinon.',                                                                        pelit: ['ristiseiska']                  },
  { kategoria: 'alue',   term: 'Alapino',       match: ['alapino','alapinot','alapinon','alapinoon'],                       emoji: '⬇️', selitys: 'Laskeva pino: 6→5→4→3→2→A. Avautuu kun maan sarja 7→6→8 on pelattu. A sulkee alapinon.',                                                                         pelit: ['ristiseiska']                  },
  { kategoria: 'alue',   term: 'Pakka',         match: ['kaatopakka','kaatopakkaan','kaatopakasta','poistopakka','poistopakkaan','poistopakasta','pakasta','pakkaan','pakan','pakka'], emoji: '🎴', selitys: 'Nostopakka: korttien nostolähde, joka ehtyy pelin edetessä. Poistopakka: kasautuva pakka, jonka määrä kasvaa — sinne päätyvät pelatut tai hylätyt kortit. Kaatopakka: kaadetut kortit — nämä kortit eivät enää palaa peliin.',  pelitLabel: 'useimmat'                  },
  { kategoria: 'alue',   term: 'Pino',          match: ['pinon','pinoa','pinoja','pino'],                                   emoji: '🃏', selitys: 'Oma kasvot alaspäin oleva korttipino. Vuorollaan käännetään päällimmäinen yhteiseen kasaan.',                                                         pelit: ['lapsy']                        },
  { kategoria: 'alue',   term: 'Pöytä',         match: ['pöydältä','pöydälle','pöydän','pöytään'],                         emoji: '🟫', selitys: 'Alussa pöytään jaetaan 4 korttia kasvot ylöspäin irralleen. Pelin kuluessa sieltä vuorotellen kaapataan ja lisätään. Pöydän tyhjentäminen on mökin arvoinen suoritus.',  pelit: ['kasino']                       },
  { kategoria: 'alue',   term: 'Poissa',        match: ['pois pelistä'],                                                    emoji: '❌', selitys: 'Kaadetut kortit eivät palaa peliin.',                                                                                                      pelitLabel: 'useimmat'                  },
];

// ── Merkistö ─────────────────────────────────────────────────────────────────
const MERKISTO = [
  // ─ Pelitoiminnot ─────────────────────────────────────────────────────────
  { kategoria: 'toiminnot', icon: '🎯', label: 'Kaappaustila',     selitys: 'Valitse pöytäkortit, sitten käsikortti — kaappaa.', peli: 'Kasino' },
  { kategoria: 'toiminnot', icon: '🔨', label: 'Rakennustila',     selitys: 'Valitse pöytäkortteja + käsikortti → rakennelma, jonka kaappaat myöhemmin.', peli: 'Kasino' },
  { kategoria: 'toiminnot', icon: '📤', label: 'Jättämistila',     selitys: 'Valitse käsikortti — se menee pöytään muiden käytettäväksi.', peli: 'Kasino' },
  { kategoria: 'toiminnot', icon: '🏠', label: 'Mökki',            selitys: 'Kaappasit koko pöydän yhdellä siirolla — +1 lisäpiste.', peli: 'Kasino' },
  { kategoria: 'toiminnot', icon: '⚔',  label: 'Hyökkäys',         selitys: 'Hyökkääjä lyö kortit pöytään puolustajan kaadettavaksi.', peli: 'Moska · Maija' },
  { kategoria: 'toiminnot', icon: '🛡',  label: 'Puolustus',        selitys: 'Puolustaja torjuu hyökkäyskorteilla tai valttimaan kortilla.', peli: 'Moska · Maija' },
  // ─ Viestit ───────────────────────────────────────────────────────────────
  { kategoria: 'viestit',   icon: '⚠',  label: 'Varoitus',         selitys: 'Huomasit jättää mahdollisuuden käyttämättä, tai olet siirtymässä riskialttiiseen tilaan.' },
  { kategoria: 'viestit',   icon: '💡', label: 'Vinkki',           selitys: 'Strategiaehdotus koneälypelaajan siirrosta opetustilassa.' },
  { kategoria: 'viestit',   icon: '●',  label: 'Vuoro',            selitys: 'Piste pisteindikaattorin ja nimen perässä — tällä pelaajalla on vuoro.' },
  // ─ Pelaajat ──────────────────────────────────────────────────────────────
  { kategoria: 'pelaajat',  icon: '👤', label: 'Ihmispelaaja',     selitys: 'Hero — sinä pelaat tätä pelaajaa.' },
  { kategoria: 'pelaajat',  icon: '🤖', label: 'Koneäly',          selitys: 'Tietokoneen ohjaama vastustaja. Nimi arvotaan valitusta ryhmästä.' },
  // ─ Käyttöliittymä ────────────────────────────────────────────────────────
  { kategoria: 'ui',        icon: '⚙',  label: 'Asetukset',        selitys: 'Avaa asetukset, peliohjeet, sanaston ja merkistön.' },
  { kategoria: 'ui',        icon: 'ℹ',  label: 'Info',             selitys: 'Tarkempi selite — esim. pisteytyssäännöt Kasinossa.' },
  { kategoria: 'ui',        icon: '🔊', label: 'Ääni päällä',      selitys: 'Korttitehosteet ja fanfaarit kuuluvat.' },
  { kategoria: 'ui',        icon: '🔇', label: 'Ääni pois',        selitys: 'Kaikki äänet mykistetty.' },
  { kategoria: 'ui',        icon: '🔍', label: 'Avoimet kortit pois',  selitys: 'Normaali tila — näet vain omat kortit.' },
  { kategoria: 'ui',        icon: '🙈', label: 'Avoimet kortit päällä',selitys: 'Näet kaikkien pelaajien käsikortit ja piilotetut kentän kortit.' },
  { kategoria: 'ui',        icon: '🔮', label: 'Mestari',          selitys: 'Koneälyn korkein taso — muistaa pakan menot ja optimoi täydellisesti.' },
];

// ── Muutosloki: ks. src/changelogs/<kieli>.js (laiskat chunkit, ladataan Info-
// paneelista; fi on totuuden lähde ja fallback puuttuvalle kielelle) ──────────
const CHANGELOG_LOADERS = import.meta.glob('./changelogs/*.js');
const loadChangelog = (lang) =>
  (CHANGELOG_LOADERS[`./changelogs/${lang}.js`] || CHANGELOG_LOADERS['./changelogs/fi.js'])()
    .then(m => m.CHANGELOG);

// ── Tulossa ───────────────────────────────────────────────────────────────────
const TODO = [
  { label: 'Kaksivärinen korttipakka nelivärisen ohella (valittavissa Asetuksista)', status: 'deferred' },
  { label: 'Kieliversiointi (12 kieltä)', status: 'done' },
  { label: 'Replay: shakki-symbolit siirtomerkintöihin (! !! ? ?? !? ?!)', status: 'deferred' },
  // UKK herää palautteen mukana — lokalisoitu fi+en, muut kielet putoavat tähän labeliin
  { label: 'Usein kysytyt kysymykset (UKK)', status: 'deferred' },
  { label: 'Jaa peli kaverille (linkki tai QR-koodi)', status: 'deferred' },
  { label: 'Ohje: sovelluksen lisääminen puhelimen aloitusnäytölle', status: 'deferred' },
];

const mkStats = () => Object.fromEntries(GAMES.map(g => [g.id, { played: 0, wins: 0 }]));

// ── Sanasto-apufunktiot ───────────────────────────────────────────────────────

/** Pilkkoo tekstin osiin: { text, isTerm, term } */
function splitWithGlossary(text) {
  const patterns = SANASTO
    .flatMap(s => s.match.map(m => ({ m, term: s.term })))
    // pisin ensin; * ei laske pituuteen (vartalohaku)
    .sort((a, b) => {
      const la = a.m.endsWith('*') ? a.m.length - 1 : a.m.length;
      const lb = b.m.endsWith('*') ? b.m.length - 1 : b.m.length;
      return lb - la;
    });
  // Sanaraja: ei kirjainta/numeroa ennen eikä jälkeen — toimii myös ä/ö/å-kirjaimilla
  const wL = '(?<![a-zA-ZäöåÄÖÅ0-9])';
  const wR = '(?![a-zA-ZäöåÄÖÅ0-9])';
  const rx = new RegExp(
    `(${patterns.map(p => {
      if (p.m.endsWith('*')) {
        // vartalo: osuu kaikkiin sanoihin jotka alkavat vartalolla
        const stem = p.m.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return wL + stem + '[a-zA-ZäöåÄÖÅ0-9]*';
      }
      return wL + p.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + wR;
    }).join('|')})`,
    'i'
  );
  const parts = [];
  let rem = text;
  while (rem.length > 0) {
    const hit = rem.match(rx);
    if (!hit) { parts.push({ text: rem, isTerm: false }); break; }
    if (hit.index > 0) parts.push({ text: rem.slice(0, hit.index), isTerm: false });
    const canon = patterns.find(p =>
      p.m.endsWith('*')
        ? hit[0].toLowerCase().startsWith(p.m.slice(0, -1).toLowerCase())
        : p.m.toLowerCase() === hit[0].toLowerCase()
    )?.term ?? hit[0];
    parts.push({ text: hit[0], isTerm: true, term: canon });
    rem = rem.slice(hit.index + hit[0].length);
  }
  return parts;
}

/** Värikoodaa maavärit tekstiin tummaa taustaa varten */
function renderSelitys(text) {
  return text.split(/((?:[2-9]|10|[AJQKT])[♠♥♦♣]|[♠♥♦♣])/).map((p, i) => {
    const suit = p.match(/[♠♥♦♣]/)?.[0];
    return suit ? <span key={i} style={{ color: SUIT_COLOR_DARK[suit], fontWeight: 700 }}>{p}</span> : p;
  });
}

/** Yksi sääntörivi korostettavilla termeillä — laajenee paikalleen */
function RuleRow({ text }) {
  const t = useT();
  const { lang } = useLang();
  const isEn = lang !== 'fi';
  const [openTerm, setOpenTerm] = useState(null);
  const parts = splitWithGlossary(text);
  const defn = openTerm ? SANASTO.find(s => s.term === openTerm) : null;
  const defnTerm = defn ? (isEn ? t(`glossary.sanasto.${defn.term}.term`) : defn.term) : '';
  const defnSelitys = defn ? (isEn ? t(`glossary.sanasto.${defn.term}.selitys`) : defn.selitys) : '';
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
        <span style={{ color: C.gold, flexShrink: 0, fontSize: 10, marginTop: 3 }}>▸</span>
        <span style={{ fontSize: 12, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.55 }}>
          {parts.map((p, i) =>
            p.isTerm
              ? <span key={i}
                  onClick={() => setOpenTerm(o => o === p.term ? null : p.term)}
                  style={{ color: openTerm === p.term ? C.gold : '#d4b86a', textDecoration: 'underline dotted', textUnderlineOffset: 3, cursor: 'pointer', fontWeight: 600 }}>
                  {p.text}
                </span>
              : <span key={i}>{renderSelitys(p.text)}</span>
          )}
        </span>
      </div>
      {defn && (
        <div style={{ marginLeft: 14, marginTop: 3, padding: '5px 10px', background: `${C.gold}12`, borderLeft: `2px solid ${C.gold}66`, borderRadius: '0 6px 6px 0', fontSize: 11, fontFamily: 'sans-serif', lineHeight: 1.65, color: C.dim }}>
          <span style={{ color: C.gold, fontWeight: 700 }}>{defn.emoji} {defnTerm}</span>{' — '}{renderSelitys(defnSelitys)}
        </div>
      )}
    </div>
  );
}

/** Sanasto-rivi Asetuksissa: termi + expand-selitys */
function SanastoRivi({ s }) {
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const isEn = lang !== 'fi';
  const term = isEn ? t(`glossary.sanasto.${s.term}.term`) : s.term;
  const selitys = isEn ? t(`glossary.sanasto.${s.term}.selitys`) : s.selitys;
  const pelitLabel = s.pelitLabel ? (isEn ? t(`glossary.pelitLabels.${s.pelitLabel}`) : s.pelitLabel) : null;
  const gameNames = pelitLabel ?? (s.pelit || []).map(id => GAMES.find(g => g.id === id)?.name ?? id).join(', ');
  return (
    <div style={{ borderBottom: `1px solid ${C.panelBorder}33` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 2px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, flexShrink: 0, minWidth: 22, ...(s.emojiStyle || {}) }}>{s.emoji}</span>
        <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 13, color: open ? C.gold : C.text, transition: 'color 0.15s' }}>{term}</span>
        {gameNames && <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, opacity: 0.6, marginRight: 4 }}>{gameNames}</span>}
        <span style={{ fontSize: 13, color: C.dim, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 4px 10px 30px', fontSize: 12, fontFamily: 'sans-serif', lineHeight: 1.65, color: C.dim }}>
          {renderSelitys(selitys)}
        </div>
      )}
    </div>
  );
}

function StatBadge({ s }) {
  const t = useT();
  if (!s || s.played === 0) return null;
  const pct = Math.round(s.wins / s.played * 100);
  const color = pct >= 60 ? '#4caf7d' : pct >= 40 ? '#c9a84c' : '#e05c3b';
  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 10, color, marginTop: 2, letterSpacing: 0.5 }}>
      {t('ui.stat', { w: s.wins, p: s.played, pct })}
    </div>
  );
}

// Inline-SVG-liput kielivalintaan. Emojiliput eivät renderöidy Windowsilla (näkyvät
// maakoodina "GB"/"FI"), joten piirretään liput SVG:nä → näkyvät kaikilla alustoilla.
function Flag({ code }) {
  const c = { width: 18, height: 12, viewBox: '0 0 18 12', 'aria-hidden': true,
    style: { borderRadius: 2, display: 'block', flexShrink: 0, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.25)' } };
  if (code === 'fi') return (
    <svg {...c}><rect width="18" height="12" fill="#fff"/><rect x="5" width="3" height="12" fill="#003580"/><rect y="4.5" width="18" height="3" fill="#003580"/></svg>
  );
  if (code === 'sv') return (
    <svg {...c}><rect width="18" height="12" fill="#006aa7"/><rect x="5" width="3" height="12" fill="#fecc00"/><rect y="4.5" width="18" height="3" fill="#fecc00"/></svg>
  );
  if (code === 'de') return (
    <svg {...c}><rect width="18" height="4" fill="#000"/><rect y="4" width="18" height="4" fill="#dd0000"/><rect y="8" width="18" height="4" fill="#ffce00"/></svg>
  );
  if (code === 'en') return (
    <svg {...c}>
      <clipPath id="ukclip"><rect width="18" height="12"/></clipPath>
      <g clipPath="url(#ukclip)">
        <rect width="18" height="12" fill="#012169"/>
        <path d="M0,0 L18,12 M18,0 L0,12" stroke="#fff" strokeWidth="2.4"/>
        <path d="M0,0 L18,12 M18,0 L0,12" stroke="#c8102e" strokeWidth="1"/>
        <rect x="7" width="4" height="12" fill="#fff"/><rect y="4" width="18" height="4" fill="#fff"/>
        <rect x="7.6" width="2.8" height="12" fill="#c8102e"/><rect y="4.6" width="18" height="2.8" fill="#c8102e"/>
      </g>
    </svg>
  );
  // Norja: punainen, valkoreunainen sininen pohjoismaaristi
  if (code === 'no') return (
    <svg {...c}><rect width="18" height="12" fill="#ba0c2f"/><rect x="4" width="5" height="12" fill="#fff"/><rect y="3.5" width="18" height="5" fill="#fff"/><rect x="5" width="3" height="12" fill="#00205b"/><rect y="4.5" width="18" height="3" fill="#00205b"/></svg>
  );
  // Tanska: punainen, valkoinen pohjoismaaristi
  if (code === 'da') return (
    <svg {...c}><rect width="18" height="12" fill="#c8102e"/><rect x="5" width="3" height="12" fill="#fff"/><rect y="4.5" width="18" height="3" fill="#fff"/></svg>
  );
  // Islanti: sininen, valkoreunainen punainen pohjoismaaristi
  if (code === 'is') return (
    <svg {...c}><rect width="18" height="12" fill="#02529c"/><rect x="4" width="5" height="12" fill="#fff"/><rect y="3.5" width="18" height="5" fill="#fff"/><rect x="5" width="3" height="12" fill="#dc1e35"/><rect y="4.5" width="18" height="3" fill="#dc1e35"/></svg>
  );
  // Ranska: pysty sininen/valkoinen/punainen
  if (code === 'fr') return (
    <svg {...c}><rect width="6" height="12" fill="#0055a4"/><rect x="6" width="6" height="12" fill="#fff"/><rect x="12" width="6" height="12" fill="#ef4135"/></svg>
  );
  // Italia: pysty vihreä/valkoinen/punainen
  if (code === 'it') return (
    <svg {...c}><rect width="6" height="12" fill="#009246"/><rect x="6" width="6" height="12" fill="#fff"/><rect x="12" width="6" height="12" fill="#ce2b37"/></svg>
  );
  // Espanja: vaaka punainen/keltainen(tuplakorkeus)/punainen
  if (code === 'es') return (
    <svg {...c}><rect width="18" height="12" fill="#aa151b"/><rect y="3" width="18" height="6" fill="#f1bf00"/></svg>
  );
  // Ukraina: sininen yläpuolisko, keltainen alapuolisko
  if (code === 'uk') return (
    <svg {...c}><rect width="18" height="6" fill="#0057b7"/><rect y="6" width="18" height="6" fill="#ffd700"/></svg>
  );
  // Venäjä: vaaka valkoinen/sininen/punainen
  if (code === 'ru') return (
    <svg {...c}><rect width="18" height="4" fill="#fff"/><rect y="4" width="18" height="4" fill="#0039a6"/><rect y="8" width="18" height="4" fill="#d52b1e"/></svg>
  );
  // Kreikka: sini-valkoraidat + kantonissa valkoinen risti
  if (code === 'el') return (
    <svg {...c}>
      <rect width="18" height="12" fill="#0d5eaf"/>
      <rect y="1.333" width="18" height="1.333" fill="#fff"/>
      <rect y="4" width="18" height="1.333" fill="#fff"/>
      <rect y="6.667" width="18" height="1.333" fill="#fff"/>
      <rect y="9.333" width="18" height="1.333" fill="#fff"/>
      <rect width="6.667" height="6.667" fill="#0d5eaf"/>
      <rect x="2.667" width="1.333" height="6.667" fill="#fff"/>
      <rect y="2.667" width="6.667" height="1.333" fill="#fff"/>
    </svg>
  );
  // Puola: valkoinen ylä, punainen ala
  if (code === 'pl') return (
    <svg {...c}><rect width="18" height="6" fill="#fff"/><rect y="6" width="18" height="6" fill="#dc143c"/></svg>
  );
  // Viro: vaaka sininen/musta/valkoinen
  if (code === 'et') return (
    <svg {...c}><rect width="18" height="4" fill="#0072ce"/><rect y="4" width="18" height="4" fill="#000"/><rect y="8" width="18" height="4" fill="#fff"/></svg>
  );
  // Portugali: vihreä/punainen pysty + keltainen pallo rajalla
  if (code === 'pt') return (
    <svg {...c}><rect width="18" height="12" fill="#da291c"/><rect width="7.2" height="12" fill="#046a38"/><circle cx="7.2" cy="6" r="2.1" fill="#ffe000" stroke="#fff" strokeWidth="0.4"/></svg>
  );
  // Karjala: vihreä pohja, musta pohjoismaaristi punaisin reunoin (Gallen-Kallela 1920)
  if (code === 'krl') return (
    <svg {...c}><rect width="18" height="12" fill="#159b3b"/><rect x="4" width="5" height="12" fill="#d2222d"/><rect y="3.5" width="18" height="5" fill="#d2222d"/><rect x="5" width="3" height="12" fill="#000"/><rect y="4.5" width="18" height="3" fill="#000"/></svg>
  );
  return null;
}

function GameBtn({ g, stats, onSelect }) {
  const t = useT();
  const { lang } = useLang();
  const [showDesc, setShowDesc] = useState(false);
  const desc = t(`games.${g.id}.desc`);
  const rules = t(`games.${g.id}.rules`);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: 'none',
      borderRadius: 14,
      overflow: 'hidden',
      borderLeft: `4px solid ${g.diffColor}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => onSelect(g.id)}
          style={{
            background: 'transparent', border: 'none',
            padding: '14px 4px 14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 26, flexShrink: 0, minWidth: 32, textAlign: 'center' }}>{g.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{g.name}</div>
            {lang !== 'fi' && (
              <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', fontStyle: 'italic', marginBottom: 3 }}>
                {renderSelitys(t(`games.${g.id}.altName`))}
              </div>
            )}
            <StatBadge s={stats[g.id]} />
          </div>
        </button>
        <button
          onClick={() => setShowDesc(v => !v)}
          aria-label={t('ui.rulesAria', { name: g.name })}
          aria-expanded={showDesc}
          style={{
            flexShrink: 0, margin: '0 12px 0 4px', background: 'transparent',
            border: `1px solid ${C.panelBorder}`,
            borderRadius: 6, width: 28, height: 28, fontSize: 12, cursor: 'pointer',
            color: showDesc ? C.gold : C.dim, fontFamily: 'sans-serif', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >ℹ</button>
      </div>
      {showDesc && (
        <div style={{ padding: '0 14px 12px 52px' }}>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.5, fontStyle: 'italic', marginBottom: rules ? 8 : 0 }}>
            {renderSelitys(desc)}
          </div>
          {Array.isArray(rules) && rules.map((rule, i) => <RuleRow key={i} text={rule} />)}
        </div>
      )}
    </div>
  );
}

// Päävalikon kielivalitsin — custom-dropdown, ryhmittelee kielet varmennustason mukaan:
// Testatut (status native/auto) ja Testaamattomat (status untested).
// Merkki nimen jäljessä: kulta ✓ = natiivi, "web" = konevarmistettu (auto).
function langMarker(status) {
  if (status === 'native') return <span title="natiivi" style={{ fontSize: 11, color: C.gold, lineHeight: 1 }}>✓</span>;
  if (status === 'auto') return <span title="konevarmistettu (web), ei natiivitarkistusta" style={{ fontSize: 8, color: C.dim, opacity: 0.7, border: `1px solid ${C.panelBorder}`, borderRadius: 3, padding: '0 3px', lineHeight: 1.5, fontFamily: 'sans-serif' }}>web</span>;
  return null;
}
function LangSelector({ lang, setLang, t }) {
  const [open, setOpen] = useState(false);
  const groups = [
    { key: 'tested', langs: LANGS.filter(l => l.status === 'native' || l.status === 'auto') },
    { key: 'untested', langs: LANGS.filter(l => l.status === 'untested') },
  ];
  const current = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('ui.lang.label')}
        title={current.name}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'transparent', border: `1px solid ${open ? C.gold : C.panelBorder}`,
          color: open ? C.gold : C.dim, borderRadius: 9, padding: '9px 9px', cursor: 'pointer',
          fontFamily: 'sans-serif', lineHeight: 1, flexShrink: 0,
        }}
      >
        <Flag code={current.code} />
        <span style={{ fontSize: 9, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 590 }} />
          <div role="listbox" aria-label={t('ui.lang.label')} style={{
            position: 'absolute', top: '100%', right: 0,
            marginTop: 6, zIndex: 591,
            background: '#0f2419', border: `1px solid ${C.panelBorder}`, borderRadius: 10,
            padding: 8, minWidth: 210, maxHeight: 340, overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}>
            {groups.map(({ key, langs }) => langs.length > 0 && (
              <div key={key} style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 10, color: C.dim, opacity: 0.6, letterSpacing: 1.5, margin: '2px 4px 4px', textTransform: 'uppercase' }}>
                  {t(`ui.lang.${key}`)}
                </div>
                {langs.map(({ code, name, status }) => {
                  const active = lang === code;
                  return (
                    <button
                      key={code} role="option" aria-selected={active} title={name}
                      onClick={() => { setLang(code); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        background: active ? `${C.gold}22` : 'transparent',
                        border: `1px solid ${active ? C.gold : 'transparent'}`,
                        color: active ? C.gold : C.dim, borderRadius: 7,
                        padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'Georgia,serif', fontSize: 13,
                        opacity: status === 'untested' ? 0.8 : 1,
                      }}
                    >
                      <Flag code={code} />
                      <span style={{ flex: 1 }}>{name}</span>
                      {langMarker(status)}
                    </button>
                  );
                })}
              </div>
            ))}
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 9, color: C.dim, opacity: 0.5, margin: '2px 4px 0' }}>
              {t('ui.lang.note')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GameHeader({ title, onBack, gearBtn, isMobile }) {
  const t = useT();
  const btnBase = {
    background: 'rgba(13,33,24,0.92)', borderRadius: 9,
    padding: isMobile ? '9px 16px' : '10px 20px', cursor: 'pointer', fontFamily: 'Georgia,serif',
    border: '1px solid #2a4a32', color: C.dim, fontSize: isMobile ? 13 : 14,
  };
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(13,33,24,0.95)',
      borderBottom: '1px solid #2a4a32',
      padding: isMobile ? '10px 8px' : '14px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={onBack} style={{ ...btnBase, flexShrink: 0, position: 'absolute', left: 8 }}>
          {t('ui.menu.back')}
        </button>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: isMobile ? 12 : 14, color: C.text, letterSpacing: 1 }}>
          {title}
        </div>
        <div style={{ position: 'absolute', right: 8 }}>{gearBtn}</div>
      </div>
    </div>
  );
}

// ── Replay: mini-kortti ──────────────────────────────────────────────────────
function MiniCard({ card }) {
  if (!card) return (
    <span style={{ display:'inline-block', background:'rgba(255,255,255,0.15)', borderRadius:3, padding:'0 3px', fontSize:11, fontFamily:'sans-serif', fontWeight:700, margin:1, border:'1px solid rgba(255,255,255,0.2)', lineHeight:'18px', minWidth:20, textAlign:'center', color:'#888' }}>?</span>
  );
  const color = SUIT_COLOR[card.s] ?? '#ccc';
  return (
    <span style={{ display:'inline-block', background:'rgba(255,255,255,0.9)', color, borderRadius:3, padding:'0 4px', fontSize:11, fontFamily:'sans-serif', fontWeight:700, margin:1, border:'1px solid rgba(0,0,0,0.15)', lineHeight:'18px', minWidth:20, textAlign:'center' }}>
      {card.r}{card.s}
    </span>
  );
}

// ── Replay: askelnavigointinäkymä ────────────────────────────────────────────
function ReplayView({ frames, onClose, isMobile }) {
  const t = useT();
  const [idx, setIdx] = useState(frames.length - 1);
  const safeIdx = Math.min(Math.max(idx, 0), frames.length - 1);
  const frame   = frames[safeIdx];

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(frames.length - 1, i + 1));
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [frames.length, onClose]);

  if (!frame) return null;

  const navBtn = disabled => ({
    background: disabled ? 'transparent' : `${C.gold}22`,
    border: `1px solid ${disabled ? C.panelBorder : C.gold}`,
    color: disabled ? C.panelBorder : C.gold,
    borderRadius: 8, padding: '7px 16px',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'sans-serif', fontSize: 16, fontWeight: 700,
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:800, background:C.bg, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* Navigaatiopalkki */}
      <div style={{
        position:'sticky', top:0, zIndex:10, background:'rgba(13,33,24,0.97)',
        borderBottom:`1px solid ${C.panelBorder}`,
        padding: isMobile ? '8px 10px' : '10px 16px',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0} style={navBtn(safeIdx === 0)}>←</button>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
          <div style={{ textAlign:'center', fontFamily:'sans-serif', fontSize:11, color:C.dim }}>
            {safeIdx + 1} / {frames.length}
          </div>
          <input type="range" min={0} max={frames.length - 1} value={safeIdx}
            onChange={e => setIdx(Number(e.target.value))}
            style={{ width:'100%', cursor:'pointer', accentColor:C.gold }}
          />
        </div>
        <button onClick={() => setIdx(i => Math.min(frames.length - 1, i + 1))} disabled={safeIdx === frames.length - 1} style={navBtn(safeIdx === frames.length - 1)}>→</button>
        <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${C.panelBorder}`, color:C.dim, borderRadius:8, padding:'7px 12px', cursor:'pointer', fontFamily:'sans-serif', fontSize:13 }}>✕</button>
      </div>

      {/* Sisältö */}
      <div style={{ padding: isMobile ? '12px 10px' : '16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        {/* Lokiteksti — logText voi olla HTML-string tai React-node */}
        {typeof frame.logText === 'string'
          ? <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.panelBorder}`, borderRadius:10, padding:'12px 14px', fontFamily:'sans-serif', fontSize: isMobile ? 13 : 14, color:C.text, lineHeight:1.5 }}
              dangerouslySetInnerHTML={{ __html: frame.logText }} />
          : <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.panelBorder}`, borderRadius:10, padding:'12px 14px', fontFamily:'sans-serif', fontSize: isMobile ? 13 : 14, color:C.text, lineHeight:1.5 }}>
              {frame.logText}
            </div>
        }

        {/* Pelaajat + käsikortit */}
        {frame.players.map(p => (
          <div key={p.name} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`, borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
            <div style={{ minWidth:72, flexShrink:0 }}>
              <div style={{ fontFamily:'sans-serif', fontSize:12, color: p.isHuman ? C.gold : C.dim, fontWeight: p.isHuman ? 700 : 400 }}>{p.name}</div>
              {p.score !== null && <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, opacity:0.8 }}>{p.score} {t('ui.replay.pts')}</div>}
              <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, opacity:0.5 }}>({p.cardCount}k)</div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:2, flex:1, alignContent:'flex-start' }}>
              {p.hand.length > 0
                ? p.hand.map((c, ci) => <MiniCard key={ci} card={c} />)
                : <span style={{ color:C.dim, fontSize:11, fontFamily:'sans-serif', opacity:0.4 }}>—</span>
              }
            </div>
          </div>
        ))}

        {/* Pöytäkortit */}
        {frame.tableCards?.length > 0 && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`, borderRadius:8, padding:'8px 12px' }}>
            <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.gold, letterSpacing:1.5, opacity:0.8, marginBottom:6, textTransform:'uppercase' }}>{t('ui.replay.table')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
              {frame.tableCards.map((c, ci) => <MiniCard key={ci} card={c} />)}
            </div>
          </div>
        )}

        {/* Extrateksti */}
        {frame.extraText && (
          <div style={{ textAlign:'center', fontFamily:'sans-serif', fontSize:12, color:C.dim, opacity:0.7 }}>{frame.extraText}</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const t = useT();
  const { lang, setLang } = useLang();
  const [active, setActive]         = useState(null);
  // Oletuspelaajamäärä, jolla pelit alustetaan. Varsinainen valinta tehdään
  // kunkin pelin aloitusnäytöllä (Pelaajia 2/3/4), joten globaalia säädintä ei ole.
  const playerCount = 4;
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo]     = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [stats, setStats]           = useState(mkStats);
  const [showLog, setShowLog]       = useState(true);   // tapahtumaloki auki oletuksena myös pienellä näytöllä
  const [soundOn, setSoundOn]       = useStickySetting('soundOn', false);  // äänet pois oletuksena; valinta muistetaan
  const [seeAll, setSeeAll]         = useState(false);
  const [showCounts, setShowCounts] = useState(true);
  const [showLastPlay, setShowLastPlay] = useState(true);
  const [showIntention, setShowIntention] = useState(true);
  const [showNextBtn, setShowNextBtn]   = useState(true);
  const [showAIKnown, setShowAIKnown]   = useState(true);
  const [aiLevel, setAiLevel]           = useState('normal'); // 'beginner' | 'normal' | 'hard'
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 600);
  // Ensikertalainen kokoelmassa → Meme-jengi oletuksena (hauska ensivaikutelma);
  // sen jälkeen satunnainen ryhmä. 'visited'-lippu persistoidaan (onboarding-tila, ks. storage.js).
  const [playerGroup, setPlayerGroup] = useState(() => {
    if (!loadPref('visited', false)) return 'meme';
    const groups = ['laituri', 'jumalat', 'puolue', 'kansa', 'meme', 'goauld'];
    return groups[Math.floor(Math.random() * groups.length)];
  });
  const [goauldTaunt, setGoauldTaunt] = useState(() => GOAULD_TAUNTS[Math.floor(Math.random() * GOAULD_TAUNTS.length)]);
  const [resultData, setResultData] = useState(null);   // {ranking, revealCards?, scoreBreakdown?}
  const [botResult, setBotResult]   = useState(null);   // bot-only result — stay on game view
  const [gameKey, setGameKey]       = useState(0);       // increment → remount game
  const [showGlossary, setShowGlossary] = useState(false);
  const [showEsittely, setShowEsittely] = useState(false);
  const [siirtorekisteri, setSiirtorekisteri] = useState([]); // allBots replay frames
  const [replayOpen, setReplayOpen]     = useState(false);
  const [showChangelog, setShowChangelog]       = useState(false);
  const [changelogData, setChangelogData]       = useState(null); // ladataan laiskasti changelogs/<lang>.js:stä
  // Lataa muutosloki kun se avataan, ja uudelleen jos kieli vaihtuu sen ollessa auki.
  useEffect(() => {
    if (showChangelog) loadChangelog(lang).then(setChangelogData).catch(() => {});
  }, [showChangelog, lang]);
  const [showTodo, setShowTodo]                 = useState(false);
  const [showPeliasetukset, setShowPeliasetukset] = useState(false);
  const [showKonealy, setShowKonealy]           = useState(false);
  const [showPelaajat, setShowPelaajat]         = useState(false);

  // Merkitse kokoelma nähdyksi → seuraavalla kerralla ryhmä arvotaan (ks. playerGroup-init).
  useEffect(() => { savePref('visited', true); }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (active) window.history.pushState(null, '');
    window.scrollTo(0, 0);
  }, [active]);

  useEffect(() => {
    if (botResult) window.scrollTo(0, 0);
  }, [botResult]);

  useEffect(() => {
    setSiirtorekisteri([]);
    setReplayOpen(false);
  }, [gameKey]);

  useEffect(() => {
    const handlePop = () => setActive(null);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const playerPool = playerGroup === 'laituri' ? LAITURI_SPECIAL
    : playerGroup === 'jumalat'  ? ONNEN_JUMALAT
    : playerGroup === 'puolue'   ? IHMISTEN_PUOLUE
    : playerGroup === 'meme'     ? MEME_GANG
    : playerGroup === 'goauld'   ? GOAULD
    : KANSA;
  // Goa'uld näyttää satunnaisen julkeuden, muut ryhmät kiinteän kuvauksen.
  const currentBlurb = playerGroup === 'goauld' ? goauldTaunt : GROUP_BLURB[playerGroup];

  function selectGame(id) {
    setActive(id);
  }

  function recordResult(gameId, heroWon) {
    setStats(prev => ({
      ...prev,
      [gameId]: { played: prev[gameId].played + 1, wins: prev[gameId].wins + (heroWon ? 1 : 0) },
    }));
  }

  function handleSnapshot(frame) {
    setSiirtorekisteri(prev => [...prev, frame]);
  }

  function handleGameResult(gameId, result) {
    // result = {ranking, revealCards?, scoreBreakdown?}
    const isBotOnly = !result.ranking.some(r => r.isHuman);
    if (isBotOnly) {
      setBotResult(result);
    } else {
      const heroWon = result.ranking.find(r => r.isHuman)?.place === 1;
      recordResult(gameId, heroWon);
      setResultData(result);
    }
  }

  const gearBtn = (
    <button
      onClick={() => setShowSettings(v => !v)}
      style={{
        background: 'transparent', border: `1px solid ${showSettings ? C.gold : C.panelBorder}`,
        color: showSettings ? C.gold : C.dim, borderRadius: 9, padding: '9px 12px',
        fontSize: 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label={t('ui.menu.settings')}
    >⚙</button>
  );

  const infoBtn = (
    <button
      onClick={() => setShowInfo(v => !v)}
      style={{
        background: 'transparent', border: `1px solid ${showInfo ? C.gold : C.panelBorder}`,
        color: showInfo ? C.gold : C.dim, borderRadius: 9, padding: '9px 12px',
        fontSize: 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label={t('ui.menu.info')}
    >ℹ</button>
  );

  // Jaa peli: Web Share API (mobiili → natiivi jakovalikko), muuten kopioi linkki leikepöydälle.
  const shareGame = async () => {
    const data = { title: t('ui.share.title'), text: t('ui.share.text'), url: SHARE_URL };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* käyttäjä perui jaon */ }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(SHARE_URL);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch { /* leikepöytä ei käytettävissä */ }
    }
  };
  const shareBtn = (
    <button
      onClick={shareGame}
      style={{
        background: 'transparent', border: `1px solid ${shareCopied ? C.gold : C.panelBorder}`,
        color: shareCopied ? C.gold : C.dim, borderRadius: 9, padding: '9px 12px',
        fontSize: 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label={t('ui.menu.share')}
      title={shareCopied ? t('ui.share.copied') : t('ui.menu.share')}
    >{shareCopied ? '✓' : (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    )}</button>
  );

  const glossaryScreen = showGlossary && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, overflowY: 'auto', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13 }}>{t('glossary.backInfo')}</button>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: C.gold, letterSpacing: 2 }}>{t('glossary.title')}</span>
          <div style={{ width: 90 }} />
        </div>

        {/* Sanasto */}
        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 8, opacity: 0.8 }}>{t('glossary.sanastoTitle')}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
            {t('glossary.sanastoIntro')}
          </div>
          {[
            { key: 'perus',  label: 'Perustermit' },
            { key: 'kortti', label: 'Kortit ja erikoistilanteet' },
            { key: 'alue',   label: 'Alueet ja vyöhykkeet' },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>{t('glossary.cat.' + key)}</div>
              {SANASTO.filter(s => s.kategoria === key).map(s => <SanastoRivi key={s.term} s={s} />)}
            </div>
          ))}
        </div>

        {/* Merkistö */}
        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 8, opacity: 0.8 }}>{t('glossary.merkistoTitle')}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
            {t('glossary.merkistoIntro')}
          </div>
          {[
            { key: 'toiminnot', label: 'Pelitoiminnot' },
            { key: 'viestit',   label: 'Viestit' },
            { key: 'pelaajat',  label: 'Pelaajat' },
            { key: 'ui',        label: 'Käyttöliittymä' },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>{t('glossary.cat.' + key)}</div>
              {MERKISTO.filter(m => m.kategoria === key).map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.panelBorder}33` }}>
                  <span style={{ fontSize: 15, flexShrink: 0, minWidth: 22, textAlign: 'center', lineHeight: 1 }}>{m.icon}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text, flexShrink: 0, minWidth: 130 }}>{lang === 'fi' ? m.label : t(`glossary.merkisto.${m.label}.label`)}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.45, flex: 1 }}>
                    {lang === 'fi' ? m.selitys : t(`glossary.merkisto.${m.label}.selitys`)}
                    {m.peli && <span style={{ color: C.gold, opacity: 0.6, marginLeft: 4 }}>({m.peli})</span>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13, width: '100%' }}>{t('glossary.backToInfo')}</button>
      </div>
    </div>
  );

  const settingsPanel = showSettings && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '16px 12px' : '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>{t('ui.settings.title')}</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >{t('ui.settings.close')}</button>
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPeliasetukset(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.settings.gameSettings')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showPeliasetukset ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showPeliasetukset && (
            <div style={{ padding: '0 14px 14px' }}>
              {(() => {
                const isAllBots = siirtorekisteri.length > 0 || !!botResult;
                return [
                  !isAllBots && { label: t('ui.settings.seeAll'),       val: seeAll,        set: setSeeAll        },
                  { label: t('ui.settings.godMode'),                    disabled: true                          },
                  { label: t('ui.settings.showCounts'),                 val: showCounts,    set: setShowCounts    },
                  !isAllBots && { label: t('ui.settings.showAIKnown'),  val: showAIKnown,   set: setShowAIKnown   },
                  { label: t('ui.settings.showLastPlay'),               val: showLastPlay,  set: setShowLastPlay  },
                  { label: t('ui.settings.showIntention'),              val: showIntention, set: setShowIntention },
                  { label: t('ui.settings.showNextBtn'),                val: showNextBtn,   set: setShowNextBtn   },
                  { label: t('ui.settings.showLog'),                    val: showLog,       set: setShowLog       },
                  { label: t('ui.settings.sound'),                      val: soundOn,       set: setSoundOn       },
                ].filter(Boolean);
              })().map(({ label, val, set, disabled }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1 }}>
                  <input
                    type="checkbox" checked={disabled ? false : val} onChange={disabled ? undefined : () => set(v => !v)}
                    disabled={!!disabled}
                    style={{ accentColor: C.gold, width: 14, height: 14, marginTop: 1, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: isMobile ? 11 : 12, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowKonealy(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.settings.aiTitle')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showKonealy ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showKonealy && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'beginner', label: t('ui.settings.ai.beginner.label'), desc: t('ui.settings.ai.beginner.desc') },
                  { key: 'normal',   label: t('ui.settings.ai.normal.label'),   desc: t('ui.settings.ai.normal.desc') },
                  { key: 'hard',     label: t('ui.settings.ai.hard.label'),     desc: t('ui.settings.ai.hard.desc') },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => setAiLevel(key)}
                    style={{
                      flex: 1, minWidth: 'calc(33% - 4px)', padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'sans-serif', fontSize: 12,
                      background: aiLevel === key ? `${C.gold}22` : 'transparent',
                      border: `1px solid ${aiLevel === key ? C.gold : C.panelBorder}`,
                      color: aiLevel === key ? C.gold : C.dim,
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPelaajat(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.settings.playersTitle')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showPelaajat ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showPelaajat && (
          <div style={{ padding: '0 14px 14px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            {t('ui.settings.playersIntro')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'laituri', label: t('ui.settings.groups.laituri'),  pool: LAITURI_SPECIAL  },
              { key: 'jumalat', label: t('ui.settings.groups.jumalat'),  pool: ONNEN_JUMALAT    },
              { key: 'puolue',  label: t('ui.settings.groups.puolue'),   pool: IHMISTEN_PUOLUE  },
              { key: 'kansa',   label: t('ui.settings.groups.kansa'),    pool: KANSA            },
              { key: 'meme',    label: t('ui.settings.groups.meme'),     pool: MEME_GANG        },
              { key: 'goauld',  label: t('ui.settings.groups.goauld'),   pool: GOAULD           },
            ].map(({ key, label, pool }) => (
              <button
                key={key}
                onClick={() => {
                  setPlayerGroup(key);
                  if (key === 'goauld') setGoauldTaunt(GOAULD_TAUNTS[Math.floor(Math.random() * GOAULD_TAUNTS.length)]);
                }}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'sans-serif', fontSize: 12,
                  background: playerGroup === key ? `${C.gold}22` : 'transparent',
                  border: `1px solid ${playerGroup === key ? C.gold : C.panelBorder}`,
                  color: playerGroup === key ? C.gold : C.dim,
                  transition: 'all 0.15s',
                }}
              >
                {label}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{t('ui.settings.namesCount', { n: pool.length })}</div>
              </button>
            ))}
          </div>
          {currentBlurb && (
            <p style={{ margin: '0 0 8px', fontSize: 11, color: C.dim, fontFamily: 'sans-serif', fontStyle: 'italic', opacity: 0.85 }}>
              {currentBlurb}
            </p>
          )}
          {playerGroup === 'puolue' && (
            <a href={PUOLUE_YT} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 0 8px',
              color: C.gold, fontSize: 11, fontFamily: 'sans-serif', textDecoration: 'none',
              border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '5px 10px',
            }}>▶ Ihmisten Puolue · YouTube (English subtitles)</a>
          )}
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.8, opacity: 0.7 }}>
            {playerPool.join(' · ')}
          </div>
          </div>
          )}
        </div>

      </div>
    </div>
  );

  const infoPanel = showInfo && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '16px 12px' : '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>{t('ui.info.title')}</span>
          <button
            onClick={() => setShowInfo(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >{t('ui.info.close')}</button>
        </div>

        {/* Kielivalinta siirretty päävalikkoon (LangSelector) — ei enää Info-paneelissa. */}

        {/* Esittely */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowEsittely(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.esittely')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showEsittely ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showEsittely && (
            <div style={{ padding: '0 14px 14px' }}>
              {t('ui.infoPanel.esittelyParas').map((para, i) => (
                <p key={i} style={{ margin: '0 0 8px', color: C.text, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>{para}</p>
              ))}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <a href={feedbackUrl(lang)} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                  border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
                }}>{t('ui.infoPanel.feedbackForm')}</a>
                <a href={MAILTO} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                  border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
                }}>{t('ui.infoPanel.feedback')}</a>
                <a href={KOFI} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: C.red, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                  border: `1px solid ${C.red}55`, borderRadius: 8, padding: '6px 12px',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                  Support via Ko-fi
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sanasto & Merkistö */}
        <button
          onClick={() => setShowGlossary(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.glossaryLink')}</span>
          <span style={{ color: C.gold, fontSize: 16 }}>›</span>
        </button>

        {/* Muutosloki */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowChangelog(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.changelog')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showChangelog ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showChangelog && changelogData && (
            <div style={{ padding: '0 14px 14px' }}>
              {changelogData.map((entry, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>{entry.date}</div>
                  {entry.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: C.gold, fontSize: 10, flexShrink: 0, marginTop: 3 }}>▸</span>
                      <span style={{ fontSize: 11, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tulossa */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowTodo(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.todo')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showTodo ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showTodo && (
            <div style={{ padding: '0 14px 14px' }}>
              {TODO.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.panelBorder}33`, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                    {item.status === 'open' ? '🎯' : item.status === 'done' ? '✅' : '⏸'}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'sans-serif', lineHeight: 1.55, color: item.status === 'done' ? C.dim : C.text, textDecoration: item.status === 'done' ? 'line-through' : 'none', opacity: item.status === 'deferred' ? 0.55 : 1 }}>{t('ui.infoPanel.todoItems')[i] ?? item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );

  if (active) {
    const game = GAMES.find(g => g.id === active);
    const GameComponent = game.component;
    const maxW = isMobile ? 'calc(100vw - 20px)' : game.maxWidth;

    // Tulosruutu pelin jälkeen (vain ihmispelaajan peli)
    if (resultData) {
      return (
        <GameResult
          ranking={resultData.ranking}
          revealCards={resultData.revealCards}
          scoreBreakdown={resultData.scoreBreakdown}
          isMobile={isMobile}
          onNewGame={() => { setResultData(null); setGameKey(k => k + 1); }}
          onMenu={() => { setResultData(null); setActive(null); }}
        />
      );
    }

    // Bottien Taistelu päättyi — näytetään banneri pelin päällä, loki jää näkyviin
    const botBanner = botResult && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 18px',
        background: `${C.gold}14`,
        borderBottom: `1px solid ${C.gold}44`,
        gap: 12,
      }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: isMobile ? 12 : 13, color: C.gold }}>
          {t('ui.botBanner.won', { name: botResult.ranking[0]?.name })}
        </span>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {siirtorekisteri.length > 0 && (
            <button
              onClick={() => setReplayOpen(true)}
              style={{
                background: 'transparent', border: `1px solid ${C.gold}`, borderRadius: 8,
                padding: isMobile ? '5px 10px' : '6px 14px',
                color: C.gold, fontFamily: 'Georgia,serif',
                fontSize: isMobile ? 11 : 12, cursor: 'pointer',
              }}
            >
              {t('ui.botBanner.replay', { n: siirtorekisteri.length })}
            </button>
          )}
          <button
            onClick={() => { setBotResult(null); setActive(null); setGameKey(k => k + 1); }}
            style={{
              background: C.gold, border: 'none', borderRadius: 8,
              padding: isMobile ? '6px 14px' : '7px 18px',
              color: '#0d2118', fontFamily: 'Georgia,serif',
              fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t('ui.botBanner.toMenu')}
          </button>
        </div>
      </div>
    );

    return (
      <div style={{ maxWidth: maxW, margin: '0 auto' }}>
        <Announcer message={siirtorekisteri[siirtorekisteri.length - 1]?.logText} />
        {replayOpen && siirtorekisteri.length > 0 && (
          <ReplayView frames={siirtorekisteri} onClose={() => setReplayOpen(false)} isMobile={isMobile} />
        )}
        {settingsPanel}
        {glossaryScreen}
        <GameHeader title={game.name} onBack={() => { setResultData(null); setBotResult(null); setActive(null); }} gearBtn={gearBtn} isMobile={isMobile} />
        {botBanner}
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: C.dim, fontFamily: 'Georgia,serif', fontSize: 14, letterSpacing: 2 }}>
            {t('ui.loading')}
          </div>
        }>
        <GameComponent
          key={gameKey}
          game={game}
          showLog={showLog}
          soundOn={soundOn}
          seeAll={seeAll}
          showCounts={showCounts}
          showLastPlay={showLastPlay}
          showIntention={showIntention}
          isMobile={isMobile}
          playerCount={Math.max(playerCount, game.minPlayers)}
          playerNames={playerPool}
          showNextBtn={showNextBtn}
          showAIKnown={showAIKnown}
          aiLevel={aiLevel}
          onAiLevelChange={setAiLevel}
          onResult={(result) => handleGameResult(active, result)}
          onSnapshot={handleSnapshot}
        />
        </Suspense>
      </div>
    );
  }

  return (
    <main style={{
      background: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? 10 : 16, padding: isMobile ? '16px 12px' : '32px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      {settingsPanel}
      {infoPanel}
      {glossaryScreen}

      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: isMobile ? '100%' : 900, marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 8 : 14 }}>
          <h1 style={{
            fontSize: isMobile ? 32 : 48, letterSpacing: isMobile ? 6 : 12, margin: 0,
            background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            JAKO<span style={{ fontSize: isMobile ? 15 : 22, verticalAlign: 'super', letterSpacing: 2 }}>{GAMES.length}</span>
          </h1>
        </div>
        <div style={{ position: 'absolute', right: 0, display: 'flex', gap: 8, alignItems: 'center' }}><LangSelector lang={lang} setLang={setLang} t={t} />{shareBtn}{infoBtn}{gearBtn}</div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 900,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {GAMES.map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={selectGame} />)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#b9c7b2', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
        v{APP_VERSION} · {BUILD_DATE} {BUILD_TIME}
      </div>
    </main>
  );
}
