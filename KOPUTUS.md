# Koputus

## Pelitapa

Jokaiselle jaetaan 4 pöytäkorttia neliöksi kuvapuolet alaspäin. Kukin saa katsoa 2 omaa korttiaan — muistettavaksi koko pelin ajan. Tavoite: pienin pistesumma.

Jokaisen vuoron jakajasta seuraava pelaaja nosta pakasta kortin. Voit vaihtaa sen johonkin omista pöytäkorteistasi tai heittää poistopakkaan.

## Vuoron kulku

1. Nosta pakasta kortti
2. Vaihdattavissa: heititä poistopakkaan tai vaihda pöytäkorttiin ja lyö vaihtunut kortti keskelle
3. Jos lyöt kortin keskelle, muut pelaajat voivat lyödä saman vahvuisen omasta pöytäkortistaan (nopeus ratkaisee)
4. Väärästä lyönnistä rangaistuksena menetät lyömäsi kortin ja nostat kaksi rangaistuskorttia (max 4 pöytäkorttia)

## Erityiskortit

- **Jätkä (J)** — saat katsoa yhden omista pöytäkorteistasi
- **Kuningatar (Q)** — saat vaihtaa yhden kortin kenen tahansa pöytäkortin kanssa
- **Kuningas (K)** — saat katsoa oman pöytäkortin ja halutessasi vaihtaa sen yhteen kenen tahansa muun pöytäkorttiin

## Pisteet

- Ässä = 1 piste
- Numerokortit = nimellisarvo (2–10)
- Jätkä = 11, Kuningatar = 12, Kuningas = 13 pistettä

## Pelin loppu

- **Koputus:** Kun uskot voittoonsa, koputa ennen nostokorttinsa pelaamista — muut saavat vielä yhden vuoron
- Kaikki kortit pelattua pelaajien summaa pisteet: pienin summa voittaa
- Tasatilanteessa vähempi kortteja omannut voittaa

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **omat 2 katsomaansa pöytäkorttia** koko pelin ajan (muistissa)
- Muut **2 pöytäkorttia pysyvät piilossa** koko pelin ajan
- Muiden pelaajien kortit ovat **piilossa koko pelin ajan**
- Poistopakka on **näkyvä kaikille** (ylin kortti)
- Nostopakan koko on **näkyvä kaikille**

## AI-strategia

AI:n päätöksenteko:
1. Tarkista omat tunnetut kortit — vertaa noustettuun korttiin
2. Jos nousettu kortti on parempi kuin pahin tunnettu → vaihda siihen
3. Jos nousettu kortti ei ole parempi → mahdollisesti vaihda tuntemattomaan paikkaan (riippuu pelaajamäärästä)
4. Muuten heitä poistopakkaan

AI pyrkii optimoimaan pisteisä ja käyttää muistia strategisesti. Vaihtojen järjestys on paikoista 4, 3, 2, 1 (huonommasta parempaan).

## Pakkakoko ja kierrosten määrä

- **4 pelaajaa**: noin 13–15 kierrosta
- **3 pelaajaa**: noin 17–20 kierrosta
- **2 pelaajaa**: noin 26 kierrosta
- Vähennetään pelaajamäärän mukaan (52 korttia / pelaajamäärä / 4 pöytäkorttia per pelaaja)
