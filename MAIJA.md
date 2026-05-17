# Maija

## Pelitapa

Jokaiselle jaetaan 5 käsikorttia. Valtti määräytyy pakan pohjimmaisesta kortista (näkyvissä pakan alle). Pata ei voi olla valtti — näin käydessä uusi yritys.

Tavoite: Pakan ehdyttyä päästä korteistaan eroon ensimmäisenä.

## Vuoron kulku

### Hyökkääjän vuoro
1. Hyökkääjä lyö pöytään yhden tai useamman **saman maan** kortin
2. Hyökkääjä **täydentää kätensä** pakasta viiteen (ei saa lyödä lisää tällä vuorolla)

### Puolustajan vuoro
1. Puolustaja **kaataa** jokaisen kortin saman maan suuremmalla kortilla **tai** valttimaan kortilla
2. Jos puolustaja ei kaada kaikkia → **nostaa kaatamatta jääneet käteensä** ja vuoro siirtyy
3. Jos kaikki kortit kaadetaan → puolustaja täydentää kätensä ja **hyökkää seuraavalla vuorolla**

### Spesiaalit säännöt
- **Patakuningatar (Maija)** — ei kelpaa kaatokortiksi, vaan **on aina nostettava** käteen
- Täysin onnistuneesta kaadosta → kaatanut saa jatkaa hyökkääjänä

## Pisteet

Käytetään **pelinumeroarvojen vertailua** (A=14, 2=2, 3=3, ..., K=13):
- Sama maa: verrataan arvoja — suurempi voittaa
- Valtti: voittaa minkä tahansa muun maan kortin

## Pelin loppu

1. Nostopakan tyhjennettyä pelaajat jatkavat käsissään olevilla korteilla
2. **Korteista pikimmiten eroon päässyt voittaa**
3. Muut taistelevat sijoituksista
4. **Patakuningatar (Maija) viimeinen omistaja hävisi pelin** — "lopussa istuu Maija"

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Pöydän kortit ovat **näkyvät kaikille** (hyökkäys- ja puolustuskortti)
- Muiden pelaajien korttien määrä on **näkyvä** mutta kortit **piilossa**
- Valttimaa on **näkyvä kaikille** (pakan pohjalla)
- Nostopakan koko on **näkyvä kaikille**

## AI-strategia

AI:n hyökkäys:
1. Lyö useamman saman maan kortin (strateginen valinta — Maijaa ei hidasteta)
2. Priorisoi pelaamalla hyökkäykseen sen maan kortit millä paljon matalaa arvoa 

AI:n puolustus:
1. Kaataa pienimmän voittavalla kortilla (säästää kortteja)
2. Suosii samaa maata — käyttää valttia vain välttämättäessä
3. Ei kaada Maijaa (nostaa käteen)

AI:n pakan täydentäminen:
1. Pyrkii saavuttamaan 5 kortin käden
2. Ajattelee seuraavan hyökkäyksen strategiaa

## Pakka- ja kierroskoko

- **4 pelaajaa**: noin 10–13 kierrosta
- **3 pelaajaa**: noin 13–17 kierrosta
- **2 pelaajaa**: noin 26 kierrosta
- Riippuu siitä, kuinka nopeasti pelaajat pääsevät korteista eroon

## Pelin luonne

Maija on **hyökkäys/puolustus-peli** jossa strategia ja pelilukutaito ratkaisevat. Maija-kortin pelaaminen peliin luo dramaattisen hetken, sen nostaja menettää vuoronsa — viimeinen pelaaja, joka joutuu nostamaan sen, häviää.
