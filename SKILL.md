---
name: fi-taivutus
description: Suomen kielen taivutus koodissa ja teksteissä. Käytä aina kun tuotat suomenkielistä sisältöä jossa esiintyy lukumääriä, pelaajien nimiä tai pelitapahtumia. Erityisesti: "N korttia/kortti", "voitit/voitti", "läpsäsit/läpsäsi", partitiivimuodot. Triggeröityy automaattisesti kun kirjoitat suomenkielistä UI-tekstiä, lokiviestejä tai pelikoodia suomalaiselle käyttäjälle.
---

# Suomen kielen taivutus

Suomi taivuttaa substantiiveja, verbejä ja adjektiiveja tiukasti. Tämä skill varmistaa että tuotettu suomenkielinen teksti on kieliopillisesti oikein erityisesti lukumäärien, persoonamuotojen ja sijapäätteiden osalta.

## Lukumäärä + substantiivi

**Sääntö:** Luku 1 → yksikkö nominatiivi. Muut luvut → partitiivi.

| Luku | Muoto | Esimerkki |
|------|-------|-----------|
| 0 | partitiivi | "0 korttia" |
| 1 | nominatiivi | "1 kortti" |
| 2–20 | partitiivi | "2 korttia", "14 pistettä" |
| 21 | nominatiivi | "21 kortti" |
| 22+ | partitiivi | "22 korttia" |

**Toteuta koodissa:**
```js
const korttia = (n) => n === 1 ? `${n} kortti` : `${n} korttia`
const pistettä = (n) => n === 1 ? `${n} piste` : `${n} pistettä`
const pelaajaa = (n) => n === 1 ? `${n} pelaaja` : `${n} pelaajaa`
const vuoroa  = (n) => n === 1 ? `${n} vuoro`  : `${n} vuoroa`
```

**Huom:** Sääntö koskee kaikkia kymmeniä: 21, 31, 41... ovat nominatiivissa. 11 on poikkeus → partitiivi ("11 korttia").

## Verbit: sinä vs. hän/se

Peliteksteissä puhutaan pelaajalle suoraan (sinä) tai kerrotaan tekoälystä (hän).

| Tilanne | Sinä-muoto | Hän-muoto |
|---------|-----------|-----------|
| voittaa | "Voitit" | "Pelaaja 2 voitti" |
| läpsätä | "Läpsäsit" | "Pelaaja 2 läpsäsi" |
| kääntää | "Käänsit" | "Pelaaja 2 kääntää" / "käänsi" |
| nostaa | "Nostit" | "Pelaaja 2 nosti" |
| haastaa | "Haastoit" | "Pelaaja 2 haastaa" / "haastoi" |
| epäonnistua | "Epäonnistuit" | "Pelaaja 2 epäonnistui" |
| vastata | "Vastasit" | "Pelaaja 2 vastasi" |
| koputtaa | "Koputit" | "Pelaaja 2 koputtaa" / "kopotti" |

**Koodimalli:**
```js
const voitti = (idx) => idx === 0 ? 'Voitit' : `${pName(idx)} voitti`
const läpsäsi = (idx) => idx === 0 ? 'Läpsäsit' : `${pName(idx)} läpsäsi`
```

## Omistusmuodot ja sijat

| Väärä | Oikea |
|-------|-------|
| "Sinä:lla 3 korttia" | "Sinulla 3 korttia" |
| "Pelaaja 2:lla" | "Pelaaja 2:lla" ✓ (ok numerolla) |
| "Sinä voittaa" | "Sinä voitat" tai "Voitit" |
| "Sinä menettää" | "Menetät" |
| "ei täsmäystä ollaan" | "ei täsmäystä" |

## Partitiivin erikoistapaukset peleissä

```
"ei yhtään korttia"   ✓    (ei "ei kortteja")
"jokaisella on kortti" ✓
"kaikki kortit"       ✓    (monikko nominatiivi)
"kaikkia kortteja"    ✓    (monikko partitiivi, käytä liikuttaessa)
"pari korttia"        ✓
"muutama kortti"      ✓
```

## Tyypilliset pelilokiviestit — mallit

```
// Läpsäys
idx===0 ? `Läpsäsit nopeiten (${ms} ms)! Voitit ${korttia(n)}.`
        : `${pName(idx)} läpsäsi (${ms} ms) — voitti ${korttia(n)}.`

// Haaste
idx===0 ? `Haastoit ${lbl(card)}! ${pName(target)}lla ${korttia(n)} aikaa.`
        : `${pName(idx)} haastaa ${lbl(card)}! Sinulla ${korttia(n)} aikaa.`

// Rangaistus
idx===0 ? `Menetät päällimmäisen korttisi.`
        : `${pName(idx)} menettää päällimmäisen korttinsa.`

// Voitto
idx===0 ? `Voitit ${korttia(n)}!`
        : `${pName(idx)} voitti ${korttia(n)}.`
```

## Muista aina

1. Tarkista onko subjekti "Sinä" (idx===0) vai kolmas persoona
2. Käytä `korttia(n)`-apufunktiota — älä kirjoita "korttia" kiinteästi
3. "Sinä:lla" ei ole suomea — käytä "Sinulla"
4. Mennyt aika: "voitti", "läpsäsi", "kääntää" (preesens) tai "käänsi" (imperfekti) — valitse tilanteen mukaan
