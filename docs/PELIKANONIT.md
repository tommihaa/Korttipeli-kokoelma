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

**Ratkaistu 18.8.2026: variaatiot kirjattiin kanoniin.** `PASKAHOUSU.md` sai osion
*Sääntövalinnat aloitusnäytöltä* (käden koko 5 tai 6, kakkosten kovuus, kuvakortin alaraja
0/6/7/8/9) ja `KASINO.md` alaosion rakennelman maksimiarvosta (13 tai 16). Kanoni kuvaa siis
säännöstön valittavine kohtineen, ja vakioasento sanotaan kussakin taulukossa erikseen.
Kirjatessa tarkentui kaksi asiaa joita auditointi ei nähnyt: käden koon ja kuvakortin alarajan
asennot ovat useampia kuin kaksi, ja `specialBuilds` ei nosta vain kattoa vaan sallii
rakennelmat erikoiskorttien kaappausarvoille (A = 14, ♠2 = 15, ♦10 = 16). Koodiin ei koskettu.

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

**Ratkaistu 18.8.2026: sääntö vietiin koodiin.** Kanoni oli oikeassa ja koodi puutteellinen.
`pRank` järjestää nyt ensin pisteillä ja sitten korttimäärällä, ja sama vertailu ohjaa
sijoituslaskennan (`pBetter`) ja tulosnäytön. Kanoniin ei koskettu, koska se sanoi jo oikein.

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

**Ratkaistu 18.8.2026: molemmat kirjattiin kanoniin, koodiin ei koskettu.** AI-strategian kohta 1
kuvaa nyt oman pinon kääntämistä ja sanoo ääneen ettei nostopakkaa ole, ja sakkokortin parisääntö
on Vuoron kulun kohtana 5. Kummassakaan ei ollut haaraumaa: koodi oli oikeassa ja kanoni vaiti.

**Auki jää AI-osion taso**, joka on kokoelmatason löydös B eikä tämän löydöksen oma: Läpsyssä on
kolmiportainen kyvykkyysporras (reaktioaika 1500/1100/500 ms, kortinlaskenta Kisällistä alkaen,
pinojärjestyksen ennustus vain Mestarilla), ja kanoni sanoo yhä *"yksinkertainen strategia"*.

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

**Ratkaistu 18.8.2026: kanoni korjattiin, koodiin ei koskettu.** Hyökkäysavain sanoo nyt
korttimäärän, ja samalla kirjattiin kolme puuttuvaa kykyä: monikorttihyökkäyksen tasoehto,
Maija-dumppi ja Mestarin valttihyökkäys. Suunta oli sama kuin neuvotekstillä 21.7.2026, eli
koodi on tässä totuus.

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

**Ratkaistu 18.8.2026: ehdot kirjattiin kanoniin ja yhtenäistettiin ihmisen ehtoihin.** Sääntö
asuu nyt koodissa yhdessä paikassa (`moskaCanPass`), ja sama funktio ajaa botin, Mestarin neuvon
ja ihmisen napin. Botilta poistui passiketjun pituusraja, ja valtti kelpaa passikortiksi myös
botilla silloin kun muuta samaa vahvuutta ei ole. Tasoporras jäi ehtojen ulkopuolelle: Oppipoika
ei edelleenkään siirrä, ja valttia säästetään kortinvalinnassa eikä säännössä. `MOSKA.md` sai
kuusikohtaisen ehtoluettelon ja kuuden hyökkäyskortin katon.

**Yksi auditoinnin rivi oli väärässä, ja se korjataan tähän.** Taulukko sanoi ettei botilla ole
ehtoa *yhtään korttia ei kaadettu*; sillä oli, `noBeats`-nimisenä samassa lauseessa. Todelliset
erot olivat kaksi eikä kolme. Samalla löytyi neljäs kirjoituspaikka jota taulukossa ei ollut:
Mestarin neuvo (`getAdvice`) toisti botin ehdot, eli neuvo saattoi vaieta siirrosta joka
ihmiselle oli laillinen. Se korjautui samalla yhtenäistyksellä.

**Uusi ehto 6 ei ole sääntömuutos vaan aiemman käyttäytymisen kirjaus.** `doPass` on aina
hylännyt siirron jolle ei löydy vastaanottajaa, mutta hylkäys tuli vasta siirron jälkeen
lokirivinä. Nyt sama tarkistus on ehdossa, joten siirtoa ei tarjota lainkaan.

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

**Ratkaistu 18.8.2026: säännöt kirjattiin kanoniin sellaisina kuin ne koodissa ovat.**
`RISTISEISKA.md` sai oman osion *Pantti: passaaminen maksaa toiselle pelaajalle kortin*, jossa
ovat myös ensimmäisen kierroksen vapautus, antajan valinta kortillisista pelaajista ja
panttikortin valintatavan sääntövalinta. Koodiin ei koskettu. Kokoelmatason löydös A kapenee
tämän myötä yhdellä rivillä: `randomPantti` on nyt kanonissa, mutta neljä muuta asetusta eivät.

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

### 9. Kasino: koko pistelasku eroaa kanonista, ja rakentamisen pelaajamäärärajaus on väärä

Kaksi löydöstä, joista ensimmäinen tarkentui 18.8.2026 kirjoittamisen jälkeen ja on
laajempi kuin ensin kirjattiin.

**Pistelasku eroaa kolmessa kohdassa.** `scoreRound` (`src/games/Kasino.jsx:771`) vasten
`KASINO.md` › Pisteet:

| Erä | Kanoni | Koodi |
|---|---|---|
| Eniten kortteja | 1 piste | 1 piste (`hasMostCards`, tasapelissä ei kummallekaan) |
| Eniten patoja | 1 piste | 1 piste |
| ♦10 | 2 pistettä | 2 pistettä |
| ♠2 | 1 piste | 1 piste |
| Ässä | **ei mainita** | **1 piste per ässä**, eli 4 kierroksessa |
| Tikki | *"jokainen tikki = 1 piste"* | omat tikit **vain jos** jollakulla toisella on vähemmän |
| Yhteensä | *"maksimissaan 11"* | 9 + tikit |

**Luku 11 on todennäköisesti vakiosäännöistä, ja se selittää molemmat poikkeamat.**
Perinteisessä Kasinossa pisteet ovat eniten kortteja 3, eniten patoja 1, ♦10 kaksi, ♠2 yksi
ja jokainen neljästä ässästä yksi, eli tasan 11. Kanonin oma luettelo ei tuota yhtätoista
millään lukutavalla (se antaa 5 plus tikit), joten luku on peräisin muualta kuin luettelosta.
Tämä ei ole kanonin puolustus vaan sen diagnoosi: **kanonin luettelosta on pudonnut ässä ja
korttienemmistön arvo on muuttunut kolmesta yhdeksi, mutta loppusumma on jäänyt entiselleen.**

Koodi on siis linjassa itsensä kanssa mutta ei vakiosääntöjen eikä kanonin loppusumman kanssa,
ja kanoni on ristiriidassa itsensä kanssa. Kysymys ei siksi ole *kumpi on oikeassa* vaan
*mikä pistetaulukko peliin halutaan*, ja se on suunnittelupäätös eikä korjaus.

**Tikkiehto on kolmas ero eikä sitä voi ratkaista samalla vastauksella.** Koodissa tikkipisteet
saa vain jos jollakulla toisella on niitä vähemmän (rivi 791), eli kahden pelaajan tasatikeillä
kumpikaan ei saa mitään. Kanonin *"jokainen tikki = 1 piste"* on ehdoton. Ero on
`eniten tikkejä` -tyyppinen sääntö kirjoitettuna `jokainen tikki` -tyyppisen näköiseksi.

**Rakentaminen ei ole rajattu kahteen pelaajaan.** `KASINO.md` › Rakentaminen (Build) on
otsikoitu *"vain 2 pelaajaa"*, ja luonnehdintaosio toistaa sen. Koodissa ei ole
pelaajamäärätarkistusta rakentamiselle: rakennusnappi ja `buildMode` ovat käytössä kaikilla
pelaajamäärillä, ja botin rakennuslogiikka (`findAIBuild`) ajetaan samoin.

**Ratkaistu 18.8.2026 (versio 1.2.210), pistelaskun osalta.** Tommin valinta on vakiosäännöt:
korttienemmistö nousi yhdestä kolmeen ja ässän piste kirjattiin kanoniin, jolloin kierroksesta
jaetaan 11 pistettä tikkien lisäksi. Tikkiehto ratkesi toiseen suuntaan, koodin hyväksi, ja
kanonin ehdoton sanamuoto korjattiin. `KASINO.md` kirjattiin ennen koodia
(sopimusmuutos-protokolla), ja sääntörivi päivitettiin kaikkiin 23 lokaaliin.

**Ratkaistu 18.8.2026: rajaus poistettiin kanonista.** Koodi oli oikeassa: rakentaminen on
tarkoitettu kaikille pelaajamäärille. `KASINO.md`:n otsikosta, AI-osiosta ja luonnehdinnasta
poistui *vain 2 pelaajaa*. Kokoelmatason löydös A:n `specialBuilds` ratkesi samalla kierroksella,
ks. sen oma kohta.

**Sivuseuraus joka jäi tekemättä tarkoituksella:** botin kaappausheuristiikka `aiCardScore`
painottaa korttimäärää pelkkänä viimeisenä tasapelin ratkaisijana (`pts * 10000 + spades * 100
+ cards.length`). Korttienemmistön kolminkertaistuminen tekee siitä alipainotetun. Viritys on
oma päätöksensä eikä seuraa säännöstä, ja sen vaikutus on mitattava eikä pääteltävä
(`docs/BOTBENCH.md`: Kasinolla ei ole mitattua porrasta, joten muutoksen näkisi vasta ajossa).

## Yhteenveto

| Peli | Löydöksiä | Painavin |
|---|---|---|
| Kasino | 2 | Pistelasku eroaa kolmessa kohdassa, ässä ja tikkiehto mukaan lukien |
| Koputus | 1 | Tasapelin ratkaisua ei ole toteutettu |
| Kultakala | 1 | Kanonin kynnys kuvaa kuollutta koodia, ja väärinpäin |
| Läpsy | 1 | AI-osion kohta 1 kuvaa toista peliä |
| Maija | 1 | Hyökkäysavain väärin, sama virhe korjattu kerran muualla |
| Moska | 2 | Passausehdot puuttuvat, ja kaksi toteutusta eroavat |
| Paskahousu | 0 | |
| Ristiseiska | 1 | Panttimekaniikka puuttuu sääntöosiosta |
| Seiska | 0 | |
| **Kokoelmataso** | **2** | Sääntövalinnat ja kyvykkyysporras |

Yksitoista pelikohtaista löydöstä ja kaksi kokoelmatason löydöstä. **Kolme on ratkaistu
18.8.2026** ja ne menivät kolmeen eri suuntaan, mikä on itsessään tulos: Kasinon pistelasku
ratkesi kanonin ulkopuolelta (vakiosäännöt, molemmat puolet olivat väärässä), Koputuksen
tasapeli koodiin (kanoni oli oikeassa) ja Ristiseiskan pantti kanoniin (koodi oli oikeassa).
Loput odottavat sopimusmuutospäätöstä eikä niihin kosketa ennen sitä.

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
