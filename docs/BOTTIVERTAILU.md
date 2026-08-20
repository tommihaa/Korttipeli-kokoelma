# Bottivertailu: tekevätkö botit haastattelussa nimetyt virheet (20.8.2026)

Lähde ja tehtävänanto: `SUBSTANSSI.md` kohta 3 jätti auki vertailun siitä, tekevätkö botit
niitä virheitä jotka Tommi nimesi haastattelussa pöydän virheiksi. Virhekartta valmistui
erässä 52 (kooste kohdassa 69): aloittelijan virhe on nimetty kaikista yhdeksästä pelistä ja
kokeneen virhe kahdeksasta (Läpsyllä sitä ei ole, kohta 65; Kasinosta sitä ei kysytty,
kohta 35).

Menetelmä on koodinluku, ei mittaus: jokaisen pelin bottilogiikka luettiin lähteestä ja
verrattiin nimettyyn virheeseen. Tämä kertoo mitä koodi tekee, ei kuinka usein virhe
vaikuttaa lopputulokseen; vaikutuksen mittari on botbench (`docs/BOTBENCH.md`).

Kysymys on kaksiosainen per virhe: **tekeekö Oppipoika virheen, ja välttääkö Mestari sen?**
Porras mallintaa virheen vasta kun molemmat puolet toteutuvat. Kolmas mahdollinen tulos on
että virhettä ei tee mikään taso (virhe ei silloin erota tasoja), ja neljäs että virheen
tekee jokainen taso (virheen välttäminen puuttuu repertuaarista).

Yhteinen mekanismi: viidessä pelissä porrastus kulkee `aiShouldFumble`-funktion kautta
(`src/shared/helpers.js`), jonka virhetodennäköisyys on Oppipojalla 0.5, Kisällillä 0.15 ja
Mestarilla 0. Nämä virheet ovat probabilistisia; loput ovat deterministisiä haaroja
tasotarkistuksen takana.

## Yhteenveto

Aloittelijan yhdeksästä virheestä seitsemän on mallinnettu portaaseen, yksi puoliksi
(Läpsy) ja yhtä ei tee mikään taso (Kultakala). Kokeneen kahdeksasta virheestä neljä on
mallinnettu, kolme puoliksi (Koputus, Moska, Paskahousu) ja yksi jäi vaille kohdetta
(Läpsy, virhettä ei nimetty).

| Peli | Aloittelijan virhe (kohta) | Tulos | Kokeneen virhe (kohta) | Tulos |
|---|---|---|---|---|
| Koputus | ei sokkovaihda (45) | mallinnettu | ei ota selvää pöytäkorteista (48) | puoliksi |
| Läpsy | väärä läpsy tai hitaus (68) | puoliksi | ei nimetty (65) | ei kohdetta |
| Kultakala | A/2 poistopakkaan (6) | ei mikään taso | ei ota selvää pöytäkorteista (52) | mallinnettu |
| Maija | isot pienten sijaan (26) | mallinnettu | jättää kaatamatta pakan loputtua (62) | mallinnettu |
| Kasino | vie pöydästä kaiken (69) | mallinnettu | ei kysytty (35) | ei kohdetta |
| Moska | isot pienten sijaan, ei siirrä (67) | mallinnettu | vaihetaju + muisti pakan loputtua (19) | puoliksi |
| Seiska | ei ryhmälyöntiä (66) | mallinnettu | ei säästä samanarvoisia (55) | mallinnettu |
| Ristiseiska | pelaa porttikortin (61) | mallinnettu | väärä panttikortti (64) | mallinnettu |
| Paskahousu | polttaa kaatajan turhaan (6, 7) | mallinnettu | ysin ja kutosen arvo (63) | puoliksi |

## Pelikohtaiset havainnot

### Koputus

**Aloittelija (kohta 45): ei vaihda sokkona pientä korttia tuntemattomaan.** Mallinnettu
deterministisesti, ja tämä oli vahvistettu jo haastattelussa: `koSwapTarget` antaa
tuntemattoman täytön hyödyn vain kun taso ei ole Oppipoika, Kisällin kynnys on 5 ja
Mestarin 3 (`Koputus.jsx`, `koSwapTarget`). Lisäksi reaktiovaiheessa on kaksi
Oppipoika-heikkoutta: passiivisuus (jättää reagoimatta todennäköisyydellä 0.5, Kisälli
0.25, Mestari 0.03) ja väärä reaktio tuntemattomalla kortilla (0.15, muilla 0).

**Kokenut (kohta 48): ei aggressiivisesti ota selvää pöytäkorteistaan.** Puoliksi
mallinnettu, ja tämä on kohdan 48 avoimen koodikysymyksen vastaus. Tasot erottuvat
tiedonhankinnassa vain sokkotäytön kautta (sama kynnysporras kuin yllä, ja Mestari ottaa
myös poistopakan pikkukortin tuntemattomaan paikkaan, `koWantsDiscard`). Sen sijaan
**erikoiskorttien katsomisia botti ei käytä millään tasolla**: J/Q/K-erikoisvaiheet
(`spec_j`, `spec_q_*`, `spec_k*`) käynnistyvät vain ihmisen nostopolulla, ja botti pelaa
nostamansa jätkän tai kuninkaan tavallisena korttina. Pelin nimetyt tiedonhankintakeinot
(jätkän ja kuninkaan katsomiset) puuttuvat siis koko portaalta, eli siltä osin jokainen
bottitaso tekee kokeneen virheen.

### Läpsy

**Aloittelija (kohta 68): väärä läpsy tai hitaus.** Puoliksi mallinnettu. Hitaus on portaan
kantava ero: läpsyviive on keskimäärin noin 2400 ms Oppipojalla, 1700 ms Kisällillä ja
1000 ms Mestarilla, ja Kisälli/Mestari nopeutuvat lisäksi kortinlaskennalla
(`Lapsy.jsx`, läpsyajastimet). **Väärää läpsyä botti ei tee koskaan millään tasolla**:
botin läpsy ajastetaan vain kun keskellä on aito pari, joten virheen toinen suunta on
olemassa vain ihmiselle.

### Kultakala

**Aloittelija (kohta 6): A:n tai 2:n pelaaminen poistopakkaan.** Tätä virhettä ei tee
mikään taso, eikä se siksi erota tasoja. Ketjuvaihdon säännöstö `kkChainStep` on
tasoparametriton eli sama kaikille: paikan 1 vartija estää tunnetun pienen kortin
ajamisen poistoon, ja pieni kortti (arvo enintään pelaajamäärä + 1) vaihdetaan
tuntemattomaan tai tunnettuun jos edellä on tuntemattomia. Oppipojan heikkoudet ovat
muualla: nostopäätöksen eagerBonus 3 (ottaa poistopakasta huonompaa) ja ketjuraja 3
(ei suunnittele ketjua ensimmäistä vaihtoa pidemmälle). Reunatapaus on olemassa ja
koskee kaikkia tasoja: jos rivi on kokonaan tunnettu, pakasta nostettu ässä menee
poistoon (`aiChainSwap`in ei-vaihtoja-haara), koska ketjusääntö ei vaihda tunnettuun
paikkaan ilman tuntemattomia edellä, vaikka rivissä olisi isompi kortti.

**Kokenut (kohta 52): ei ota selvää pöytäkorteistaan.** Mallinnettu. Oppimiskeino on
Kultakalassa vaihtaminen, ja se porrastuu: Oppipojan ketjuraja katkaisee oppimisketjun,
Kisälli ketjuttaa täydellä säännöstöllä, ja Mestari täyttää tuntemattomia proaktiivisesti
poistopakan pikkukorteilla ja laskee loppupelissä täyttökynnyksen 3:sta 1:een
(`kkDrawDecision`, kierrostietoinen kynnys 18.8.2026).

### Maija

**Aloittelija (kohta 26): isojen pelaaminen pienten sijaan.** Mallinnettu
deterministisesti ja suoraan: hyökkäysryhmän lajittelu on Oppipojalla suurin ensin ja
muilla pienin ensin (`maijaPickAttack`). Oppipoika myös lyö yhden kortin kerrallaan
(monikorttihyökkäys on Kisällin kyky) ja kohtelee Maijaa tavallisena korttina.

**Kokenut (kohta 62): jättää kaatamatta pakan loputtua.** Mallinnettu: juuri se vaiheraja
jonka Tommi nimesi (pakan loppuminen) on puolustusehdossa. Valttipuolustus kytkeytyy
päälle ehdolla `deckEmpty || pöytäkortteja vähintään 3` (Kisälli) tai `vähintään 2`
(Mestari), eli pakan loputtua molemmat kaatavat aina kun pystyvät
(`maijaPickDefense`).

### Kasino

**Aloittelija (kohta 69): vie pöydästä kaiken minkä säännöt sallivat.** Mallinnettu
deterministisesti: Oppipojan kaappausvalinta on `findNaiveCapture`, joka maksimoi
kaapattujen korttien lukumäärän, kun Kisälli ja Mestari käyttävät `findBestCapture`a
joka maksimoi pistearvon. Määrä ainoana akselina on täsmälleen nimetty virhe. Oppipoika
ei myöskään rakenna, varasta eikä poimi bonuskortteja.

**Kokenutta ei kysytty** (kohta 35: pöytäpeli ei noussut sille tasolle), joten vertailtavaa
ei ole.

### Moska

**Aloittelija (kohta 67): pelaa isoja kun voi pelata pieniä, eikä siirrä hyökkäystä.**
Molemmat puolet mallinnettu. Iso pienen sijaan on fumble: hyökkäys suurimmalla
ei-valtilla todennäköisyydellä 0.5/0.15/0, ja puolustuksessa vastaava fumble polttaa
valtin kun ei-valtti riittäisi (`runAI`). Siirtämättä jättäminen on deterministinen:
siirtoa kokeillaan vain kun taso ei ole Oppipoika (`lvl !== 'beginner' &&
moskaCanPass`), ja kommentti nimeää tämän itse: Aloittelija ei siirrä.

**Kokenut (kohta 19): ei huomaa vaiheen vaihtumista pakan loputtua, ja muisti auttaa.**
Puoliksi mallinnettu. Muistipuoli on Mestarilla: `aiPickAttackSN` käyttää poistuneiden
korttien kirjanpitoa (`removedRef`) ja suosii arvoja joista kopiot ovat poissa, eli
juuri sivustalyöntiriskin hallintaa jonka Tommi nimesi muistin syyksi. Sen sijaan
**vaihetajua ei ole millään tasolla**: mikään hyökkäys-, puolustus- tai
lisäyspäätöksistä ei lue nostopakan kokoa, joten tavoitteen kääntymistä korteista eroon
pääsemiseksi ei tapahdu. Siltä osin jokainen bottitaso tekee kokeneen virheen.

### Seiska

**Aloittelija (kohta 66): ei pelaa samanarvoisia kerralla.** Mallinnettu fumblena:
ryhmälyönnistä pelataan vain yksi kortti todennäköisyydellä 0.5/0.15/0, paitsi voittava
ryhmä jota ei unohdeta koskaan (`Seiska.jsx`, ryhmäfumble). Sama fumble kattaa myös
seiskan panttaamisen: pelkän seiskan varassa oleva botti nostaa turhaan.

**Kokenut (kohta 55): ei säästä samanarvoisia lopetuskorteiksi.** Mallinnettu, ja tämä
oli vahvistettu jo haastattelussa: parinsäästölogiikka (`aiBestPlay`) pelaa yksittäisen
kun ryhmän voi säästää, suosii korttia jolla ei ole paria ja jättää 3:n, 4:n ja 5:n
kädellä mahdollisimman suuren samanarvoisten ryhmän. Logiikka on tasoparametriton,
joten porrastus tulee samasta ryhmäfumblesta: Oppipoika hajottaa säästetyn ryhmän
puolessa tilanteista, Mestari ei koskaan.

### Ristiseiska

**Aloittelija (kohta 61): pelaa porttikortin jota voisi pihdata.** Mallinnettu fumblena
ja vahvistettu jo haastattelussa: pidättelysäännön ohi pelataan portti
todennäköisyydellä 0.5/0.15/0 (`Ristiseiska.jsx`), ja pidättelyn ehto on Kisällillä
karkeampi (pidättele kun samaa maata on useampi) ja Mestarilla maakohtainen
kaukolaskenta (`aiBestCard`). Fumble koskee myös seiskan avaamista väärään maahan.

**Kokenut (kohta 64): antaa väärän panttikortin.** Mallinnettu fumblena: pantiksi
annetaan strategisesti huonoin kortti (`aiWorstCard`: kauimpana pelattavuudesta,
toissijaisesti yksinäinen maa), paitsi fumblella satunnainen kortti kädestä
todennäköisyydellä 0.5/0.15/0. Oppipoika antaa siis väärän pantin puolessa
tilanteista ja Mestari ei koskaan.

### Paskahousu

**Aloittelija (kohdat 6 ja 7): polttaa kaatajan tai kovan kakkosen kun halvempi siirto
riittäisi.** Mallinnettu fumblena: kun normaali kortti kävisi, Oppipoika pelaa silti
10:n tai ässän todennäköisyydellä 0.5 (`runAI`, kommentti nimeää virheen). Perustaso
suosii normaaleja kortteja ja käyttää kaatajia vain pakosta. Rajaus: pöydän nimeämä
oikea vaihtoehto eli tarkoituksellinen sokkonosto pakasta ei ole botin repertuaarissa
millään tasolla, sillä botti lyö pakasta vain kun kädessä ei ole laillista korttia.
Mestari välttää virheen siis eri reittiä kuin pöydän kokenut pelaaja.

**Kokenut (kohta 63): ei ymmärrä ysin ja kutosen arvoa.** Puoliksi mallinnettu, ja
molemmat puolet ovat tasoparametrittomia. Ysi on loppupelin säästölistalla kaikilla
tasoilla (`aiCards`: säästä kova kakkonen, 10, A ja 9), eli ysin arvon ymmärtää myös
Oppipoika; virhe ei erota tasoja. Kutosen tukkimisarvoa (kutosen päälle käy vähemmän
kortteja kuin seiskan) ei tunne mikään taso: koodissa ei ole yhtään kutoseen viittaavaa
päätöshaaraa. Siltä osin jokainen bottitaso tekee kokeneen virheen.

## Mitä tästä seuraa

Kolme aukkoa on samaa muotoa: virheen välttäminen puuttuu koko portaalta, jolloin Mestari
ei voi erottua siinä mistä pöydän kokenut pelaaja tunnistetaan. Ne ovat Koputuksen
erikoiskorttien katsomiset, Moskan vaiheenvaihto pakan loputtua ja Paskahousun kutonen.
Neljäs samansuuntainen mutta lievempi on Läpsyn väärä läpsy, joka puuttuu botilta
kokonaan (botti ei voi läpsäistä väärin, mikä on pelaajalle eduksi eikä haitaksi, mutta
tekee Oppipojasta siltä osin virheettömän).

Nämä ovat mahdollisia porrastyön kohteita, eivät velvoitteita: mittari ensin, eli
muutoksen hyöty todetaan botbenchillä eikä julisteta (`docs/BOTBENCH.md`). Kirjaus tehdään
tässä, jotta seuraava porrastyö alkaa kartasta eikä koodinluvusta.

Erillinen havainto ilman toimenpidettä: Kultakalan reunatapaus (täysin tunnettu rivi ja
nostettu ässä poistoon) koskee kaikkia tasoja ja on harvinainen, koska rivi on kokonaan
tunnettu vasta kun kaikki viisi vaihdettavaa paikkaa on opittu. Se on nimetyn
aloittelijavirheen ainoa koodissa elävä muoto.
