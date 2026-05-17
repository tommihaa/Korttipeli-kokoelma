# Kasino

## Pelitapa

Kaikille jaetaan 4 korttia, pöytään avataan 4 korttia näkyviin. Käsikorttien loppuessa jaetaan uudet 4 per pelaaja — pöytään ei enää jaeta.

Tavoite: saada eniten pisteitä. **Pisteraja: 21** — ensimmäinen 21 pistettä saanut voittaa (tasapeli mahdollinen).

## Vuoron kulku

### Kaappaaminen (Capture)
- Oman kortin arvo **vastaa** pöydän yhden kortin arvoa **tai**
- Oman kortin arvo **vastaa summan** pöydän useiden korttien yhteissummasta
- Kaappaa kortit pöydästä ja laita ne voittosalkkoosi

### Rakentaminen (Build) — vain 2 pelaajaa
- **Yhdistä** kaksi tai useampia kortteja pöydässä ilmoittamalla summa
- Esim. 2 + 5 = 7, odotat että sinulla on 7
- Vastustaja **voi varastaa** rakennelmasi!
- Rakennelma **on kaapattava seuraavalla vuorolla**

### Jättäminen (Trail)
- Jos et kaappaa eikä rakenna → laskea kortin pöytään

## Pisteet

Pelin lopussa lasketaan:
- **Eniten kortteja** = 1 piste
- **Ruutu kymppi (♦10)** = 2 pistettä
- **Pata kakkonen (♠2)** = 1 piste
- **Eniten patoja** = 1 piste
- **Jokainen tikki** (pöydän täydellinen tyhjennys yhdellä kortilla) = 1 piste

**Yhteensä maksimissaan 11 pistettä per kierros.**

## Pelin loppu

1. Kierros päättyy kun käsikorttien pakka loppuu
2. Lasketaan pisteen yllä olevan kaavan mukaisesti
3. Pelin voittaa ensimmäinen **21 pistettä** saavuttava pelaaja
4. **Tasapeli on mahdollinen** (molemmat saavat 21 samalla kierroksella)

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Pöydän kortit ovat **näkyvät kaikille**
- Muiden pelaajien kädet ovat **piilossa**
- Voittosalkkojen sisältö on **näkyvä** (lasketaan pisteen loppussa)
- Pakassa jäljellä olevien korttien **koko on näkyvä**

## AI-strategia

AI:n kaappauslogiikka:
1. Etsi yksinkertaisia kaappausmahdollisuuksia (1:1 tai pieni summa)
2. Priorisoi **Ruutu kymppi** ja **Pata kakkonen**
3. Kaappaa aggressiivisesti jäljellä olevista korteista
4. Arvioi, missä vaiheessa pelistä olet

AI:n rakentamislogiikka (2 pelaajaa):
- Käytä rakentamista strategisesti
- Ei rakenna jos vastustaja voi helposti varastaa

AI:n jättämislogiikka:
- Jätä heikoimpia kortteja (tai kortteja joista ei ole muuta käyttöä)

## Pelin luonne

Kasino on **strateginen peli** jossa pistelaskenta on olennainen. Tikkien hankkiminen (pöydän täydellinen tyhjennys) on dramaattinen hetki ja voi ratkaista pelin. Rakentaminen (2 pelaajaa) lisää psykologista elementtiä.

## Erityistapaus

- Kunhan pakka loppuu, kierros päättyy heti
- Tasapelit on mahdollisia (molemmat pelaajat saavat 21 pistettä)
