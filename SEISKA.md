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
4. Jos ei pysty lyödä → **on pakko nostaa pakasta, enintään 3 korttia** (ei vapaaehtoista passia)
5. Nostetun pelattavan kortin saa joko lyödä tai jättää lyömättä ja nostaa lisää (jos nostoja jäljellä); jos kolmannenkaan noston jälkeen mikään ei käy → **vuoro siirtyy automaattisesti**
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
- Jos unohtaa eikä sitä huomata ennen seuraavan vuoron alkua → **sakoksi nostetaan 3 korttia**
  - Korttipelioppaiden tavanomainen sakko on 5; tässä käytetään armollisempaa **3:a** tietoisena pehmennyksenä (`applyLappu`, `deck.slice(0, 3)`).

### Ihmisen ja botin epäsymmetria (tietoinen design)

Lappu-velvollisuus toteutuu eri tavoin ihmiselle ja botille — tämä on **tietoinen valinta**, ei bugi:

- **Ihminen**: putoaa yhteen korttiin → saa **4 sekunnin ikkunan**, jonka aikana on klikattava **"LAPPU!"**-nappia. Jos ei ehdi → sakko. Reaktiotaitomekaniikka kuten oikeassa UNO:ssa.
- **Botti**: deterministinen. **`hard` (Mestari) -taso ja kaikki allBots-pelit sanovat Lapun aina automaattisesti** (ei koskaan sakkoa). `beginner`/`normal` unohtaa `aiShouldFumble`-todennäköisyydellä.

**Seuraus, joka on syytä tiedostaa:** ihmisen lappu-riski **ei skaalaudu valitun vaikeustason mukaan**. Vaikka pelaaja valitsee Oppipoika-tason, ihminen saa silti täyden 4 s reaktiotestin — kun taas botin erehtyväisyys nimenomaan kytkeytyy tasoon. "Helpoin taso" ei siis helpota ihmisen Lappua lainkaan. Tämä on sama epäsymmetrian laji kuin nostosäännössä (vuoron kulku, kohta 4–5): sääntö on botille pakotettu/virheetön, ihmiselle elävä riski.

> Ässä-bonushaarassa Lapun ajoitus eroaa hieman: botti ilmoittaa Lapun heti, ihminen lykkää sen ässän bonusvuoron ratkaisuun (`humanSkipAceBonus` / `humanChooseSuit`). Molemmat toimivat oikein.

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

Kolme tasoa (UI-nimet: **Oppipoika / Kisälli / Mestari**):

| Taso | Kuvaus |
|---|---|
| `beginner` (Oppipoika) | Tekee satunnaisia virheitä: unohtaa että 7 käy aina, pelaa ryhmän yksittäisenä |
| `normal` (Kisälli) | Kortinlaskuri — muistaa nähtyjen arvojen määrät, ennakoinnin perusteella |
| `hard` (Mestari) | Täysi strategia ilman virheitä + **muistaa pelatut kortit** (kasan järjestyksen voitetun pöydän pohjalta) ja ennakoi täsmäykset. Vastaa aiempaa "Yliluonnollinen"-logiikkaa, joka yhdistettiin tähän. |

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
