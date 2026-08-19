# Substanssi: mitä yhdeksästä korttipelistä tiedetään pöydän puolelta

Tämä tiedosto kantaa sitä mitä **peleistä maailmana** tiedetään: mistä ne on opittu, miten
niitä oikeasti pelataan pöydässä ja mikä pelaajan päätöksessä on hyvää tai huonoa silloin kun
säännöt sallivat molemmat. Se ei ole sääntökuvaus. Yhdeksän pelikanonia (`KASINO.md`,
`KOPUTUS.md`, `KULTAKALA.md`, `LAEPSY.md`, `MAIJA.md`, `MOSKA.md`, `PASKAHOUSU.md`,
`RISTISEISKA.md`, `SEISKA.md`) kertovat mitä peli pitää totena, ja `docs/PELIKANONIT.md` pitää
kirjaa siitä sanooko kanoni sen mitä koodi tekee. Kumpikaan ei kanna sitä mitä alla on.

Se on kokoelmatasolla nimetty kolmas akseli: `Kaanon/KÄSITTEISTÖ.md` kertoo mitä teokset
pitävät totena ja `Kaanon/TYÖTAVAT.md` miten niiden parissa työskennellään, mutta kumpikaan ei
kanna sitä mitä maailmasta tiedetään. Toinen tämän lajin dokumentti on `DGAndroid/SUBSTANSSI.md`,
ja se on kirjoitettu ensin.

**Lukija on malli, ja tiedosto noudetaan kun aihe tulee vastaan.** Muoto on siksi väitelauseita
eikä proosaa.

## Menetelmä: jokainen väite on Tommin vastaus

Pahin mahdollinen lopputulos on keksitty substanssi, koska se näyttää oikealta. Vastine ei ole
työkalu vaan kirjoitustapa: kysytään ensin, ja väite kirjataan vasta vastauksena. Koetin on
Tommi eikä testi, eikä se tuota paluuarvoa.

**Vastaus ja siitä vedetty seuraus kirjoitetaan eri riveille.** DGAndroidin haastattelussa
mitattu vikamuoto ei ollut keksitty substanssi vaan **liian pitkä johtopäätös tosi
lähtökohdasta**, ja se on vaarallisempi juuri siksi että sen alla on oikea vastaus. Alla oleva
merkintä `Seuraus:` on kirjoittajan päätelmä eikä Tommin sanoma, ja se saa kaatua ilman että
vastaus kaatuu sen mukana.

**Korttipelien yleistä sääntötietoa ei toisteta täällä.** Siitä on julkista kirjallisuutta jonka
malli osaa pääpiirteittäin, joten sen kirjoittaminen tuottaisi dokumentin joka näyttää
substanssilta olematta sitä.

## Alkuperä on kirjattu tänne täysimääräisenä, ja se on kumottu päätös

Louhinnan `Lahteet/louhinnat/04-pelit-ja-pelisuunnittelu.md` kysymykseen 1 vastattiin
19.8.2026, ettei Laiturin taustaa kirjata ja että alkuperä on tarkoituksella pois. Päätös
kumoutui samana iltana, kun tämän tiedoston ensimmäinen kysymys osoitti että viisi peliä
yhdeksästä on opittu siellä. Kumoutuminen on kirjattu louhintaan omaksi osiokseen, ja
alkuperäinen vastaus on jätetty siihen näkyviin kumottuna.

Repo on julkinen, joten tämä tiedosto on ulospäin näkyvää tekstiä. Se on tiedossa ja se on
päätöksen sisältö eikä sen sivuvaikutus.

**Mikä ei muuttunut.** `laituri`-nimiryhmä on kunnianosoitus oikeille ihmisille eikä
arkkityyppiryhmä, eikä sille anneta persoonallisuuksia, puhetyylejä tai pelitapaeroja
(`CLAUDE.md`, Players). Se sääntö on voimassa tämän kirjauksen jälkeenkin, koska sen peruste on
kunnianosoitus eikä salassapito.

---

## 1. Yhdeksän peliä on opittu kolmessa paikassa, ja ne jakautuvat 2 + 2 + 5

Tommi 19.8.2026, kysyttäessä mistä pelit ovat tulleet ja kuka ne opetti:

> *lapsena ristiseiska ja paskahousu*
> *opiskelukaveri kasino, seiska*
> *laituri moska, maija, koputus, kultakala, läpsy*

| Paikka | Pelit | Määrä |
|---|---|---|
| Lapsuus | Ristiseiska, Paskahousu | 2 |
| Opiskelukaveri | Kasino, Seiska | 2 |
| Laituri | Moska, Maija, Koputus, Kultakala, Läpsy | 5 |

Laituri on Kontiolahden kuntouttava työtoiminta, jota siellä kutsuttiin Laituriksi. Tommin oma
kuvaus 21.5.2026: *Siellä neljä tuntia vietettiin, tehtiin asioita ja lätkittiin korttia
teemasta riippuen, mutta päivittäin. Pakko ei ollut pelata ja aikaa oli toistoihin. Siviilissä
näitä pelien oppimisia rajoittaa, kun ei ole aikaa, opettajaa, virtaa tai pelaajia.*

**Seuraus:** enemmistö kokoelmasta on opittu yhdessä paikassa päivittäisellä toistolla ilman
pakkoa, ja sovelluksen lupaus on sama pari toisessa muodossa (*sääntöjä ei tarvitse opetella
etukäteen, peli neuvoo pelatessa, kukaan ei kiirehdi sinua*). Tätä ei ole aiemmin sanottu
missään ääneen, vaikka sekä pelivalikoima että opetustapa seuraavat siitä.

**Seuraus:** kolme paikkaa tarkoittaa kolmea eri sääntöperinnettä, eivät yhtä. Lapsuuden kaksi
peliä ovat vanhimmat ja niiden säännöt ovat todennäköisimmin kotisääntöjä, opiskelukaverin
kaksi on opittu yhdeltä ihmiseltä ja ovat siksi kapein otos, ja Laiturin viisi on opittu
useasta pelaajasta koostuvassa porukassa. Tämä on päätelmä eikä Tommin vastaus, ja se on
tarkistettava peli kerrallaan.

**Avoin:** kysymys sisälsi toisen puolen, johon ei ole vielä vastattu. Onko yhdeksästä joku,
jota Tommi ei ole pelannut pöydässä lainkaan vaan poiminut kirjasta tai netistä. Sen kohdalla
hän ei olisi koetin, ja se on tiedettävä ennen kuin sen pelin substanssia kirjataan.

## 2. Sääntömuunnelmat on jo ratkaistu koodissa, ja se on vastaus eri kysymykseen

Kysyttäessä missä yhdeksästä Tommin pelaamat säännöt eroavat eniten sääntökirjasta tai netistä,
vastaus 19.8.2026 oli:

> *yritin kanonisoida minkä voin ja asetuksilla loput valinnoiksi*

Vastaus kuvaa menettelyä eikä eroa. Se on silti tarkistettavissa ja se pitää paikkansa:
`docs/PELIKANONIT.md` kirjaa viisi aloitusnäytön sääntövalintaa kolmessa pelissä (Paskahousun
käden koko, kakkosten kovuus ja kuvakortin alaraja, Ristiseiskan pantin arvonta, Kasinon
rakennelman maksimiarvo), ja ne kirjattiin kanoniin 18.8.2026 säännöstön valittavina kohtina.

**Seuraus:** kohta jossa muunnelma olisi näkynyt on jo suljettu, ja se selittää miksi kysymys
ei tuottanut listaa eroista. Kanoni kuvaa säännöstön ja asetus kantaa muunnelman.

**Avoin, ja tämä on tärkein yksittäinen aukko koko dokumentissa:** kysymys **mistä** kukin
muunnelma on peräisin, on yhä vastaamatta. Asetus kertoo että vaihtoehtoja on kaksi tai
useampia, muttei sitä kumpi niistä on Laiturin tapa ja kumpi kirjan tapa, eikä sitä onko
vakioasento valittu siksi että se on yleisin vai siksi että se on se jolla Tommi on pelannut.
Tämä on juuri sitä tietoa jota ei saa mistään muualta kuin häneltä.

## 3. Aloittelijan virhe on kortin arvon väärinlukeminen, ei sääntörikkomus

Kysyttäessä mitä aloittelija tekee pöydässä väärin ilman että mikään sääntö kieltää sitä,
vastaus 19.8.2026 oli:

> *pelaa liian hyvän tai täysin väärän kortin*

Molemmat ovat laillisia siirtoja, joten ohjelma sallii ne yhtä lailla kuin parhaan siirron.
Ne ovat myös eri virheitä eivätkä saman virheen asteita: liian hyvä kortti on **oikea kortti
väärään aikaan**, eli resurssin tuhlaus, ja täysin väärä kortti on **väärä kortti**, eli
tilanteen lukemisen virhe.

**Seuraus:** kumpikin virhe on pelikohtainen, koska se mikä tekee kortista liian hyvän riippuu
siitä mitä pelissä kerätään tai vältetään. Yleistä muotoa ei siis voi kirjata, vaan kysymys on
esitettävä peli kerrallaan.

**Avoin:** kumpaakin virhettä ei ole vielä purettu yhdenkään yhdeksän pelin kohdalla, eikä
sitä ole verrattu siihen mitä botit tekevät. Jälkimmäinen on tarkistettavissa koodista, mutta
vasta kun tiedetään mitä pöydässä pidetään virheenä.

*Kohta täydentyi erässä 2, ks. kohta 6.*

---

## 4. Kaikki yhdeksän on pelattu pöydässä, mutta Kasinon rakentaminen ei

Tommi 19.8.2026, kysyttäessä onko joku peleistä poimittu kirjasta tai netistä pöydän sijaan:

> *ei, mutta kasino pelissä en ole pelannut rakennelman sallivaa variaatioita*

**Seuraus:** kaikkien yhdeksän pelin osalta Tommi on koetin, yhtä mekaniikkaa lukuun ottamatta.
Se yksi on Kasinon rakentaminen, ja aukko on isompi kuin vastauksen sanamuodosta arvaisi:
rakentamista **ei voi kytkeä pois** sovelluksessa. `KASINO_DEFAULT_RULES` tuntee vain
`specialBuilds`-asetuksen, joka nostaa rakennelman katon 13:sta 16:een; rakentaminen itsessään
on aina käytössä sekä ihmisellä että boteilla. Vakioasennon 13 ja vaihtoehdon 16 välinen valinta
on siis valinta kahden sellaisen asennon välillä, joista kumpaakaan Tommi ei ole pöydässä
pelannut.

**Seuraus:** aukko osuu juuri siihen mekaniikkaan joka erottaa Kasinon bottitasot toisistaan.
Kyvykkyysportaassa Aloittelija ei rakenna eikä varasta rakennelmia, ja ylemmät tasot tekevät
molempia, Mestari hypergeometrisella päättelyllä. Kasinon kyvykkyysporras nojaa siis
kokonaan siihen puoleen pelistä jossa ihmiskoetin ei ole koetin.

**Avoin:** mistä rakentaminen on tullut sovellukseen, jos se ei ole tullut pöydästä. Se on
Kasinon vakiosääntö laajasti, joten lähde on todennäköisesti kirjallinen, mutta sitä ei ole
kysytty eikä sitä saa päätellä tästä.

## 5. Vakioasetukset ovat pelattavuuspäätöksiä eivätkä perinnettä

Tommi 19.8.2026, kysyttäessä kumpi asento kussakin sääntövalinnassa on hänen oma tapansa:

> *totuin pelaamaan 5 korttia paskahousu, jossa kaikki kakkoset oli kovia eikä kynnystä milloin
> voi pelata kuvakortti ja minusta se oli tylsää, kynnys ainakin tarvittiin*

| Paskahousun sääntö | Tommin oma tapa | Sovelluksen vakio |
|---|---|---|
| Käden koko | 5 | 6 |
| Kakkosten kovuus | kaikki kovia | vain ♠2 ja ♣2 |
| Kuvakortin alaraja | ei rajaa (0) | 7 |

Kaikissa kolmessa vakioasento on siis **eri kuin se jolla hän oppi pelaamaan**, ja kanoni
esittää vakioasennon sääntönä.

**Tommin arvio omasta tavastaan on kirjattava sellaisenaan, koska se on harvinainen laji
substanssia:** hän sanoo oppimansa muodon olleen tylsä ja nimeää syyn, eli kuvakortin
puuttuvan kynnyksen. Lähde arvioi siis omaa perinnettään eikä vain kuvaa sitä.

**Seuraus:** vakioasento on suunnittelupäätös eikä perinne, ja ainakin yhden asetuksen kohdalla
päätöksen peruste on nimetty. Kuvakortin alaraja 7 on siellä siksi että ilman rajaa peli oli
tylsä, ei siksi että 7 olisi yleisin sääntö kirjoissa.

**Seuraus:** asetusvalikko ei siis ole lista muunnelmia joista vakio olisi neutraalein, vaan
säädin jonka toisessa päässä on Tommin oma perinne ja vakiokohdassa se mikä osoittautui
paremmaksi pelata. Tämä on päinvastainen kuin oletus jonka asetusnäkymästä tekisi.

**Avoin:** käden koon 5 ja kakkosten kovuuden kohdalla perustetta ei ole nimetty, vain
kuvakortin kynnyksen. Ja Kasinon rakennelman katto jäi vastaamatta, mutta kohta 4 selittää
miksi: kumpikaan asento ei ole pöydästä.

## 6. Kolme nimettyä esimerkkiä liian hyvän kortin pelaamisesta

Tommi 19.8.2026, kysyttäessä yhtä konkreettista esimerkkiä, vastasi kolmella eri pelistä:

> *Ristiseiska: pelaa porttikortin jota olisi kannattanut pihdata*
> *Paskahousu: kaataa kun pakasta voi kokeilla yksiarvoisen pöydän pelaamisen*
> *Kultakala A tai 2 pelaaminen poistopakkaan*

Kolme esimerkkiä ovat sama virhe kolmessa eri resurssissa: **pelataan kortti jonka arvo on
sen pidättämisessä eikä pelaamisessa.**

**Ristiseiskan esimerkki on jo mallinnettu koodissa, eikä se siksi ole uutta tietoa vaan
vahvistus.** Porttikortit ovat 6 ja 8, ja niiden pidättely on kanonissa nimetty
aloittelijavirheen vastakohdaksi (`RISTISEISKA.md`, kyvykkyysporras). Mestarin ehto on
maakohtainen: porttia pidätellään jos samassa maassa on enintään yksi kaukainen kortti.
Aloittelijataso tekee tämän virheen tarkoituksella.

**Paskahousun esimerkki koskee kaatajakortin tuhlaamista.** Kaatajia ovat 10 (arvon 9 tai
sitä pienemmän päälle) ja A (kuvakortin päälle), ja kaato tyhjentää kasan pelistä ja antaa
kaatajalle uuden vuoron. Virhe on kaataa tilanteessa jossa halvempi siirto olisi riittänyt.

*Tulkinta jää tässä kesken tarkoituksella.* Vastauksen jälkiosa (*kun pakasta voi kokeilla
yksiarvoisen pöydän pelaamisen*) viittaa todennäköisesti siihen että kasassa on vain yhtä
arvoa ja pakassa on kortteja jäljellä, jolloin kannattaa lyödä ja katsoa mitä nostaa, ja
vaihto-oikeus antaa vielä kolmen sekunnin peruutusmahdollisuuden. **Tätä ei kirjata väitteeksi
ennen kuin Tommi on vahvistanut sen**, koska kyse on juuri siitä lajista jossa liian pitkä
johtopäätös näyttäisi oikealta.

**Kultakalan esimerkki on kaksinkertainen virhe, ja se on kolmesta selvin.** Pienin summa
voittaa ja ässä on 1, joten A ja 2 ovat pelin parhaat kortit. Poistopakkaan heittäminen
menettää kortin ja **antaa sen näkyvästi vastustajalle**, koska poistopakan ylin kortti on
kaikkien nähtävissä ja seuraava pelaaja saa nostaa sen.

**Seuraus:** kolmesta esimerkistä yksi on jo koodissa (Ristiseiska), yksi on osittain kirjattu
strategiaosioon mutta ei virheenä (Paskahousu), ja yhtä ei ole kanonissa (Kultakala).

*Kultakalan koodi tarkistettiin heti, ja vartija on olemassa mutta kapea.* `kkChainStep`
sisältää ehdon jonka kommentti sanoo suoraan: *paikka 1: älä aja ulos tunnettua pientä korttia
poistopakkaan*. Raja on `playerCount + 1`, eli kolme pelaajamäärällä kaksi ja viisi
pelaajamäärällä neljä, ja samalla rajalla pieni kortti myös vaihdetaan sisään sen sijaan että
se heitettäisiin pois. **Vartija koskee kuitenkin vain paikkaa 1**, ja se on ketjuvaihdon
sääntö eikä yleinen kielto. Tommin nimeämä virhe on siis estetty siinä kohdassa jossa se on
tavallisin, muttei nimetty missään dokumentissa, joten kanonin ja koodin ero on tässä kirjaus
eikä käyttäytyminen.
