# P3 — Pass-and-Play

## Visio

2–4 ihmispelaajaa vuorottelee yhdellä ruudulla (tabletti/puhelin). Tavoite: madaltaa kynnystä kokeilla pelejä yhdessä, oppia kortinpelin logiikkaa reaaliajassa ilman erillistä laitetta.

## Päätetty — kaikki avoimet kysymykset ratkaistu (2026-05-24)

### Pelaajamääritys

- **4 riviä** aina näkyvillä — rasti = pelaaja mukana pelissä
- Kaikki rivit tasa-arvoisia, Hero ei erikoisasemassa
- Jokaisella rivillä: **Ihminen / Botti** -valinta + **nimi**
- Ihminen kirjoittaa nimensä, Botti saa automaattinimen (Fortuna, Loki, Tyche...)
- **Bottien keskinäinen taisto mahdollinen** — kaikki rivit botteja → katsomotila

```
[✓] [ Ihminen | Botti ]  [_Matti___________]
[✓] [ Ihminen | Botti ]  [_Liisa___________]
[✓] [ Ihminen | Botti ]  [_________________]  ← botti, autonimi
[ ] [ Ihminen | Botti ]  [_________________]  ← ei mukana
```

### Peittokuva (HandoffScreen)

Kun vuoro siirtyy ihmiseltä toiselle ihmiselle, ruutu peitetään kokonaan:

```
┌─────────────────────────┐
│                         │
│   🃏  Liisa             │
│   Sinun vuorosi         │
│                         │
│   [ Paina aloittaaksesi ]│
│                         │
└─────────────────────────┘
```

- Edellisen pelaajan kortit täysin piilossa
- Seuraava pelaaja painaa → kortit näkyvät
- **Ei peruutusta** vahingollisesta napauksesta — pelaajien opittava. Pelin oppiminen tärkeämpää kuin yhden edun saaminen.
- Bottivuoroilla ei peittokuvaa — botti pelaa itsekseen

### Muut päätökset

- **Läpsy** ei kuulu P3:een — reaktiopeli ei toimi luontevasti yhdellä laitteella
- **Cheat Mode**: jos päällä, päällä kaikille — globaali asetus, ei erikoiskäsittelyä
- **Asetukset**: pelaajamääritys tehdään pelin omassa aloitusnäytössä ennen pelin alkua

## Pelit — soveltuvuus

| Peli | Pass-and-play | Huomio |
|---|---|---|
| Läpsy | ❌ Ei | Reaktiopeli — ei sovi yhdelle laitteelle |
| Seiska | ✅ Helppo | Yksinkertaisin — pilotoidaan tänne ensin |
| Ristiseiska | ✅ Helppo | Rivit näkyvissä kaikille, käsi piiloon |
| Paskahousu | ✅ Hyvä | Selkeä luovutuspiste |
| Koputus | ✅ Sopii | Muistipeli — peittokuva kriittinen |
| Kultakala | ✅ Sopii | Sama kuin Koputus |
| Maija | ✅ Hyvä | Hyökkäys/puolustusasetelma selkeä |
| Kasino | ✅ Hyvä | Pöytä näkyy kaikille, käsi piiloon |
| Moska | ⚠️ Myöhemmin | Kompleksi rakenne |

## Tekninen toteutus

### Jaettu komponentti: `HandoffScreen.jsx`
```jsx
// src/shared/HandoffScreen.jsx
export default function HandoffScreen({ playerName, onReady }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0d1f17',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 24 }}>
      <div style={{ fontSize: 48 }}>🃏</div>
      <div style={{ fontSize: 24, color: '#c9a84c' }}>{playerName}</div>
      <div style={{ fontSize: 16, color: '#8aaa90' }}>Sinun vuorosi</div>
      <button onClick={onReady}>Aloita vuoro →</button>
    </div>
  );
}
```

### Pelaajamääritys-komponentti: `PlayerSetup.jsx`
```jsx
// src/shared/PlayerSetup.jsx
// 4 riviä: checkbox (mukana) + toggle (ihminen/botti) + nimi
// Palauttaa: [{ name, isHuman, active }, ...]
```

### Pelien muutokset
1. Aloitusnäyttöön `PlayerSetup`-komponentti
2. `players`-rakenne saa `isHuman`-kentän
3. Peittokuva näytetään kun seuraava pelaaja on ihminen
4. Botti-logiikka ohitetaan kun `isHuman = true`

### Järjestys
1. `HandoffScreen.jsx` — jaettu komponentti
2. `PlayerSetup.jsx` — jaettu komponentti
3. **Pilotti: Seiska** (yksinkertaisin vuorojärjestys)
4. Laajennus peleihin yksi kerrallaan (Ristiseiska → Paskahousu → ...)
5. Moska viimeisenä
