# Seiska

## Pelitapa

Jokaiselle jaetaan 7 käsikorttia. Loput muodostavat nostopakan — pakan päällimmäinen käännetään näkyviin lyöntipakan pohjaksi.

Tavoite: pääse kortit käsistä ensimmäisenä. Voittaa korteista pikimmiten eroon päässyt.

## Vuoron kulku

1. Jakajasta seuraava aloittaa — myötäpäivään
2. Pelaaja lyö **yhden tai useamman** kortin lyöntipakan päälle
3. Kortin on **täsmättävä** maalta **tai** arvoltaan päällimmäisen kanssa:
   - **Sama maa**: yksi kortti kerrallaan
   - **Sama arvo**: useamman saman arvoisen voi lyödä **yhdellä kertaa**
4. Jos ei pysty lyödä → nosta pakasta **enintään 3 korttia**
5. Nostamisen jälkeen jos silti ei sovi → sano "Ohi" ja vuoro siirtyy
6. Jos nostopakka loppuu → lyöntipakan päällimmäinen jätetään paikalleen, muista sekoitetaan uusi nostopakka

## Erityiskortit

### Ässä (A)
- Lyödessä ässää kaikki **muut pelaajat nostavat pakasta yhden kortin**
- Ässää ei voi lyödä toisen ässän päälle

### Seiska (7)
- **Villikortti** — pelaaja saa **valita seuraavan maan vapaasti**
- Seiskaa **ei voi lyödä toisen seiskan päälle**
- **Rajoitus**: seiskaa **ei voi lyödä viimeisenä kortilla** — on lyötävä ennen sitä

## Lappu-sääntö

- Kun pelaajalla on **enää yksi kortti jäljellä**, hänen on **sanottava "Lappu"**
- Jos unohtaa eikä sitä huomata ennen **seuraavan vuoron** alkua → **sakoksi nostetaan 5 korttia**

## Pisteet (valinnainen)

Seiskasta voidaan pelata **pisteillä useamman erän yli**:
- Käteenjääneet kortit lisätään **miinuspisteisiin**:
  - Ässä = −14 pistettä
  - Seiska = −25 pistettä
  - Muut kortit = nimellisarvo (2–13)
- **Häviää**: ensimmäinen pelaaja joka ylittää −100 (tai sovitun rajan)

## Pelin loppu

- Ensimmäinen pelaaja joka **tyhjentää kätensä** (ei seiskalla!) **voittaa**
- Jos seiskaa jää käteen, se on lyötävä ennen viimeistä korttia

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Lyöntipakan päällimmäinen kortti on **näkyvä kaikille**
- Muiden pelaajien kädet ovat **piilossa** (kortiluku näkyvä)
- Nostopakan koko on **näkyvä kaikille**
- Seiskasta asetettu maa on **näkyvä kaikille**

## AI-strategia

### AI:n pelaamislogiikka
1. **Priorisoi**: sama arvo useampana — ei tarvitse nostaa
2. **Seiskat viimeisenä**: älä lyö seiskaa viimeisenä korttina
3. **Ässien käyttö**: varoksi — kaikki muut nostavat kortin

### AI:n seiskan logiikka
- Valitse maa strategisesti:
  - Suo pelaajille visuaalisia virheitä
  - Pelaa maa jossa sinulla on vähän kortteja

### AI:n nostamislogiikka
- Nosta 3 korttia tai kunnes kelpaa
- Passu jos 3 kortin jälkeen ei kelpaa

## Pelin luonne

Seiska on **UNO-tyyppinen peli** jossa:
- Yksinkertainen säännöt mutta strateginen ja nopea
- Erityiskortit (A, 7) lisäävät käänteitä
- Lappu-sääntö lisää muistiin liittyvää elementtiä
- Pisteversio (valinnainen) tekee pitkäaikaisesta pelaamisesta palkitsevaa

Nopeus ja muisti ovat tärkeämpiä kuin syvä strategia.
