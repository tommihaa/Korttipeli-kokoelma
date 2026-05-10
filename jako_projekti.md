# JAKO — Korttipelien kokoelma
## Projektidokumentti

---

## Projektin kuvaus

**Jako** on korttipelisovellus joka kokoaa enimmäkseen suomalaisia versioita korttipelisuosikeistani yhteen. Nimi tulee korttipelien jako-termistä. Sovelluksessa on kaksi tilaa: opetustila ja vapaa tila. Kehitetty React-pohjaisena sovelluksena, tavoitteena toimia sekä säännöstönä että pelattavana sovelluksena selaimessa ja mobiilissa.

---

## Termistö

Yhtenäinen termistö jota käytetään kaikissa peleissä:

- **Pöytäkortti** — pelaajan omat piilossa olevat kortit (Koputus, Kultakala, Läpsy)
- **Pöytä** — yhteinen alue keskellä (Maija, Moska, Kasino)
- **Pino** — pelaajan nostamaton korttipino (Läpsy)
- **Kasa** — voitetut kortit (Läpsy) / kaapattavat kortit (Kasino)
- **Kaataa** — Maijassa ja Moskassa
- **Kaapata** — Kasinossa (eri mekaniikka, ei kaatopakkaa)
- **Hyökkääjä / Puolustaja** — Moskassa
- **Käsikortti** — pelaajan kädessä olevat kortit (Maija, Kasino)
- **Nostopakka** — pakka josta nostetaan
- **Kaatopakka** — poistettujen tai hylättyjen korttien pakka
- **Lyöntipakka** — keskelle lyödyt kortit; digitaalisessa versiossa siisti pino, livessä käytännössä härökasa kortteja suurin piirtein päällekkäin
- **Käsi** — pelaajan kädessä olevat kortit yleiskäsitteenä (vrt. *Käsikortti* joka on pelin sisäinen termi Maijassa ja Kasinossa)
- **Etukäsi** — jakajan vasemmalla puolella istuva pelaaja, joka yleensä aloittaa pelin

---

## Pelitilat

### Opetustila 🎓
- Ohjattu läpikäynti
- Tekoäly neuvoo ja selittää siirtoja
- Ei aikapaineita
- Säännöt auki sivussa tarvittaessa
- Visuaaliset värit: sininen (#5ba8d4)

### Vapaa tila 🃏
- Puhdas peli ilman opastusta
- Klassinen tunnelma, omat päätökset
- Visuaaliset värit: kulta/vihreä (#c9a84c)

---

## Ääni- ja efektiperiaatteet

- **Äänet oletuksena päällä** kaikissa tiloissa — löydettävissä asetuksista
- **Boss-fight-hetket** joissa ääni on perusteltua (jos pelaaja sen sallinut):
  - Valttikakkonen vaihtuu automaattisesti → kultainen transformaatio
  - Patakuningatar jää viimeiselle → dramaattinen häviö
  - Läpsy: koko pakka kerätty yhdellä läpsäytyksellä
  - Kasino: täydellinen tikki joka tyhjentää pöydän ja ratkaisee pelin
  - Moska: viimeinen pelaaja jää yksin korttien kanssa
  - Kultakala: tuntematon paljastetaan tasatilanteessa

---

## Pelien kehitysjärjestys

1. Koputus (yksinkertaisin mekaniikka, hyvä aloituspiste)
2. Läpsy (reaktiopeli, sopii mobiiliin)
3. Kultakala (muistipeli, tuntematon elementti)
4. Maija (valttimaa, hyökkäys/puolustus)
5. Kasino (kaappausmekaniikka, pisteet)
6. Moska (monimutkaisin)

---

## Tuleva peli

**Kultakala** lisätty ystävän pyynnöstä. Mahdollisesti myös muita pelejä tulossa kokoelmaan.

---

## Pelit ja säännöt

---

### KOPUTUS

**Pelaajia:** 2–6
**Pakka:** 52 korttia
**Tavoite:** Pienin pistesumma
**Vaikeus:** Keskitaso

**Pisteet:** Ässä = 1, numerokortit = nimellisarvo, J = 11, Q = 12, K = 13. Tasatilanteessa vähempi kortteja omannut voittaa.

**Valmistelu**
1. Kullekin pelaajalle jaetaan 4 pöytäkorttia neliöksi kuvapuolet alaspäin.
2. Kukin saa katsoa 2 omaa korttiaan.
3. Loput kortit muodostavat nostopakan.
4. Pöytäkortit ovat aina kuvapuolet alaspäin.

**Vuoron kulku**
1. Jakajasta seuraava aloittaa pelin vetämällä pakasta kortin. Hän voi vaihtaa sen johonkin omista pöytäkorteistaan.
2. Vedetyn kortin voi joko lyödä keskelle tai vaihtaa sen johonkin omistaan, jonka lyö keskelle — tällöin pelaajista nopein voi lyödä omista korteistaan samanvahvuisen kortin päälle.
3. Väärän kortin keskelle lyömisestä rangaistuksena menettää lyömänsä kortin ja nostaa kaksi korttia pakasta lisää pöytäkorteikseen — maksimi on neljä pöytäkorttia.
4. Hitaampi saman kortin lyöjä nostaa pakasta kortin lyömänsä kortin tilalle.

**Erityiskortit**
- Jätkä (J) — saat katsoa yhden omista pöytäkorteistasi.
- Kuningatar (Q) — saat vaihtaa yhden kortin kenen tahansa pöytäkortin kanssa.
- Kuningas (K) — saat katsoa oman pöytäkortin ja halutessasi vaihtaa sen yhteen kenen tahansa muun pöytäkorttiin.

**Pelin loppu**
- Kun pelaaja uskoo voittoonsa, voi hän ennen nostokorttinsa pelaamista koputtaa ja sitten pelata korttinsa — muut saavat vielä yhden vuoron.

---

### LÄPSY

**Pelaajia:** 2–6
**Pakka:** 52 korttia
**Tavoite:** Kerää kaikki kortit
**Vaikeus:** Helppo

**Valmistelu**
1. Kaikki kortit jaetaan tasan pelaajille pinoiksi kasvot alaspäin. Live-pelissä kortit kannattaa pelata suoraan kädestä.

**Vuoron kulku**
1. Jakajasta seuraava aloittaa kääntämällä pinonsa päällimmäisen kortin keskelle kasvot ylöspäin.
2. Pelaajat jatkavat vuorotellen.
3. Jos kaksi päällimmäistä korttia ovat samat, nopein läpsääjä voittaa kasan.
4. Väärästä läpsäytyksestä rangaistuksena menettää pinonsa päällimmäisen kortin kasaan.
5. Kasa menee voittajan pinon alle.

**Erityiskorttien haaste**
- Jätkä (J) — seuraavalla 1 kortti aikaa vastata erityiskortilla.
- Kuningatar (Q) — seuraavalla 2 korttia aikaa.
- Kuningas (K) — seuraavalla 3 korttia aikaa.
- Ässä (A) — seuraavalla 4 korttia aikaa.
- Jos vastaus onnistuu eri arvoisella erityiskortilla, sen haaste siirtyy seuraavalle.
- Jos kaksi samaa erityiskorttia kohtaa, nopein läpsääjä voittaa kasan.
- Jos haaste epäonnistuu, erityiskortin lyönyt voittaa kasan.

**Tietokonaversiossa:** Tasapelitilanteet ratkaistaan sekuntilaskurilla joka mittaa reaktionopeutta.

---

### MAIJA

**Pelaajia:** 2–6
**Pakka:** 52 korttia
**Tavoite:** Lyö maa kerrallaan, pääse kortit käsistä
**Vaikeus:** Keskitaso

**Valmistelu**
1. Kullekin pelaajalle jaetaan 5 korttia käsikorteiksi.
2. Valttimaa määräytyy pakan pohjimmaisesta kortista, joka jää näkyville pakan alle. Pata ei voi olla valttimaa — sen kohdalle sattuessa uusi yritys.

**Vuoron kulku**
1. Jakajasta seuraava aloittaa lyömällä pöytään yhden tai useamman saman maan kortin. (Kokemus on osoittanut ettei ole syytä olla lyömättä kaikkia, paitsi Maijaa piilotellessa.)
2. Hyökkääjä täydentää kätensä pakasta viiteen — muttei voi lyödä lisää tällä vuorolla.
3. Puolustaja kaataa kortit saman maan suuremmalla tai valttimaalla.
4. Jos puolustaja ei kaada kaikkia — nostaa kaatamatta jääneet käteensä ja vuoro siirtyy.
5. Patakuningatar on Maija, joka ei kelpaa kaatokortiksi — vaan on aina nostettava käteen.
6. Täysin onnistuneen kaadon jälkeen kaatanut täydentää kätensä viiteen ja hyökkää seuraavalla vuorolla.

**Pelin loppu**
1. Nostopakan tyhjennettyä pelin voittaa korteista pikimmiten eroon päässyt ja muut taistelevat sijoituksista.
2. Pelaaja, jolle jää patakuningatar viimeisenä käteen on Maija.

---

### KASINO

**Pelaajia:** 2–4
**Pakka:** 52 korttia
**Tavoite:** Eniten pisteitä
**Vaikeus:** Keskitaso
**Pisteraja:** 21

**Valmistelu**
1. Kaikille jaetaan 4 korttia, pöytään avataan 4 korttia näkyviin.
2. Käsikorttien loppuessa jaetaan uudet 4 per pelaaja — pöytään ei enää jaeta.

**Vuoron kulku**
1. Kaappaamalla — oma kortti vie pöydästä saman arvoisen tai summaltaan täsmäävän yhdistelmän.
2. Rakentamalla (valinnainen, vain 2 pelaajaa) — yhdistää kortit ilmoittaen summan jonka aikoo kaapata. Vastustaja voi varastaa rakennelman! Rakennelma on kaapattava seuraavalla vuorolla.
3. Jättämällä — laskee kortin pöytään jos ei kaappaa eikä rakenna.
4. Pöydän tyhjentäminen kerralla = tikki.

**Pisteet**
- Eniten kortteja = 1 piste
- Ruutu kymppi = 2 pistettä
- Pata kakkonen = 1 piste
- Eniten patoja = 1 piste
- Jokainen tikki = 1 piste

---

### MOSKA

**Pelaajia:** 2–6 yhdellä pakalla, 7+ kahdella pakalla
**Pakka:** 52 korttia
**Tavoite:** Lyö lyötyä — pääse kortit käsistä
**Vaikeus:** Vaativa

**Valmistelu**
1. Jaetaan 6 korttia käteen per pelaaja.
2. Pakan pohjakortti osoittaa valttimaan ja jää näkyville pakan alle.
3. Se pelaaja, jolla on pienin valttikortti kädessään, aloittaa ensimmäisen hyökkäyksen.

**Vuoron kulku**
1. Hyökkääjä lyö pöytään yhden tai useamman saman vahvuisen kortin. Hyökkäyksessä ei saa käyttää enemmän kortteja kuin puolustajalla on kädessään.
2. Puolustaja voi siirtää hyökkäyksen lyömällä hyökkäykseen saman vahvuisen kortin — seuraavasta pelaajasta tulee uusi puolustaja, joka hänkin voi tehdä saman.
3. Puolustajan on kaadettava jokainen kortti saman maan suuremmalla tai valttimaan kortilla.
4. Hyökkäys voi saada jatkoa — kuka tahansa voi lisätä saman vahvuisia kortteja kuin puolustuksessa on käytetty, kunhan puolustajalla on määrällisesti riittävästi kortteja kaataakseen ne.

**Nostorutiini**
1. Nostopakan käydessä vähiin pelaajilla on taktikoinnin paikka.
2. Oma käsi täydennetään nostopakasta kuuteen vasta puolustusyrityksen päätyttyä.
3. Puolustus onnistuu — pöydän kortit poistopakkaan, hyökkääjät nostavat nostopakasta ensin lyöntijärjestyksessä, puolustaja viimeisenä.
4. Hyökkäys onnistuu — puolustaja nostaa kaikki pöydän kortit, ei nosta pakasta.

**Loppuvaihe & erityissäännöt**
1. Valttimaan kakkosen haltija saakoon tässä versiossa alkuperäisen pakan pohjakortin, jonka perusteella alussa valtti määräytyi. Vaihto tapahtuu automaattisesti.
2. Nostopakan tyhjennettyä pelin voittaa korteista pikimmiten eroon päässyt ja muut taistelevat sijoituksista.
3. Viimeinen pelaaja jolla on kortit on Moska.

---

### KULTAKALA

**Pelaajia:** 3–6 (paras useammalla — kortit ovat niukkuushyödyke)
**Pakka:** 52 korttia
**Tavoite:** Pienin pistemäärä — 1 tuntematon + 5 pöytäkorttia
**Vaikeus:** Helppo

**Pisteet:** A = 1, numerokortit = nimellisarvo, J = 11, Q = 12, K = 13.

**Valmistelu**
1. Kukin vetää viuhkasta yhden kortin — jää katsomattomana omaksi tuntemattomaksi koko peliksi. Kukaan ei voi koskea siihen.
2. Kullekin jaetaan 5 pöytäkorttia jonoon kasvot alaspäin.
3. Loput muodostavat nostopakan.

**Vuoron kulku**
1. Jakajasta seuraava aloittaa. Nosta joko nostopakasta tai kaatopakasta.
2. Vertaa nostettuun — vaihda jonon viimeiseen sokkona tai heitä kaatopakkaan.
3. Jos vaihdettu viimeinen on huono, voi jatkaa vaihtamista jonossa eteenpäin.
4. Vaihdettava kortti menee aina kaatopakkaan josta seuraava pelaaja voi nostaa sen.
5. Kukin vuoro kartuttaa tietoa — mutta niin myös vastustajille.

**Tärkeä:** Jos haluaa katsoa jonon viimeisen kortin, se pitää myös vaihtaa — katsominen maksaa.

**Strateginen tuntu:** Mitä enemmän pelaajia, sitä vähemmän nostopakkaa ja vaihtomahdollisuuksia — hyväksyttävä korttiarvo nousee pelaajamäärän myötä. Kaksinpelissä tavoitellaan ässiä ja kakkosia; kolmen pelaajan pelissä nelosetkin kelpaavat. Ei matemaattinen laki, vaan kokemusperäinen suunta.

**Pelin loppu**
1. Peli loppuu nostopakan ehdyttyä.
2. Tuntematon paljastetaan — dramaattinen hetki joka voi kaataa koko pelin.
3. Lasketaan summa: tuntematon + 5 pöytäkorttia. Pienin summa voittaa.
4. Tasatilanteessa molemmat heittävät viittä noppaa — suurempi yhteissumma voittaa.

---

### PASKAHOUSUT

**Pelaajia:** 3–6
**Pakka:** 52 korttia
**Tavoite:** Pääse kortit käsistä — viimeinen on Paskahousut
**Vaikeus:** Helppo

**Valmistelu**
1. Jaetaan kaikki kortit mahdollisimman tasan pelaajille.

**Vuoron kulku**
1. Pienimmän kortin haltija aloittaa — punaiset kakkoset ovat pienimpiä, joten ♥2 tai ♦2 menee kolmosen edelle. Siirretään myötäpäivään.
2. Pelaajan on lyötävä kasaan yhtä vahva tai vahvempi kortti. Useamman saman arvoisen voi lyödä kerralla.
3. Jos ei pysty tai halua lyödä, passaa. Kun kaikki passaavat, kasa menee roskiin — viimeksi lyönyt aloittaa uuden.
4. Viimeinen jolla on kortit on Paskahousut.

**Erityiskortit**
- **Mustat kakkoset (♠2, ♣2) — kova kortti:** Lyö minkä tahansa kortin päälle. Jos kova kortti lyödään tyhjälle pöydälle (uusi kierros), seuraavan pelaajan on nostettava se käteensä.
- **Punaiset kakkoset (♥2, ♦2):** Normaali arvo 2 — pienimmät kortit pelissä.
- **Seiska (7):** Seiskan jälkeen on lyötävä kuvakortti (J, Q tai K) — kutoselta tai alle kuvia ei voi lyödä.
- **Kymppi (10):** Kympin jälkeen on lyötävä pieni kortti (6 tai alle).
- **Ässä (A):** Lyö kuvakorttien (J, Q, K) päälle.
- **Neljä samaa:** Kun kasaan tulee neljäs saman arvoinen (eri vuoroilla tai yhdellä kertaa), kasa kaatuu roskiin ja sama pelaaja aloittaa uuden.

**Korttijärjestys (heikoin → vahvin):**
2(pun.) — 3 — 4 — 5 — 6 — 7 *(pakottaa kuvalle)* — 8 — 9 — 10 *(pakottaa pienille)* — J — Q — K — A — 2(must.)

---

### RISTISEISKA

**Pelaajia:** 3–6
**Pakka:** 52 korttia
**Tavoite:** Pääse kortit käsistä ensimmäisenä
**Vaikeus:** Helppo

**Valmistelu**
1. Jaetaan kaikki kortit tasan pelaajille (ylijäävät kaatopakkaan näkyviin).
2. Pöytä on tyhjä — kortit rakennetaan pelissä.

**Vuoron kulku**
1. Se jolla on ristiseiska (♣7) aloittaa ja lyö sen pöytään.
2. Pöytä rakentuu neljän maan joukoiksi: kukin maa laajenee kumpaankin suuntaan seiskasta (ylös 8–K ja alas 6–A).
3. Omalla vuorolla on lyötävä yksi sallittu kortti — tai passattava.
   - **Sallittu kortti:** mikä tahansa 7 (avaa uuden maan), tai jatko olemassa olevaan jonoon (esim. jos ♣8 on pöydässä, voi lyödä ♣9).
4. Passaus on sallittu milloin vain — mutta voi lyödä vain yhden kortin per vuoro.
5. Vuoro siirtyy myötäpäivään.

**Pelin loppu**
- Ensimmäinen joka tyhjentää kätensä voittaa. Muut jatkavat sijoituksista.

---

### SEISKA

**Pelaajia:** 2–6
**Pakka:** 52 korttia
**Tavoite:** Pääse kortit käsistä ensimmäisenä
**Vaikeus:** Helppo

**Valmistelu**
1. Jaetaan 7 korttia per pelaaja käteen.
2. Loput muodostavat nostopakan — pakan päällimmäinen käännetään näkyviin lyöntipakan pohjaksi.

**Vuoron kulku**
1. Jakajasta seuraava aloittaa. Myötäpäivään.
2. Pelaaja lyö yhden tai useamman kortin lyöntipakan päälle. Kortin on täsmättävä maalta tai arvoltaan päällimmäisen kanssa.
   - **Sama maa:** yksi kortti kerrallaan.
   - **Sama arvo:** useamman saman arvoisen voi lyödä yhdellä kertaa.
3. Jos ei pysty lyödä, nostaa pakasta kortteja enintään 3. Jos nostamisen jälkeenkään ei sovi, sanoo "Ohi" ja vuoro siirtyy.
4. Jos nostopakka loppuu, lyöntipakan päällimmäinen jätetään paikalleen ja muista sekoitetaan uusi nostopakka.

**Erityiskortit**
- **Ässä (A):** Kaikki muut pelaajat nostavat pakasta yhden kortin.
- **Seiska (7):** Pelaaja saa valita seuraavan maan vapaasti — ei tarvitse täsmätä. Seiskaa ei voi lyödä toisen seiskan päälle. Pelissä ei voi voittaa seiskalla — se on lyötävä ennen viimeistä korttia.

**Lappu-sääntö**
- Kun pelaajalla on enää yksi kortti jäljellä, hänen on sanottava "Lappu". Jos unohtaa eikä sitä huomata ennen seuraavan vuoroa, sakoksi nostetaan 5 korttia.

**Pelin loppu**
- Ensimmäinen joka tyhjentää kätensä (ei seiskalla) voittaa.

**Pisteet (valinnainen)**
- Pidetään kirjaa useamman erän yli. Käteenjääneet kortit lisätään omiin miinuspisteisiin: ässä −14, seiska −25, muut nimellisarvo. Häviää se joka ensimmäisenä ylittää −100 (tai sovitun rajan).

---

## Tekninen toteutus

**Teknologia:** React (JSX), inline styles, CSS animaatiot
**Tiedostot:**
- `jako_v3.jsx` — viimeisin prototyyppi (6 peliä, tilanvalinta, pelattava rakenne)

**Navigaatiovirtaus:**
Etusivu → Pelin sivu → Säännöt TAI Tilanvalinta → Pelitila

**Väripaletti:**
- Tausta: #0d2118 (tummanvihreä)
- Kulta: #c9a84c
- Teksti: #f0e6cc
- Opetustila: #5ba8d4
- Helppo: #4caf7d, Keskitaso: #e0a93b, Vaativa: #e05c3b

**Olio-rakenne:** Jokainen peli on objekti `games`-taulukossa. Uuden pelin lisääminen = uuden objektin lisääminen samassa muodossa.

---

## Muistiinpanot kehitykseen

- Äänet oletuksena pois — löydettävissä asetuksista
- Valttimaa aina pakan pohjimmaisesta kortista (Maija ja Moska yhdenmukaistettu)
- Kultakalan tuntematon-elementti on pelin keskeinen satunnaistaja
- Kultakalan noppafinaalit ovat spektaakkelihetki
- Moskan valttikakkosen automaattinen vaihto on live-pelin hienous joka säilytetään
