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
4. Jos et pysty tai halua lyödä → **passaa**
5. Kun **kaikki passaavat** → kasa menee **roskiin** (poistuu pelistä) ja **viimeksi lyönyt aloittaa** uuden kierroksen

## Erityiskortit ja säännöt

### Mustat kakkoset (♠2, ♣2) — "Kova kortti"
- **Lyö minkä tahansa kortin päälle** (arvo ≥ mikä tahansa)
- **Tyhjälle pöydälle lyödessä** → seuraavan pelaajan on **nostettava se käteensä** ja vuoro siirtyy (ei passausta!)

### Seiska (7)
- Seiskan jälkeen on lyötävä **kuvakortti (J, Q tai K)**
- **Kutoselta tai alle kuvia ei voi lyödä**

### Kymppi (10)
- Kympin jälkeen on lyötävä **pieni kortti (6 tai alle)**
- Esim. jos 10 on pöydässä, seuraava kortti on oltava 2, 3, 4, 5 tai 6

### Ässä (A)
- Lyö **kuvakortit (J, Q, K)** päälle
- **Ei voi lyödä kolikosta (< 7) päälle**

### Neljä samaa
- Kun kasaan tulee **neljäs saman arvoinen kortti** (eri vuoroilla tai yhdellä kertaa) → **kasa kaatuu roskiin**
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

1. **Vältä 10 ja A tuntemattomille** — ne ovat loukkaavia kortteja
   - 10 pakottaa pienen kortin (3–6) — haittaa pelaajille
   - A pakottaa kuvan (J, Q, K) — haittaa pelaajille
2. **Käytä normaaleja kortteja** (3–9, ennen 7:ää)
3. **Kova kortti (2) vain välttämättä** — säästä lopusta

### AI:n kovan kortin (2) logiikka
- Priorisoi: 10/A-loukka > samanarvoisen suojan > defensiivinen käyttö
- Älä hukkaa kovaa korttia turhan aikaisesti

### AI:n passauslogiikka
- Passaa jos ei voi lyödä laillisesti
- Älä lyö turhaan — säästä vahvempia

### AI:n tyhjälle pöydälle aloitus
- Aloita pienellä (3–6) — säästä vahvempia
- Kova kortti vain jos pakko

## Pakkakoko ja kierrosten määrä

- **4 pelaajaa**: 13 korttia per pelaaja = noin 10–15 kierrosta
- **3 pelaajaa**: ~17 korttia per pelaaja = noin 15–20 kierrosta
- Riippuu siitä kuinka nopeasti pelaajat tyhjentävät

## Pelin luonne

Paskahousu on **loukkaava ja taktiikkapeli** jossa:
- **Yksinkertainen säännöt** mutta **taktinen syvyys**
- **Kova kortti (2)** ja **loukkaavat kortit (10, A, 7)** luovat **psykologista painetta**
- **Neljän samaa kaatava -sääntö** lisää **dramaattisuutta**
- **Viimeinen pelaaja (Paskahousu)** — häviäjä on selkeä

Peli yhdistää **nopean reaktion, strategian ja muistin** — oikea kortti oikealla hetkellä ratkaisee.
