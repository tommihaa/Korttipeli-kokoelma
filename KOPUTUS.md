# Koputus

## Pelitapa

Jokaiselle jaetaan 4 pöytäkorttia neliöksi kuvapuolet alaspäin. Pelin alussa kukin saa katsoa 2 omaa korttiaan — muistettavaksi koko pelin ajan. Tavoite: pienin pistesumma.

Jokaisen vuoron jakajasta seuraava pelaaja nostaa pakasta kortin. Voit vaihtaa sen johonkin omista pöytäkorteistasi tai heittää poistopakkaan.

## Vuoron kulku

1. Nosta nostopakasta kortti, poistopakastakin voi nostaa kun siellä on kortteja
2. Vaihdettavissa: heittä poistopakkaan tai vaihda pöytäkorttiin ja lyö vaihtunut kortti keskelle
3. Jos lyöt kortin keskelle, kaikki pelaajat voivat lyödä saman vahvuisen omasta pöytäkortistaan (nopeus ratkaisee)
4. Väärästä lyönnistä rangaistuksena menetät lyömäsi kortin ja nostat kaksi rangaistuskorttia (max 4 pöytäkorttia)

## Erityiskortit

- **Jätkä (J)** — saat katsoa yhden omista pöytäkorteistasi
- **Kuningatar (Q)** — saat vaihtaa yhden kortin kenen tahansa pelaajan minkä tahansa pöytäkortin kanssa
- **Kuningas (K)** — saat katsoa oman pöytäkortin, yhden jonkun muun pelaajan pöytäkortin ja halutessasi tehdä vaihdon

## Pistelasku lopussa

- Ässä = 1 piste
- Numerokortit = nimellisarvo (2–10)
- Jätkä = 11, Kuningatar = 12, Kuningas = 13 pistettä

## Pelin loppu

- **Koputus:** Kun uskot voittosi, koputa ennen nostokorttisi pelaamista — muut saavat vielä yhden vuoron
- Koputuksen tapahduttua tai kun kaikki kortit on pelattu summataan pelaajien pisteet: pienin summa voittaa
- Tasatilanteessa vähempi kortteja omannut voittaa

## Pelaajien näkyvyys

- Jokainen pelaaja muistaa  **omat 2 katsomaansa pöytäkorttia** koko pelin ajan (muistissa)
- Muut **2 pöytäkorttia pysyvät piilossa** koko pelin ajan, mutta niitä voi silti vaihtaa jos vetää pakasta J tai K, voi vaihtaa myös sokkona, jos pitää nostokortistaan
- Muiden pelaajien kortit ovat **piilossa koko pelin ajan**
- Poistopakka on **näkyvä kaikille** (ylin kortti)
- Nostopakan koko on **näkyvä kaikille**

## AI-strategia

AI:n päätöksenteko:
1. Tarkista omat tunnetut kortit — vertaa nostettuun korttiin
2. Jos nostettu kortti on parempi kuin pahin tunnettu → vaihda siihen
3. Jos nostettu kortti ei ole parempi → mahdollisesti vaihda tuntemattomaan paikkaan (riippuu pelaajamäärästä)
4. Jos on sama kuin joku omista, niin heitä poistopakkaan. Ja viiveen salliessa täsmäävä pöytäkortti myös.
5. Muuten heitä poistopakkaan

AI pyrkii optimoimaan pisteissä ja käyttää muistia strategisesti. Paikoilla ei ole väliä, mutta omien pöytäkorttien määrän minimointi ja summan minimointi on tärkeää.

## Pakkakoko ja kierrosten määrä

- **4 pelaajaa**: noin 13–15 kierrosta
- **3 pelaajaa**: noin 17–20 kierrosta
- **2 pelaajaa**: noin 26 kierrosta
- Vähennetään pelaajamäärän mukaan (52 korttia / pelaajamäärä / 4 pöytäkorttia per pelaaja)
