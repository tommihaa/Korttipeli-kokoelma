import { useState, useEffect } from 'react';
import { C, SUIT_COLOR, SUIT_COLOR_DARK } from './shared/colors.js';
import GameResult from './shared/GameResult.jsx';

/* eslint-disable no-undef */
const APP_VERSION = __APP_VERSION__;
const BUILD_DATE  = __BUILD_DATE__;
const BUILD_TIME  = __BUILD_TIME__;
/* eslint-enable no-undef */
const MAILTO = `mailto:no.jopas@gmail.com?subject=${encodeURIComponent(`Version ${APP_VERSION}, Deploy ${BUILD_DATE}, Jako52 palaute`)}`;
import Koputus from './games/Koputus.jsx';
import Lapsy from './games/Lapsy.jsx';
import Kultakala from './games/Kultakala.jsx';
import Maija from './games/Maija.jsx';
import Kasino from './games/Kasino.jsx';
import Moska from './games/Moska.jsx';
import Seiska from './games/Seiska.jsx';
import Ristiseiska from './games/Ristiseiska.jsx';
import Paskahousu from './games/Paskahousu.jsx';
import Admin from './Admin.jsx';

const LAITURI_SPECIAL  = ['Antti','Arto','Arttu','Janus','Jens','Jokke','Juuso','Jukka','Kirsi','Markku','Marko','Markus','Marviel','Mika','Mikael','Osku','Panja','Rebekka','Sanna','Sari','Simo','Sune','Tarja','Teemu','Tinja'];
const ONNEN_JUMALAT    = ['Vortumna','Loki','Fortuna','Tykhe','Tommi Palleroine'];
const IHMISTEN_PUOLUE  = ['Hannes','Päivi','Regina','Tapani (DI)','Topi-Petteri'];
const KANSA            = ['Astraalitason tirehtööri','Boomer','Jonne','Justiina','Karen','Kukkahattutäti','Lumihiutale','NPC','Rane','Random','Setämies','Veeti'];

const GAMES = [
  {
    id: 'kultakala', name: 'Kultakala', emoji: '🐟',
    desc: 'Muistipeli, jos katsot niin vaihdat',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Kultakala, maxWidth: 560, pakka: 'taydennetty',
    rules: [
      'Kenttäsi: 6 piilossa — 1 tuntematon pistelaskuun asti, 5 muuta voit katsoa',
      'Nosta pakasta tai poistopakasta',
      'Vaihda nostettu huonompaan tai hylkää poistopakkaan',
      'Pakka loppuu → kaikki paljastetaan ja pisteet lasketaan',
    ],
  },
  {
    id: 'lapsy', name: 'Läpsy', emoji: '👋',
    desc: 'Reaktiopeli',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Lapsy, maxWidth: 520, pakka: 'jaettu',
    rules: [
      'Läpsää kasaa, kun kaksi päällimmäistä korttia täsmäävät',
      'Oikein → voitat kasan · Väärin → lisäät kortin kasaan',
      'Kasaan käännetty kuvakortti on haaste seuraavalle pelaajalle, 1–4 korttia aikaa siirtää haaste seuraavalle kääntämällä pinostaan kuvakortti',
      'Viimeinen, jolla kortteja voittaa',
    ],
  },
  {
    id: 'ristiseiska', name: 'Ristiseiska', emoji: '♣',
    desc: 'Kiusantekoa, korttipantteja ja kärsivällisyyttä',
    players: '3–4', minPlayers: 3, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Ristiseiska, maxWidth: 620, pakka: 'jaettu',
    rules: [
      '7♣ aloittaa · jatka 6♣:lla tai avaa uusi maa toisella 7:llä',
      'Saman maan sarjassa pelatut 7→6→8 avaa maan alapinon (6→A) ja yläpinon (8→K)',
      'Jos käsikorteista ei löydy käypää → korttipantti: edellinen pelaaja (jolla enemmän kuin 1 kortti jäljellä) antaa sinulle käsikorteistaan vaikeasti pelattavan',
      'Ensin korteitta → voittaa',
      'Viimeisenä kortteja kädessä → häviää',
    ],
  },
  {
    id: 'seiska', name: 'Seiska', emoji: '7️⃣',
    desc: 'UNO-tyyppinen kilpajuoksu kortittomuuteen',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Seiska, maxWidth: 580, pakka: 'kierratetty', suosikki: true,
    rules: [
      'Lyö sama maa (1 kerralla) TAI sama arvo (useampi kerralla)',
      'Ei sovi → nosta max 3 korttia, pelaa heti jos löytyy',
      '7 → valitse vaadittu maa',
      'A → bonusvuoro saman maan kortilla',
      '1 kortti → ilmoita LAPPU tai myöhästyessäsi saat 3 lisäkorttia',
      'Ensin korteitta → voittaa',
      'Viimeisenä kortteja kädessä → häviää',
    ],
  },
  {
    id: 'kasino', name: 'Kasino', emoji: '🂺',
    desc: 'Kaappaa koko pöytä',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Kasino, maxWidth: 560, pakka: 'taydennetty', suosikki: true,
    rules: [
      'Laske pöydän korteista täsmääkö joku summa käsikorttisi arvon kanssa — tee kaappaus',
      'Tai jätä kortti pöytään — muut voivat käyttää sitä omien käsikorttiensa summiin',
      'Rakennelma: valitse pöytäkortteja + käsikortti → summa, jonka kaappaat myöhemmin toisella saman arvoisella kortilla',
      'Mökki: kaappaa kaikki pöydältä → 1 lisäpiste',
      'Ensimmäisenä 16+ pistettä voittaa',
    ],
  },
  {
    id: 'koputus', name: 'Koputus', emoji: '🤜',
    desc: 'Muistipeli yllätysmomentein',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Koputus, maxWidth: 560, pakka: 'taydennetty',
    rules: [
      'Alussa saat kurkata kaksi korttia. Opi pelin aikana muutkin tai vaihda pakasta vedettyyn.',
      'Kun poistopakka ja kortti kentästäsi täsmää → käännä kortti poistopakkaan nopeiten',
      'Koputus käynnistää viimeisen kierroksen',
      'Pienin pistemäärä paljastuksessa voittaa',
    ],
  },
  {
    id: 'maija', name: 'Maija', emoji: '🂭',
    desc: 'Osittainen kaato — torjuntavoitto. Täyskaato — hyökkäät.',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Maija, maxWidth: 560, pakka: 'taydennetty',
    rules: [
      'Hyökkääjä lyö kortteja — puolustaja torjuu',
      'Torju samalla maalla korkeammalla tai valtilla',
      'Täyskaato → sinä hyökkäät seuraavaksi',
      'Q♠ = Maija — ei voi torjua eikä torju muita',
      'Valttimaa paljastetaan alussa',
      'Ensin korteitta → voittaa',
      'Viimeisenä kortteja kädessä → häviää',
    ],
  },
  {
    id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',
    desc: <>Lähes se perinteinen paskahousu kuudella kortilla. <span style={{color:SUIT_COLOR_DARK['♦']}}>2♦</span> <span style={{color:SUIT_COLOR_DARK['♥']}}>2♥</span>{' arvo 2 · '}<span style={{color:SUIT_COLOR_DARK['♠']}}>2♠</span> <span style={{color:SUIT_COLOR_DARK['♣']}}>2♣</span>{' kovia'}</>,
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true,
    rules: [
      'Pelaa samaa tai suurempaa arvoa kasaan, vaikka useampi. Neljä samaa kaataa kasan pelistä pois.',
      '2♠ / 2♣ = kova kakkonen — lyö minkä tahansa ei-kaatokortin päälle',
      '10 tai A kaataa kasan · neljä samaa kaataa myös',
      'Ensin korteitta → voittaa',
      'Viimeisenä kortteja kädessä → häviää',
    ],
  },
  {
    id: 'moska', name: 'Moska', emoji: '⚔️',
    desc: 'Totaalinen korttisota: hyökkää, siirrä, puolusta ja muista iskeä kylkeen.',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Vaativa', diffColor: '#e05c3b',
    component: Moska, maxWidth: 580, pakka: 'taydennetty',
    rules: [
      'Hyökkääjä lyö kortteja — puolustaja voi siirtää samanarvoisella, puolustautua kaatamalla kaikki tai nostaa kaikki',
      'Muut voivat vuorollaan lyödä sivusta hyökkäykseen tai puolustukseen käytetyillä arvoilla',
      'Torju samalla maalla korkeammalla tai valttikortilla',
      'Valttimaa paljastetaan alussa',
      'Ensin korteitta → voittaa',
      'Viimeisenä kortteja kädessä → häviää',
    ],
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

// ── Muutosloki ────────────────────────────────────────────────────────────────
const CHANGELOG = [
  {
    date: '30.5.2026',
    items: [
      'Pelaajamäärä valitaan vain pelin aloitusnäytöllä (poistettu päällekkäinen säädin Asetuksista)',
      'Katselutila-palkki (tahtisäädin) nyt kaikissa 9 pelissä — myös Läpsy, Ristiseiska ja Paskahousu',
      'Vuoroviesti yhtenäistetty: "Vuorossa X." kaikissa vuoropohjaisissa peleissä',
      'Tapahtumaviestit yhtenäistetty kolmanteen persoonaan (pohjaa kieliversioinnille)',
      'Ristiseiska: pelatun kortin vaikutus näkyy lokissa (esim. "avaa maan", "alapino ei avaudu vielä")',
      'Bottien Taistelu: korjattu kohtia joissa bottia puhuteltiin pelaajana',
      'Seiska: Bottien Taistelu -rivin korkeus — aikomus-kortti ei enää leikkaudu',
      'Sisäinen siivous: Moskasta poistettu vähän käytetty Momentti-tallennus, korjattu kirjoitusasu',
    ],
  },
  {
    date: '29.5.2026',
    items: [
      'Katselutila-palkki yhtenäistetty: kaikissa peleissä sama tahtisäädin (Seiskan +/- napit korvattu liukusäätimellä)',
      'Sisäinen siivous: kuollut koodi poistettu, korttipakan luonti ja katselutila-palkki jaettu yhteisiksi moduuleiksi',
      'Strategiatippi-tila (teachMode) poistettu kokonaan',
    ],
  },
  {
    date: '29.5.2026',
    items: [
      'Bottien Taistelu: AI-taso seuraa Asetuksista valittua tasoa (Oppipoika/Kisälli/Mestari)',
      'Bottien Taistelu -nappi näyttää valitun tason dynaamisesti',
    ],
  },
  {
    date: '29.5.2026',
    items: [
      'Koneälyn tasot nimetty uudelleen: Oppipoika · Kisälli · Mestari',
      'Asetukset: kaikki osiot suljettu oletuksena, avautuvat napautuksella',
      'Asetukset: Muutosloki ja Tulossa -osiot lisätty',
      '/deploy-komento päivittää Muutoslokin automaattisesti',
    ],
  },
  {
    date: '28.5.2026',
    items: [
      'Asetukset: "Näytä kaikki kortit" ja muistipeliasetus piilotettu Bottien Taistelu -tilassa',
      '"Bottien Taistelu" -nappi näyttää "Mestari" — kaikki 9 peliä',
      'Debug-näkymän nappi nimetty "Avoimet kortit" — kaikki 9 peliä',
      'Replay: väritetyt korttimerkit renderöityvät lokissa oikein',
      'Seiska: katselutila-palkki ja AI-ässäbonus-bugit korjattu',
    ],
  },
  {
    date: '27.5.2026',
    items: [
      'Bottien Taistelu: tapahtumaloki ja pelaajatilat näkyvät pelin aikana',
      'Kultakala: allBots — pelaaja 0 ei enää näy muiden bottien joukossa',
    ],
  },
  {
    date: '26.5.2026',
    items: [
      'Bottien Taistelu: askelpalautus — selaa jokaista siirtoa taaksepäin',
      'AllBots-parannukset: vuoroviestit, pakkasekoitus, AI-maanvaihto',
      'AI-tasot 3 kpl: Oppipoika · Kisälli · Mestari',
    ],
  },
  {
    date: '25.5.2026',
    items: [
      'Paskahousu: AI-inferenssi, äkkikuolema, parannettuja viestejä',
      'AllBots-katselutila: pelattavat kortit korostettu, järjestys yhtenäistetty',
    ],
  },
];

// ── Tulossa ───────────────────────────────────────────────────────────────────
const TODO = [
  { label: 'Bottien Taistelu: AI-taso seuraa Asetuksista valittua tasoa', status: 'done' },
  { label: 'Pelikohtaiset sääntövalinnat pelin valinta-näyttöön (pelaajamäärän viereen). Paskahousu: 5 vai 6 korttia, ovatko kakkoset kovia, minkä päälle kuvakortin saa laskea (7/8/9). Kasino: salli rakennelmat erikoiskorttien arvoille — ässä 14, pata 2 = 15, ruutu 10 = 16', status: 'deferred' },
  { label: 'Kieliversiointi (FI/EN)', status: 'deferred' },
  { label: 'Replay: shakki-symbolit siirtomerkintöihin (! !! ? ?? !? ?!)', status: 'deferred' },
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
  const [openTerm, setOpenTerm] = useState(null);
  const parts = splitWithGlossary(text);
  const defn = openTerm ? SANASTO.find(s => s.term === openTerm) : null;
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
          <span style={{ color: C.gold, fontWeight: 700 }}>{defn.emoji} {defn.term}</span>{' — '}{renderSelitys(defn.selitys)}
        </div>
      )}
    </div>
  );
}

/** Sanasto-rivi Asetuksissa: termi + expand-selitys */
function SanastoRivi({ s }) {
  const [open, setOpen] = useState(false);
  const gameNames = s.pelitLabel ?? (s.pelit || []).map(id => GAMES.find(g => g.id === id)?.name ?? id).join(', ');
  return (
    <div style={{ borderBottom: `1px solid ${C.panelBorder}33` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 2px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, flexShrink: 0, minWidth: 22, ...(s.emojiStyle || {}) }}>{s.emoji}</span>
        <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 13, color: open ? C.gold : C.text, transition: 'color 0.15s' }}>{s.term}</span>
        {gameNames && <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, opacity: 0.6, marginRight: 4 }}>{gameNames}</span>}
        <span style={{ fontSize: 13, color: C.dim, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 4px 10px 30px', fontSize: 12, fontFamily: 'sans-serif', lineHeight: 1.65, color: C.dim }}>
          {renderSelitys(s.selitys)}
        </div>
      )}
    </div>
  );
}

function StatBadge({ s }) {
  if (!s || s.played === 0) return null;
  const pct = Math.round(s.wins / s.played * 100);
  const color = pct >= 60 ? '#4caf7d' : pct >= 40 ? '#c9a84c' : '#e05c3b';
  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 10, color, marginTop: 2, letterSpacing: 0.5 }}>
      {s.wins}V / {s.played}P · {pct}%
    </div>
  );
}

function GameBtn({ g, stats, onSelect }) {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: 'none',
      borderRadius: 14,
      overflow: 'hidden',
      borderLeft: `4px solid ${g.diffColor}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
    }}>
      <button
        onClick={() => onSelect(g.id)}
        style={{
          background: 'transparent', border: 'none',
          padding: '14px 12px 14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', textAlign: 'left', width: '100%',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 26, flexShrink: 0, minWidth: 32, textAlign: 'center' }}>{g.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{g.name}</div>
          <StatBadge s={stats[g.id]} />
        </div>
        <span
          onClick={e => { e.stopPropagation(); setShowDesc(v => !v); }}
          style={{
            flexShrink: 0, border: `1px solid ${C.panelBorder}`,
            borderRadius: 6, width: 24, height: 24, fontSize: 11, cursor: 'pointer',
            color: showDesc ? C.gold : C.dim, fontFamily: 'sans-serif', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >ℹ</span>
      </button>
      {showDesc && (
        <div style={{ padding: '0 14px 12px 52px' }}>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.5, fontStyle: 'italic', marginBottom: g.rules ? 8 : 0 }}>
            {g.desc}
          </div>
          {g.rules && g.rules.map((rule, i) => <RuleRow key={i} text={rule} />)}
        </div>
      )}
    </div>
  );
}

function GameHeader({ title, onBack, gearBtn, isMobile }) {
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
          ← Valikko
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
              {p.score !== null && <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, opacity:0.8 }}>{p.score} pts</div>}
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
            <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.gold, letterSpacing:1.5, opacity:0.8, marginBottom:6, textTransform:'uppercase' }}>Pöytä</div>
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
  const [active, setActive]         = useState(null);
  // Oletuspelaajamäärä, jolla pelit alustetaan. Varsinainen valinta tehdään
  // kunkin pelin aloitusnäytöllä (Pelaajia 2/3/4), joten globaalia säädintä ei ole.
  const playerCount = 4;
  const [showAdmin, setShowAdmin]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats]           = useState(mkStats);
  const [showLog, setShowLog]       = useState(() => window.innerWidth >= 600);
  const [soundOn, setSoundOn]       = useState(true);
  const [seeAll, setSeeAll]         = useState(false);
  const [showCounts, setShowCounts] = useState(true);
  const [showLastPlay, setShowLastPlay] = useState(true);
  const [showIntention, setShowIntention] = useState(true);
  const [showNextBtn, setShowNextBtn]   = useState(true);
  const [showAIKnown, setShowAIKnown]   = useState(true);
  const [aiLevel, setAiLevel]           = useState('normal'); // 'beginner' | 'normal' | 'hard'
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 600);
  const [playerGroup, setPlayerGroup] = useState(() => {
    const groups = ['laituri', 'jumalat', 'puolue', 'kansa'];
    return groups[Math.floor(Math.random() * groups.length)];
  });
  const [resultData, setResultData] = useState(null);   // {ranking, revealCards?, scoreBreakdown?}
  const [botResult, setBotResult]   = useState(null);   // bot-only result — stay on game view
  const [gameKey, setGameKey]       = useState(0);       // increment → remount game
  const [showGlossary, setShowGlossary] = useState(false);
  const [showEsittely, setShowEsittely] = useState(false);
  const [siirtorekisteri, setSiirtorekisteri] = useState([]); // allBots replay frames
  const [replayOpen, setReplayOpen]     = useState(false);
  const [showChangelog, setShowChangelog]       = useState(false);
  const [showTodo, setShowTodo]                 = useState(false);
  const [showPeliasetukset, setShowPeliasetukset] = useState(false);
  const [showKonealy, setShowKonealy]           = useState(false);
  const [showPelaajat, setShowPelaajat]         = useState(false);

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
    : KANSA;

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

  if (showAdmin) {
    return (
      <div>
        <button
          onClick={() => setShowAdmin(false)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 300,
            background: 'rgba(13,33,24,0.92)', border: '1px solid #2a4a32',
            color: C.dim, padding: '6px 14px', borderRadius: 9,
            fontSize: 12, fontFamily: 'Georgia,serif', cursor: 'pointer',
          }}
        >
          ← Päävalikko
        </button>
        <Admin />
      </div>
    );
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
      aria-label="Asetukset"
    >⚙</button>
  );

  const glossaryScreen = showGlossary && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, overflowY: 'auto', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13 }}>← Asetukset</button>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: C.gold, letterSpacing: 2 }}>Sanasto & Merkistö</span>
          <div style={{ width: 90 }} />
        </div>

        {/* Sanasto */}
        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 8, opacity: 0.8 }}>Sanasto 📖</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
            Napauta termiä — selitys aukeaa alle. Korostetut termit aukeavat myös pelivalikon säännöistä.
          </div>
          {[
            { key: 'perus',  label: 'Perustermit' },
            { key: 'kortti', label: 'Kortit ja erikoistilanteet' },
            { key: 'alue',   label: 'Alueet ja vyöhykkeet' },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
              {SANASTO.filter(s => s.kategoria === key).map(s => <SanastoRivi key={s.term} s={s} />)}
            </div>
          ))}
        </div>

        {/* Merkistö */}
        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 8, opacity: 0.8 }}>Merkistö 🔣</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
            Sovelluksessa käytetyt ikonit ja niiden merkitykset.
          </div>
          {[
            { key: 'toiminnot', label: 'Pelitoiminnot' },
            { key: 'viestit',   label: 'Viestit' },
            { key: 'pelaajat',  label: 'Pelaajat' },
            { key: 'ui',        label: 'Käyttöliittymä' },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
              {MERKISTO.filter(m => m.kategoria === key).map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.panelBorder}33` }}>
                  <span style={{ fontSize: 15, flexShrink: 0, minWidth: 22, textAlign: 'center', lineHeight: 1 }}>{m.icon}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text, flexShrink: 0, minWidth: 130 }}>{m.label}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.45, flex: 1 }}>
                    {m.selitys}
                    {m.peli && <span style={{ color: C.gold, opacity: 0.6, marginLeft: 4 }}>({m.peli})</span>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13, width: '100%' }}>← Takaisin asetuksiin</button>
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
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>⚙ Asetukset</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >✕ Sulje</button>
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowEsittely(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Esittely</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showEsittely ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showEsittely && (
            <div style={{ padding: '0 14px 14px' }}>
              {[
                'Hei!',
                'Tämän sovelluksen missiona on auttaa pelihaluisia viettämään rattoisaa aikaa yhteisen pöydän ääressä. Mukana on yhdeksän peliä, joiden kulun oppii ymmärtämään lukuisien toistojen kautta. Tämä sovellus on digitaalinen, vuorovaikutteinen ympäristö, jossa kenelläkään ei ole kiire.',
                'Korttipelien rikkaus piilee paikallisissa säännöissä. Yritin olla reilu omissa tulkinnoissani ja vivahteissani, mutta saattaahan sieltä joku "bugi, ei ominaisuus" seasta löytyä.',
                'Kiitos ja kumarrus,\nTommi Haanranta',
              ].map((t, i) => (
                <p key={i} style={{ margin: '0 0 8px', color: C.text, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>{t}</p>
              ))}
              <a href={MAILTO} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
                color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
              }}>✉ Lähetä risut ja ruusut</a>
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPeliasetukset(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Peliasetukset</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showPeliasetukset ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showPeliasetukset && (
            <div style={{ padding: '0 14px 14px' }}>
              {(() => {
                const isAllBots = siirtorekisteri.length > 0 || !!botResult;
                return [
                  !isAllBots && { label: '👁 Näytä kaikki kortit',                                  val: seeAll,        set: setSeeAll        },
                  { label: '🔒 God Mode (manifestoi tulevat kortit)',                                    disabled: true                          },
                  { label: 'Korttimäärät näkyvillä (nosto-, kaato-, poistopakan koot)',                 val: showCounts,    set: setShowCounts    },
                  !isAllBots && { label: 'Näe muistipeleissä vastustajien katsomat korttipaikat korostettuina',       val: showAIKnown,   set: setShowAIKnown   },
                  { label: 'Näytä viimeisin siirto (kelluva kortti-indikaattori)',                       val: showLastPlay,  set: setShowLastPlay  },
                  { label: 'Lyönti- ja nostoaikomus — botti näyttää etukäteen mitä korttia se pelaa seuraavaksi (Seiska, Ristiseiska, Maija, Paskahousu, Moska)', val: showIntention, set: setShowIntention },
                  { label: 'Pysähdy näyttämään kaappauksen / kierroksen yksityiskohdat (Kasino, Moska)', val: showNextBtn,   set: setShowNextBtn   },
                  { label: 'Tapahtumaloki auki',                                                         val: showLog,       set: setShowLog       },
                  { label: 'Äänet',                                                                       val: soundOn,       set: setSoundOn       },
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
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Koneälyn taso 🤖</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showKonealy ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showKonealy && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'beginner', label: 'Oppipoika', desc: 'tekee virheitä, voitettavissa' },
                  { key: 'normal',   label: 'Kisälli',    desc: 'pelaa hyvin, mokaa joskus' },
                  { key: 'hard',     label: 'Mestari',    desc: 'täysi strategia + muistaa kortit' },
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

        <button
          onClick={() => setShowGlossary(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Sanasto & Merkistö 📖</span>
          <span style={{ color: C.gold, fontSize: 16 }}>›</span>
        </button>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPelaajat(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Pelaajat 👥</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showPelaajat ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showPelaajat && (
          <div style={{ padding: '0 14px 14px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            Vastustajat arvotaan valitusta ryhmästä.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'laituri', label: '🏖 Laiturin tyypit',  pool: LAITURI_SPECIAL  },
              { key: 'jumalat', label: '⚡ Onnen jumalat',    pool: ONNEN_JUMALAT    },
              { key: 'puolue',  label: '🗳 Ihmisten puolue',  pool: IHMISTEN_PUOLUE  },
              { key: 'kansa',   label: '🧑‍🤝‍🧑 Kansa',           pool: KANSA            },
            ].map(({ key, label, pool }) => (
              <button
                key={key}
                onClick={() => setPlayerGroup(key)}
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
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{pool.length} nimeä</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.8, opacity: 0.7 }}>
            {playerPool.join(' · ')}
          </div>
          </div>
          )}
        </div>

        {/* Muutosloki */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowChangelog(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Muutosloki 📋</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showChangelog ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showChangelog && (
            <div style={{ padding: '0 14px 14px' }}>
              {CHANGELOG.map((entry, i) => (
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
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>Tulossa 🗺</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showTodo ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showTodo && (
            <div style={{ padding: '0 14px 14px' }}>
              {TODO.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.panelBorder}33`, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                    {item.status === 'open' ? '🎯' : item.status === 'done' ? '✅' : '⏸'}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'sans-serif', lineHeight: 1.55, color: item.status === 'done' ? C.dim : C.text, textDecoration: item.status === 'done' ? 'line-through' : 'none', opacity: item.status === 'deferred' ? 0.55 : 1 }}>{item.label}</span>
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
          🏆 {botResult.ranking[0]?.name} voitti
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
              ▶ Toisto ({siirtorekisteri.length})
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
            Pelivalinta →
          </button>
        </div>
      </div>
    );

    return (
      <div style={{ maxWidth: maxW, margin: '0 auto' }}>
        {replayOpen && siirtorekisteri.length > 0 && (
          <ReplayView frames={siirtorekisteri} onClose={() => setReplayOpen(false)} isMobile={isMobile} />
        )}
        {settingsPanel}
        {glossaryScreen}
        <GameHeader title={game.name} onBack={() => { setResultData(null); setBotResult(null); setActive(null); }} gearBtn={gearBtn} isMobile={isMobile} />
        {botBanner}
        <GameComponent
          key={gameKey}
          game={game}
          hints={showLog}
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
      </div>
    );
  }

  return (
    <div style={{
      background: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? 10 : 16, padding: isMobile ? '16px 12px' : '32px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      {settingsPanel}
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
            JAKO<span style={{ fontSize: isMobile ? 15 : 22, verticalAlign: 'super', letterSpacing: 2 }}>52</span>
          </h1>
        </div>
        <div style={{ position: 'absolute', right: 0 }}>{gearBtn}</div>
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
      <div style={{ fontSize: 10, color: C.dim, opacity: 0.35, fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
        v{APP_VERSION} · {BUILD_DATE} {BUILD_TIME}
      </div>
    </div>
  );
}
