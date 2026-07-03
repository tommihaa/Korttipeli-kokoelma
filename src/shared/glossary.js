// Termimoduuli — Jaon vendoroitu kopio Lahja-kokoelman jaetusta termiskeemasta.
// Speksi: TERMIMODUULI.md (Projects-juuri) · sisarkopio: Itu src/rules/terms.ts.
// Tämä toteutus on skeeman ESIKUVA: {term, match, kategoria, selitys, esimerkki?,
// emoji?, pelit?/pelitLabel?} + splitWithGlossary-moottori. Skeema jaetaan, DATA ei —
// termistö on pelin omaa (KÄSITTEISTÖ §0).
//
// Käännökset: fi (tämä tiedosto) on totuuden lähde; muut 22 kieltä locales/*.js
// avaimilla glossary.sanasto.<term>.{term,selitys} — term-kenttä on käännösavain,
// älä nimeä termiä uudelleen ilman locale-avainten päivitystä.

export const TERM_SCHEMA_VERSION = 1;

// match[]:    merkkijonot joita haetaan säännöistä (case-insensitive), pisin ensin
// pelitLabel: ohittaa automaattisen pelinimilistan kun pelejä on monta
export const SANASTO = [
  // ─ Perustermit ───────────────────────────────────────────────────────────
  { kategoria: 'perus', term: 'Maat',        match: ['pata','hertta','ruutu','risti','maata','maan'],                        emoji: '♠', selitys: 'Neljä maata: ♠ Pata · ♥ Hertta · ♦ Ruutu · ♣ Risti. Punaiset: ♥ ♦. Mustat: ♠ ♣. Maa ei yleensä ratkaise vaan arvo, paitsi valttipelissä.',                        pelitLabel: 'kaikki'                    },
  { kategoria: 'perus', term: 'Kuvakortti',  match: ['kuvakortti','kuvakorttia','kuvakortilla','kuvakorteilla','kuvakortit'], emoji: '👑', selitys: 'J (Jätkä), Q (Kuningatar), K (Kuningas). Usein erityisasemassa: Paskahousussa ei voi pelata alle seiskan päälle, Läpsyssä laukaisevat haasteen.',                          pelitLabel: 'useimmat'                  },
  { kategoria: 'perus', term: 'Ässä',        match: ['ässä','ässällä','ässiä','ässän','ässät'],                               emoji: '🂡', selitys: 'A: korkein tai erikoiskortti pelistä riippuen. Kasinossa +1 piste, Paskahousussa kaataa kuvakortteja (J/Q/K), Moskassa korkein arvo, Läpsyssä haastaa 4 kertaa.',           pelitLabel: 'useimmat'                  },
  { kategoria: 'perus', term: 'Jako',        match: ['jaetaan','jaettu','jako','jakaa','jaon'],                               emoji: '🤲', selitys: 'Pakan jakaminen pelaajille pelin alussa. 52 korttia, 4 maata, 13 arvoa per maa (2–10, J, Q, K, A). Jako määrää koko pelin lähtötilanteen.',                                    pelitLabel: 'kaikki'                    },
  // ─ Kortit ja erikoistilanteet ─────────────────────────────────────────────
  { kategoria: 'kortti', term: 'Mökki',         match: ['mökki','mokki','mökin','mökkejä'],                                emoji: '🏚', selitys: 'Koko pöydän tyhjennys yhdellä kaappauksella. Antaa yhden lisäpisteen.',                                                          pelit: ['kasino']                       },
  { kategoria: 'kortti', term: 'Rakennelma',   match: ['rakennelma','rakennelman','rakennelmaa','rakennelmat','rakennelmia','rakennelmat'], emoji: '🔨', selitys: 'Valitset pöydältä kortteja ja lisäät oman käsikorttisi: niiden summa on rakennelman arvo. Sinulla täytyy olla kädessäsi toinen kortti samalla arvolla, jolla kaappaat rakennelman myöhemmin. Vastustaja voi varastaa rakennelman jos hänellä on saman arvoinen kortti.', pelit: ['kasino'] },
  { kategoria: 'kortti', term: 'Korttipantti',  match: ['korttipantti','korttipantteja','pantti','pantteja','panttia'],    emoji: '🎫', selitys: 'Rangaistuskortti, jonka saat edelliseltä pelaajalta, kun sinulla ei ole käypää pelattavaa. Eniten korttipantteja saanut häviää.',    pelit: ['ristiseiska']                  },
  { kategoria: 'kortti', term: 'Maija',         match: ['maija'],                                                           emoji: '🂭', emojiStyle: { filter: 'grayscale(1) brightness(0.05)' }, selitys: 'Q♠ on tämän pelin ainoa erikoiskortti: se on aina vain nostettava. Sillä ei voi torjua eikä sitä voi torjua.',                                                         pelit: ['maija']                        },
  { kategoria: 'kortti', term: 'Lappu',         match: ['lappu'],                                                           emoji: '📢', selitys: 'Kun sinulla on vuorosi lopussa enää yksi kortti kädessä, huuda LAPPU ennen kuin seuraava pelaaja ehtii nostaa kortin! Unohtunut huuto tarkoittaa +3 korttia.',              pelit: ['seiska']                       },
  { kategoria: 'kortti', term: 'Kova kakkonen', match: ['kova kakkonen','kovat kakkoset'],                                 emoji: '♠',  selitys: '2♠ tai 2♣: voi lyödä minkä tahansa kortin päälle paitsi kaatokortin.',                                                                       pelit: ['paskahousu']                   },
  { kategoria: 'kortti', term: 'Hyökkäys',      match: ['hyökkä*'],                                                        emoji: '⚔️', selitys: 'Hyökkääjä lyö käsikorttejaan pöytään puolustajan kaadettavaksi. Moskassa hyökkäys samanarvoisilla korteilla, Maijassa saman maan korteilla.',          pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Puolustus',     match: ['puolust*','torjuu','torjua','torju'],                              emoji: '🛡️', selitys: 'Puolustaja puolustautuu kaatamalla pöydän hyökkäyskortit saman maan isommalla kortilla tai valttimaan kortilla.',                                               pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Täyskaato',     match: ['täyskaato*'],                                                     emoji: '✅', selitys: 'Puolustaja kaatoi kaikki hyökkäykseen käytetyt kortit. Täydentää korttinsa viimeiseksi ja on seuraava hyökkääjä.',                                                pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Torjuntavoitto', match: ['torjuntavoitto*'],                                               emoji: '🔰', selitys: 'Puolustaja kaataa osan hyökkäykseen käytetyistä korteista ja nostaa loput. Seuraava pelaaja on hyökkääjä.',                                                   pelit: ['maija','moska']                },
  { kategoria: 'kortti', term: 'Kaato',         match: ['kaadetaan','kaataa','kaadat','kaato','kaatamalla'],                             emoji: '⬇️', selitys: 'Maijassa ja Moskassa sama asia kuin puolustus. Paskahousussa kaatokortteja ovat 10 (kymppi), A (ässä) ja neljä samanvahvuista (3–9, J, Q, K). Moskassa kaadetut kortit ovat poissa pelistä, vain jos puolustus onnistuu kaatamaan kaikki hyökkäykseen käytetyt kortit.',  pelit: ['maija','moska','paskahousu']   },
  { kategoria: 'kortti', term: 'Valttimaa',     match: ['valttimaa','valttimaan','valttikortilla','valttikortti','valtilla','valtit','valtti'],         emoji: '⭐', selitys: 'Pelin alussa pakan viimeinen jaettu kortti määrää valttimaan. Valttikortilla voi kaataa minkä tahansa ei-valttimaan kortin. Maijassa kaksi lisärajoitetta: valttimaa ei voi olla ♠ ja Q♠ on vain nostettava.', pelit: ['moska','maija']                },
  { kategoria: 'kortti', term: 'Täsmäys',      match: ['täsmäys','täsmäyksen','TÄSMÄYS'],                                  emoji: '👐', selitys: 'Kasan kaksi päällimmäistä korttia ovat samaa arvoa. Nopein läpsääjä voittaa koko kasan. Väärä läpsäys sen sijaan lisää kortin kasaan.',                             pelit: ['lapsy']                        },
  { kategoria: 'kortti', term: 'Haaste',       match: ['haaste','haastaa','haasteen','haasteeseen','haastettiin'],                  emoji: '⚡', selitys: 'J/Q/K/A käännettäessä haastetaan seuraava: J=1 · Q=2 · K=3 · A=4 yritystä vastata J/Q/K/A:lla. Onnistunut vastaus siirtää haasteen eteenpäin. Epäonnistunut → haastaja voittaa kasan.', pelit: ['lapsy']                        },
  // ─ Alueet ja vyöhykkeet ───────────────────────────────────────────────────
  { kategoria: 'alue',   term: 'Käsi',          match: ['käsikorttisi','käsikortillesi','käsikortteja'],                   emoji: '🤚', selitys: 'Useimmissa peleissä pysyvä viuhka: jaetaan alussa, niistä valitaan pelattava. Koputuksessa ja Kultakalassa käsi on hyvin tilapäinen: yksi nostettu kortti, joka vuoron aikana vaihdetaan kentän korttiin tai heitetään poistopakkaan.',  pelitLabel: 'kaikki paitsi Koputus, Kultakala' },
  { kategoria: 'alue',   term: 'Kenttä',        match: ['kenttäsi','kentästäsi','kentältä','kenttään','kenttää','kenttä'], emoji: '🔲', selitys: 'Nurinpäin pöydälle eteesi jaetut kortit. Pelin aikana sinulle tulee mahdollisuuksia katsoa ja vaihtaa niitä parempiin. Koputuksessa ja Kultakalassa A on pienin ja paras.',  pelit: ['kultakala','koputus']          },
  { kategoria: 'alue',   term: 'Kasa',          match: ['kasaan','kasan','kasaa','kasasta','kasalla','kasalta','kasa'],   emoji: '📚', selitys: 'Pöydän keskelle kasautuva korttikeko. Läpsyssä sinne käännetään kortteja vuorotellen, ja kasan voittaa täsmäyksellä tai haastevoitolla. Paskahousussa siihen pelataan päälle, kaadetaan T/A tai neljällä samalla, muuten nostetaan.', pelit: ['lapsy','paskahousu']           },
  { kategoria: 'alue',   term: 'Yläpino',       match: ['yläpino','yläpinot','yläpinon','yläpinoon'],                      emoji: '⬆️', selitys: 'Nouseva pino: 8→9→10→J→Q→K. Avautuu kun maan sarja 7→6→8 on pelattu. K sulkee yläpinon.',                                                                        pelit: ['ristiseiska']                  },
  { kategoria: 'alue',   term: 'Alapino',       match: ['alapino','alapinot','alapinon','alapinoon'],                       emoji: '⬇️', selitys: 'Laskeva pino: 6→5→4→3→2→A. Avautuu kun maan sarja 7→6→8 on pelattu. A sulkee alapinon.',                                                                         pelit: ['ristiseiska']                  },
  { kategoria: 'alue',   term: 'Pakka',         match: ['kaatopakka','kaatopakkaan','kaatopakasta','poistopakka','poistopakkaan','poistopakasta','pakasta','pakkaan','pakan','pakka'], emoji: '🎴', selitys: 'Nostopakka: korttien nostolähde, joka ehtyy pelin edetessä. Poistopakka: kasautuva pakka, jonne päätyvät pelatut tai hylätyt kortit. Kaatopakka: kaadetut kortit, jotka eivät enää palaa peliin.',  pelitLabel: 'useimmat'                  },
  { kategoria: 'alue',   term: 'Pino',          match: ['pinon','pinoa','pinoja','pino'],                                   emoji: '🃏', selitys: 'Oma kasvot alaspäin oleva korttipino. Vuorollaan käännetään päällimmäinen yhteiseen kasaan.',                                                         pelit: ['lapsy']                        },
  { kategoria: 'alue',   term: 'Pöytä',         match: ['pöydältä','pöydälle','pöydän','pöytään'],                         emoji: '🟫', selitys: 'Alussa pöytään jaetaan 4 korttia kasvot ylöspäin irralleen. Pelin kuluessa sieltä vuorotellen kaapataan ja lisätään. Pöydän tyhjentäminen on mökin arvoinen suoritus.',  pelit: ['kasino']                       },
  { kategoria: 'alue',   term: 'Poissa',        match: ['pois pelistä'],                                                    emoji: '❌', selitys: 'Kaadetut kortit eivät palaa peliin.',                                                                                                      pelitLabel: 'useimmat'                  },
];

// ── Moottori (jaettu kontrakti, ks. TERMIMODUULI.md) ─────────────────────────

/** Pilkkoo tekstin osiin: { text, isTerm, term } */
export function splitWithGlossary(text, entries = SANASTO) {
  const patterns = entries
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
