# Seiska

## Pelitapa

Jokaiselle jaetaan 7 käsikorttia. Loput muodostavat nostopakan — pakan päällimmäinen käännetään näkyviin lyöntipakan pohjaksi (ei 7 eikä A).

Tavoite: pääse eroon käsikorteista ensimmäisenä.

## Vuoron kulku

1. Jakajasta seuraava aloittaa — myötäpäivään
2. Pelaaja lyö **yhden tai useamman** kortin lyöntipakan päälle
3. Kortin on **täsmättävä** maalta **tai** arvoltaan päällimmäisen kanssa:
   - **Sama maa**: yksi kortti kerrallaan
   - **Sama arvo**: useamman saman arvoisen voi lyödä **yhdellä kertaa**
4. Jos ei pysty lyödä → nosta pakasta **enintään 3 korttia**
5. Nostamisen jälkeen jos silti ei sovi → sano "Ohi" ja vuoro siirtyy
6. Jos nostopakka loppuu → lyöntipakan päällimmäinen jätetään paikalleen, muut sekoitetaan uudeksi nostopakaksi

## Erityiskortit

### Ässä (A)
- Lyödessä ässää kaikki **muut pelaajat nostavat pakasta yhden kortin** (rangaistus)
- Ässää lyönyt saa **bonusvuoron** samaa maata
- Ässää ei voi lyödä **viimeisenä korttina**
- Toisen ässän päälle voi lyödä ässän — bonusmaa on jälkimmäisen ässän maa

### Seiska (7)
- **Villikortti** — pelaaja saa **valita seuraavan maan vapaasti**
- Jos seuraava pelaaja lyö toisen seiskan toisen päälle, vaadittu maa on sen toisen seiskan maa
- Seiskaa **ei voi lyödä viimeisenä korttina**

## Lappu-sääntö

- Kun pelaajalla on **enää yksi kortti jäljellä**, hänen on sanottava **"Lappu"**
- Jos unohtaa eikä sitä huomata ennen seuraavan vuoron alkua → **sakoksi nostetaan 5 korttia**

## Nostopakan uudelleensekoitus

- Kun nostopakka loppuu ja pelaaja haluaa nostaa, lyöntipakka (paitsi päällimmäinen kortti) **sekoitetaan uudeksi nostopakaksi**
- Viesti lokissa: "Pakka loppui. Lyöntipakka juuri sekoitettiin uudeksi Pakaksi."
- Jos lyöntipakassakin on vain 1 kortti (ei voi sekoittaa) → vuoro päättyy automaattisesti

## Pelin loppu

- Ensimmäinen joka **tyhjentää kätensä** (ei seiskalla eikä ässällä) **voittaa**
- Sijoitukset määräytyvät poistumisajankohdan mukaan

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Lyöntipakan päällimmäinen kortti on **näkyvä kaikille**
- Muiden pelaajien kädet ovat **piilossa** (kortiluku näkyvä)
- Nostopakan koko on **näkyvä kaikille**
- Seiskasta asetettu maa on **näkyvä kaikille**

## Tapahtumaloki

- **Vuorossa [Pelaaja].** — jokaisen uuden vuoron alussa (ei ässäbonusvuorolle)
- **Sinun vuorosi — [ohje]** — ihmispelaajalle hints-moodissa
- **Pakka loppui. Lyöntipakka juuri sekoitettiin uudeksi Pakaksi.** — uudelleensekoituksesta

## AI-strategia

### Tasot
| Taso | Kuvaus |
|---|---|
| `beginner` | Tekee satunnaisia virheitä: unohtaa että 7 käy aina, pelaa ryhmän yksittäisenä |
| `normal` | Kortinlaskuri — muistaa nähtyjen arvojen määrät, ennakoinnin perusteella |
| `hard` (tosilaskija) | Muistaa kasan järjestyksen voitetun pöydän pohjalta, ennakoi täsmäyksiä |
| `supernatural` | Ei virheitä, täysi strategia |

### Ryhmälyöntilogiikka (`aiBestPlay`)

1. **Etsi suurin pelattava ryhmä** (sama arvo, ≥2 korttia; ei 7/A)
2. **Järjestä ryhmä**: yhdistävä maa ensin, uusi päällimmäinen maa viimeisenä
3. **Pelaa ryhmä jos:**
   - Se tyhjentää tai lappuuttaa käden (≤1 kortti jäljellä) — aina
   - Parin oma kortti on ainoa yhteensopiva kortti (ei muuta vaihtoehtoa)
   - **Ryhmä vaihtaa maan sellaiseksi jota on enemmän jäljellä kädessä** ← (maanvaihto-optimointi)
4. **Muuten säästä pari** ja pelaa yksittäinen suoran maan kortti

### Yksittäiskortin valinta
- Jos vastustajalla ≤ 2 korttia → suosi ässää (rangaistus + bonusvuoro)
- 3–5 korttia kädessä → pelaa kortti joka jättää suurimman saman arvon ryhmän
- Suosi korttia jolla ei ole paria kädessä (säästää parin myöhempään ryhmälyöntiin)

### Seiskan maanvalinta (`aiSuit`)
- Valitaan maa jossa on **eniten kortteja kädessä**

## Pelin luonne

Seiska on **UNO-tyyppinen peli** jossa:
- Yksinkertaiset säännöt mutta strateginen syvyys
- Erityiskortit (A, 7) lisäävät käänteitä
- Ryhmälyönti + maanvaihto ovat keskeisiä taktiikoita
- Lappu-sääntö lisää muistielementtejä
