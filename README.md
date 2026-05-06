# Jako — projektin yhteenveto

> **"Ethnic games to conquer the world"** — suomalaiset, skandinaaviset, baltialaiset ja venäläiset korttipelit ansaitsevat paremman digitaalisen toteutuksen.

## Kokoelman pelit

| Peli | Status | Pelaajat | Erikoisuudet |
|------|--------|----------|--------------|
| **Koputus** | ✅ valmis | 2–6 | Ennakoivaa muistipeliä; J/Q/K erikoiskortit; reaktiopelaaminen |
| **Läpsy** | ✅ valmis | 2–6 | Reaktiopeli; haasteet J/Q/K/A; nopeus ratkaisee |
| **Kultakala** | ✅ valmis | 2–6 | Tuntemattomien hallinta; vaihtoketju oikealta vasemmalle |
| **Maija** | ✅ valmis | 2–6 | Hyökkäys/puolustus; Q♠ on Maija; valttimaa pakan pohjasta |
| **Kasino** | ✅ v1 | 2–4 | Kaappaus + summakaappaus; mökki kun pöytä tyhjenee |
| **Moska** | 🔜 tulossa | 2–6 | Venäläinen Durak; monimutkaisin peli |

## Tekninen perusta

**Stack:** React 18, JSX, ei TypeScriptiä. Yksi tiedosto per peli (~700–1000 riviä). Vue/Tailwind/css-in-js -kombinaatio inline-tyyleillä.

**Yhteinen pohja jokaisessa pelissä:**
- `BACKS`-objekti: Ilves/Karhu/Korppi -korttipakat (vihreä, ruskea, sininen)
- Web Audio API -äänimoottori: `actx()`, `tone()`, `noise()`, `SFX`-kokoelma
- `Card`-komponentti SVG-pakkadesigneillä
- Tapahtumaloki yläkulmassa, tilarivi alhaalla
- Brand-vakioväritys: `#0d2118` tausta, `#c9a84c` kulta, `#f0e6cc` teksti

**Nelivärinen pakka:**
```js
const SUIT_COLOR={
  '♠':'#1a1a2e',  // musta
  '♥':'#b83030',  // punainen
  '♦':'#c05a00',  // oranssi
  '♣':'#0a5c6a',  // teal (vihreällä taustalla luettavampi)
};
```

**Yhteinen tilarivi joka pelissä:**
```
[Pelaajat] ... [BACKS-valitsin: 3 minikorttia] [🔊/🔇] [🔍/🙈]
```

## UX-säännöt (Tommilta opitut)

### Iframe-yhteensopivuus
- **Ei `position:fixed`** — rikkoo iframen sisällä
- **Kiinteä `height`** dynaamisille elementeille (ei `min-height` joka kasvaa)
- **Viestikupla**: `height:68-78px overflow:hidden`
- **Pöytäalueet**: `height:120-200px overflow:hidden`
- **Toimintopainikkeet**: `minHeight:44`
- **Ehdolliset divit korvataan aina renderöityihin** placeholderiin

### Tempo
- AI ei saa tuntua ylivoimaiselta — `setTimeout` 1.8–4.0s riippuen tilanteesta
- Reaktiopelit (Läpsy/Koputus): 5s ihmiselle, 2–4.5s AI:lle
- Kortit pöydällä näkyvät 2.2s ennen siirtymää

### Stale closure -ongelma
React + setTimeout = sudenkuoppa. Käytä **ref-peilejä**:
```js
const phaseRef=useRef('idle');
const gRef=useRef(null);
useEffect(()=>{phaseRef.current=phase;},[phase]);
// timeout-funktioissa: phaseRef.current EIKÄ phase
```

## Tunnetut sudenkuopat

| Virhe | Oikea tapa |
|-------|-----------|
| `phase` suoraan timeoutissa | `phaseRef.current` |
| `splice` + `slice(0,4)` rangaistuksessa | `null`-paikkamerkki + täyttö |
| Ehdollinen render lisää/poistaa divin | Aina renderöity placeholder + kiinteä korkeus |
| Brace-epätasapaino `str_replace`:n jälkeen | Aja `chk.js` aina ennen deployta |
| Indeksi menee `-1` tai `>=length` | Tarkista reunatapaus erikseen |
| Async-ketjut päättyvät kesken | `if(phaseRef.current==='gameover')return;` |

## Skill-kirjasto

Projektin aikana syntyi 5 skilliä jotka opettavat mallin tekemään asioita oikein:

1. **`fi-taivutus`** — suomen kielen taivutus: `korttia(n)` vs `kortin(n)`, sinä/hän-verbit
2. **`toisto-tunnistus`** — automaation ehdottaminen kun toistoa havaitaan
3. **`jako-laaduntarkistus`** — sääntötarkkuus, layout-jitter, stale closures
4. **`anti-slop-manifesti`** — sopimus on moraali, tarkkuus on hyve (Tommin TS-manifesti Reactiin)
5. **`lukittumisen-ehkäisy`** — tila-automaatin reunatapausten tarkistus

## Pelimekaaniset säännöt

### Koputus
- 4 pöytäkorttia, kurkkaa 2 alkuun
- Vuorolla: nosta pakasta tai poistopakasta → vaihda pöytäkorttiin tai lyö poistopakkaan
- Kun kortti osuu poistopakkaan, **5s reaktioikkuna** — kaikki voi lyödä saman vahvuisen pöytäkortin
- Erityiskortit (vain kaatopakkaan): J=kurkkaa oma, Q=vaihda sokkona, K=kurkkaa+vaihda
- Koputus → viimeinen kierros muille
- Pienin pistesumma voittaa

### Läpsy
- Vuorottainen kortin kääntö pinosta pöytäkasaan
- Täsmäys (sama arvo peräkkäin) → kuka tahansa läpsää, oikein → koko kasa
- Haaste J=1, Q=2, K=3, A=4 — vain seuraava pelaaja flippaa, vastaus erikoiskortilla **ketjuttaa** haasteen
- Hieman hitaampi ihminen ei rangaistu (`recentMatch` 800ms grace)

### Kultakala
- 1 tuntematon (kultainen reunus, paljastetaan vasta lopussa) + 5 pöytäkorttia jonossa
- Vuorolla: nosta pakasta tai poistopakasta → vaihda jonon viimeiseen → ulos tullut kortti voi jatkaa vasemmalle
- Vain `swapIdx`-paikka klikattavissa kerrallaan
- Paikalla 1 vaihto on pakollinen
- Kun kaikki 5 vaihdettu → paikka 1:n kortti poistopakkaan, vuoro ohi
- Tasatilanne sallittu (ei noppia — opetus ennen kaikkea)

### Maija
- Patakuningatar Q♠ = Maija, ei kelpaa kaatokortiksi
- Hyökkääjä lyö 1+ saman maan kortin (auto-valinta klikatessa)
- Puolustaja näkee kaikki, valitsee oman kortin → vihreät pöytäkortit korostuvat → klikkaa kaataaksesi
- `canBeat` tarkistaa molemmat suunnat: Maijaan ei voi kaataa myöskään hyökkäyskorttina
- Kaadetut parit poistopakkaan, kaatamattomat puolustajan käteen
- Osittainen kaato kannattaa
- Ensimmäinen 0 kortilla = sijoitus 1, viimeiselle jää Maija
- Valttimaa pakan pohjasta (poikittain näkyvissä, ei voi olla pata)

### Kasino
- Pöydässä 4 korttia + 4 per pelaaja
- **Pöytäkortit ensin**, sitten käsikortti kaappaa
- Suora: käsi=pöytä; Summa: pöytäkorttien summa = käsi
- **Erikoisarvot** (käsi vs pöytä):
  - 2♠ = 15 kädessä / 2 pöydässä
  - 10♦ = 16 kädessä / 10 pöydässä
  - A = 14 kädessä / 1 pöydässä
- Tyhjä käsikortti pöytään → "jätä"
- **Mökki** = kaikki pöytäkortit kerralla → +1p
- Pisteet: eniten kortteja=1p, eniten patoja=1p, 10♦=2p, 2♠=1p, mökki=1p
- **Ensimmäinen 16 pisteeseen voittaa**
- Rakentaminen vain 2 pelaajan pelissä (v2:een)

### Moska (tulossa)
- Venäläinen Durak
- Hyökkäys + puolustus, mutta useampi hyökkääjä voi lisätä kortteja
- Valttimaa, viimeiselle jää "Durak/Moska"

## Kehitysprosessi

**Vibekoodausta sen parempaa lajiketta** — käyttäjä on pelisuunnittelija, malli on toteuttaja. Sopimus määritellään yhdessä, malli toteuttaa, käyttäjä testaa, malli korjaa.

**Civilization-efekti**: ensimmäinen peli avasi teknologiapuun, seuraavat tulivat nopeammin valmiilla pohjalla. BACKS, äänimoottori, Card-komponentti — kaikki on copy-pastettavissa peliin → vain logiikka muuttuu.

**Toistuva korjaussilmukka**:
1. Käyttäjä havaitsee bugin/parannustarpeen
2. Malli korjaa
3. Jos sama virhe toistuu → tehdään skill estämään se
4. `chk.js` tarkistaa brace-tasapainon ennen jokaista deployta

## Brändäys

- Otsikko: "The Tommi Collection — learn multiplayer card games"
- Dealer: Tommi
- Termit: poistopakka (ei kaatopakka), pöytäkortti, kaataja+hyökkäys
- Globaali: "Pakan loputtua pelataan käsikortit loppuun"
- Mobiili pystyssä, ei vaakaa
- Ranking: localStorage, ei backendia
- Palaute: Google Form → Sheets, lahjoitus opetustilan loppuun

## Seuraavat askeleet

1. **Kasino-rakentaminen** (v2)
2. **Moska** — viimeinen peli
3. **Yhdistäminen `jako_v3.jsx`-päätiedostoon** valikolla pelivalintaan
4. **Skill-kirjaston siirto** Claude Codeen
5. **Testailut ihmisten kanssa** — ihminen vs ihminen samalla laitteella?
6. **Ranking järjestelmä** localStorageen
7. **Kielikäännös** — englanti, ehkä venäjä Moskaa varten

## Tiedostorakenne Claude Codessa

```
jako/
├── README.md              ← tämä yhteenveto
├── package.json
├── src/
│   ├── games/
│   │   ├── Koputus.jsx
│   │   ├── Lapsy.jsx
│   │   ├── Kultakala.jsx
│   │   ├── Maija.jsx
│   │   ├── Kasino.jsx
│   │   └── Moska.jsx       ← tulossa
│   ├── shared/
│   │   ├── Card.jsx        ← yhteinen korttikomponentti
│   │   ├── BACKS.jsx       ← Ilves/Karhu/Korppi
│   │   ├── audio.js        ← SFX-kokoelma
│   │   ├── colors.js       ← C, SUIT_COLOR
│   │   └── helpers.js      ← korttia, kortin, lbl, isRed
│   └── App.jsx             ← peli-valikko
├── skills/
│   ├── fi-taivutus.md
│   ├── toisto-tunnistus.md
│   ├── jako-laaduntarkistus.md
│   ├── anti-slop-manifesti.md
│   └── lukittumisen-ehkaisy.md
└── tools/
    └── chk.js              ← brace-tarkistus
```
