// ── Muutosloki (fi = totuuden lähde) ──────────────────────────────────────────
// Kielikohtaiset versiot samassa kansiossa (en.js, sv.js, …) — kukin oma laiska
// chunkkinsa, ladataan vasta kun Info → Muutosloki avataan; puuttuva kieli
// putoaa tähän fi-versioon. Rakenteen on oltava identtinen kaikissa kielissä
// (samat date-arvot, sama määrä items-rivejä samassa järjestyksessä).
// /deploy lisää uusimman merkinnän TÄHÄN tiedostoon (taulukon alkuun) JA
// käännättää sen kaikkiin saman kansion kielitiedostoihin.
export const CHANGELOG = [
  {
    date: '21.7.2026',
    items: [
      'Info-paneelin versionumero näyttää nyt oikean version. Aiemmin tuotannossa näkyi väärä, liian pieni numero (esimerkiksi 1.2.010), koska numero laskettiin julkaisupalvelimella tavalla joka ei nähnyt kuin pienen osan projektin historiasta. Numero on nyt kiinteä osa julkaisua, joten se on sama kaikkialla. Buildin päiväys ja kellonaika ovat olleet koko ajan oikein.',
      'Mestarin neuvo erottuu nyt selvemmin: osoitettu kortti saa sykkivän purppurakehän ja nousee hieman ylös, ja muut kortit himmenevät neuvon ajaksi. Aiemmin korostus oli vaisu ja osoitettu kortti saattoi hukkua käteen. Koskee kaikkia pelejä.',
      'Seiska ja Paskahousu: näkymä ei enää nytkähdä ylöspäin kesken pelin, kun joku pääsee korteistaan eroon. Aiemmin pelaajan korttirivi kutistui tyhjäksi sillä hetkellä kun hän lopetti, jolloin kaikki sen alapuolella oleva hyppäsi ylös. Nyt rivi säilyttää korkeutensa loppuun asti.',
      'Koputus, katselutila: kortit joiden arvon botti muistaa korostuvat nyt myös silloin kun seuraat bottien keskinäistä peliä. Aiemmin korostus näkyi vain tavallisessa pelissä, koska katselutila piirsi bottien kortit eri tavalla eikä korostusasetus yltänyt sinne.',
      'Paskahousu: viimeisimmän lyönnin ilmaisin näkyy nyt pinon vasemmassa alakulmassa kuten muissa peleissä. Aiemmin se vilahti pinon yläpuolella, koska ilmaisin oli sijoitettu pinoa ennen.',
      'Mestarin neuvo, kaksi lisäkorjausta hyökkäysneuvoihin: neuvo nimesi väärän perusteen sille minkä kortin se itse valitsi. Maijassa neuvo kehotti hyökkäämään maalla, jossa on eniten matalia kortteja, vaikka se valitsee sen maan jota sinulla on eniten. Moskassa neuvo kehotti aloittamaan pienimmillä ei-valteilla, vaikka se valitsee ensisijaisesti arvon, jota on jo eniten pelattu pois, jolloin vastustajilla on harvemmin sama arvo kädessä. Molemmissa peleissä ehdotettu siirto oli oikea, mutta perustelu opetti väärää strategiaa.',
      'Mestarin neuvo, kuusi tekstikorjausta: neuvo lupasi paikoin eri asian kuin mitä se todella suositteli. Maijassa neuvo kehotti säästämään valtit puolustukseen silloinkin kun se itse osoitti hyökkäämään niillä, joten valttihyökkäys sai oman neuvonsa. Moskassa neuvo kehotti säästämään kortteja myös silloin kun lyötäviä kortteja ei ollut lainkaan. Kultakalassa pakkovaihto esitettiin kannattavana valintana, vaikka vaihtoa ei voi pysäyttää poistopakasta noston jälkeen. Seiskassa neuvo väitti säästävänsä parisi myös silloin kun paria ei ollut; nyt perustelu näkyy vain kun pari on oikeasti pelattavissa ja jää lyömättä. Koputuksessa neuvo viittasi paikkanumeroon jota ruudulla ei näy, joten se osoittaa nyt korostettuun korttiin. Kasinossa neuvo lupasi kiireen laskematta varastamisriskiä; nyt riski lasketaan näkyvistä korteista ja neuvo kertoo erikseen, kun rakennelmaa ei voi enää viedä.',
    ],
  },
  {
    date: '20.7.2026',
    items: [
      'Seiska, sääntökorjaus ässän bonusvuoroon: kun tekoäly lyö bonusvuorollaan useamman saman arvoisen kortin kerralla, se pelaa nyt bonusmaan kortin ensin eli alimmaiseksi, jolloin ryhmän viimeinen kortti jää päällimmäiseksi ja määrää seuraavan maan. Aiemmin kortit lähtivät käden järjestyksessä, jolloin maa saattoi jäädä vaihtumatta ja seuraavan pelaajan siirrot menivät toisin kuin sääntö edellyttää. Ihmispelaajalta oikea järjestys on aina vaadittu, joten tekoäly noudattaa nyt samaa sääntöä.',
      'Seiska: kun tekoäly pelaa seiskan noston jälkeen, valittu maa kirjautuu taas tapahtumalokiin. Aiemmin rivi jäi näissä tilanteissa pois, jolloin lokista ei voinut lukea mihin maahan peli vaihtui.',
    ],
  },
  {
    date: '19.7.2026',
    items: [
      'Uusi ominaisuus kaikissa yhdeksässä pelissä: Kysy Mestarilta neuvoa. Omalla vuorolla voi painaa 🧙-nappia, jolloin Mestari-tason tekoäly kertoo mitä se pelaisi sinun tilanteessasi: ehdotettu kortti korostuu violetilla ja lyhyt perustelu näkyy kuplassa. Nyt mukana myös monivaiheiset pelit (Moska, Paskahousu, Kasino, Maija), joissa neuvo tunnistaa vaiheen: hyökkää, kaada, siirrä, lisää, rakenna tai jätä. Kasinossa korostuvat yhtä aikaa käsikortti, pöytäkohteet ja rakennelma. Neuvo käyttää vain samaa tietoa jonka itsekin näet, joten se on reilu oppimisen apu.',
    ],
  },
  {
    date: '17.7.2026',
    items: [
      'Tekoälyn vaikeustasoja hiottiin useissa peleissä (Kultakala, Koputus, Maija, Kasino, Läpsy). Oppipoika-taso pelaa nyt inhimillisemmin ja tekee uskottavampia aloittelijan virheitä, jolloin ero kokeneempaan vastustajaan tuntuu selkeämmältä. Aiemmin osa tasoerosta syntyi satunnaisesta hutiloinnista; nyt heikkoudet ja vahvuudet ovat johdonmukaisia pelitaitoja.',
      'Kultakalassa bottien korttirivi näkyy nyt tasaisesti: jokaisella kortilla on sama kehys.',
    ],
  },
  {
    date: '16.7.2026',
    items: [
      'Info-näytön Esittelyyn lisättiin "Muut pelit" -osio, joka linkittää saman tekijän muihin ilmaisiin peleihin (Itu ja Superjatsi). Näkyy vain suomenkielisessä versiossa, koska nämä pelit ovat toistaiseksi vain suomeksi.',
    ],
  },
  {
    date: '7.7.2026',
    items: [
      'Asetuksiin uusi "Kokeile ääniä" -osio (näkyy kun äänet ovat päällä): jokaisen pelitapahtuman äänen voi kuunnella etukäteen, ja äänet voi hiljentää yhdellä napilla suoraan samasta paikasta.',
      'Uusi ääniteema: Torvi & kantele. Asetuksista (Lisäasetukset → Äänet) löytyy nyt vaihtoehtoinen äänimaailma, jossa korttitoiminnot kuulostavat kanteleen näppäykseltä ja isot voitot torvifanfaarilta.',
      'Paskahousussa korjattu bugi: vaihtotarjous saattoi ehdottaa lyömään yhdessä kaksi kakkosta joiden arvo ei ollut sama (esim. musta ja punainen kakkonen).',
    ],
  },
  {
    date: '4.7.2026',
    items: [
      'Peliohjeet, säännöt ja viestit ovat nyt selkeämpiä ja lyhyempiä sekä suomeksi että englanniksi: mutkikkaita virkkeitä on suoristettu koko sovelluksesta.',
      'Kultakalan sääntöteksti täsmentyi: kenttäkortit oppii vain vaihtamalla niitä, ei katsomalla etukäteen.',
    ],
  },
  {
    date: '3.7.2026',
    items: [
      'Tauko toimii nyt luotettavasti kaikissa peleissä: kun pysäytät bottiottelun, tekoäly pysähtyy heti eikä ehdi tehdä siirtoa tauon aikana.',
    ],
  },
  {
    date: '28.6.2026',
    items: [
      'Jakolla on uusi sovelluskuvake: korttiviuhka pakan neljällä värillä. Jos olet lisännyt Jakon laitteesi aloitusnäytölle, kuvake ja avausruutu näyttävät nyt siistimmiltä ja yhtenäisiltä.',
    ],
  },
  {
    date: '24.6.2026',
    items: [
      'Saavutettavuusparannus: päävalikon Säännöt-painikkeen ja kielivalitsimen tekstit erottuvat nyt selkeämmin taustasta, ja kielivalitsin tunnistuu paremmin ruudunlukijalla.',
    ],
  },
  {
    date: '23.6.2026',
    items: [
      'Uusille pelaajille selkeämpi aloitus: suositellut pelit on merkitty ★-tähdellä, ja ennen ensimmäistä peliä valikko vinkkaa mistä kannattaa aloittaa.',
      'Jokaisen pelin säännöt löytyvät nyt selkeästä Säännöt-painikkeesta, ja samasta paikasta pääsee suoraan sanastoon.',
      'Asetuksiin lisätty Aloittelija/Kokenut-pikavalinta, joka säätää opastuksen kerralla sopivaksi; yksittäiset asetukset löytyvät nyt Lisäasetukset-kohdan takaa.',
      'Vastustajien nimiryhmän voi nyt valita suoraan pelin aloitusnäytöltä, pelaajamäärän vierestä.',
      'Jokaiseen peliin lisätty selkeä Sinun vuorosi -kehote, joka kertoo omalla vuorollasi mitä sinun on määrä tehdä.',
    ],
  },
  {
    date: '20.6.2026',
    items: [
      'Uusi 📊 Tilastot-näkymä (Info-valikosta): näet pelikohtaisesti montako kertaa olet pelannut ja voittanut, sijoitusjakaumasi sekä voitot eri vaikeustasoilla. Lisäksi yhteenveto kokeilluista peleistä, pelikerroista ja pelisessioista. Tilastot tallentuvat vain tähän selaimeen ja voit tyhjentää ne koska tahansa.',
      'Tilastonäkymä on käännetty kaikille 23 kielelle.',
    ],
  },
  {
    date: '19.6.2026',
    items: [
      'Asetukset muistetaan nyt: valitsemasi näkyvyysasetukset, koneälyn taso, vastustajien nimet sekä Paskahousun, Ristiseiskan ja Kasinon sääntövalinnat säilyvät seuraavallakin pelikerralla.',
      'Valikon yläpalkki on selkeämpi pienellä näytöllä: pelin nimi ja kielivalinta eivät enää mene päällekkäin.',
    ],
  },
  {
    date: '13.6.2026',
    items: [
      'Muilla kielillä pelien lempinimet on siistitty lapsiystävällisemmiksi. Suomenkieliset pelinimet pysyvät ennallaan.',
      'Versio 1.2 🎉 Muutosloki näkyy nyt omalla kielellä kaikilla 23 kielellä, myös kaikkein uusimmilla.',
      'Kolme uutta kieltä lisätty: tšekki, unkari ja romania (yhteensä 23 kieltä). Mukana tuttuja klassikoita: Seiska = Prší / Makaó / Septică, Maija = Černý Petr / Fekete Péter / Baba. Löytyvät kielivalikon "Testaamattomat"-ryhmästä: käännökset odottavat vielä natiivipuhujan tarkistusta.',
      'Jaa-napista aukeaa nyt QR-koodi: kaveri pääsee peliin skannaamalla sen puhelimella, ilman linkin näpyttelyä.',
    ],
  },
  {
    date: '12.6.2026',
    items: [
      'Kolme uutta kieltä lisätty: pohjoissaame, romani ja latina (yhteensä 20 kieltä). Ne löytyvät kielivalikon "Testaamattomat"-ryhmästä: käännökset odottavat vielä natiivipuhujan tarkistusta.',
    ],
  },
  {
    date: '11.6.2026',
    items: [
      'Muutosloki näkyy nyt omalla kielelläsi: koko historia on käännetty kaikille 17 kielelle.',
      'Uusi asetus: kaksivärinen korttipakka (♠ ja ♣ mustia, ♥ ja ♦ punaisia). Valinta muistetaan kuten kieli ja äänet.',
      'Uusi ohje Info-paneelissa: näin lisäät pelin aloitusnäytölle tai työpöydälle, peli avautuu kuin sovellus.',
      'Maijan ja Kasinon kortti-ikonit näkyvät nyt oikein kaikilla laitteilla.',
    ],
  },
  {
    date: '10.6.2026',
    items: [
      'Sovellus avautuu nyt selvästi nopeammin: kielet ja muutosloki haetaan vasta tarvittaessa, joten ensilataus keveni noin 70 %.',
      'Peli kulkee nyt mukana myös ilman verkkoa: kerran avatut pelit ja kielet toimivat offline-tilassa, vaikka mökillä ilman kenttää.',
    ],
  },
  {
    date: '9.6.2026',
    items: [
      'Esittelyteksti on nyt luettavissa kaikilla kielillä, ei vain suomeksi.',
      'Uusi Jaa-nappi valikossa: jaa pelin linkki kaverille yhdellä napautuksella.',
    ],
  },
  {
    date: '7.6.2026',
    items: [
      'Palautteen voi nyt antaa kahdella tavalla: arvioi kokoelma lomakkeella tai lähetä risut ja ruusut suoraan sähköpostilla, kumpi sinulle sopii.',
    ],
  },
  {
    date: '7.6.2026',
    items: [
      'Palaute uudistui: pelin sisäinen palautelomake, jossa voit antaa arvosanan ja kehitysehdotuksia. Löytyy Info-paneelin (ℹ) Esittely-osiosta.',
      'Voit halutessasi tukea peliä Ko-fissa: pieni tukilinkki palautteen vierestä. Ei mainoksia eikä pakkoa.',
      'Kieli- ja ääniasetukset muistetaan nyt käyntien välillä. Muut asetukset palautuvat oletuksiin kuten ennenkin.',
      'Uusi vastustajaryhmä Goa\'uld (Stargaten System Lordit). Onnen jumalat -ryhmä sai uusia jäseniä: Onnetar, Macuilxochitl ja Felicitas.',
      'Jokaisella vastustajaryhmällä on nyt pieni kuvaus, ja ensimmäisellä käynnillä vastustajiksi valitaan Meme-jengi.',
      'Esittelyteksti uudistui selkeämmäksi: kerromme nyt suoraan, ettei peli käytä evästeitä, tilejä, sähköpostia tai mainoksia, ja että vain kieli- ja ääniasetukset tallentuvat omaan selaimeesi.',
    ],
  },
  {
    date: '5.6.2026',
    items: [
      'Kaksi uutta kieltä lisää: portugali ja karjala, sovellus on nyt 17 kielellä. Karjala (varsinaiskarjala) on kokeellinen käännös, joten se löytyy kielivalikon "testaamattomat"-ryhmästä. Lisäksi kielivalitsin on siirretty ylös info- ja asetukset-nappien viereen, tiiviiksi lippuvalikoksi.',
    ],
  },
  {
    date: '5.6.2026',
    items: [
      'Kolme uutta kieltä: kreikka, puola ja viro, sovellus on nyt 15 kielellä. Kielivalinta on muuttunut siistiksi alasvetovalikoksi (pelilistan alla), jossa kielet on ryhmitelty: testatut (suomi natiivina ✓, muut "web"-varmistettuina) ja testaamattomat omassa ryhmässään. Puola sai vakiintuneet pelinimet (Seiska → Makao, Maija → Piotruś, Moska → Dureń), viro samoin (Maija → Must Peeter).',
    ],
  },
  {
    date: '4.6.2026',
    items: [
      'Kielivalinta siirretty Info-paneelista suoraan päävalikkoon (pelilistan alle). Kielet on ryhmitelty varmennustason mukaan: suomi on natiivi (✓), muut on merkitty "web" eli pelinimet on varmistettu verkkohaulla mutta ei vielä äidinkielisen tarkistamana. Korjattu myös pari pelinimeä (espanjaksi Ristiseiska → Cinquillo, islanniksi Seiska → Olsen Olsen, Paskahousu → Skítakall).',
    ],
  },
  {
    date: '4.6.2026',
    items: [
      'Valikon pelinimet kielikohtaisesti! Jokaisella kielellä pelin nimen alla näkyy nyt sen oman korttipelikulttuurin vakiintunut vastine: esim. Moska on saksaksi "Durak", ruotsiksi näkyy Paskahousu → "Skitgubbe", Seiska → "Mau-Mau", Kasino → "Cassino". Kun vakiintunutta nimeä ei ole, tilalla on lyhyt kuvaus kyseisellä kielellä. Suomeksi pelit pysyvät ilman alaotsikkoa.',
    ],
  },
  {
    date: '4.6.2026',
    items: [
      'Kymmenen uutta kieltä! Sovellus toimii nyt suomen ja englannin lisäksi myös ruotsiksi, norjaksi, tanskaksi, islanniksi, saksaksi, ranskaksi, espanjaksi, italiaksi, ukrainaksi ja venäjäksi: kaikkiaan 12 kielellä. Kieli tunnistetaan selaimesta, ja sen voi vaihtaa Info-paneelin lippuvalikosta. Valikot, pelien kuvaukset ja säännöt, sanasto sekä kaikki pelinaikaiset viestit ja vihjeet on käännetty.',
      'Pelien omat nimet (Moska, Seiska, Kasino…) pysyvät tuttuina kaikilla kielillä: kunkin kielen vakiintuneet vastineet hiotaan myöhemmin.',
    ],
  },
  {
    date: '3.6.2026',
    items: [
      'Valikko: englanninkielisessä tilassa pelin nimen alla näkyy nyt kansainvälinen vastine (esim. Kasino → "Classic Cassino", Moska → "a Finnish Durak variant", Paskahousu → "Finnish Palace variant"): tutut pelit on helpompi tunnistaa',
    ],
  },
  {
    date: '3.6.2026',
    items: [
      'Kielivalinta: sovellus on nyt kokonaan käytettävissä myös englanniksi: valikot, pelien kuvaukset ja säännöt, sanasto sekä pelinaikaiset tapahtumaviestit ja vihjeet. Kieli tunnistetaan selaimesta ja sen voi vaihtaa Info-paneelin FI | EN -napista',
      'Kasino: omalla vuorollasi eniten pisteitä kaappaava kortti siirtyy kätesi vasempaan reunaan: paras siirto on helpompi bongata',
      'Kasino: rakennelman tekemisestä kertova lokiviesti näyttää nyt myös käytetyt kortit (esim. "rakentaa rakennelman (5♣ + 4♦), arvo 9")',
      'Ristiseiska: kun kaadat pinon ja saat jatkaa, napin teksti on nyt selkeämpi "En jatka" (aiemmin "Lopeta")',
    ],
  },
  {
    date: '2.6.2026',
    items: [
      'Saavutettavuus: pelikortteja, nostopakkoja ja nappeja voi nyt käyttää myös näppäimistöllä (Tab-selaus, Enter tai väli pelaa) ja kohdistettu elementti saa selkeän kullanvärisen reunuksen: peliä voi pelata ilman hiirtä',
      'Saavutettavuus: ruudunlukija lukee nyt korttien nimet (esim. "pata 7") ja ilmoittaa pelin tapahtumat ääneen jokaisessa pelissä',
      'Saavutettavuus: jos laitteessa on "vähennä liikettä" -asetus käytössä, peli kunnioittaa sitä eikä toista animaatioita',
      'Nopeampi avautuminen: sovelluksen ensilataus kevennetty noin puoleen: kunkin pelin koodi haetaan vasta kun peli avataan',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Oletusasetukset: äänet pois päältä ja tapahtumaloki auki oletuksena (myös puhelimen kokoisella näytöllä)',
      'Ohjevihjeet (esim. Seiskan "lyö ♠-maa tai 4") näytetään nyt aina: erillinen opetustila-kytkin poistettu',
      'Koputus: lisätty puuttuneet äänet: nosto, vaihto, kortin heitto, koputus, korttien paljastus ja voitto soivat nyt myös tekoälyn vuoroilla (peli oli aiemmin lähes mykkä)',
      'Seiska: korjattu bugi jossa "Lappu" jäi vaatimatta kun käsi oli kasvanut takaisin yhteen korttiin sakkokorttien tai ässärangaistuksen jälkeen: Lappu vaaditaan nyt aina yhteen korttiin tultaessa',
      'Ristiseiska: kun annat passaajalle panttikortin, valinta vahvistetaan nyt erillisellä "Anna"-napilla: ei enää vahinkolahjoituksia yhdellä klikkauksella. Satunnaispantin loki muotoiltu luettavammaksi',
      'Paskahousu: kuvakortin minimikynnykseen kaksi uutta vaihtoehtoa: "0" (kuvakortin saa minkä tahansa ei-erityiskortin päälle) ja "6"',
      'Läpsy: haasteviestit selkeytetty: "siirsi haasteen kortilla X" ja "haastaa kortilla X pelaajan Y" (vähemmän toistoa, selvempää kuka haastaa ketä)',
      'Sisäinen siivous: poistettu käyttämätön Momentti-keruu (kehittäjän palautetyökalu + localStorage) ja siihen liittynyt saavuttamaton Admin-näkymä kaikista peleistä, ei vaikutusta pelaamiseen',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Sisäinen siivous: tekoälytasojen nimistö yhtenäistetty (poistettu vanhentunut "Yliluonnollinen"-jäänne koodista, joka oli jo sulautettu Mestari-tasoon) ja sen jättämää kuollutta koodia karsittu, ei muutoksia pelin toimintaan. Pelikohtaiset sääntödokumentit (Seiska, Paskahousu) ajantasaistettu vastaamaan kolmea tekoälytasoa',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Seiska: kun et voi lyödä, on pakko nostaa pakasta (enintään 3): poistettu virheellinen "Lopeta vuoro" -nappi joka antoi passata kesken nostoja. Kolmannen noston jälkeen vuoro siirtyy yhä automaattisesti; nostetun pelattavan kortin saa silti jättää lyömättä ja nostaa lisää (ässä/maanvaihto taktiikkana)',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Pakka näytetään nyt yhtenäisesti kaikissa peleissä: termi "PAKKA" ja korttimäärä Pöydän yhteydessä (Koputuksen ja Kultakalan "NOSTOPAKKA" → "PAKKA"; Kultakala näyttää nyt myös "TYHJÄ!"-tilan)',
      'Viimeisin siirto -merkki kelluu nyt pöydän päällä eikä varaa omaa riviään: tiiviimpi näkymä, etenkin puhelimella',
      'Sisäinen siivous: Pöytä- ja pakkanäkymät jaettu yhteisiksi komponenteiksi; poistettu päällekkäistä koodia ja kaksi eri "pakka ehtyi" -animaatiota yhdistetty yhdeksi',
    ],
  },
  {
    date: '1.6.2026',
    items: [
      'Paskahousu: poistumisviestit eritelty sijoituksen mukaan (voitto 🏆 / poistui pelistä 👏 / jäi Paskahousuksi 💩), ei enää useaa "vei voiton"',
      'Paskahousu: korjattu bugi jossa vastustaja pelasi 10/A:n tyhjälle ja vaihtoi sen pienempään korttiin, mutta seuraava pelaaja menetti silti vuoronsa',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Bottien Taistelu käynnistää nyt valitun pelaajamäärän verran botteja kaikissa peleissä (ei enää aina 4); napin teksti seuraa valintaa ("3 bottia")',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Ristiseiska, Moska, Maija, Kultakala ja Paskahousu: vastustajien kortit pienennetty Seiskan kokoon (xsmall): mahtuvat ruudulle paremmin puhelimella, etenkin Bottien Taistelu -tilassa',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Ristiseiska: uusi sääntövalinta aloitusnäytöllä: panttikortti "Valittu" (vakio: edellinen pelaaja valitsee kortin) tai "Satunnainen" (kortti arvotaan antajan kädestä)',
      'Paskahousu: "kovat kakkoset" -napissa ♠2 ♣2 nyt maaväreissä (musta pata, vihreä risti): selkeämpää mitä vakiosääntö tarkoittaa',
      'Valikko: Maijan ikoni nyt selkeä Q♠-pikkukortti ja Kasino kultakolikko 🪙 (entiset tummat korttiglyyfit näkyivät huonosti)',
      'Kasino: tekoälyn jättöriskin arvio huomioi nyt myös ♠2- ja ♦10-kaappaukset (sisäinen viilaus)',
    ],
  },
  {
    date: '31.5.2026',
    items: [
      'Valikko: Info eriytetty omaksi paneeliksi (ℹ-nappi rattaan vieressä): Asetukset sisältää enää muutettavat arvot, Info luettavat tekstit (Esittely, Sanasto & Merkistö, Muutosloki, Tulossa)',
      'Pelikohtaiset sääntövalinnat aloitusnäyttöön (pelaajamäärän viereen)',
      'Paskahousu: käsikoko 5/6 · kovat kakkoset: napit "Kaikki" (kaikki 2 = 15) tai "♠2 ♣2" (vakio: vain mustat kakkoset kovia, ♥2/♦2 tavalliset) · kuvakortin minimikynnys 7/8/9',
      'Kasino: salli erikoisrakennelmat arvoille 14-16 (A = 14, ♠2 = 15, ♦10 = 16)',
    ],
  },
  {
    date: '30.5.2026',
    items: [
      'Moska: loppupelin loki yhtenäistetty Maijan tyyliin: "X poistui pelistä 👏" ja "X hävisi." (poistettu kömpelö verbitaivutus)',
    ],
  },
  {
    date: '30.5.2026',
    items: [
      'Versio 0.3: Bottien Taistelu -kokonaisuus valmis 🎉',
      'Tekoäly: Maija pelaa nyt Maija-kortin (♠Q) pois patojen mukana; Seiska osaa voittaa ässä-bonusketjulla (ässä ensin, nostettu kortti perään)',
      'Kasino (Bottien Taistelu): rakennelman omistajan nimi näkyy katselutilassa (ei enää "oma"); kierrosten välissä katsoja etenee "Seuraava peli →" -napilla',
      'Koputus (Bottien Taistelu): aikomus-kortti näkyy nyt kokonaan',
    ],
  },
  {
    date: '30.5.2026',
    items: [
      'Pelaajamäärä valitaan vain pelin aloitusnäytöllä (poistettu päällekkäinen säädin Asetuksista)',
      'Katselutila-palkki (tahtisäädin) nyt kaikissa 9 pelissä: myös Läpsy, Ristiseiska ja Paskahousu',
      'Vuoroviesti yhtenäistetty: "Vuorossa X." kaikissa vuoropohjaisissa peleissä',
      'Tapahtumaviestit yhtenäistetty kolmanteen persoonaan (pohjaa kieliversioinnille)',
      'Ristiseiska: pelatun kortin vaikutus näkyy lokissa (esim. "avaa maan", "alapino ei avaudu vielä")',
      'Bottien Taistelu: korjattu kohtia joissa bottia puhuteltiin pelaajana',
      'Seiska: Bottien Taistelu -rivin korkeus: aikomus-kortti ei enää leikkaudu',
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
      '"Bottien Taistelu" -nappi näyttää "Mestari": kaikki 9 peliä',
      'Debug-näkymän nappi nimetty "Avoimet kortit": kaikki 9 peliä',
      'Replay: väritetyt korttimerkit renderöityvät lokissa oikein',
      'Seiska: katselutila-palkki ja AI-ässäbonus-bugit korjattu',
    ],
  },
  {
    date: '27.5.2026',
    items: [
      'Bottien Taistelu: tapahtumaloki ja pelaajatilat näkyvät pelin aikana',
      'Kultakala: allBots: pelaaja 0 ei enää näy muiden bottien joukossa',
    ],
  },
  {
    date: '26.5.2026',
    items: [
      'Bottien Taistelu: askelpalautus: selaa jokaista siirtoa taaksepäin',
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
