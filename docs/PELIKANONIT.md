# Yhdeksän pelikanonin ja koodin pinta

**Mitä tämä dokumentti on.** Yhdeksän pelikanonin (`KASINO.md`, `KOPUTUS.md`, `KULTAKALA.md`,
`LAEPSY.md`, `MAIJA.md`, `MOSKA.md`, `PASKAHOUSU.md`, `RISTISEISKA.md`, `SEISKA.md`) ja
`src/games/`-koodin välisen pinnan tarkastuskirjanpito. Se vastaa kysymykseen *sanooko kanoni
sen mitä koodi oikeasti tekee*.

**Miksi tämä pinta on erikseen `MESTARIN_NEUVO.md`:stä.** Sekin tarkastaa dokumentin koodia
vasten, mutta eri dokumenttia ja eri koodia: siellä kohteena on neuvoteksti bottivalintaa
vasten, tässä kanonin sääntökuvaus koko pelilogiikkaa vasten. Ero on olennainen, koska
neuvotekstin siirto ei voi ajautua (sama koodi ajaa neuvon ja botin), kun taas kanonin
sääntökuvauksella ei ole mitään yhteyttä koodiin: se on proosaa jota mikään ei sido.

**Kanoni on kirjoitettu ennen koodia, ja koodi on liikkunut sen jälkeen.** Tämä on löydösten
yhteinen muoto. Yksikään yhdeksästä ei ole väärin siksi, että se olisi kuvattu väärin
kirjoitushetkellä; ne ovat väärin siksi, että sääntö on muuttunut koodissa eikä kukaan ole
palannut tekstiin. Poikkeukset todistavat saman: `SEISKA.md` ja `PASKAHOUSU.md` ovat
tarkistetuilta osin täsmällisiä, ja molempia on päivitetty koodimuutosten yhteydessä
(`10a72fa`, botbench-ajojen kirjaukset).

## Kattavuus ja sen raja (auditoitu 18.8.2026)

Luettu yhdeksän kanonia (770 riviä kanonitekstiä) ja tarkistettu niiden **tarkistettavissa
olevat väitteet** koodia vasten (10 890 riviä pelikoodia). Tarkistettava väite tarkoittaa tässä
väitettä jolla on koodissa vastine jonka voi lukea: korttimäärä, pistearvo, kynnysluku,
lajitteluavain, sallitun siirron ehto, pelin päättymisehto, tasapelin ratkaisu.

**Mitä ei ole tarkistettu, jotta lupausta ei lueta liian laajaksi.** Kanonin luonnehdinnat
(*"vaativin peli kokoelmassa"*), pelituntumaa koskevat väitteet, kierrosmääräarviot
(*"4 pelaajaa: noin 10 kierrosta"*), näkyvyystaulukot muutoin kuin siltä osin kuin botti
lukee tilaa jota se ei kanonin mukaan näkisi, ja UI-tekstien vastaavuus kanoniin. Kattavuus on
siis väitetasolla eikä rivitasolla: koodissa on sääntöjä joita mikään kanonin lause ei
väitä, ja ne löytyvät vain lukemalla koodia kanonia vastaan eikä toisinpäin. Osa alla
olevista löydöksistä on juuri tätä lajia, mutta niitä ei voi luvata löytyneen kaikkia.

## Kaksi kokoelmatason löydöstä

Nämä eivät koske yhtä peliä vaan toistuvat samanlaisina useassa, joten ne on nostettu erilleen.

### A. Kolmessa pelissä on aloitusnäytön sääntövalinta jota yksikään kanoni ei tunne

| Peli | Asetus | Vakio | Mitä toinen asento tekee |
|---|---|---|---|
| Paskahousu | `handSize` | 6 | käden koko muuttuu |
| Paskahousu | `hardTwos` | false | kaikki kakkoset saavat arvon 15 (kotisääntö) |
| Paskahousu | `faceMin` | 7 | kuvakortin alaraja muuttuu |
| Ristiseiska | `randomPantti` | false | panttikortti arvotaan myös ihmiseltä |
| Kasino | `specialBuilds` | false | rakennelman maksimiarvo 13 → 16 |

Kaikki viisi ovat käyttäjän valittavissa aloitusnäytöltä (`useStickySetting`, asetus muistetaan
selaimessa), eli ne eivät ole sisäisiä vakioita. Kanonit esittävät vakioasennon **sääntönä**:
`PASKAHOUSU.md` sanoo *"Jokaiselle jaetaan 6 käsikorttia"* ja *"Kuvakorttia ei saa lyödä alle 7
olevan kortin päälle"*, ja korttiarvotaulukko antaa punaiselle kakkoselle arvon 2 ilman ehtoa.

**Sopimusmuutoskysymys:** kirjataanko variaatiot kanoniin (kanoni kuvaa säännöstön, jossa on
valittavia kohtia), vai onko kanoni tarkoituksella vakiosäännöstön kuvaus ja variaatiot
kuuluvat muualle?

### B. Kanonien AI-osiot ovat kyvykkyysporrasta vanhempia

Seitsemän kanonia kuvaa **yhden** AI-strategian. Koodissa on kolme tasoa, joiden ero on
17.7.2026 alkaen deterministinen kyvykkyysporras eikä satunnaiskohina (`docs/BOTBENCH.md`).
Vain `SEISKA.md` ja `PASKAHOUSU.md` sisältävät tasotaulukon, ja `RISTISEISKA.md` sai
tasokohtaisen ehdon 18.8.2026 porttisäännön yhteydessä.

Seuraus ei ole kosmeettinen: kanonin AI-osiosta ei voi lukea kumpaa tasoa se kuvaa, joten
sitä ei voi käyttää tarkistuslähteenä. Alla olevat löydökset 1, 4 ja 9 ovat kaikki tästä
muodosta: kanonin lause on totta jostakin tasosta tai ei mistään, eikä lause kerro kummasta.

## Pelikohtaiset löydökset

### 1. Kultakala: kanonin kynnys ei ole koodissa, ja kuvattu suunta on päinvastainen

`KULTAKALA.md` › AI-strategia › Päätöslogiikka kohta 2: *"Kynnys riippuu kierrosten määrästä
(myöhäispelissä aggressiivisempi)"*.

Elävä nostopäätös on `kkDrawDecision` (`src/games/Kultakala.jsx:63`), eikä siinä ole
kierroksiin sidottua kynnystä lainkaan. Kynnykset ovat tasokohtaisia ja kiinteitä:
Oppipojalla `eagerBonus = 3`, Mestarilla tuntemattoman odotusarvo `UNKNOWN_EV = 7` ja
hyötyraja `gainUnknown >= 3`.

Kierroksiin sidottu kynnys **on** koodissa, mutta se on kuollutta koodia (`aiTurn`, rivit
391–434) eikä vaikuta yhteenkään siirtoon: `swapThreshold`, `gameState` ja `isLeadingThreaten`
lasketaan eikä yhtäkään lueta. Ja siinäkin suunta on kanonin vastainen: `isLateGame ?  3 : 5`
tarkoittaa matalampaa kynnystä myöhäispelissä, ja koodin oma kommentti sanoo sen ääneen
(*"Mitä vähemmän kierroksia, sitä konservatiivisempi"*).

**Sivulöydös samasta lohkosta, ja se on painavampi kuin kuollut koodi sinänsä.** Lohko lukee
jokaisen pelaajan koko rivin (`pl.row.reduce`) ja tuntemattoman kortin todellisen arvon
(`pl.unknown.v`). Kanonin näkyvyysosio kieltää molemmat nimenomaisesti: *"AI ei voi nähdä:
muiden pelaajien kortteja, kenen pistemäärä on paras/huonoin"*. Kanoni ei siis pidä tässä
paikkaansa sattumalta: sen pelastaa vain se, ettei lohkon tulosta käytetä. Sama vikamuoto on
korjattu Seiskasta ja Kultakalasta jo kahdesti (`24eaa6d`, `03e6b54`).

**Sopimusmuutoskysymys:** poistetaanko kuollut lohko ja korjataanko kanonin kohta 2 kuvaamaan
`kkDrawDecision`ia, vai onko kierroskynnys tarkoitus herättää henkiin?

### 2. Koputus: tasapelin ratkaisua ei ole toteutettu

`KOPUTUS.md` › Pelin loppu: *"Tasatilanteessa vähempi kortteja omannut voittaa"*.

`endGame` (`src/games/Koputus.jsx:373`) järjestää pelaajat yhdellä avaimella
(`pScore(a) - pScore(b)`) eikä korttimäärä osallistu vertailuun. Sijoitus lasketaan
`sorted.filter(q => pScore(q) < s).length + 1`, joten samapisteiset saavat saman sijan
riippumatta siitä kummalla on vähemmän kortteja. Sama yhden avaimen järjestys on myös
tulosnäytössä (rivi 740).

Ratkaisulla on todellinen kohde: väärästä lyönnistä korttimäärä kasvaa ja onnistuneesta
laskee, joten samapisteiset eri korttimäärillä ovat Koputuksessa tavallinen lopputulos eikä
reunatapaus.

**Sopimusmuutoskysymys:** lisätäänkö toissijainen avain koodiin vai poistetaanko lause
kanonista?

**Sivuhavainto, ei löydös:** erityiskortit (J/Q/K) laukeavat vain kun nostettu kortti
**heitetään poistopakkaan** (`src/games/Koputus.jsx:436`). Kanonin Erityiskortit-osio ei
nimeä ehtoa lainkaan, joten se ei ole ristiriita vaan aukko.

### 3. Läpsy: säännöt täsmäävät, AI-osio ei kuvaa tätä peliä

Sääntöpuoli on tarkistetuilta osin puhdas. Haastetaulukko täsmää tarkalleen
(`SPEC = { J: 1, Q: 2, K: 3, A: 4 }`, rivi 17), väärän läpsyn rangaistus on kanonin mukainen
(päällimmäinen kortti kasaan, rivit 409–411), samaan erityiskorttiin vastaaminen ratkeaa
läpsykisana (rivi 295, sama arvo keskellä), ja epäonnistuneesta vastauksesta kasa menee
haastajalle (rivi 321).

Kaksi huomiota:

- **AI-strategian kohta 1** sanoo *"Nosta kortti pakasta ajanmukaisesti"*. Läpsyssä ei ole
  nostopakkaa: pelaaja kääntää oman pinonsa päällimmäisen. Lause on peräisin toisesta pelistä.
- **Sakkokortin parisääntö puuttuu kanonista.** Jos sakkokortti muodostaa keskelle uuden parin,
  peli jatkuu läpsäistävänä parina eikä vuoronvaihtona (rivit 414–420). Sääntö on koodissa
  perusteltuna, kanonissa sitä ei ole.

### 4. Maija: kanonin hyökkäysavain on väärä, ja sama virhe on korjattu kerran jo muualla

`MAIJA.md` › AI-strategia › AI:n hyökkäys kohta 2: *"Priorisoi pelaamalla hyökkäykseen sen maan
kortit millä paljon matalaa arvoa"*.

`maijaPickAttack` (`src/games/Maija.jsx:63`) järjestää maat **korttimäärän** mukaan
(`suits.sort((a, b) => b.length - a.length)`) eikä arvojen mukaan. Maan sisällä kortit
järjestetään pienin ensin, mutta maan valinta on pituusvalinta.

**Tämä on sama väite joka korjattiin neuvotekstistä 21.7.2026** (`283c7c6`): teksti lupasi
*"eniten matalaa"* ja koodi valitsi pisimmän maan. Neuvoteksti korjattiin, kanoni jäi
sanomaan vanhaa. Löydös on siis suora näyttö kohdan 19 alkuperäisestä perusteesta: kun samaa
väitettä säilytetään kahdessa paikassa ja vain toista tarkistetaan, korjaus jää puolitiehen.

**Kaksi kykyä puuttuu kanonista kokonaan.** Maija-dumppi (Kisälli ja Mestari johtavat
Maijalla ja padoilla, rivit 79–82) ja Mestarin valttihyökkäys pakan tyhjennyttyä (rivit
71–78, ehtona vähintään kaksi omaa valttia ja enintään kolme muualla). Molemmat ovat
kanonin AI-osiota olennaisempia kuin siinä nyt lukevat kolme kohtaa.

Sääntöpuoli on puhdas: viiden kortin käsi, valtti pakan pohjalta pata poissuljettuna
(rivit 248–253), A = 14 pelin omassa arvotaulukossa (rivi 15, tietoisesti eri kuin jaettu
`VAL` jossa A = 1), Maija ei kelpaa kaatokortiksi eikä kaadettavaksi (`canBeat`, rivit 36–37).

### 5. Moska: passaussäännöt puuttuvat kanonista, ja kaksi toteutusta eroavat toisistaan

`MOSKA.md` › Puolustajan vuoro kohta 2 kuvaa siirron vain sen seurauksen kautta
(*"seuraavasta tulee uusi puolustaja"*). Ehdot puuttuvat, ja niitä on koodissa useita:
pöydällä on oltava vain yhtä vahvuutta, passaajan on **pelattava** samaa vahvuutta oleva
kortti, eikä sama pelaaja voi passata kahdesti (`passChain`).

Vakavampi puoli on, että ehdot on kirjoitettu koodiin kahdesti eivätkä versiot vastaa
toisiaan:

| | Botti (`src/games/Moska.jsx:198`) | Ihminen (`canPassNow`, rivi 1101) |
|---|---|---|
| Pöytä yhtä vahvuutta | kyllä | kyllä |
| Ei ole jo passannut | kyllä | kyllä |
| Aktiivisia yli 2 | kyllä | kyllä |
| Ketjun pituusraja | `passChain.length < activeCount - 2` | ei ole |
| Yhtään korttia ei kaadettu | ei ole (`noBeats` on eri ehto) | kyllä |
| Passikortti saa olla valtti | ei (`c.s !== ts`) | kyllä |

Koodin oma kommentti rivillä 198 sanoo ehtojen olevan *"samat kuin UI:n canPassNow"*, eivätkä
ne ole. Osa eroista on bottitason valintaa (valtilla ei kannata passata) ja osa on
sääntötason eroa (ketjun pituusraja koskee vain botteja).

**Toinen puuttuva sääntö:** hyökkäyskortteja on enintään kuusi yhteensä
(`byLimit = 6 - g.table.length`, rivi 131). Kanoni nimeää vain puolustajan käden koon
rajoitukseksi.

**Sopimusmuutoskysymys:** kirjataanko passausehdot ja kuuden kortin katto kanoniin, ja
yhtenäistetäänkö botin ja ihmisen ehdot? Jälkimmäinen on sopimusmuutos vain siltä osin kuin
ero on tarkoitettu.

### 6. Paskahousu: tarkistetut väitteet pitävät

Ei löydöksiä muuten kuin kokoelmatason löydös A (kolme sääntövalintaa). Tarkistettu:
kuuden kortin käsi, mustan kakkosen arvo 15 ja punaisen 2 (rivit 47–48), kympin kaatoehto
`top.v <= 9` ja ässän kaatoehto kuvakortin päälle (rivit 67–68), yhtäkkisen kuoleman 150
sekuntia (rivi 381).

Yksi tarkennus: kanoni sanoo yhtäkkisen kuoleman ehdoksi *"Mestari-tekoäly (`hard`)"*.
Koodissa ehto on istuinkohtainen silloin kun istuintasot on annettu
(`botLevels.some(l => l === 'hard')`, rivi 350), eli sekapelissä yksi Mestari riittää. Ero on
kirjattu `docs/BOTBENCH.md`:n löydökseen 5 mutta ei kanoniin.

### 7. Ristiseiska: pelin oma perusmekaniikka puuttuu sääntöosiosta

`RISTISEISKA.md` › Vuoron kulku kohta 1: *"Omalla vuorolla on lyötävä yksi sallittu kortti tai
passattava"*, ja kohta 3 sanoo passin olevan sallittu vain jos ei käy. Passin **hinta** ei ole
kanonissa missään sääntönä.

Koodissa passaaminen siirtää kortin: edellinen kortillinen pelaaja antaa passaajalle
panttikortin (`doPass`, rivit 599–627). Mekaniikka on pelin taktinen ydin, ja sen ympärille on
rakennettu kaksi asiaa jotka nekään eivät ole kanonissa: ensimmäisellä kierroksella panttia ei
anneta (`!g.firstRoundDone`, rivi 592), ja panttikortin valintatapa on aloitusnäytön
sääntövalinta (`randomPantti`, kokoelmatason löydös A).

Erikoisuus, joka tekee tästä muita löydöksiä kiinnostavamman: **kanoni puhuu pantista, mutta
vain AI-osiossa.** 18.8.2026 lisätty porttisäännön perustelu sanoo *"Lukittu pöytä pakottaa
passaamaan, ja passatessa annetaan kortti panttina"*. Sääntö esiintyy siis kanonissa
perusteluna säännölle jota kanoni ei ole koskaan lausunut. Tämä on suora seuraus siitä että
eilinen työ katsoi AI-siivua eikä sääntösiivua.

Tarkistetut väitteet pitävät: porttisäännöt (5 vaatii 8:n, 8 vaatii 6:n, 6 vaatii 7:n),
Mestarin maakohtainen pidättelyehto sellaisena kuin se 18.8.2026 kirjattiin (`farSameSuit > 1`,
rivi 357), Kisällin ja Oppipojan vanhempi `suitCount > 1` (rivi 345), ja *"pelaa pienin arvo
muista"* (rivi 361).

**Sivuhavainto, ei löydös:** rivin 672 seiskavalinta järjestää maat päinvastoin kuin rivin 333.
Ero on tarkoitettu: jälkimmäinen on `aiShouldFumble`-haaran aloittelijavirhe (avaa seiskan
huonoimpaan maahan), ja koodin kommentti sanoo sen.

### 8. Seiska: tarkistetut väitteet pitävät

Ei löydöksiä. Tarkistettu: seitsemän kortin käsi (rivi 56), pohjakortti ei 7 eikä A (rivi 61),
enintään kolme nostoa vuorossa (rivit 247, 754, 835, 985), Lapun sakko kolme korttia
(`applyLappu`, rivi 507), ihmisen neljän sekunnin ikkuna (rivit 680, 894, 909), ässää ja
seiskaa ei viimeisenä korttina (rivit 30, 42).

`SEISKA.md` on kokoelman tarkin kanoni, ja syy on nähtävissä sen omassa tekstissä: se nimeää
koodifunktioita (`applyLappu`, `aiSuit`, `aiAceBonusDecision`), päiväyksiä ja tietoisia
epäsymmetrioita. Se on kirjoitettu tarkistettavaksi, ja siksi se on kestänyt tarkistuksen.

### 9. Kasino: ässän piste puuttuu pistelaskusta, ja rakentamisen pelaajamäärärajaus on väärä

Kaksi löydöstä.

**Ässän piste puuttuu.** `KASINO.md` › Pisteet luettelee viisi pisteenlähdettä (eniten kortteja,
♦10, ♠2, eniten patoja, tikki). `scoreRound` (`src/games/Kasino.jsx:789`) laskee lisäksi yhden
pisteen **jokaisesta kaapatusta ässästä** (`pts += ruutuKymppiCount * 2 + pataKakkonenCount +
aceCount`), ja piste näkyy tulosnäytön erittelyssä omana rivinään. Neljä ässää on siis neljä
pistettä kierroksessa, eli enemmän kuin mikään kanonin luettelemista eristä ruutukymppiä
lukuun ottamatta.

Kanonin lause *"Yhteensä maksimissaan 11 pistettä per kierros"* ei siis vastaa koodia. Luku ei
myöskään ole johdettavissa kanonin omasta luettelosta: viisi eritettyä lähdettä antavat
1 + 2 + 1 + 1 = 5 pistettä ja tikkejä muuttuvan määrän. Kanonin AI-osio tuntee ässän
erityiskorttina (*"Erityiskortit: mitkä on pelattu (Pata 2, Ruutu 10, Ässä)"*), joten puute on
nimenomaan pistelaskuosiossa.

**Rakentaminen ei ole rajattu kahteen pelaajaan.** `KASINO.md` › Rakentaminen (Build) on
otsikoitu *"vain 2 pelaajaa"*, ja luonnehdintaosio toistaa sen. Koodissa ei ole
pelaajamäärätarkistusta rakentamiselle: rakennusnappi ja `buildMode` ovat käytössä kaikilla
pelaajamäärillä, ja botin rakennuslogiikka (`findAIBuild`) ajetaan samoin.

**Sopimusmuutoskysymys molempiin:** korjataanko kanoni koodin mukaiseksi (ässä on pisteen
arvoinen, rakentaminen on aina käytössä) vai koodi kanonin mukaiseksi? Jälkimmäinen olisi
peliin puuttuva muutos molemmissa, joten kysymys ei ole muodollinen.

## Yhteenveto

| Peli | Löydöksiä | Painavin |
|---|---|---|
| Kasino | 2 | Ässän piste puuttuu kanonin pistelaskusta |
| Koputus | 1 | Tasapelin ratkaisua ei ole toteutettu |
| Kultakala | 1 | Kanonin kynnys kuvaa kuollutta koodia, ja väärinpäin |
| Läpsy | 1 | AI-osion kohta 1 kuvaa toista peliä |
| Maija | 1 | Hyökkäysavain väärin, sama virhe korjattu kerran muualla |
| Moska | 2 | Passausehdot puuttuvat, ja kaksi toteutusta eroavat |
| Paskahousu | 0 | |
| Ristiseiska | 1 | Panttimekaniikka puuttuu sääntöosiosta |
| Seiska | 0 | |
| **Kokoelmataso** | **2** | Sääntövalinnat ja kyvykkyysporras |

Yksitoista pelikohtaista löydöstä ja kaksi kokoelmatason löydöstä. Yksikään ei ole korjattu
tässä yhteydessä: kaikki koskevat kysymystä *korjataanko kanoni vai koodi*, ja siihen
vastataan sopimusmuutos-protokollan mukaan ennen kuin riviäkään muutetaan.

## Miksi tästä ei tehty konetarkistinta

Sama peruste kuin `MESTARIN_NEUVO.md`:ssä ja samat kaksi tarkistusta
(`Kaanon/TYÖTAVAT.md` › Portin kelpoisuusehto). Kanonin sääntökuvaus on proosaa ja sen väite on
tarkoitus eikä merkkijono (tarkistus 1), ja väärä hälytys olisi sääntö eikä poikkeus, koska
sama sääntö sanotaan koodissa ja kanonissa eri sanoilla (tarkistus 3).

Yksi kapea osajoukko läpäisisi ehdot: kanonin nimeämät **luvut** (käden koko, sakon suuruus,
laskurin sekunnit, pistearvot) ovat merkkijonoja, ja ne voisi verrata koodin vakioihin. Sitä ei
tehty, koska tarkistus 5 ei täyty: tämä auditointi löysi yhdeksästä kanonista yhden luvun joka
oli väärin (Kasinon 11 pistettä), ja sekin oli väärin siksi että luettelo oli vajaa eikä siksi
että luku olisi ajautunut. Vikamuoto jota ei ole esiintynyt ei osta porttia.
