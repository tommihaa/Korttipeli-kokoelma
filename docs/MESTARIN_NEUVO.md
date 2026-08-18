# Mestarin neuvo: dokumentti- ja koodipinta

**Mitä tämä dokumentti on.** Mestarin neuvon (🧙) neuvotekstien ja bottikoodin välisen pinnan
tarkastuskirjanpito. Se vastaa kysymykseen *sanooko neuvoteksti sen mitä koodi oikeasti tekee*.

**Miksi tämä pinta on erikseen.** Neuvon siirto ja neuvon perustelu voivat ajautua toisistaan, ja
vain jälkimmäinen on näkymätön testeille. Vika on lauennut tuotannossa kerran: `283c7c6`
(21.7.2026) korjasi Maijan ja Moskan hyökkäystekstit jotka nimesivät väärän lajitteluavaimen.
Siirto oli molemmissa oikea, ja perustelu opetti väärää strategiaa. Löytäjä oli ihmisen pelitesti,
eikä mikään olemassa oleva testi olisi nähnyt sitä.

## Rakenne suojaa siirron, ei perustelua (auditoitu 18.8.2026)

Jokaisen pelin `getAdvice` kutsuu samaa valintafunktiota kuin botti (`aiBestPlay`,
`maijaPickAttack`, `aiPickAttackSN`, `koSwapTarget`, ...) tasolla `hard`. Siitä seuraa kaksi asiaa:

- **Neuvon siirto ei voi ajautua bottikoodista**, koska se on sama koodi eikä kopio.
- **Neuvon perustelu voi ajautua vapaasti**, koska se on lokalisoitu merkkijono jolla ei ole
  yhteyttä lajitteluavaimiin.

Ajautuma osuu siis aina perusteluun, ja se on aina samaa muotoa: oikea siirto väärällä syyllä.

## Auditointi 18.8.2026

Luettu 52 pelikohtaista neuvotekstiä (`src/locales/fi.js`, yhdeksän `advice`-lohkoa) kunkin pelin
`getAdvice`-funktiota ja sen kutsumaa valintalogiikkaa vasten. Kolme ajautumaa, kuusi peliä puhdas.

**Löydöksiä ei korjattu**, päätös 18.8.2026: kirjataan ensin, korjaus omana vuoronaan. Korjaus
koskee 23 lokaalia, koska muut ovat käännöksiä suomesta.

### 1. Moska `beat`: ensisijainen avain jää nimeämättä

Teksti: *"Pienin voittava kortti riittää, isot talteen."*

`aiPickDefense` (`src/games/Moska.jsx`) lajittelee **ensin ei-valtti ennen valttia** ja vasta
sitten arvon mukaan. Jos ainoa ei-valttikaato on kuningas ja kädessä on valttikakkonen, koodi
valitsee kuninkaan. Teksti lupaa siis pienimmän voittavan, ja koodi säästää valtin.

Maijan vastaava teksti sanoo saman asian oikein: *"Pienin voittava riittää, valtit vasta pakon
edessä."* Korjaus on siis olemassa sisarpelissä eikä sitä tarvitse keksiä.

### 2. Koputus `swapSlot`: varma pienennys luvataan sokkopaikasta

Teksti: *"Vaihda nostettu kortti korostettuun korttiin, se pienentää summaasi eniten."*

`koSwapTarget` (`src/games/Koputus.jsx`) voi valita **tuntemattoman** paikan odotusarvolla
(`UNKNOWN_EV = 7`, kynnys 3, ja vain jos se voittaa tunnetun vaihdon hyödyn). Silloin korostettu
kortti on sellainen jota pelaaja ei näe, eikä summa välttämättä pienene lainkaan. Valinta on
oikea, mutta perustelu esittää odotusarvon varmuutena.

Sama muoto lievempänä Kultakalan `drawDiscard`-tekstissä: *"näkyvä pikkukortti"* on
yksinkertaistus, koska `kkDrawDecision`in kynnys on suhteellinen omaan huonoimpaan korttiin eikä
absoluuttinen. Tätä ei ole laskettu löydökseksi.

### 3. Ristiseiskan porttisääntö: kanoni ja koodi eri mieltä, eikä kumpaakaan ole valittu

Tämä on ainoa löydös joka ei rajoitu neuvotekstiin.

| Lähde | Mitä sanoo |
|---|---|
| `RISTISEISKA.md` › AI-strategia | *"Vältä porttikortteja (6 ja 8), käytä ne vain välttämättä"* |
| Neuvoteksti `play` | *"portit (6 ja 8) vasta pakon edessä"* |
| `aiBestCard`, taso `hard` | Pidättelee porttia **vain jos** kädessä on jokin kortti jonka `distanceToPlay >= 3` |

Koodin poikkeus on tehty tarkoituksella ja perusteltu koodikommentissa: porttikortti on
placeholder, jota kannattaa pihdata vain niin kauan kuin kädessä on huonoja kortteja joista
haluaa päästä eroon panttina. Kanoni ja neuvoteksti sanovat silti vanhaa, eli kyse on
sopimusmuutos-protokollan tapauksesta: korjataanko koodi kanonin mukaiseksi vai kanoni koodin.

**Tommin oma kanta 18.8.2026, sanatarkasti:** *"itse ajattelen, että pidättelen porttia, jos
minulla on enintään 1 sitä maata kaukana pelattavuudesta, toivoen että saisin antaa kaukana
pelattavuudesta olevan kortin jollekin korttipanttina"*.

Tämä on kolmas sääntö eikä kumpikaan taulukon riveistä, joten valinta ei sulkeudu ilman sitä.
**Tarkennus samana päivänä:** *"portti ja yksi kortti kyseistä maata"*, eli laskettava joukko on
**kyseisen maan** kortit eikä koko käsi.

Sitä ei ole viety koodiin, koska päätös oli kirjata eikä korjata, ja koska ero nykykoodiin on
suurempi kuin miltä se näyttää. Koodi pidättelee portin kun kädessä on **jokin** kaukainen kortti
mistä tahansa maasta, Tommin sääntö kun kaukaisia kortteja on **kyseisessä maassa enintään yksi**.
Ehdot osoittavat siis eri suuntiin: koodi pidättelee sitä useammin mitä enemmän roskaa kädessä on,
Tommin sääntö sitä useammin mitä vähemmän sitä on siinä maassa.

Yksi yksityiskohta jää auki, eikä sitä arvattu: *enintään yksi* sallii myös nollan, jolloin
panttina annettavaa korttia ei ole ja säännön oma perustelu jää ilman kohdetta. Toteutus tarvitsee
tiedon siitä onko ehto *enintään yksi* vai *tasan yksi*. Vaikutus menee suoraan Mestarin tasoon,
joten se liikuttaa myös Botbench-lukuja.

### Puhtaat

Seiska (8 tekstiä), Maija (5), Läpsy (3), Kasino (7), Paskahousu (7), Kultakala (5, ks. huomio
löydöksessä 2). Tarkastetut väitteet ovat lajitteluavaimia ja sääntölupauksia, esimerkiksi Seiskan
*"vaadi maaksi se, jota sinulla on eniten"* (`aiSuit`), Maijan *"hyökkää sillä maalla jota sinulla
on eniten"* (`maijaPickAttack`, valtit ja Maija suljettu pois) ja Kasinon *"sinulla on toinen
kortti jolla kaappaat sen seuraavaksi"* (`findAIBuild` vaatii kaappaajan olemassaolon).

## Miksi tästä ei tehty konetarkistinta

Neuvoteksti on proosaa ja sen väite on tarkoitus, ei merkkijono. `Kaanon/TYÖTAVAT.md`:n portin
kelpoisuusehdon tarkistus 1 (kohde on merkkijono eikä tarkoitus) ja 3 (väärä hälytys on
poissuljettava) eivät täyty, joten portti hälyttäisi väärin ja sen ohittamisesta tulisi tapa.
Tämä pinta tarkastetaan siis lukemalla, ja tämä dokumentti on sen kirjanpito.
