# Kasino

## Pelitapa

Kaikille jaetaan 4 korttia, pöytään avataan 4 korttia näkyviin. Käsikorttien loppuessa jaetaan uudet 4 per pelaaja — pöytään ei enää jaeta.

Tavoite: saada eniten pisteitä. **Pisteraja: 16* — ensimmäinen 16 pistettä saanut voittaa (tasapeli mahdollinen).

## Vuoron kulku

### Kaappaaminen (Capture)
- Oman kortin arvo **vastaa** pöydän yhden kortin arvoa **tai**
- Oman kortin arvo **vastaa summan** pöydän useiden korttien yhteissummasta
- Kaappaa kortit pöydästä ja laita ne voittosalkkoosi

### Rakentaminen (Build)
- Käytössä **kaikilla pelaajamäärillä**, sekä ihmisellä että boteilla
- **Yhdistä** kaksi tai useampia kortteja pöydässä ilmoittamalla summa
- Esim. 2 + 5 = 7, odotat että sinulla on 7
- Vastustaja **voi varastaa** rakennelmasi!
- Rakennelma **on kaapattava seuraavalla vuorolla**

#### Sääntövalinta: rakennelman maksimiarvo

Rakennelman suurin sallittu arvo on **valittavissa ennen pelin alkua**, ja valinta muistetaan
selaimessa. Vakio on **13** (kuningas). Erikoisrakennelmilla raja nousee **16**:een, jolloin
rakennelman saa tehdä myös erikoiskorttien kaappausarvoille: ässä 14, ♠2 = 15 ja ♦10 = 16.

### Jättäminen (Trail)
- Jos et kaappaa eikä rakenna → lyö joki käsikorteistasi  pöytään

## Pisteet

Pelin lopussa lasketaan:
- **Eniten kortteja** = 3 pistettä
- **Eniten patoja** = 1 piste
- **Ruutu kymppi (♦10)** = 2 pistettä
- **Pata kakkonen (♠2)** = 1 piste
- **Jokainen ässä** = 1 piste (neljä ässää, siis 4 pistettä kierroksessa)

**Yhteensä 11 pistettä per kierros**, tikit päälle. Kortti- ja patojen enemmistö jäävät
jakamatta jos ne menevät tasan.

**Tikki** (pöydän täydellinen tyhjennys yhdellä kortilla) = 1 piste per tikki, mutta vain jos
**jollakulla toisella pelaajalla on tikkejä vähemmän**. Tasatikeillä kukaan ei saa tikkipisteitä.
Ehto on tietoinen: se tekee tikistä kilpailullisen erän eikä varmaa palkkiota.

*Pistetaulukko linjattu 18.8.2026.* Kanoni ja koodi olivat tähän asti eri mieltä kolmessa
kohdassa, ja ristiriita ratkaistiin vakiosääntöjen hyväksi: korttienemmistö nousi yhdestä
kolmeen ja ässän piste kirjattiin näkyviin. Loppusumma 11 oli kanonissa oikein koko ajan,
mutta luettelo ei tuottanut sitä. Tikkiehto ratkaistiin toisin päin, koodin hyväksi.
Tausta: `docs/PELIKANONIT.md` löydös 9.

## Pelin loppu

1. Kierros päättyy kun käsikorttien pakka on jaettu ja pelaajien kortit on pelattu
2. Lasketaan pisteen yllä olevan kaavan mukaisesti
3. Pelin voittaa ensimmäinen **16 pistettä** saavuttava pelaaja
4. **Tasapeli on mahdollinen** (molemmat saavat 16 pistettä samalla kierroksella)

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Pöydän kortit ovat **näkyvät kaikille**
- Muiden pelaajien kädet ovat **piilossa**
- Pelaajien voittamien kasojen sisältö on **näkyvä** (lasketaan pisteen loppussa)
- Pakassa jäljellä olevien korttien **määrä on näkyvä**

## AI-strategia

### AI näkee ja laskee:
1. **Erityiskortit** — mitkä on pelattu (Pata 2, Ruutu 10, Ässä)
2. **Patoja** — seuraa eniten patoja -pistettä
3. Pöydän kortit ja oman käden

### AI ei aktiivisesti laske:
- Kerättyjen korttien kokonaismäärää
- Muiden voitto-kasojen sisältöä
- Pitkäaikaista strategista muistia

### Päätöksenteko:
1. Etsi yksinkertaisia kaappausmahdollisuuksia
2. Priorisoi erityiskortit (Pata 2, Ruutu 10)
3. Jätä heikot kortit jos ei voi kaapata

AI:n rakentamislogiikka:
- Käytä rakentamista strategisesti
- Ei rakenna jos vastustaja voi helposti varastaa

### Kyvykkyysporras

Tasot eroavat **kyvyiltään** eivätkä satunnaisuudelta.

| Kyky | Oppipoika | Kisälli | Mestari |
|---|---|---|---|
| Kaappauksen valinta | naiivi: eniten kortteja | pistearvon mukaan | pistearvon mukaan |
| Rakentaminen | ei rakenna | rakentaa | rakentaa, arvio hypergeometrisella päättelyllä |
| Rakennelman varastaminen | ei varasta | varastaa | varastaa |
| Bonuskortit kaappauksen mukana | ei poimi | poimii samaan arvoon summautuvat | poimii samaan arvoon summautuvat |
| Jättökortin vaara | ei arvioi | heuristinen arvio | laskettu arvio, ässän suojaus |

## Pelin luonne

Kasino on **strateginen peli** jossa pistelaskenta on olennainen. Mökkien hankkiminen (pöydän täydellinen tyhjennys) on dramaattinen hetki ja voi ratkaista pelin. Rakentaminen lisää psykologista elementtiä.

## Erityistapaus

- Kierros päättyy kun käsikorttien pakka on jaettu ja pelaajien kortit on pelattu
- Tasapelit on mahdollisia (molemmat pelaajat saavat 16 pistettä)
