# Botbench: bottien voimamittari

Itsepeluu-benchmark joka mittaa AI-tasojen (Oppipoika/beginner, Kisälli/normal,
Mestari/hard) todellista voimaeroa: taso A vastaan taso B, istuimet vuorotellen
ABAB/BABA, 4 pelaajaa, siemennetty satunnaisuus (toistettava).

## Mistä tarve tuli: katselutila teki tämän käsin (kirjattu 19.8.2026)

Botbench ei ole ensimmäinen yritys mitata bottien laatua vaan **toinen**, ja ensimmäinen oli
käsityötä. Menetelmä on päivättävissä Gemini-arkistoon, 28.5.2026:

> Peluutan botteja avoimilla korteilla sivusta katsellen ottaakseni selvää löytävätkö he
> tiensä voittajaksi ilman mokia ja kun tähän lisää korttien laskennan niin taso on korkea

> Siis botit eivät näe toistensa kortteja, vain minä Tarkkailiija näen ne

Viikkoa myöhemmin, 3.6.2026, menetelmä on nimetty ja sen raja tunnistettu:

> On kolme vaikeustasoa, joista Mestari ei tee tietoisia virheitä, mutta yritän koulia sitäkin
> paremmaksi nimenomaan katselutilassa eriskummallisuuksia bongaamalla ja niihin tarttumalla.
> En osaa neuvoa agenttia tähän vielä.

Viimeinen lause on tämän dokumentin syntysyy: **puuttuva osa oli automatisointi, ei
havaintotapa.** Botbench julkaistiin 18.7.2026 eli kuusi viikkoa myöhemmin.

**Seuraus työtapaan, ja se on yhä voimassa.** Katselutila ja Botbench eivät korvaa toisiaan
vaan mittaavat eri asioita. Mittari näkee voimaeron mutta ei outoa siirtoa joka toistuu ilman
että se näkyy voittoprosentissa; katselutila näkee juuri sen. Nollatulos mittarissa ei siis ole
todiste siitä että botti pelaa järkevästi, ja useampi alla oleva löydös on löytynyt katsomalla
eikä ajamalla.

**Bottien näkyvyysvaatimus, samasta illasta 3.6.2026.** *Mulle tärkein oli huiputuksen ja
epäsymmetrisyyden poisto. Vain laillisia siirtoja.* Botti ei siis saa lukea tilaa jota pelaaja
ei näe, eikä sillä saa olla eri sääntöjä kuin pelaajalla. Tämä on se vaatimus jota katselutila
oikeasti valvoi, ja `docs/PELIKANONIT.md` tarkistaa saman koodia vasten näkyvyystaulukoiden
kohdalla. Vaikeustaso saa siis vaihdella osaamisessa, ei tiedossa.

*Lähde: `Lahteet/louhinnat/04-pelit-ja-pelisuunnittelu.md` kohta 3, kuitattu 19.8.2026.*

## Ajo

```powershell
$env:BOTBENCH='1'; npx vitest run test/botbench.test.jsx; Remove-Item Env:BOTBENCH
```

Valinnaiset ympäristömuuttujat: `BOTBENCH_N` (pelejä/pari, oletus 20),
`BOTBENCH_GAMES` (esim. `Moska,Kasino`), `BOTBENCH_PAIRS` (esim. `hard:beginner`),
`BOTBENCH_OUT` (JSON-rivien tulostiedosto). Ei aja osana `npm test`iä.

Tekninen perusta: pelien valinnainen `botLevels`-prop (istuinkohtainen AI-taso;
`null` = tuotantokäytös). Mittari yhdistää tulossijoitukset istuimiin
snapshot-framejen nimistä.

## Baseline 17.7.2026 (N=30/pari, siemennetty)

Luku = ensin mainitun tason voitto-osuus (tasapelit puolikkaina). Otoskoolla 30
keskivirhe on n. ±9 %-yks., joten yksittäinen 40–60 % on kohinaa; toistuva kuvio
yli pelien ei ole.

| Peli        | hard vs beginner | hard vs normal | normal vs beginner |
|-------------|-----------------:|---------------:|-------------------:|
| Läpsy       | 97 % | 87 % | 37 % → korjattu, ks. alla |
| Seiska      | 80 % | 60 % | 60 % |
| Paskahousu  | 70 % | 43 % | 53 % |
| Kultakala   | 67 % | 40 % | 30 % |
| Moska       | 67 % | 47 % | 57 % |
| Ristiseiska | 63 % | 57 % | 53 % |
| Koputus     | 58 % | 37 % | 38 % |
| Kasino      | 52 % | 40 % | 50 % |
| Maija       | 50 % | 47 % | 50 % |

Yhteenlaskettuna yli kaikkien pelien (270 peliä/pari):
hard vs beginner **67 %**, hard vs normal **51 %**, normal vs beginner **47 %**.

## Löydökset (baseline)

1. **Tasoladder ei ole monotoninen.** Mestari voittaa Oppipojan selvästi (67 %),
   mutta Kisälli EI voita Oppipoikaa (47 %) eikä Mestari Kisälliä (51 %).
   Nykyinen tasomekanismi (sama heuristiikka + virhekohina 0/15/50 %) ei tuota
   tasaista porrasta: 15 %:n kohina ei juuri haittaa, ja Mestarin lisäkyvyt
   näkyvät vain osassa pelejä.
2. **Läpsyn Kisälli oli hitaampi kuin Oppipoika** (37 % Oppipoikaa vastaan).
   Ajoitustaulukon suora seuraus: beginner-keskireaktio ~1550 ms, normal
   ~1700 ms (Lapsy.jsx, handleMatch). Oppipoika siis läpsyi nopeammin.
   **KORJATTU 17.7.2026**: Oppipoika hidastettu ~2400 ms:iin (normal/hard
   ennallaan, jotta ihmistä vastaan pelattavat tasot eivät muutu). Välivaihe
   ~2000 ms ei riittänyt (voitot 50/50, koska osa Läpsyn voitoista ratkeaa
   haastekorteilla eikä läpsynopeudella). Mitattu korjauksen jälkeen (N=30):
   hard vs beginner **100 %**, hard vs normal **87 %**, normal vs beginner
   **77 %**, porras monotoninen.
3. **Kasino ja Maija: tasoilla ei mitattavaa eroa** (52 %/50 % hard vs beginner).
   Kasinon hienostunut inferenssi ei realisoidu voitoiksi; Maijassa
   kohinavirheet eivät ilmeisesti maksa mitään. Molemmat ansaitsevat
   jatkotutkinnan ennen kuin tasoja mainostetaan pelaajalle vaikeuseroina.
4. **Kultakala ja Koputus: Kisälli häviää Oppipojalle** (30 %/38 %), sama
   epämonotonisuus kuin Läpsyssä, syy selvittämättä.
5. **Paskahousun sekatasopeli pattiutui ilman yhtäkkistä kuolemaa.** Mestarin
   optimipeli tuottaa ikuisen loppupelisilmukan myös heikompaa vastaan; korjattu
   niin että pattikatkaisija virittyy kun vähintään yksi istuin on Mestari
   (tuotantokäytös ennallaan).

~~Terveimmät ladderit: Seiska, Ristiseiska, Moska (+ Läpsyn hard). Ne voivat
toimia referenssinä kun muiden pelien tasoja korjataan.~~

**⚠️ KUMOTTU 21.7.2026, älä käytä näitä referenssinä.** Kaikki kolme mitattiin
uudelleen N=400:lla: Seiskan ja Moskan ylätasot ovat samantasoiset ja Ristiseiskalla
ei ole porrasta lainkaan. Ks. alempaa osiot "Seiska 21.7." ja "Moska ja Ristiseiska 21.7.".

## Kyvykkyysporras 17.7.2026 (Kultakala, Koputus, Maija, Kasino)

Neljän rikkinäisen pelin tasoerot rakennettiin uudelleen kyvykkyyksinä
satunnaiskohinan (`aiShouldFumble`) sijaan: Oppipojalla on deterministisiä
inhimillisiä heikkouksia, Kisällillä täysi perusstrategia, Mestarilla lisäkyvyt.
Kohina poistettu näistä neljästä kokonaan.

| Peli      | Oppipoika (heikkoudet) | Kisälli | Mestari (lisäkyvyt) |
|-----------|------------------------|---------|----------------------|
| Kultakala | ketju jatkuu vain A-3:lla; ottaa poistopakasta "melkein hyvän" (+3) | täysi ketjuvaihto | EV-vertailu: huonoin tunnettu vs. tuntematon (EV 7), kynnys ≥3 |
| Koputus   | ei huomaa poistopakkaa; arka koputtaja (kynnys 5) | poistopakka; koputus 8; tuntemattoman täyttö vain A/2 | tuntemattoman EV-täyttö ≤4; realistisempi arvio (×6); poistopakasta EV-nosto |
| Maija     | **lyö vain yhden kortin kerrallaan** (26.7.2026); isot kortit ensin; kohtelee Maijaa tavallisena patana (ei dumppausta, ei karttelua); polttaa valtit | **monikorttihyökkäys (koko maa)** + pienimmät ensin + Maija-prioriteetti + valttiepäröinti | + valttilaskenta pakan loputtua + kaatoprioriteetti (Maija/korkeat ensin) |
| Kasino    | määräkaappaus (ei pisteitä); ei rakenna/varasta/bonuksia; jättää "pienimmän" numeroarvon mukaan (ässä!) | pistekaappaus + rakentaminen aina + varastus + bonukset | + inferenssi: jättövaara, A-suoja, rakennuksen varastusriskiportti |

Mittaustulokset muutosten jälkeen (N=40/pari):

| Peli      | hard vs beginner | hard vs normal | normal vs beginner |
|-----------|-----------------:|---------------:|-------------------:|
| Koputus   | 66 % | 68 % | 65 % |
| Kultakala | 70 % | 45 % | 65 % |
| Maija     | 63 % | 48 % | 60 % |
| Kasino    | 51 % | 50 % | 54 % |

(Kultakalan ja Maijan luvut päivitetty pelitesti-inhimillistyksen jälkeen,
ks. löydös 4.)

Opit ja rajat:

1. **Koputus korjautui täysin** (66/68/65, aiemmin 58/37/38). Kaksi mitattua
   oivallusta: aikainen koputus on ETU (alkuperäinen "aloittelija koputtaa
   liian aikaisin" -virhe oli oikeasti lahja → Oppipojan heikkous on nyt
   arkuus), ja tuntemattoman paikan EV-täyttö (KOPUTUS.md:n oma strategiaohje,
   jota botit eivät koskaan toteuttaneet) on Mestarin päävahvuus.
2. **Kultakala ja Maija**: porras beginneriä vastaan kunnossa (60-73 %), mutta
   hard ≈ normal. Nollahypoteesitesti (identtiset botit → sama jakauma kuin
   "erilaiset") osoitti että kärkiero hukkuu nosto-/jakotuuriin näillä
   otoksilla. Kirjattu pelin ominaisuutena, ei rikkinäisyytenä.
   **⚠️ MAIJAN OSALTA KUMOTTU 21.7.2026 (N=400):** päinvastoin, alapää on rikki
   ja yläpää terve (`beginner ≈ normal < hard`). Ks. osio "Maija 21.7.2026".
   Kultakalan luvut ovat yhä tästä N=40-erästä eli varmistamatta.
3. **Kasino on tuuripeli botti-erojen erotuskyvyn kannalta** (kaikki parit
   ~50 %). Viisi eri heikennystä/vahvennusta ei liikuttanut voittoja, vaikka
   mittari todistetusti reagoi Kasinon koodimuutoksiin (parinäkö-kokeilu
   liikutti lukuja). Tärkein löydös silti: Mestarin vanha rakennus-EV-portti
   ("rakenna vain jos arvo > 1.5 × kaappaus") oli HAITALLINEN (40 % Kisälliä
   vastaan kahdesti); rakentaminen on Kasinossa vahva siirto, ja portti
   korvattiin varastusriskirajalla.
4. **Pelitesti-inhimillistys (17.7. ilta):** kaksi Oppipojan heikkoutta näytti
   ihmispelaajalle absurdilta ja pehmennettiin mittaria vasten: Kultakalan
   ketjukielto heitti paljastuneita ässiä poistopakkaan (nyt: ketju jatkuu
   ilmiselvällä A-3-kortilla; ero haetaan poistopakka-ahneudella +3) ja Maijan
   Oppipoika hamstrasi Maijaa loppuun asti, koska kortti oli suljettu pois
   hyökkäysryhmistä (nyt: tavallinen pata, lähtee isot ensin -tyylillä).
   Mittaus inhimillistyksen jälkeen: Kultakala 70/45/65, Maija 63/48/60.
   Oppi: heikkouden pitää olla paitsi mitattava myös USKOTTAVA, "botti ei
   tee ilmeistä siirtoa" rikkoo illuusion nopeammin kuin heikko strategia.
5. Kuollutta koodia siivottu: Kultakalan käyttämätön "PHASE 1-3" -analyysi
   (uhka-arvio, dynaaminen kynnys, paikkavalinta) poistettu/otettu osin
   käyttöön; Kasinon findWorstCapture poistettu.

## Seiska 20.7.2026 (N=150): ässäbonuksen järjestyskorjauksen jälkeen

Ajettu koska `aiAceBonusDecision` korjattiin järjestämään ässäbonuksen ryhmälyönti
kanonisesti (bonusmaan kortti alimmaiseksi). Korjaus muuttaa pelin kulkua, joten
mittaus oli pakko uusia. **Ei ylikirjoita 17.7. baselinea**, koska otoskoko on eri
(N=150 vs N=30) ja rivien sekoittaminen antaisi väärän kuvan tarkkuudesta.

| Peli   | hard vs beginner | hard vs normal | normal vs beginner |
|--------|-----------------:|---------------:|-------------------:|
| Seiska (17.7., N=30)  | 80 % | 60 % | 60 % |
| Seiska (20.7., N=150) | **74,7 %** | **52,0 %** | **78,0 %** |

N=150 → keskivirhe n. ±4 %-yks. 450 peliä, `stalled: 0`, `unmapped: 0`.

**Löydös: Seiskan porras on `beginner << normal ≈ hard`, ei monotoninen.**
Mestari ei erotu Kisällistä (52 %, kolikonheitto), ja molemmat voittavat
Oppipojan yhtä selvästi (74,7 % vs 78,0 %, ero ~1 keskivirhe eli ei todellinen).

**Tämä ei ole järjestyskorjauksen aiheuttama.** Baselinen 60 % mitattiin N=30:llä
(±9 %-yks.), joten 60 % ja 52 % ovat tilastollisesti yhteensopivia. Ylätasot olivat
todennäköisesti samantasoiset jo 17.7., mutta otoskoko ei riittänyt näyttämään sitä.

**Seuraus baselinen johtopäätökseen:** yllä oleva lause *"Terveimmät ladderit:
Seiska, Ristiseiska, Moska"* ei päde Seiskan osalta. Seiskan yläpää kuuluu samaan
jatkotutkintaan kuin Kasino ja Maija (löydös 3). Ristiseiskan ja Moskan luvut ovat
yhä N=30 eli samalla varauksella; niiden "terveys" kannattaa varmistaa isommalla
otoksella ennen kuin niitä käytetään referenssinä.

**Metodivaroitus:** järjestystä muuttava korjaus muuttaa satunnaisluvun kulutuksen
koko pelin ajaksi, joten siemennetty ajo EI ole pariverrattu A/B ennen ja jälkeen
vaan käytännössä uusi arvonta. Pienet erot N=30:llä eivät kerro mitään.

## Seiska 21.7.2026: outtien laskenta tasapeliin: NOLLATULOS (muutos palautettu)

`aiBestPlay`n viimeinen rivi oli `return [nonPair.length ? nonPair[0] : non7[0]]`,
eli kun useampi laillinen yksittäiskortti läpäisi kaikki suodattimet, valinnan
ratkaisi käden järjestys eikä pisteytys. Kokeiltu korjaus: valitse se kortti jolla
on vähiten outteja (saman maan + saman arvon näkemättömät kortit; näkemätön = ei
omassa kädessä eikä lyöntipakan päällimmäisenä). Sama tehtiin `leaveGroup[0]`:lle.

| hard vs normal | N=150 | N=400 |
|---|------:|------:|
| Ennen muutosta | 52,0 % | **58,0 %** |
| Muutoksen jälkeen | 60,0 % | **61,25 %** |

Erotus samalla kierrosjoukolla +3,25 %-yks., yhdistetty keskivirhe 3,54 %-yks.,
z = 0,92. Ei merkitsevä. Muut parit eivät liikkuneet (hard vs beginner 74,7 → 73,3,
normal vs beginner 78,0 → 77,3). **Muutos palautettu.**

Kaksi opetusta, jotka ovat arvokkaampia kuin itse tulos:

1. **Tasoriippumaton parannus ei voi nostaa porrasta.** `aiBestPlay` on jaettu
   kaikille kolmelle tasolle, ja outtien laskenta osui haaraan jota hard ja normal
   käyttävät identtisesti. Seiskan tasoerot syntyvät muualta: `aiShouldFumble`
   (normal 15 % virhettä), `pickBestAce` (vain hard) ja `aiAceBonusDecision`in
   `isHard`-haara. Kun molemmat tasot paranevat yhtä paljon, keskinäinen voitto-osuus
   pysyy määritelmällisesti ennallaan. **Tarkista ennen mittausta, onko muutos
   tasokohtainen; jos ei ole, mittari ei voi näyttää mitään ja ajo on hukkaan
   heitettyä aikaa.** Jos outteja haluaa käyttää porrastukseen, se pitää portittaa
   Mestarin kyvykkyydeksi kuten 17.7. tehtiin neljälle muulle pelille.

2. **Aiempi kirjaus "52 %, kolikonheitto" oli liian pieni otos.** Sama muuttumaton
   koodi antaa N=400:lla 58,0 %. Kierrokset 0–149 tuottivat 52,0 % ja kierrokset
   150–399 tuottivat 61,6 %, eli kaksi riippumatonta otosta samasta koodista eroavat
   9,6 %-yks. Seiskan yläpään hajonta on siis suurempi kuin binomikeskivirhe
   ennustaa. **N=150 ei riitä Seiskan hard–normal-parille; käytä N≥400.** Yllä oleva
   20.7. kirjattu johtopäätös *"Mestari ei erotu Kisällistä"* on tämän valossa
   yliampuva: 58,0 % ± 2,5 on vaatimaton mutta todellinen porras.

Nollatulos on kirjattu tänne nimenomaan siksi, ettei samaa ideaa ehdoteta uudelleen.
Käden järjestys oli tässä yhtä hyvä kuin outtien laskenta.

## Moska ja Ristiseiska 21.7.2026 (N=400): "terveet ladderit" oli otosharha

Baseline nimesi Seiskan, Ristiseiskan ja Moskan terveimmiksi laddereiksi ja ehdotti
niitä referenssiksi muiden pelien korjaamiseen. Se perustui N=30:een. Kun kaikki
kolme mitataan N=400:lla (keskivirhe ±2,5 %-yks.), yksikään ei kelpaa referenssiksi.

| Peli | pari | N=30 (17.7.) | N=400 (21.7.) |
|------|------|-------------:|--------------:|
| Moska | hard vs beginner | 67 % | **71,8 %** |
| Moska | hard vs normal | 47 % | **53,5 %** |
| Moska | normal vs beginner | 57 % | **65,8 %** |
| Ristiseiska | hard vs beginner | 63 % | **53,3 %** |
| Ristiseiska | hard vs normal | 57 % | **49,0 %** |
| Ristiseiska | normal vs beginner | 53 % | **51,3 %** |

**Moska: sama muoto kuin Seiskalla**, `beginner << normal ≈ hard`. Oppipoika häviää
selvästi molemmille (71,8 % ja 65,8 %), mutta Mestari ei erotu Kisällistä (53,5 %,
z ≈ 1,4). Ylätasot ovat samantasoiset.

**Ristiseiskalla ei ole porrasta lainkaan.** Kaikki kolme paria ovat kolikonheittoja
(53,3 %, 49,0 %, 51,3 %); yksikään ei eroa 50 %:sta enempää kuin ~1,3 keskivirhettä.
Tasoerot eivät realisoidu voitoiksi ollenkaan, mikä on sama tila kuin Kasinolla ja
Maijalla (löydös 3 ja kyvykkyysporras-osion kohta 3).

**Seuraus: baselinen lause *"Terveimmät ladderit: Seiska, Ristiseiska, Moska"* on
kumottu kaikkien kolmen osalta** (Seiska ks. 21.7. nollatulososio). Mittarilla ei ole
tällä hetkellä yhtään peliä jonka porras olisi todennetusti monotoninen kolmen tason
yli. ~~Lähimpänä on Läpsy (100/87/77, N=30), mutta sekin on mittaamatta isolla otoksella.~~

*Ensimmäinen virke piti 21.7.2026 ja lakkasi pitämästä 20.8.2026: Koputuksen kolme paria
mitattiin samassa N=400-ajossa ja kaikki ovat merkitsevästi yli 50 %:n (69,9 / 61,6 /
66,9). Jälkimmäinen virke on yhä voimassa Läpsyn osalta, ks. osio "Koputus ja Paskahousu
20.8.2026".*

**Metodioppi, kolmas kerta samasta asiasta:** N=30 ei ainoastaan ollut epätarkka, se
tuotti systemaattisesti liian ruusuisen kuvan. Kolmesta "terveestä" ladderista kahden
tasot osoittautuivat samantasoisiksi ja yksi porras olemattomaksi, kun otos
nelinkertaistettiin. Pienen
otoksen virhe ei jakaudu tasaisesti johtopäätöksiin: se suosii kiinnostavan näköisiä
eroja, koska kohina näyttää signaalilta. Älä nimeä referenssipeliä otoksella joka ei
kestä kaksinkertaistusta.

## Ristiseiska 21.7.2026: passausmuisti Mestarille: NOLLATULOS (muutos palautettu)

Ristiseiskalla ei ole kyvykkyysporrasta (ks. edellinen osio). Hypoteesi: pelin ainoa
taitokanava on toteuttamatta. RISTISEISKA.md rivi 39 sanoo *"Passaus on sallittu vain
jos ei käy"*, ja rivi 90 nimeää muistin olennaiseksi, mutta botti ei muistanut
passauksia lainkaan. Passaus on pakotettu ja julkinen, joten siitä seuraa varmaa
tietoa: passaaja ei omistanut yhtäkään sillä hetkellä pelattavissa ollutta korttia.

Toteutus (vain `hard`): `lacks[i]` = korttiavaimet joita pelaaja i tunnetusti ei omista,
kertyy passauksista, purkautuu jos hän saa kortin panttina. `aiBestCard` suosi siirtoa
joka avaa vain kortteja jotka vastustaja tunnetusti puuttuu.

| Ristiseiska N=400 | Ennen | Passausmuistilla |
|-------------------|------:|-----------------:|
| hard vs beginner | 213 | **213** |
| hard vs normal | 196 | **196** |
| normal vs beginner | 205 | **205** |

Voittomäärät identtiset kaikissa pareissa. Ainoa ero koko 1200 pelin aineistossa oli
`meanA` 2,4 → 2,40125 hard vs beginner -parissa, eli **yksi sijoitus 400 pelissä**.
**Muutos palautettu.**

**Miksi se ei voinut toimia (rakenteellinen syy):** Ristiseiskassa pelattavien korttien
joukko on kapea, ULOSPÄIN liikkuva rintama, kussakin avatussa maassa vain `low-1` ja
`high+1`. Passaaja paljastaa puuttuvansa sen hetken rintaman. Mutta oma siirto työntää
rintamaa ulospäin, joten siirron avaama kortti on määritelmän mukaan sellainen joka EI
ollut aiemmin pelattavissa, eikä se siksi voi kuulua aiemmin kirjattuun puutejoukkoon.
Leikkaus on käytännössä aina tyhjä ja pisteytys palautti nollan.

**Yleinen oppi, tämän session arvokkain:** tieto joka on ihmiselle piilossa voi olla
botille jo laskettuna. Passaus kertoo mitä vastustajalta puuttuu, mutta puuttuva joukko
ON pöydän näkyvä rintama, jonka jokainen laillisuutta laskeva botti tuntee joka tapauksessa.
Muistiin tallentaminen ei lisännyt informaatiota. **Ennen kuin rakennat botille
päättelykanavan, tarkista sisältyykö se jo siihen mitä botti laskee sääntöjen
noudattamiseksi.** Ihmispelaajien välinen taitoero ei ole sama asia kuin bottien välinen.

**Metodi jota kannattaa toistaa:** muutos portitettiin `hard`-tasolle ja pisteytys
laski vain varmaa puutetta, jolloin tyhjä muisti antaa kaikille ehdokkaille 0 ja käytös
on bittitarkasti entinen. Tästä seurasi ilmainen tarkistus: `normal vs beginner` ei
osallistu muutokseen lainkaan, joten sen TÄYTYI tulla ulos samana (205/400). Se tuli.
Rakenna tasokohtainen muutos aina niin, että jokin mitattava pari toimii
verrokkina joka paljastaa vuodon muille tasoille.

## Maija 21.7.2026 (N=400): porras katkeaa keskeltä, tasot eivät samantasoiset

Mitattu jotta tiedetään kuuluuko Maija "taso vaikuttaa vähän" -merkinnän piiriin
(ks. `FLAT_AI_GAMES`, src/App.jsx). **Ei kuulu.**

| pari | N=40 (17.7.) | N=400 (21.7.) | z |
|------|-------------:|--------------:|--:|
| hard vs beginner | 63 % | **57,8 %** | 3,1 |
| hard vs normal | 48 % | **52,9 %** | 1,2 |
| normal vs beginner | 60 % | **51,3 %** | 0,5 |

**Mestari voittaa Oppipojan todistetusti** (57,8 %, z = 3,1), joten väite "taso
vaikuttaa vähän" olisi Maijassa VÄÄRÄ. Merkintää ei lisätty.

Mutta porras on rikki eri tavalla kuin Seiskassa ja Moskassa: siellä muoto on
`beginner << normal ≈ hard`, Maijassa **`beginner ≈ normal < hard`**. Kisälli ei
erotu Oppipojasta lainkaan (51,3 %), eli keskitaso on nimellinen. Kyvykkyysporras-
osion taulukko lupasi Kisällille "täysi perusstrategia + Maija-prioriteetti +
valttiepäröinti"; ne eivät tuota mitattavaa etua Oppipojan heikkouksia vastaan.

**Kolmas kerta jolloin pieni otos petti, ja nyt molempiin suuntiin.** N=40 antoi
`normal vs beginner` = 60 %, N=400 antaa 51,3 %: kohina oli tuottanut olemattoman
portaan. Samalla `hard vs normal` nousi 48 → 52,9 %. Aiempi kirjaus "Kultakala ja
Maija: hard ≈ normal, porras beginneriä vastaan kunnossa (60-73 %)" on siis Maijan
osalta väärin päin: yläpää on terveempi kuin alapää.

**Kultakala on yhä mittaamatta N=400:lla** ja sen luvut ovat samasta N=40-erästä,
joten sen "porras kunnossa" -kirjaus on yhtä epäluotettava. Älä käytä sitä
referenssinä ennen uusintamittausta.

## Kasino 21.7.2026 (N=400): samantasoisuus vahvistettu, merkintä lisätty

Kasino oli baselinesta asti epäilty tuuripeliksi botti-erojen erotuskyvyn kannalta
(löydös 3, kaikki parit ~50 % N=30/40:llä). N=400 vahvistaa sen, eli tämä on harvinainen
tapaus jossa pieni otos ei erehtynyt.

Voitto-% tasapelit puolikkaina (Kasinossa tasapeli on sääntöjen mukaan mahdollinen,
16 pisteen raja, joten `ties` ei ole virhe):

| pari | winsA / winsB / ties | voitto-% | z |
|------|---------------------:|---------:|--:|
| hard vs beginner | 210 / 180 / 10 | **53,8 %** | 1,5 |
| hard vs normal | 190 / 199 / 11 | **48,9 %** | −0,45 |
| normal vs beginner | 202 / 190 / 8 | **51,5 %** | 0,6 |

Kaikki kolme ovat ~1,5 keskivirheen sisällä 50 %:sta. **Lisätty `FLAT_AI_GAMES`-listaan**
(src/App.jsx) eli Kasinon Koneäly-osio kertoo pelaajalle että tason vaikutus on pieni.

Tämä vahvistaa myös aiemman löydöksen 3 tulkinnan: viisi eri heikennystä/vahvennusta ei
liikuttanut Kasinon voittoja, vaikka mittarin todettiin reagoivan Kasinon koodimuutoksiin.
Kaappauspelin lopputulos ratkeaa jakotuurilla siinä määrin, että botin taito hukkuu siihen.

## Kultakala 24.7.2026 (N=400): alaporras terve, ylätasot samantasoiset, EI merkintää

Viimeinen mittaamaton peli. Mitattu jotta "porras beginneriä vastaan kunnossa
(60-73 %)" -kirjaus (samasta N=40-erästä joka petti Maijalla) saadaan varmennettua
tai kumottua.

Voitto-% tasapelit puolikkaina:

| pari | winsA / winsB / ties | voitto-% | z |
|------|---------------------:|---------:|--:|
| hard vs beginner | 216 / 174 / 10 | **55,25 %** | 2,1 |
| hard vs normal | 196 / 189 / 15 | **50,9 %** | 0,35 |
| normal vs beginner | 226 / 165 / 9 | **57,6 %** | 3,05 |

**Kaikki parit eivät ole samantasoiset, merkintää ei lisätty.** `normal vs beginner` on 57,6 % (z = 3,05, p < 0,01)
ja `hard vs beginner` 55,25 % (z = 2,1). Lisäysehto (kaikki kolme paria 50 % ±1,5 SE eli
46,3-53,8 %) ei täyty, joten `flatNote` valehtelisi: Kisälli ja Mestari voittavat
Oppipojan todistetusti. Keskiarvosijoitukset vahvistavat (hard 2,28 · normal 2,27 ·
beginner 2,64).

Muoto on **`beginner << normal ≈ hard`**, sama kuin Seiskalla ja Moskalla: alaporras
terve, ylätasot (`hard vs normal` 50,9 %) samantasoiset. Kultakala liittyy siis
rikkinäisen yläportaan peleihin, ei täysin samantasoisiin.

**Poikkeus N=40:n petossarjaan:** toisin kuin Maijalla (jossa pieni otos meni väärin
päin), vanha "hard ≈ normal, porras beginneriä vastaan kunnossa" oli tässä suunnaltaan
oikea. `hard vs normal` on aidosti samantasoinen ja beginner-porras aidosti olemassa, vain
sen suuruus oli yliarvioitu (60-73 % → 55-58 %). N=40 ei siis aina valehtele, mutta
kolmesta neljästä tapauksesta se teki, joten johtopäätös vaatii yhä N≥400:n.

## Maija 26.7.2026 (N=400): alapää korjattu: monikorttihyökkäys on Kisällin kyky

Ensimmäinen kohta joka ratkesi "Avoimet AI-työt" -listalta. Muutos on yhden rivin
mittainen (`maijaPickAttack`, `maxCards`): **Oppipoika lyö yhden kortin kerrallaan,
Kisälli ja Mestari koko maan.**

| pari | ennen | jälkeen | muutos | z |
|------|------:|--------:|-------:|--:|
| hard vs beginner | 57,8 % | **74,0 %** | +16,2 | 9,6 |
| hard vs normal | 52,9 % | **52,9 %** | ±0,0 | 1,2 |
| normal vs beginner | 51,3 % | **68,0 %** | +16,8 | 7,2 |

**Verrokki täsmää bitilleen.** `hard vs normal` ei muuttunut pyöristyksen tarkkuudella
vaan raakaluvuiltaan: 211/188, yksi patti, keskisijat 2,4506/2,5496 molemmissa ajoissa.
Tämä on vahvin mahdollinen todiste siitä että muutos osui vain Oppipoikaan. Tasokohtaisen
muutoksen vaatimus (ks. työjärjestys) ei ole muodollisuus: juuri tämä identtisyys erottaa
korjatun portaan vuotaneesta.

### Miksi vika oli juuri tässä

Kaikki kolme tasoa löivät koko maan kerralla, eli **Oppipoika sai pelin vahvimman
shedding-työkalun ilmaiseksi.** Kisällille luvatut kolme lisää eivät korvanneet sitä,
koska kukin niistä oli joko tyhjä tai Oppipojan itsensä toistama:

| Kisällin lisä | Miksi ei tuottanut porrasta |
|---|---|
| pienimmät ensin (vs. isot ensin) | ei valitse kortteja pakkavaiheessa lainkaan, vain rivijärjestyksen |
| Maija-prioriteetti | Oppipoika lajittelee isot ensin, ja Maija on arvo 12, joten se nousee patakäden kärkeen omin avuin |
| valttiepäröinti puolustuksessa | aito mutta kapea: koskee vain tilannetta jossa kaikki voidaan kaataa |

Lajittelun tyhjyys on laskettavissa. Käsi täydennetään aina viiteen, joten
`slice(0, defHandSize)` ei voi katkaista ryhmää kun puolustajalla on viisi korttia.
Mallinnus 200 000 kädellä: pisin ei-valttimaa on 1 kortti 13,3 %, 2 korttia 58,8 %,
3 korttia 24,4 %, 4+ korttia 3,5 %. Katkaisu alkaa vaikuttaa vasta kun puolustajan käsi
on kutistunut kahteen (27,9 %) tai yhteen (86,7 %), eli loppupelissä.

**Yleistettävä oppi: älä oleta että tasokohtainen ehto vaikuttaa siellä minne se on
kirjoitettu.** Rivin 64 lajittelu näyttää koodissa tasoerolta ja on sitä syntaktisesti,
mutta sen tulos kulkee `slice`in läpi joka useimmiten ottaa kaikki kortit. Ero oli
olemassa, se ei vain päässyt vaikuttamaan mihinkään. Tarkista mihin ehdon tulos päätyy,
älä vain sitä että ehto on olemassa.

### Muoto vaihtoi paikkaa, ei kadonnut

Uusi muoto on **`beginner << normal ≈ hard`**, eli Maija siirtyi Seiskan, Moskan ja
Kultakalan seuraan: alaporras terve, yläpää samantasoinen. `hard vs normal` on yhä
52,9 % (z = 1,2), mikä ei ole merkitsevä.

Tämä ei ole korjauksen sivuvaikutus vaan sen paljastama. Yläpää oli 52,9 % jo ennen
muutosta; se näytti terveeltä vain siksi että alapää oli sitä huonompi. **Kalibrointi
poisti alapään vian ja siirsi Maijan uuden kanavan odottajiin** (ks. luokittelu alla).

### Yhteenveto: mitkä pelit saavat merkinnän

| Peli | N=400 mitattu | Kaikki parit ~50 % | Merkintä |
|------|:-------------:|:------------------:|:--------:|
| Ristiseiska | kyllä | kyllä | **on** |
| Kasino | kyllä | kyllä | **on** |
| Maija | kyllä | ei (hard vs beg 74,0 %, z = 9,6) | ei |
| Seiska | kyllä | ei (beginner häviää selvästi) | ei |
| Moska | kyllä | ei (beginner häviää selvästi) | ei |
| Kultakala | kyllä | ei (normal vs beg 57,6 %, z = 3,05) | ei |
| ~~Koputus, Läpsy, Paskahousu~~ | ~~ei (N=30/40)~~ | ~~—~~ | ~~ei~~ |
| Koputus | kyllä (20.8.2026) | ei (kaikki kolme paria yli 50 %, z = 4,65-7,95) | ei |
| Paskahousu | kyllä (20.8.2026) | kyllä (suurin z = 1,45) | **on** (20.8.2026) |
| Läpsy | kyllä (20.8.2026) | ei (kaikki kolme paria yli 80 %, z = 12,2-16,7) | ei |

*Kolmen pelin rivi on korvattu kolmella omalla rivillä 20.8.2026, ks. osio "Koputus ja
Paskahousu 20.8.2026". Vanha rivi jätetään näkyviin, koska se kertoo mitä mittausvelkaa
oli olemassa.*

## Ristiseiska 18.8.2026 (N=400): maakohtainen porttisääntö, ensimmäinen ei-nollatulos

Mitattu 18.8.2026 versiosta 1.2.209 (`7d5b8dc`), jossa Mestarin porttikorttien pidättelyehto
muuttui maakohtaiseksi (`RISTISEISKA.md` kohta 2, `aiBestCard`). Muutos koskee vain tasoa
`hard`, joten `normal vs beginner` on tässä verrokki jonka ei kuulu liikkua.

| Pari | 21.7.2026 | 18.8.2026 | z vs. 50 % | z vs. 21.7. |
|---|---:|---:|---:|---:|
| hard vs beginner | 53,3 % | **55,8 %** (223/400) | 2,30 | 0,69 |
| hard vs normal | 49,0 % | **55,0 %** (220/400) | 2,00 | 1,70 |
| normal vs beginner | 51,3 % | **51,3 %** (205/400) | 0,50 | -0,01 |

Kaikki 1 200 peliä ratkesivat: 0 tasapeliä, 0 pattiin jäänyttä, 0 istuimeen yhdistämätöntä.

**Lukema on kuvio eikä yksittäinen voitto.** Kumpikaan Mestari-parin muutoksesta ei ole yksin
merkitsevä (z = 0,69 ja z = 1,70), eikä 21.7. mitattua nollaporrasta voi siis julistaa
kumotuksi yhdellä parilla. Painava on se että kolme lukua liikkuivat juuri niin kuin muutoksen
kohde ennustaa: molemmat Mestari-parit ylös, ja verrokki paikallaan kolmanteen desimaaliin asti
(51,3 % → 51,3 %). Satunnaisvaihtelu ei valitse liikkuvia pareja muutoksen kohteen mukaan.

**Suurin liike on oikeassa parissa.** Ehto koskee Mestaria, ja Kisälli on ainoa vastustaja jolla
on sama vanha porttisääntö käytössään (`suitCount > 1`). Juuri `hard vs normal` liikkui eniten
(49,0 % → 55,0 %), eli muutos erottaa Mestarin nimenomaan siitä tasosta jonka säännön se
korvasi. Oppipoikaa vastaan liike on pienempi, mikä on odotettua: Oppipoika hukkaa etua muissa
kohdissa niin paljon, että porttisäännön osuus lopputuloksesta on pienempi.

**Tämä on Ristiseiskan ensimmäinen ei-nollatulos.** Kaksi aiempaa yritystä olivat nollia:
passausmuisti (21.7., muutos palautettu) ja sitä edeltänyt oletus terveestä ladderista joka
osoittautui otosharhaksi. Osion "Avoimet AI-työt" kohta 3 luokitteli Ristiseiskan uuden kanavan
odottajaksi ja nimesi oletukseksi *hyväksy nykytila*, koska kolmatta kanavaa ei ollut löytynyt.
Kanava löytyi, eikä sitä löydetty AI-työnä vaan sivutuotteena: `MESTARIN_NEUVO.md`:n löydös 3
oli kanonin ja koodin ristiriita, ja sen ratkaisu oli Tommin oma sääntö jota kumpikaan puoli ei
ollut esittänyt.

**Mitä tästä ei seuraa.** `FLAT_AI_GAMES` (`src/App.jsx:182`) merkitsee Ristiseiskan yhä
samantasoiseksi ja `flatNote` näkyy pelaajalle. Merkinnän poistaminen on linjauskysymys eikä
mittauksen seuraus: 55 % on porras, mutta se on ohut, ja pelaajalle luvattu vaikeusero on eri
väite kuin mitattu voitto-osuus. Kysymys jää auki tässä eikä ratkea kirjaamalla.

## Kultakala ja Moska 18.8.2026 (N=400): kanonikorjausten mittaus, molemmat nollatuloksia

Mitattu versiosta jossa pelikanonien auditointi vietiin koodiin (`bd44e03`, `f6b7382`). Kaksi
muutosta koskee botteja, ja molemmat mitattiin samalla siemenellä kuin niiden viimeisin
aiempi ajo.

**Kultakala:** Mestari sai kierrostietoisen kynnyksen (tuntemattoman täytön hyötyvaatimus
laskee 3:sta 1:een kun kierroksia on enintään kaksi), ja vastustajien rivit lukenut kuollut
lohko poistettiin. Muutos koskee vain tasoa `hard`, joten `normal vs beginner` on verrokki.

| pari | 24.7.2026 | 18.8.2026 | z |
|------|----------:|----------:|--:|
| hard vs beginner | 55,25 % | **55,6 %** (213 / 168 / 19) | 2,2 |
| hard vs normal | 50,9 % | **49,1 %** (188 / 195 / 17) | -0,35 |
| normal vs beginner | 57,6 % | **57,6 %** (226 / 165 / 9) | 3,05 |

**Verrokki on bitilleen sama** (226/165/9 molemmissa ajoissa), mikä vahvistaa sekä siemenen
toistettavuuden että sen että muutos osui vain Mestariin. Se on tässä tärkeämpi lukema kuin
itse tulos, koska se erottaa nollatuloksen rikkinäisestä mittauksesta.

**Nollatulos.** `hard vs normal` liikkui 50,9 → 49,1 %, eli kohinan sisällä. Kynnys laukeaa vain
kahden viimeisen kierroksen aikana, ja niissä nostoja on jäljellä muutama per pelaaja, joten
vaikutuspinta on pieni. Muutosta **ei palautettu**, toisin kuin Ristiseiskan passausmuistissa
21.7.2026: se tehtiin kanonin ja koodin yhteensovittamiseksi eikä voimistamiseksi, ja poistettu
kuollut lohko rikkoi kanonin näkyvyyssääntöä. Kultakalan yläportaan ongelma on siis yhä auki.

**Moska:** passausehdot yhtenäistettiin ihmisen ehtoihin (botilta poistui passiketjun pituusraja
ja valttikielto), ja ehdot koottiin yhteen funktioon (`moskaCanPass`) joka ajaa botin, Mestarin
neuvon ja UI:n. Muutos koskee tasoja `normal` ja `hard`, joten verrokkia ei ole.

| pari | 21.7.2026 | 18.8.2026 | z |
|------|----------:|----------:|--:|
| hard vs beginner | 71,8 % | **71,5 %** (286 / 114 / 0) | 8,6 |
| hard vs normal | 53,5 % | **54,0 %** (216 / 184 / 0) | 1,6 |
| normal vs beginner | 65,8 % | **64,75 %** (259 / 141 / 0) | 5,9 |

**Nollatulos, ja tässä se oli toivottu lopputulos.** Muutoksen tarkoitus oli poistaa
sääntöristiriita eikä muuttaa voimasuhteita, ja porras säilyi muodossa
`beginner << normal ≈ hard`. Olennaisin luku ei ole voitto-% vaan **stalled 0 / unmapped 0**:
botin passausportti oli aiemmin tiukempi kuin `doPass`in oma tarkistus, ja löysentäminen olisi
voinut jättää botin odottamaan siirtoa jonka `doPass` hylkää. Uusi ehto kysyy vastaanottajan
olemassaolon samalla haulla kuin `doPass`, ja 1200 peliä ajoi läpi ilman yhtään jumia.

## Koputus, Läpsy ja Paskahousu 20.8.2026 (N=400): mittausvelka on suljettu

Mitattu commitista `b2b2559`, joka koskee vain dokumentteja, eli koodi on sama kuin
18.8.2026 julkaistu. Syy ajoon tuli `docs/BOTTIVERTAILU.md`:stä: se nimesi kolme aukkoa
joissa virheen välttäminen puuttuu koko portaalta, ja kaksi niistä on juuri näissä
peleissä (Koputuksen erikoiskorttien katsomiset, Paskahousun kutonen). Kumpaakaan ei
voinut työstää, koska tämän dokumentin oma työjärjestys vaatii N=400-vertailukohdan eikä
sellaista ollut: Koputus oli N=40:n, Läpsy ja Paskahousu N=30:n varassa.

**Nämä kolme olivat mittarin viimeiset mittaamattomat pelit, joten jokainen yhdeksästä on
nyt mitattu N=400:lla.** Kierros tuotti sekä mittarin vahvimman portaan (Läpsy) että sen
toisen täysin litteän pelin sen jälkeen kun Ristiseiskan nollaporras kumoutui 18.8.2026
(Paskahousu).

### Koputus: kaikki kolme paria erottuvat

| pari | winsA / winsB / ties | voitto-% | z | keskisija |
|------|---------------------:|---------:|--:|---|
| hard vs beginner | 277 / 118 / 5 | **69,9 %** | 7,95 | 2,10 vs 2,87 |
| hard vs normal | 244 / 151 / 5 | **61,6 %** | 4,65 | 2,30 vs 2,67 |
| normal vs beginner | 265 / 130 / 5 | **66,9 %** | 6,75 | 2,20 vs 2,75 |

Kaikki 1 200 peliä tulkittiin: 0 pattiin jäänyttä, 0 istuimeen yhdistämätöntä. Tasapelit
ovat 18.8.2026 koodiin viedyn tasasääntösäännön tulos ja ne on laskettu puolikkaina.

~~**Tämä on mittarin vahvin porras, ja se on ainoa peli jonka kolme paria on mitattu
samassa N=400-ajossa ja jotka kaikki ovat merkitsevästi yli 50 %:n.**~~

*Korjattu samana päivänä, ja väärä muotoilu jätetään näkyviin: Läpsy mitattiin samalla
kierroksella ja on sekä vahvempi (91,8 / 85,8 / 80,5) että mitattu samalla tavalla.
Koputus on siis toiseksi vahvin, ja oikea väite kuuluu: **Koputus ja Läpsy ovat ne kaksi
peliä joiden kolme paria on mitattu samassa N=400-ajossa ja jotka kaikki ovat
merkitsevästi yli 50 %:n.** Kirjoitin ensimmäisen version silloin kun Läpsyn ajo oli
vielä kesken, mikä on tämän kierroksen oma pikku oppitunti: älä kirjoita
paremmuusjärjestystä keskeneräisestä mittauksesta.*

Muotoilu on tarkoituksella
kapeampi kuin *ensimmäinen monotoninen porras*, koska Seiska tulee lähelle (73,3 / 58,0 /
77,3) mutta sen luvut ovat eri ajoista: vain `hard vs normal` on mitattu N=400:lla
nykyisestä koodista, ja juuri sillä parilla on dokumentoitu epävakaus osaotosten välillä
(52,0 % kierroksilla 0-149 ja 61,6 % kierroksilla 150-399). ~~Seiskan puhdas yhden ajon
uusintamittaus on siis edelleen tekemättä, eikä sitä pidä olettaa tehdyksi tämän osion
perusteella.~~

*Varaus purkautui samana päivänä: uusinta ajettiin 20.8.2026 ja kaikki kolme paria ovat nyt
yhdestä ajosta (78,5 / 58,0 / 69,5), ks. osio "Kutonen, monikortti ja Seiska 20.8.2026". Rivi
jätetään näkyviin kumottuna, koska se oli oikea sillä tiedolla joka kirjoitushetkellä oli.*

**Vertailu vanhaan N=40-lukuun (66/68/65) ei ole puhdas A/B.** Koputuksen bottilogiikka on
välissä irrotettu `runAI`:n sisältä moduulitason funktioiksi (`koKnockEstimate`,
`koWantsDiscard`, `koSwapTarget`) Mestarin neuvoa varten, ja tasapelisääntö on lisätty.
Suunta on silti sama ja kaikki kolme paria vahvistuivat, joten pieni otos ei tässä
valehdellut. Se on toinen tunnettu tapaus Kultakalan 24.7.2026 rinnalla.

### Läpsy: mittarin vahvin porras

| pari | winsA / winsB / ties | voitto-% | z | keskisija |
|------|---------------------:|---------:|--:|---|
| hard vs beginner | 367 / 33 / 0 | **91,8 %** | 16,7 | 1,92 vs 3,08 |
| hard vs normal | 343 / 57 / 0 | **85,8 %** | 14,3 | 2,00 vs 3,00 |
| normal vs beginner | 322 / 78 / 0 | **80,5 %** | 12,2 | 2,05 vs 2,95 |

Kaikki 1 200 peliä ratkesivat: 0 tasapeliä, 0 pattia, 0 istuimeen yhdistämätöntä.

**Läpsy on selvästi mittarin vahvin porras, ja ero muihin on suuruusluokka eikä
vivahde.** Heikoin sen pareista (80,5 %) on vahvempi kuin minkään toisen pelin paras.
Portaan mekanismi on myös eri kuin Koputuksen: Läpsyssä tasot erottaa pelkkä
reaktioviive, Koputuksessa deterministiset kyvykkyydet. Kahden vahvimman portaan
mekanismit ovat siis eri lajia, eikä yhtä oikeaa tapaa rakentaa porras siis ole.

**17.7.2026 tehty Oppipojan hidastus kestää mittakaavan.** Silloin mitattiin korjauksen
jälkeen 100/87/77 (N=30), ja N=400 antaa 91,8 / 85,8 / 80,5. Suunta ja suuruusluokka
pitävät, ja `normal vs beginner` jopa nousi (77 → 80,5). Pieni otos oli tässä
liian ruusuinen vain ylimmässä parissa, jossa 100 % oli mahdoton pitää.

**Kolmas tapaus jossa N=30 ei valehdellut.** Kultakalan (24.7.2026) ja Koputuksen
rinnalla tämä tarkoittaa, että pienen otoksen petossarja koskee ennen kaikkea
*litteitä ja ohuita* portaita, joissa kohina on samaa kokoluokkaa kuin mitattava ero.
Kun ero on aito ja suuri, N=30 löytää sen. Sääntö *älä nimeä referenssipeliä otoksella
joka ei kestä kaksinkertaistusta* pysyy silti voimassa, koska otoshetkellä ei tiedä
kumpaan luokkaan peli kuuluu.

### Paskahousu: porrasta ei ole

| pari | winsA / winsB / ties | voitto-% | z | keskisija |
|------|---------------------:|---------:|--:|---|
| hard vs beginner | 214 / 185 / 0 | **53,6 %** | 1,45 | 2,44 vs 2,56 |
| hard vs normal | 198 / 202 / 0 | **49,5 %** | -0,20 | 2,50 vs 2,51 |
| normal vs beginner | 196 / 204 / 0 | **49,0 %** | -0,40 | 2,48 vs 2,52 |

Yksi peli 400:sta jäi pattiin `hard vs beginner` -parissa, joten sen n on 399. Se on
huomionarvoista siksi, että pattikatkaisija on löydöksen 5 mukaan viritetty aina kun
vähintään yksi istuin on Mestari, ja tässä parissa niitä on kaksi.

**Vanha baseline lupasi hard vs beginner 70 %, ja ero ei johdu koodimuutoksesta.**
Tarkistettu funktiotasolla: `aiCards` ja `runAI` ovat bitilleen samat kuin botbenchin
julkaisucommitissa `311a9f0` (18.7.2026), ja koko sääntöalueen ainoa ero siihen on yksi
JSDoc-tyyppimerkintä `mkGame`ssa. Vertailu ei silti ole puhdas A/B toiseen suuntaan:
N=30-baseline mitattiin 17.7.2026 ennen saman päivän korjauksia, joten 70 % kuvaa
mahdollisesti eri koodia. **Varma väite on tämä: Paskahousun porras on litteä, ja se on
ollut litteä koko sen ajan jonka nykyinen koodi on ollut tuotannossa.**

**Lisätty `FLAT_AI_GAMES`-listaan** (`src/App.jsx`) Tommin linjauksella 20.8.2026. Koodissa
kirjattu lisäysehto täyttyy: N≥400 ja kaikki kolme paria noin 50 %, suurimman z:n ollessa
1,45. Luvut ovat itse asiassa litteämmät kuin listalla ennestään olevan Kasinon
(53,8 / 48,9 / 51,5). Paskahousu on nyt kolmas peli jonka Koneäly-osio kertoo pelaajalle
suoraan, ettei tason vaikutus ole suuri.

**Miksi porras puuttuu, ja tämä on `BOTTIVERTAILU.md`:n suora jatko.** Paskahousun ainoa
tasoero on `aiShouldFumble` (0,5 / 0,15 / 0), eikä pelissä ole yhtään tasokohtaista
kyvykkyyttä. Kumpikaan Tommin nimeämistä taitoelementeistä ei erota tasoja: ysi on
loppupelin säästölistalla kaikilla tasoilla, ja kutosen tukkimisarvoa ei tunne yksikään
taso, koska koodissa ei ole yhtään kutoseen viittaavaa päätöshaaraa. Mitattu tulos sanoo
saman kuin koodinluku: 50 %:n virhetodennäköisyys maksaa noin kolme prosenttiyksikköä,
eli fumble osuu päätöksiin jotka eivät ratkaise peliä. **Jos Paskahousulle halutaan
porras, se vaatii tasokohtaisen kyvykkyyden eikä kohinan säätöä**, ja kutonen on ainoa
nimetty ehdokas jolla on sekä lähde että puuttuva koodikohde.

### Metodihavainto: Läpsy vaatii oman prosessin

Ensimmäinen ajo kaatui 27,8 minuutin kohdalla V8:n kasarajaan (4 Gt, *Ineffective
mark-compacts near heap limit*) kun vuoro tuli Läpsyyn. Kuusi paria yhdeksästä oli jo
kirjoitettu levylle, koska `BOTBENCH_OUT` appendataan parin valmistuttua. **Käytä siis
aina `BOTBENCH_OUT`ia pitkissä ajoissa**, muuten kaatuminen vie kaiken.

Läpsy ajetaan omana prosessinaan ja pari kerrallaan, jolloin muisti nollautuu parien
välissä. **Todennettu samana päivänä: kaikki kolme paria menivät näin läpi paluuarvolla 0
ja kukin vei 5,3-5,5 minuuttia**, eli koko Läpsy on noin 16 minuuttia eikä sen tarvitse
kaataa mitään:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
```

Kaksi muuta ansaa samasta ajosta. Ajo on käynnistettävä **projektin sisältä**, koska
Projects-juuressa ei ole `node_modules`ia ja `npx vitest` alkaa asentaa omaa versiotaan
joka ei löydä `jsdom`ia. Ja PowerShellissä natiivikomennon `2>&1` kääntää normaalinkin
tulosteen virheeksi, joten ajo näyttää epäonnistuneelta vaikka se onnistuisi.

## Kutonen, monikortti ja Seiska 20.8.2026 (N=400): kaksi nollatulosta ja yksi suljettu kohta

Saman päivän toinen ajosarja, ja se toteutti kohtien 2 ja 4 ehdotukset. Molemmat ehdotukset
olivat kirjattuja, kanoniin nojaavia ja nimetyllä koodikohteella varustettuja, ja **kumpikaan ei
tuottanut porrasta**. Se on tämän osion sisältö: kaksi kartoitettua umpikujaa, ei kaksi
epäonnistunutta ajoa, ja ero näiden välillä on mitattu eikä oletettu.

**Baseline ajettiin ensin uudelleen, ja se toistui bitilleen kaikissa kolmessa parissa**
(Moska 286/114/0 · 216/184/0 · 259/141/0, samat kuin 18.8.2026). Ilman tätä lukemaa muutosten
jälkeisiä lukuja ei olisi voinut tulkita, koska ero olisi voinut olla ympäristön eikä muutoksen.

### Paskahousu: kutoskiristys, nollatulos, muutos palautettu

Mestari sai pakan tyhjennyttyä valita kortin joka maksimoi todennäköisyyden ettei seuraavalla
ole vastausta, sen sijaan että lyö pienimmän. Sääntö kirjoitettiin yleisenä eikä kutosen nimeen
sidottuna, koska kutonen on tuon laskun **tulos**: sen päälle käy 21 korttia 51:stä, kun
seiskan päälle käy 29, koska kuvakortit tyssäävät alarajaan.

| pari | tulos | 20.8. baseline | z |
|------|------:|---------------:|--:|
| hard vs beginner | **55,1 %** (220 / 179 / 0, n=399) | 53,6 % | 2,05 |
| hard vs normal | **51,0 %** (204 / 196 / 0) | 49,5 % | 0,40 |
| normal vs beginner | 49,0 % (196 / 204 / 0) | 49,0 % | -0,40 |

**Verrokki tuli ulos bitilleen samana**, mikä todistaa että muutos pysyi Mestarissa. Molemmat
Mestari-parit liikkuivat samaan suuntaan ja saman verran, kuusi voittoa neljästäsadasta
kummassakin, mutta suuruus on kohinan kokoluokkaa. Ajot on siemennetty samoiksi peleiksi, joten
oikea testi olisi parittainen ja vaatisi tiedon siitä montako yksittäistä peliä kääntyi; sitä ei
kerätty, eikä pelkistä yhteenlasketuista luvuista voi laskea z:aa erotukselle.

**Muutos palautettiin** Tommin linjauksella. Peruste on sama kuin Ristiseiskan passausmuistilla
21.7.2026: muutos tehtiin voimistamaan eikä yhtenäistämään kanonia, eikä se voimistanut.
Paskahousu pysyy `FLAT_AI_GAMES`-listalla, ja kohta 4 pysyy auki uudella tiedolla.

### Moska: monikorttihyökkäys, nollatulos, muutos jäi koodiin

Mestari lyö koko samanarvoisen ryhmän kun nostopakka **ja** valttikortti ovat lopussa, ja yhden
kortin niin kauan kuin käsi täydentyy. Kanonin rivin 13 raja ja käyttöliittymän kuuden kortin
raja ovat botin omassa valinnassa, koska `doAttack` ei valvo kumpaakaan vaan luottaa kutsujaan.

| pari | tulos | baseline (sama päivä) | z |
|------|------:|----------------------:|--:|
| hard vs beginner | **72,5 %** (290 / 110 / 0) | 71,5 % | 9,0 |
| hard vs normal | **54,25 %** (217 / 183 / 0) | 54,0 % | 1,7 |
| normal vs beginner | 64,75 % (259 / 141 / 0) | 64,75 % | 5,9 |

Verrokki on jälleen muuttumaton, ja `hard vs normal` liikkui **yhden ainoan pelin verran**
neljästäsadasta. Se on niin lähellä nollaa kuin mittari pystyy antamaan.

**Muutos jäi silti koodiin**, ja se on tietoinen poikkeus työjärjestyksen *peru jos porras ei
nouse* -sääntöön. Peruste ei ole voitto-% vaan tämän dokumentin oma alkuosio: mittari näkee
voimaeron muttei outoa siirtoa joka toistuu ilman että se näkyy voittoprosentissa, ja juuri sen
näkee katselutila. Botti joka ei koskaan lyö kolmea samaa vaikka säännöt sallivat ja ihminen
tekee niin, on täsmälleen sitä eriskummallisuutta jota katselutila oli rakennettu bongaamaan.

### Seiska: puhdas yhden ajon uusinta, avoin kohta suljettu

Seiskan luvut olivat kahdesta eri ajosta, ja vain `hard vs normal` oli mitattu N=400:lla
nykyisestä koodista. Nyt kaikki kolme ovat samasta ajosta.

| pari | tulos | vanha kirjattu | z |
|------|------:|---------------:|--:|
| hard vs beginner | **78,5 %** (314 / 86 / 0) | 73,3 % (eri ajosta) | 11,4 |
| hard vs normal | **58,0 %** (232 / 168 / 0) | 58,0 % (sama luku) | 3,2 |
| normal vs beginner | **69,5 %** (278 / 122 / 0) | 77,3 % (eri ajosta) | 7,8 |

`hard vs normal` toistui bitilleen, mikä oli odotettavaa juuri siltä pariltä joka oli jo mitattu
nykyisestä koodista. Uutta tietoa ovat kaksi muuta, ja `normal vs beginner` liikkui reilusti
alaspäin. **Porras on monotoninen ja kaikki kolme paria ovat kohinan yläpuolella**, mutta
suoraa vertailua Koputukseen ei tehdä tässä: se väite on mennyt kahdesti yli tässä
dokumentissa, ja kolmatta muotoilua ei kirjoiteta ilman että sen tarve on osoitettu.

### Menetelmä: nollatulos ilman laukeamislukua ei ole mittaus

Tämän ajosarjan tärkein havainto ei ole kumpikaan voitto-%. Kaksi täysin eri tilannetta näyttää
mittarissa identtiseltä: **haara laukesi ja osoittautui merkityksettömäksi**, tai **haara ei
laukennut kertaakaan**. Jälkimmäisessä luku ei kerro muutoksesta mitään, ja se on sokean
koettimen muoto (`KÄSITTEISTÖ.md` §0.2): komento onnistui ja vastasi eri kysymykseen kuin
luultiin.

Ero mitattiin väliaikaisella laskurilla, joka laskee kaksi eri asiaa. `fired` on montako kertaa
haara ylipäätään laukesi, `changed` montako kertaa se valitsi eri siirron kuin vanha koodi olisi
valinnut. Sata peliä kumpaakin peliä, `hard vs normal`:

| haara | fired | changed | muuta |
|---|------:|--------:|---|
| Paskahousu, kutoskiristys | 140 | **70** | 0,7 muuttunutta siirtoa per peli |
| Moska, monikorttihyökkäys | 450 | **161** | 385 korttia, eli 2,4 korttia per hyökkäys |

Molemmat haarat siis laukeavat runsaasti ja muuttavat oikeasti siirtoja. **Kumpikaan nollatulos
ei ole sokea koetin**, vaan aito mittaus siitä että muutos tapahtui eikä vaikuttanut. Ilman näitä
lukuja kohtia 2 ja 4 ei olisi voinut sulkea, koska harvoin laukeava haara ja vaikutukseton haara
johtavat vastakkaisiin päätöksiin.

Kaksi rajausta. Paskahousun luku mittaa koodia joka on sittemmin palautettu, eli se dokumentoi
palautetun muutoksen eikä nykytilaa. Ja laskuri oli **väliaikainen instrumentti** joka poistettiin
ajon jälkeen: mittalaite tuotantokoodissa olisi johdettu kopio jota kukaan ei myöhemmin mitätöi,
joten luku asuu tässä dokumentissa ja koodi on ennallaan.

## Käyttö jatkossa

Jokainen AI-muutos todennetaan ajamalla sama mittaus ja vertaamalla tähän
tauluun. Päivitä taulu ja päivämäärä kun baseline muuttuu tarkoituksella.

**Käytä N≥150 kun teet johtopäätöksiä tasoerosta.** N=30:n keskivirhe (±9 %-yks.)
on niin suuri, että se peittää juuri sen kokoluokan eroja joita mittarilla haetaan.

**Uudelleenajo ei ole toisto.** Mittari on siemennetty, joten sama koodi ja sama N
tuottavat bitilleen saman tuloksen. 26.7.2026 Kultakalan N=400 ajettiin uudelleen ja
kaikki kolme paria täsmäsivät (216/174/10 · 196/189/15 · 226/165/9). Se todistaa kaksi
asiaa: luvut on tuotettu tällä mittarilla eikä kirjoitettu käsin, eivätkä myöhemmät
commitit ole liikuttaneet bottien käytöstä. Tilastollista lisävarmuutta se ei anna.
Uudelleenajo on siis regressiotesti, ja lisävarmuus vaatisi eri siemenen.

## Avoimet AI-työt (per 26.7.2026)

Kootut `JATKOPROMPTI_tasoporras.md`:stä, joka oli committaamaton työpuutiedosto ja
poistettiin tämän kirjauksen jälkeen. ~~Mittausvelkaa ei enää ole: kaikki kuusi peliä
joista on tehty johtopäätös on mitattu N=400:lla, ks. yhteenvetotaulu yllä.~~

*Lause piti 26.7.2026 rajauksellaan ja on nyt vahvempi ilman sitä: 20.8.2026 alkaen
**kaikki yhdeksän peliä** on mitattu N=400:lla, eivät vain ne joista oli tehty
johtopäätös. Rajaus oli tarpeen niin kauan kuin Koputus, Läpsy ja Paskahousu olivat
mittaamatta, ks. osio "Koputus, Läpsy ja Paskahousu 20.8.2026".*

**Työjärjestys kaikissa alla:** baseline on jo tallessa (luvut yllä), joten muutos →
aja N=400 → pidä jos porras nousee, peru ja kirjaa nollatulos jos ei. **Muutoksen on
oltava tasokohtainen** (vain `hard` tai vain `beginner`), muuten se ei voi liikuttaa
porrasta lainkaan, ks. outtien nollatulos. Rakenna niin että jokin pari toimii
verrokkina joka paljastaa vuodon: jos muutat vain Kisälliä, `hard vs beginner` EI saa
muuttua.

**Kalibrointi vai uusi kanava? Kolme kohtaa eivät ole samaa lajia** (erottelu kirjattu
26.7.2026). Ero ratkaisee milloin kohta on ajankohtainen, joten se on syytä lukea ennen
kuin valitsee mistä aloittaa:

| Kohta | Laji | Milloin ajankohtainen |
|---|---|---|
| ~~Maija (alapää)~~ | ~~kalibrointi~~ | ✅ ratkaistu 26.7.2026, ks. osio yllä |
| Maija (yläpää) | uusi kanava | vasta kun kanava löytyy |
| ~~Moska~~ | ~~ei diagnosoitu, luultavasti uusi kanava~~ | ~~kun syy on selvitetty~~ |
| ~~Moska~~ | ~~uusi kanava, nyt diagnosoitu~~ | ✅ mitattu 20.8.2026: nollatulos, kanava suljettu |
| Ristiseiska | **uusi kanava**, vanha todettu umpikujaksi | vasta kun kanava löytyy |
| Paskahousu | **uusi kanava**, kutonen mitattu ja hylätty (20.8.2026) | vasta kun uusi kanava löytyy |

**Luokittelu koeteltiin heti ja piti.** Maija ennustettiin kalibroinniksi ja ratkesi
yhden rivin muutoksella ilman uutta taitoelementtiä, täsmälleen kuten laji lupasi.
Samalla se osoitti että laji on kohdan ominaisuus, ei pelin: alapään ratkettua Maijan
yläpää jäi jäljelle ja se on nyt uuden kanavan odottaja.

**Kalibrointi** tarkoittaa että taitoelementti on jo koodissa ja kysymys on sen määrästä
tai siitä kumpi porras on väärässä kohdassa. **Uusi kanava** tarkoittaa että pelistä on
löydettävä taitoelementti jota botti ei vielä käytä lainkaan; sitä ei voi aikatauluttaa,
koska se on keksintö eikä työsuoritus.

Erottelu on helppo hukata, koska kaikki kolme näyttävät mittarissa samalta (pari joka ei
erotu). **Muoto kertoo lajin:** Maijassa rikki on alapää (`beginner ≈ normal < hard`),
eli Mestari erottuu ja kanava siis toimii, vain porras on väärässä kohdassa. Moskassa ja
Ristiseiskassa rikki on yläpää, ja yläpään umpeutuminen tarkoittaa että pelin tunnetut
taitokanavat ovat loppuun käytetyt. Ristiseiskassa tämä on jo todistettu passausmuistin
nollatuloksella, Moskassa vasta epäilty.

Käytännön seuraus: Maija on ainoa joka kannattaa aloittaa suoraan, koska sillä on nimetty
koodikohde. Se voi jopa ratketa pelkästään Oppipoikaa heikentämällä, jolloin uutta
taitoelementtiä ei tarvita lainkaan.

### 1. Maija: Kisälli ei erotu Oppipojasta ✅ RATKAISTU 26.7.2026

Ennuste piti: ratkesi Oppipoikaa heikentämällä, ilman uutta taitoelementtiä.
`normal vs beginner` 51,3 % → **68,0 %** (z = 7,2), `hard vs beginner` 57,8 % → **74,0 %**
(z = 9,6), verrokki `hard vs normal` muuttumaton bitilleen. Syy oli että kaikki tasot
löivät koko maan kerralla; monikorttihyökkäys on nyt Kisällin kyky. Koko kirjaus omassa
osiossaan "Maija 26.7.2026" yllä.

**Jäljelle jäi Maijan yläpää:** `hard vs normal` on yhä 52,9 % (z = 1,2). Se on eri lajin
kohta, uuden kanavan odottaja, eikä jatku tästä samalla työtavalla.

### 2. Moska: Mestari ei erotu Kisällistä ✅ KANAVA MITATTU 20.8.2026 (nollatulos)

`hard vs normal` 53,5 % (N=400, 18.8.2026 uusintamittauksessa 54,0 %). Muoto on
`beginner << normal ≈ hard`, sama kuin Seiskalla ja Kultakalalla: alaporras terve, yläpää
samantasoinen.

**Diagnoosi 20.8.2026, ja se tuli kanonin ja koodin ristiriidasta eikä AI-työstä.**
`MOSKA.md` rivi 12: *hyökkääjä lyö pöytään yhden tai useamman saman vahvuisen kortin*,
ja rivi 13 rajaa määrän puolustajan käden kokoon. Koodissa sekä `aiPickAttack` että
Mestarin `aiPickAttackSN` palauttavat aina täsmälleen yhden kortin, ja kommentti sanoo
sen suoraan. **Monikorttihyökkäystä ei käytä yksikään bottitaso, vaikka säännöt sallivat
sen ja ihmisen käyttöliittymä toteuttaa sen.** Reitti on siis sama kuin Ristiseiskan
kanavalla 18.8.2026, ja se on kolmas kerta kun umpikujaksi merkitty peli avautuu
lukemalla sen oma kanoni koodia vasten.

**Toinen puoli samasta diagnoosista** (`docs/BOTTIVERTAILU.md`): yksikään botin päätös ei
lue nostopakan kokoa, joten Tommin nimeämä kokeneen virhe (vaiheen vaihtuminen pakan
loputtua, kohta 19 substanssihaastattelussa) on mallintamatta koko portaalla. Mestarilla
on vaiheen toinen puoli, muisti poistuneista korteista, muttei vaihetta itseään.

**Ehdotus, jota ei ole vielä mitattu:** Mestari lyö koko samanarvoisen ryhmän silloin kun
nostopakka on tyhjä, ja yhden kortin niin kauan kuin käsi täydentyy. Se yhdistää
molemmat puutteet yhteen tasokohtaiseen muutokseen. Se on `hard`-only, joten
`normal vs beginner` on verrokki jonka pitää tulla ulos bitilleen samana (259 / 141 / 0).
Kanonin rivin 13 raja on toteutettava botin omassa valinnassa, koska `doAttack` ei valvo
korttimäärää vaan luottaa kutsujaan.

**Mitattu samana päivänä, ja ehdotus ei tuottanut porrasta.** `hard vs normal` 54,0 → 54,25 %,
eli yksi peli neljästäsadasta, verrokki bitilleen muuttumaton. Laskuri osoitti että haara
laukesi 1,6 kertaa pelissä ja löi keskimäärin 2,4 korttia, joten kyse ei ole laukeamattomasta
haarasta vaan vaikutuksettomasta. Muutos jäi silti koodiin katselutilaperusteella, ks. osio
"Kutonen, monikortti ja Seiska 20.8.2026". **Moskan yläpää on siis yhä auki, ja tunnetuista
kanavista tämä on nyt käytetty loppuun.**

### 3. Ristiseiska: hyväksy nykytila vai etsi uusi kanava?

Linjauskysymys, ei mittaus. Ristiseiska on merkitty samantasoiseksi ja `flatNote` näkyy
tuotannossa, eli pelaajalle ei valehdella. Passausmuistin nollatulos osoitti että pelin
ilmeisin taitokanava (passaus paljastaa vastustajan puutteen) ei tuota eroa, koska
puutejoukko ON pöydän näkyvä rintama jonka botti tuntee joka tapauksessa. Aito porras
vaatisi siis UUDEN hypoteesin, ei saman kanavan viilausta. `RISTISEISKA.md` nimeää
porttikorttien (6/8) pihtaamisen, mutta Mestari tekee sitä jo.

**Oletus: hyväksy nykytila.** Kolmatta kanavaa ei ole löytynyt lukematta peliä uudelleen,
eikä nykytila ole pelaajalle epärehellinen.

**Kanava löytyi 18.8.2026, ja yllä oleva teksti jätetään näkyviin kumottuna.** Maakohtainen
porttisääntö liikutti molempia Mestari-pareja ja jätti verrokin paikalleen, ks. osio
"Ristiseiska 18.8.2026" yllä. Kumoutunut kohta on nimenomaan viimeinen virke: Mestari **teki**
porttien pihtaamista jo, mutta väärällä ehdolla, joten kanava oli auki eikä käytetty. Ennuste
piti siltä osin että kyse oli uudesta hypoteesista eikä saman kanavan viilauksesta, ja petti
siltä osin että hypoteesin piti tulla AI-työstä: se tuli kanonin ja koodin ristiriidasta.

**Avoin kohta kapenee eikä sulkeudu.** Kysymys ei ole enää *löytyykö kanavaa* vaan
*riittääkö 55 % merkinnän poistoon*, ja se on Tommin linjaus.

### 4. Paskahousu: litteä porras, ja kutonen on nyt mitattu ja hylätty

Uusi kohta 20.8.2026. Kaikki kolme paria ovat noin 50 % (53,6 / 49,5 / 49,0, N=400), ja
peli on lisätty `FLAT_AI_GAMES`-listaan, joten pelaajalle ei valehdella. Kohta on silti
auki, koska litteys ei ole tässä pelin ominaisuus samalla tavalla kuin Kasinossa: syy on
tiedossa ja se on rakenteellinen.

Paskahousun ainoa tasoero on `aiShouldFumble`, eikä pelissä ole yhtään tasokohtaista
kyvykkyyttä. Mitattu hinta 50 %:n virhetodennäköisyydelle on noin kolme
prosenttiyksikköä, eli fumble osuu päätöksiin jotka eivät ratkaise peliä.

**Nimetty kohde on kutonen.** Tommi nimesi kokeneen virheeksi ysin ja kutosen arvon
ymmärtämättömyyden, ja perusteli kutosen näin: sen päälle käy paljon vähemmän kortteja
kuin seiskan, joten kutosen pelaaja tekee nostamisesta todennäköisemmän seuraajalle kuin
itselleen. Ysi on jo säästölistalla kaikilla tasoilla, mutta ~~kutoseen viittaavaa
päätöshaaraa ei ole koodissa lainkaan~~. Se on siis uusi kanava jolla on sekä lähde että
puuttuva koodikohde, mikä on harvinaisempi yhdistelmä kuin Maijan tai Ristiseiskan
yläpäässä.

**Mitattu 20.8.2026, ja kanava on hylätty.** Ehdotus toteutettiin ja palautettiin samana
päivänä: `hard vs normal` 49,5 → 51,0 %, `hard vs beginner` 53,6 → 55,1 %, verrokki bitilleen
muuttumaton. Laskuri osoitti 0,7 muuttunutta siirtoa per peli, eli haara laukesi runsaasti,
joten nollatulos koskee kanavaa eikä laukeamista. Yliviivattu lause pitää siis taas
paikkansa, koska koodi palautettiin. Luvut ja peruste osiossa "Kutonen, monikortti ja Seiska
20.8.2026".

**Tommin havainto piti tasan, ja se on syytä kirjata erikseen tuloksesta riippumatta.** Mitattuna
kutosen päälle käy 21 korttia 51:stä ja seiskan päälle 29, ja kutonen on suurin kortti joka
vielä torjuu kuvakortit. Ysi on identtinen 21:llä, mikä selittää miksi molemmat nimettiin
yhdessä: ne ovat kahden eri kaistan huiput. Kanava on siis todellinen pelissä, se ei vain
ratkaise tässä toteutuksessa mitään.

**Jäljelle jäi yksi suunniteltu mutta mittaamaton ehdokas, ja se on eri muuttuja.** Botti lyö
aina kaikki saman arvoiset kortit kerralla, jolloin kolmen kutosen lyöminen jättää kasan päälle
sarjan jonka **yksi** kutonen täydentää neljäksi, ja seuraava saa kasan pois ja jatkovuoron.
Kahden lyöminen jättää sarjan jonka täydentämiseen tarvitaan kaksi, ja jos itse pitää kolmea,
niitä on näkymättömissä enää yksi: silloin kaato ei ole epätodennäköinen vaan **mahdoton**, eikä
pakan tyhjennyttyä kukaan muukaan voi täydentää sitä. Sääntö kirjoittuu siis lukumääränä eikä
korttina: lyö suurin määrä jolla näkymättömät samanarvoiset eivät riitä neljään, ja jos sellaista
määrää ei ole, lyö kaikki. Poikkeus on käsi joka tyhjenee lyönnillä, koska se voittaa aina.
Ehdotusta ei ole mitattu, eikä sitä saa mitata samassa ajossa kutoskiristyksen kanssa.

### Reunaehdot AI-työssä

- **Sääntölogiikkaan ei kosketa.** Jos muutos näyttäisi vaativan sitä, lue pelin oma
  `PELI.md` ja nosta sopimusmuutos-protokolla ENNEN koodausta (`CLAUDE.md`).
- **Botti ja Mestarin neuvo jakavat funktion.** Jos neuvon valinta muuttuu, tarkista
  ettei perustelu jää valehtelemaan (`selkokieli`-skill kohta 7: lue lajittelun viimeinen
  askel JA ensimmäinen avain).
- Uudet advice-avaimet kaikkiin 23 lokaaliin (`i18n-kieli`-skill).
- Nämä eivät ole kiireellisiä eivätkä valehtele pelaajalle. Ne ovat todellista puutetta
  AI-tasoissa, ja etenevät palautteen mukana.
