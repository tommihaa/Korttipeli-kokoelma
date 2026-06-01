# Paskahousu

## Pelitapa

Jokaiselle jaetaan 6 käsikorttia. Loput muodostavat nostopakan.

Tavoite: pääse eroon käsikorteista — viimeinen on **Paskahousu**.

## Korttiarvot

| Kortti | Arvo | Huomio |
|---|---|---|
| ♥2 / ♦2 | 2 | Pienin — käy vain tyhjälle pöydälle |
| 3 | 3 | — |
| 4–9 | 4–9 | Normaali alue |
| 10 | — | **Kaataja** (arvo ≤ 9 päällä) tai rangaistus tyhjälle |
| J | 11 | Kuvakortti — ei alle seiskan (7) päälle |
| Q | 12 | Kuvakortti — ei alle seiskan (7) päälle |
| K | 13 | Kuvakortti — ei alle seiskan (7) päälle |
| A | — | **Kaataja** (kuvakortin päälle) tai rangaistus tyhjälle |
| ♠2 / ♣2 | 15 | Suurin — vain toinen musta kakkonen päälle |

## Vuoron kulku

1. Pelaaja jolla on **pienin kortti** aloittaa
2. Lyö yksi tai useampi **samanarvoinen** kortti kasaan
3. Kortin arvo pitää olla **yhtä suuri tai suurempi** kuin päällimmäinen
4. **Kuvakorttia** ei saa lyödä alle 7 olevan kortin päälle
5. Tyhjälle pöydälle käyvät kaikki kortit (paitsi 10 ja A → rangaistus)
6. Jos ei voi pelata → **nosta pakasta** (sokkona) tai **nosta kasa** käteen
7. Pelattuaan pelaaja täydentää kätensä 6 kortiksi nostopakasta

## Sokkopakasta nosto

- Nosta pakan päällimmäinen kortti paljastamatta ensin
- Jos kortti käy kasaan → **lyödään kasaan** (voi kaataa kasan!)
- Jos ei käy → **otetaan koko kasa käteen** (rangaistus)

## Kaato (kasan tyhjennys)

Kasa tyhjennetään pelistä ja kaataja jatkaa:

| Tilanne | Ehto |
|---|---|
| **10** kaataa | Päällimmäinen arvo ≤ 9 (3–9 tai ♥/♦2) |
| **A** kaataa | Päällimmäinen on kuvakortti (J/Q/K) |
| **4 samaa** | Neljä samanarvoista päällä (myös eri vuoroilta kertyneinä) |

Kaataja saa jatkaa (uusi vuoro). Kasa menee sivuun — ei sekoiteta nostopakkaan.

## Rangaistuskortti tyhjälle pöydälle

- 10 tai A tyhjälle pöydälle → **seuraava pelaaja nostaa kortin ja menettää vuoronsa**

## Vaihto-mahdollisuus

Kun pelaaja täydentää kätensä nostopakasta ja nostaa **paremman kortin kuin pelasi**:

- 3 sekuntia aikaa vaihtaa: lyöty kortti takaisin käteen, uusi kortti kasaan
- Ehto: nostettu kortti käy kasaan ja on **arvo pienempi** tai erityiskortti (musta 2, tai kaataa kasan)
- Vaihto voi myös kaataa kasan — silloin kaataja jatkaa
- AI tekee vaihdon aina kun se on edullinen

## Pakka tyhjä

Kun nostopakka loppuu:
- Viesti lokissa: `📦 Pakka on tyhjä — peli jatkuu käsikortein.`
- Kortteja ei enää täydennetä käteen
- Kasattuja kortteja ei sekoiteta uudelleen (kaadettua kasaa ei palauteta)

## Pelin loppu

- Ensimmäinen joka tyhjentää kätensä voittaa
- Sijoitukset määräytyvät poistumisajankohdan mukaan
- Viimeinen jäljelle jäänyt on **Paskahousu**

## Pelaajien näkyvyys

- Jokainen näkee **oman kätensä** koko ajan
- Kasan **päällimmäinen kortti** on kaikkien nähtävissä
- Muiden kortit ovat **piilossa** (kortiluku näkyy; Cheat Mode paljastaa)
- Nostopakan koko on **näkyvissä**

## Tapahtumaloki

- **Vuorossa [Pelaaja].** — jokaisen uuden vuoron alussa
- **📦 Pakka on tyhjä — peli jatkuu käsikortein.** — nostopakka loppui
- **⏱ Pakka tyhjä — Yhtäkkinen kuolema! 2:30 laskuri käy.** — Mestari (`hard`) + 2 pelaajaa

## Yhtäkkinen kuolema (Sudden Death)

**Ehto**: Mestari-tekoäly (`hard`) + tasan 2 aktiivista pelaajaa + pakka tyhjä

- 2:30 (150 s) laskuri käynnistyy
- Ajan loputtua: **vähemmän kortteja kädessä voittaa**
- Laskuri näytetään punaisena alle 30 s:n kohdalla

## AI-strategia

### Tasot

Kolme tasoa (UI-nimet: **Oppipoika / Kisälli / Mestari**):

| Taso | Kuvaus |
|---|---|
| `beginner` (Oppipoika) | Pelaa 10/A turhaan, pelaa yhden kerralla vaikka useampi kävisi |
| `normal` (Kisälli) | Pelaa pienimmät kortit, ryhmittää samanarvoiset, säästää 10/A |
| `hard` (Mestari) | Proaktiivinen 10/A-kaato kasan rakenteen perusteella **+ täydellinen informaatio loppupelissä** (täysi strategia). Vastaa aiempaa "Yliluonnollinen"-logiikkaa, joka yhdistettiin tähän. |

### Normaali peli (pakka ei tyhjä)

1. **Pelaa pienin arvo** (säästää korkeat kortit)
2. **Pelaa kaikki samanarvoiset yhdellä kertaa** (ryhmälyönti)
3. **Säästä 10 ja A** — käytä vain jos ei muuta vaihtoehtoa
4. 10 ja A pelataan yksi kerrallaan (yksikin tyhjentää kasan)

### Proaktiivinen kaato (Mestari, `hard`)

Jos kasassa ≥ 3 eri arvoa, arvioidaan käden rakenne:

- **10-kaato**: lyödään kun top ≤ 9 ja kädessä on pieniä + kuvakortteja
- **A-kaato**: lyödään kun top on kuvakortti ja kädessä on pieniä
- Vaatii ≥ 1 pienen kortin (arvo ≤ 6) kädessä

### Endgame-strategia (pakka tyhjä)

**Prioriteettijärjestys**:

1. **Punainen 2** (♥2/♦2, arvo 2) tyhjälle pöydälle — muuten jumissa
2. **Täydennä nelonen** (4 samaa) → välitön kaato
3. **Kuvakortti** (J < Q < K) — pelaa pienin ensin, suurempi joustavampi myöhemmin
4. **Normaali kortti** — pienin arvo ensin
5. **Säästettävät** (9, 10, A, ♠2/♣2) — pelaa vain kun muuta ei ole
   - Järjestys: 9 ensin → 10/A → musta kakkonen viimeiseksi

### Täydellinen informaatio (Mestari, `hard`)

**Ehto**: Mestari (`hard`) + 2 aktiivista pelaajaa + pakka tyhjä

- Vastustajan käsi lasketaan:
  `kaikki 52 korttia − oma käsi − kasa − poistetut kortit`
- **Prioriteetti 1**: pelaa kortti jota vastustaja ei voi lyödä → pakottaa nostamaan kasan
- **Prioriteetti 2**: kaikki kortit lyötävissä → pelaa se joka vaatii vastustajalta korkeimman kortin

## Pelin luonne

Paskahousu on **laituripeli** jossa:
- Yksinkertaiset säännöt mutta kasan rakenteen analysointi tärkeää
- 10/A ovat taktisia aseita — oikea hetki ratkaisee
- Neljän samanarvoisen kerääminen tuo dramaattisen kaaton
- Vaihto-mekanismi palkitsee onnellisen noston
- Loppupelissä (pakka tyhjä) strategia muuttuu täysin: punainen 2 on vaarallinen, kova kakkonen vahvin
