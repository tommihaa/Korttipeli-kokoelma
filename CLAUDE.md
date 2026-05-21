# Jako – Finnish Card Game Collection

## Project
Mobile-responsive card game app (React/JSX + Vite). Dark green (#1a3a2a) + gold (#c9a84c) aesthetic.
Structure: `src/App.jsx` (entry), `src/games/*.jsx` (9 games), `src/shared/` (Card, FanStack, colors, helpers, audio).
Reference docs: `jako_projekti.md` (general), pelikohtaiset säännöt: `KOPUTUS.md`, `LAEPSY.md`, `KULTAKALA.md`, `MAIJA.md`, `KASINO.md`, `MOSKA.md`, `SEISKA.md`, `RISTISEISKA.md`, `PASKAHOUSU.md`. Dev server: `http://localhost:5173/`.
Repo: `https://github.com/tommihaa/Korttipeli-kokoelma`
Responsive: Portrait phone (~375px) + tablet landscape (~768px+)

## Navigation
Valikko (päävalikko) → Peli (suoraan, ei välinäyttöä)
- `playerCount` valitaan Asetukset-paneelin Pelaajat-osiossa [2][3][4]
- Ristiseiska: `Math.max(playerCount, game.minPlayers)` — varmistaa min 3 pelaajaa

## Global settings (App.jsx → props to all games)
| Prop | Default | Selitys |
|---|---|---|
| `showLog` | window.innerWidth≥600 | Tapahtumaloki auki |
| `soundOn` | true | Äänet |
| `seeAll` | false | Cheat Mode — Hero näkee kaikki kortit |
| `showCounts` | true | Korttimäärät näkyvillä |
| `showPlayHints` | true | Pelattavat kortit korostettu |
| `teachMode` | false | Strategiatippejä (poistettu asetusvalikosta, prop silti olemassa) |
| `showLastPlay` | true | Kelluva viimeisin siirto -indikaattori |

## Component signature (kaikki 9 peliä)
```jsx
export default function PelinNimi({ onResult, hints, soundOn: initSoundOn, seeAll: initSeeAll,
  showCounts, showPlayHints, teachMode, showLastPlay, isMobile, playerCount, playerNames }) {}
```
Huom: `playerCount` välitetään propina, pelit eivät vielä kaikki hyödynnä sitä (wiring kesken).

## Session start
At the start of every session run `npm run dev` in the background so the dev server is available at http://localhost:5173/ for preview verification during development.

## Deploy
Production deploy: `npm run build && npx vercel --prod`
Live URL: https://tommi-jako52.vercel.app

## Games & Terminology
Nine games with unified Finnish UI terms:

| Peli | Tyyppi | Taso | Pelaajat |
|---|---|---|---|
| Koputus | Muistipeli | Keskitaso | 2-4 |
| Läpsy | Reaktiopeli | Helppo | 2-4 |
| Kultakala | Muistipeli | Helppo | 2-4 |
| Maija | Kaatopeli | Keskitaso | 2-4 |
| Kasino | Kaappaaminen | Keskitaso | 2-4 |
| Moska | Hyökkäily/puolustus | Vaativa | 2-4 |
| Seiska | UNO-tyyppinen | Helppo | 2-4 | <!-- UI shows "7" as icon, code name: Seiska -->
| Ristiseiska | Kiusantekopeli | Helppo | 3-4 |
| Paskahousu | Laituripeli | Keskitaso | 2-4 |

Key terms: kortti, käsi, pino, nosto, lasku, pistelasku, kierros, vuoro, jako

## Pakkatyypit

Kolme tyyppiä — näkyy päävalikossa pelikorteissa:

| Tyyppi | Koodi | Pelit |
|---|---|---|
| Täysin jaettu | `jaettu` | Läpsy, Ristiseiska |
| Täydennetty | `taydennetty` | Kultakala, Maija, Moska, Paskahousu, Koputus, Kasino |
| Kierrätetty | `kierratetty` | Seiska |

Erikoistapaukset (silti yllä olevissa luokissa):
- **Koputus**: Koputus käynnistää viimeisen kierroksen — nostopakkaa voi jäädä huomiotta
- **Seiska**: Voittaja pääsee korteistaan eroon ensin — nostopakkaa voi jäädä huomiotta
- **Kasino**: 16 pistettä ensin saanut voittaa; pisteet lasketaan nostopakan ehdyttyä pelatun kierroksen päätyttyä; tasapeli on mahdollinen

## Modes
- **Opetustila** – `hints=true`, move hints visible, tapahtumaloki auki oletuksena
- **Vapaa tila** – `hints=false`, ei ohjeviestejä, loki kiinni oletuksena
- Toggle-napit pelin aikana oikeassa yläkulmassa (menu ← | pelinimi)
- `teachMode` prop on olemassa mutta oletuksena false eikä enää asetusvalikossa

## SFX (`src/shared/audio.js` — `SFX` objekti)
Korttitoiminnot:
| Funktio | Käyttötilanne |
|---|---|
| `flip` | nosto / käännös |
| `play` | kortin pelaus, hyökkäys |
| `capture` | korttien otto pöydältä |
| `leave` | lasku / syöttö / passi |
| `swap` | korttien vaihto |
| `reveal` | piilokorttien paljastus |
| `take` | pakkootto (tappio) |
| `beat` | torjunta onnistuu |
| `build` | rakennus (Kasino) |

Erityistapahtumat:
| Funktio | Käyttötilanne |
|---|---|
| `tikki` | mokki / tikki (Kasino) |
| `maija` | Maija-kortti (Maija) |
| `slap` | läpsäys (Läpsy) |
| `wrongSlap` | väärä läpsäys (Läpsy) |
| `winPile` | pino voitettu |
| `challenge` | haaste (Läpsy) |
| `reactWin` | reaktio onnistui |
| `reactWrong` | reaktio epäonnistui |
| `lastCardWin` | viimeinen kortti pelattu voittoon |

Virstanpylväät:
| Funktio | Käyttötilanne |
|---|---|
| `score` | pistemerkki |
| `fanfare` | voitto |

## Players
- Human player: "Hero"
- AI opponents: "Tekoäly" (1–3 bots)
- Player count per game varies: see Games table above

## Tech
- React functional components + hooks only (no class components)
- Tailwind core utilities only (no custom compiler)
- No localStorage / sessionStorage (use useState/useReducer) — TIETOINEN VALINTA: sovellus on "tyylikäs karvalakki-versio", ei tallenna edistymistä
- Single-file artifacts (.jsx) — no separate CSS/JS files
- Touch + stylus primary input (phone + tablet), no hover-dependent interactions
- Responsive: `window.innerWidth < 600` = mobile, else tablet
- Mobile: 1-col game grid, smaller fonts (11-12px), reduced padding
- Tablet: 3-col game grid, fonts 12-14px, normal padding

## Code style
- Finnish variable names for game logic (e.g. `kortti`, `pelaaja`, `vuoro`)
- English for React/component internals
- Destructure imports: `import { useState } from "react"`

## DO NOT
- Break single-file structure without asking
- Add npm packages beyond what's in current prototype
- Assume desktop viewport — always design for ~1200px landscape tablet

## Compact instructions
When compacting: preserve current game logic state, component structure, and any
unresolved bugs. Drop conversation filler and superseded code versions.
