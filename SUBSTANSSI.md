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
