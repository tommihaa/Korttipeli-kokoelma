# Paskahousu

## Pelitapa

Kaikki kortit jaetaan mahdollisimman tasan pelaajille. **Pienimmän kortin haltija aloittaa** — punaiset kakkoset (♥2, ♦2) ovat pienimmät kortit pelissä.

Tavoite: pääste kortit käsistä ensimmäisenä. Viimeinen pelaaja jolla on kortit on **Paskahousu**.

## Korttijärjestys (heikoin → vahvin)

```
2(pun.) — 3 — 4 — 5 — 6 — 7 *(pakottaa kuvalle)* — 8 — 9 — 10 *(pakottaa pienille)* — J — Q — K — A — 2(must.)
```

- **Punaiset kakkoset (♥2, ♦2)** = 2 (pienimmät kortit)
- **Numerokortit** = 3–10
- **Kuvakortit** = J (11), Q (12), K (13)
- **Ässä** = 14
- **Mustat kakkoset (♠2, ♣2)** = 15 (suurimmät kortit, "kova kortti")

## Vuoron kulku

1. Aloittaja lyö (aloitukseen käy mikä tahansa kortti)
2. Jokainen pelaaja vuorollaan lyö **yhtä vahva tai vahvempi** kortti
3. Voit lyödä **useamman saman arvoisen** kortin **yhdellä kertaa** (esim. kaksi kolmosta)
4. Jos et voi lyödä → **kokeile lyömällä pakasta kortti**
5. Jos se ei käy, niin nosta kasa

## Erityiskortit ja säännöt

### Mustat kakkoset (♠2, ♣2) — "Kova kortti"
- **Lyö minkä tahansa kortin päälle** (arvo ≥ mikä tahansa)
- **Tyhjälle pöydälle lyödessä** → seuraavan pelaajan on **nostettava se käteensä, jos ei ole toista kovaa kakkosta** ja vuoro siirtyy (ei passausta!)

### Seiska (7)
- Seiskan jälkeen on lyötävä **kuvakortti (J, Q tai K)**
- **Kutosen tai alle kortin päälle kuvia ei voi lyödä**

### Kymppi (10)
- Kymppi on kaatokortti, joka kaataa kasan, jonka päällimmäinen 2-9

### Ässä (A)
- Ässä on kaatokortti, joka kaataa kasan, jossa päällimmäinen J,Q tai K

### Neljä samaa
- Kun kasaan tulee **neljäs saman arvoinen kortti** (eri vuoroilla tai yhdellä kertaa) → **kasa kaatuu pelistä pois**
- **Sama pelaaja aloittaa uuden** kierroksen

## Pelin loppu

1. Pelaajat pelaa kunnes heiltä loppuvat kortit
2. **Ensimmäinen joka tyhjentää kätensä voittaa**
3. Seuraavat sijoituksista (toinen, kolmas jne.)
4. **Viimeinen pelaaja jolla on kortit on Paskahousu** — häviää

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Pöydän ylin kortti on **näkyvä kaikille**
- Muiden pelaajien kädet ovat **piilossa** (kortiluku näkyvä)
- Roskissa olevien korttien määrä on **näkyvä** (ei sisältö)

## AI-strategia

### AI:n pelaamisen prioriteetti

1. **Vältä nostamista, joten käytä 10 ja A kaatoihin**
2. **Käytä normaaleja kortteja** (3–9, ennen 7:ää)
3. **Kova kortti (2) vain välttämättä** — säästä lopusta

### AI:n kovan kortin (2) logiikka
- Älä hukkaa kovaa korttia turhan aikaisesti

### AI:n tyhjälle pöydälle aloitus
- Aloita pienellä (2–6) — säästä vahvempia
- Kova kortti vain jos pakko

## Pakkakoko ja kierrosten määrä

- **4 pelaajaa**: 13 korttia per pelaaja = noin 10–15 kierrosta
- **3 pelaajaa**: ~17 korttia per pelaaja = noin 15–20 kierrosta
- Riippuu siitä kuinka nopeasti pelaajat tyhjentävät

## Pelin luonne

Paskahousu on **loukkaava ja taktiikkapeli** jossa:
- **Yksinkertaiset säännöt** mutta **taktinen syvyys**
- **Kova kortti (2)** ja **kaato kortit (10, A)** sekä kynnyskortti 7 luovat **psykologista painetta**
- **Neljän samaa kaatava -sääntö** lisää **dramaattisuutta**
- **Viimeinen pelaaja (Paskahousu)** — häviäjä on selkeä

Peli yhdistää **nopean reaktion, strategian ja muistin** — oikea kortti oikealla hetkellä ratkaisee.
