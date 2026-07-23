# Botbench — bottien voimamittari

Itsepeluu-benchmark joka mittaa AI-tasojen (Oppipoika/beginner, Kisälli/normal,
Mestari/hard) todellista voimaeroa: taso A vastaan taso B, istuimet vuorotellen
ABAB/BABA, 4 pelaajaa, siemennetty satunnaisuus (toistettava).

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
   **77 %** — porras monotoninen.
3. **Kasino ja Maija: tasoilla ei mitattavaa eroa** (52 %/50 % hard vs beginner).
   Kasinon hienostunut inferenssi ei realisoidu voitoiksi; Maijassa
   kohinavirheet eivät ilmeisesti maksa mitään. Molemmat ansaitsevat
   jatkotutkinnan ennen kuin tasoja mainostetaan pelaajalle vaikeuseroina.
4. **Kultakala ja Koputus: Kisälli häviää Oppipojalle** (30 %/38 %) — sama
   epämonotonisuus kuin Läpsyssä, syy selvittämättä.
5. **Paskahousun sekatasopeli pattiutui ilman yhtäkkistä kuolemaa.** Mestarin
   optimipeli tuottaa ikuisen loppupelisilmukan myös heikompaa vastaan; korjattu
   niin että pattikatkaisija virittyy kun vähintään yksi istuin on Mestari
   (tuotantokäytös ennallaan).

~~Terveimmät ladderit: Seiska, Ristiseiska, Moska (+ Läpsyn hard). Ne voivat
toimia referenssinä kun muiden pelien tasoja korjataan.~~

**⚠️ KUMOTTU 21.7.2026, älä käytä näitä referenssinä.** Kaikki kolme mitattiin
uudelleen N=400:lla: Seiskan ja Moskan yläpää on litteä ja Ristiseiskalla ei ole
porrasta lainkaan. Ks. alempaa osiot "Seiska 21.7." ja "Moska ja Ristiseiska 21.7.".

## Kyvykkyysporras 17.7.2026 (Kultakala, Koputus, Maija, Kasino)

Neljän rikkinäisen pelin tasoerot rakennettiin uudelleen kyvykkyyksinä
satunnaiskohinan (`aiShouldFumble`) sijaan: Oppipojalla on deterministisiä
inhimillisiä heikkouksia, Kisällillä täysi perusstrategia, Mestarilla lisäkyvyt.
Kohina poistettu näistä neljästä kokonaan.

| Peli      | Oppipoika (heikkoudet) | Kisälli | Mestari (lisäkyvyt) |
|-----------|------------------------|---------|----------------------|
| Kultakala | ketju jatkuu vain A-3:lla; ottaa poistopakasta "melkein hyvän" (+3) | täysi ketjuvaihto | EV-vertailu: huonoin tunnettu vs. tuntematon (EV 7), kynnys ≥3 |
| Koputus   | ei huomaa poistopakkaa; arka koputtaja (kynnys 5) | poistopakka; koputus 8; tuntemattoman täyttö vain A/2 | tuntemattoman EV-täyttö ≤4; realistisempi arvio (×6); poistopakasta EV-nosto |
| Maija     | isot kortit ensin; kohtelee Maijaa tavallisena patana (ei dumppausta, ei karttelua); polttaa valtit | pienimmät ensin + Maija-prioriteetti + valttiepäröinti | + valttilaskenta pakan loputtua + kaatoprioriteetti (Maija/korkeat ensin) |
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
   Oppi: heikkouden pitää olla paitsi mitattava myös USKOTTAVA — "botti ei
   tee ilmeistä siirtoa" rikkoo illuusion nopeammin kuin heikko strategia.
5. Kuollutta koodia siivottu: Kultakalan käyttämätön "PHASE 1-3" -analyysi
   (uhka-arvio, dynaaminen kynnys, paikkavalinta) poistettu/otettu osin
   käyttöön; Kasinon findWorstCapture poistettu.

## Seiska 20.7.2026 (N=150) — ässäbonuksen järjestyskorjauksen jälkeen

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
(±9 %-yks.), joten 60 % ja 52 % ovat tilastollisesti yhteensopivia. Yläpää oli
todennäköisesti litteä jo 17.7., mutta otoskoko ei riittänyt näyttämään sitä.

**Seuraus baselinen johtopäätökseen:** yllä oleva lause *"Terveimmät ladderit:
Seiska, Ristiseiska, Moska"* ei päde Seiskan osalta. Seiskan yläpää kuuluu samaan
jatkotutkintaan kuin Kasino ja Maija (löydös 3). Ristiseiskan ja Moskan luvut ovat
yhä N=30 eli samalla varauksella; niiden "terveys" kannattaa varmistaa isommalla
otoksella ennen kuin niitä käytetään referenssinä.

**Metodivaroitus:** järjestystä muuttava korjaus muuttaa satunnaisluvun kulutuksen
koko pelin ajaksi, joten siemennetty ajo EI ole pariverrattu A/B ennen ja jälkeen
vaan käytännössä uusi arvonta. Pienet erot N=30:llä eivät kerro mitään.

## Seiska 21.7.2026 — outtien laskenta tasapeliin: NOLLATULOS (muutos palautettu)

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

## Moska ja Ristiseiska 21.7.2026 (N=400) — "terveet ladderit" oli otosharha

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
z ≈ 1,4). Yläpää on litteä.

**Ristiseiskalla ei ole porrasta lainkaan.** Kaikki kolme paria ovat kolikonheittoja
(53,3 %, 49,0 %, 51,3 %); yksikään ei eroa 50 %:sta enempää kuin ~1,3 keskivirhettä.
Tasoerot eivät realisoidu voitoiksi ollenkaan, mikä on sama tila kuin Kasinolla ja
Maijalla (löydös 3 ja kyvykkyysporras-osion kohta 3).

**Seuraus: baselinen lause *"Terveimmät ladderit: Seiska, Ristiseiska, Moska"* on
kumottu kaikkien kolmen osalta** (Seiska ks. 21.7. nollatulososio). Mittarilla ei ole
tällä hetkellä yhtään peliä jonka porras olisi todennetusti monotoninen kolmen tason
yli. Lähimpänä on Läpsy (100/87/77, N=30), mutta sekin on mittaamatta isolla otoksella.

**Metodioppi, kolmas kerta samasta asiasta:** N=30 ei ainoastaan ollut epätarkka, se
tuotti systemaattisesti liian ruusuisen kuvan. Kolmesta "terveestä" ladderista kaksi
osoittautui litteäksi ja yksi olemattomaksi, kun otos nelinkertaistettiin. Pienen
otoksen virhe ei jakaudu tasaisesti johtopäätöksiin: se suosii kiinnostavan näköisiä
eroja, koska kohina näyttää signaalilta. Älä nimeä referenssipeliä otoksella joka ei
kestä kaksinkertaistusta.

## Ristiseiska 21.7.2026 — passausmuisti Mestarille: NOLLATULOS (muutos palautettu)

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

## Maija 21.7.2026 (N=400) — porras katkeaa keskeltä, EI litteä

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

## Kasino 21.7.2026 (N=400) — litteä vahvistettu, merkintä lisätty

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

### Yhteenveto: mitkä pelit saavat merkinnän

| Peli | N=400 mitattu | Kaikki parit ~50 % | Merkintä |
|------|:-------------:|:------------------:|:--------:|
| Ristiseiska | kyllä | kyllä | **on** |
| Kasino | kyllä | kyllä | **on** |
| Maija | kyllä | ei (hard vs beg 57,8 %, z = 3,1) | ei |
| Seiska | kyllä | ei (beginner häviää selvästi) | ei |
| Moska | kyllä | ei (beginner häviää selvästi) | ei |
| Kultakala | **ei** | — | ei (mittaamatta) |
| Koputus, Läpsy, Paskahousu | ei (N=30/40) | — | ei |

## Käyttö jatkossa

Jokainen AI-muutos todennetaan ajamalla sama mittaus ja vertaamalla tähän
tauluun. Päivitä taulu ja päivämäärä kun baseline muuttuu tarkoituksella.

**Käytä N≥150 kun teet johtopäätöksiä tasoerosta.** N=30:n keskivirhe (±9 %-yks.)
on niin suuri, että se peittää juuri sen kokoluokan eroja joita mittarilla haetaan.
