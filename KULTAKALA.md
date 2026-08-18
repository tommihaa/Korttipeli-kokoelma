# Kultakala

## Pelitapa

Jokaiselle jaetaan 1 tuntematon + 5 pöytäkorttia. 

Yrität saada omiin pöytäkortteihisi mahdollisimman pieniä, A = 1 … K = 13.

Nosta vuorollasi kortti pakasta tai poistopakasta. Voit vaihtaa sen paikalle 5 rivin oikeaan päähän, sitten paljastuneen kortin paikan 4 korttiin jne. Tuntematon ei ole vaihdettavissa ja paljastuu vasta pelin lopussa, kun korttien pisteet lasketaan yhteen. Pienin summa voittaa.

## Pelaajakohtainen näkyvyys

- Jokainen pelaaja oppii **omat pöytäkorttinsa** (paikat 1-5) vasta vaihtaessaan kortin kuhunkin paikkaan: alussa nekin ovat häneltä piilossa
- Jokainen pelaaja näkee **oman tuntemattoman kortin** (paikka 0) vasta pelin lopussa
- Muiden pelaajien kortit ovat **piilossa** koko pelin ajan
- Poistopakka on **näkyvä kaikille** (ylin kortti)
- Nostopakan koko on **näkyvä kaikille**

## Pakan koko ja kierrosten määrä

- **4 pelaajaa**: 28 korttia = ~7 kierrosta
- **3 pelaajaa**: 34 korttia = ~11 kierrosta
- **2 pelaajaa**: 40 korttia = ~20 kierrosta

Mitä vähemmän kierroksia, sitä kriittisempiä ovat päätökset.

## AI-strategia

AI voi nähdä vain:
- Omat pöytäkortit (tunnetut paikat)
- Pakan koon (kierrosten määrä)
- Ylin poistopakkakortti

AI **ei voi nähdä**:
- Muiden pelaajien kortteja
- Kenen pistemäärä on paras/huonoin
- Tuntemattomia kortteja

**Päätöslogiikka (nostopäätös poistopakan ylimmästä):**
1. Jos kortti on parempi kuin pahin tunnettu oma kortti → vaihda
2. Muuten: jos kortti on hyvä, vaihda tuntemattomaan paikkaan
3. Muuten heitä poistopakkaan

**Kyvykkyysporras.** Tasot eroavat kyvyiltään eivätkä satunnaisuudelta. Kohta 2 on
tasokohtainen, ja vain Mestari lukee kierrosten määrää:

| Taso | Kohdan 1 kynnys | Kohta 2: milloin tuntemattomaan |
|---|---|---|
| Oppipoika | pahin tunnettu **+3** (ottaa liian herkästi, esim. 9:n 7:n tilalle) | ei täytä tuntemattomia |
| Kisälli | pahin tunnettu | ei täytä tuntemattomia |
| Mestari | pahin tunnettu, ja verrataan kumpi hyöty on suurempi | arvo **≤ 4**, ja **≤ 6** kun kierroksia on enintään kaksi |

Tuntemattoman paikan odotusarvo on **7**, joten Mestarin ehto tarkoittaa vähintään kolmen
pisteen odotettua hyötyä, ja loppupelissä vähintään yhden. **Myöhäispelissä siis
aggressiivisempi**, koska täyttämättä jäänyt tuntematon paikka jää tuntemattomaksi eikä
korjaukselle jää enää vuoroja. Kynnys lukee vain nostopakan kokoa ja botin omaa riviä.

**Vaihtojen järjestys:**
- Vaihdetaan paikkoihin 5, 4, 3, 2, 1 järjestyksessä
- Ei oikaista tuntemattomaan paikkaan
