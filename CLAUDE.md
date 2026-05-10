# Jako – Finnish Card Game Collection

## Project
Android tablet card game app (React/JSX + Vite). Dark green (#1a3a2a) + gold (#c9a84c) aesthetic.
Structure: `src/App.jsx` (entry), `src/games/*.jsx` (9 games), `src/shared/` (Card, FanStack, colors, helpers, audio).
Reference doc: `jako_projekti.md`. Dev server: `http://localhost:5173/`.

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
- **Opetustila** – move hints visible, tapahtumaloki auki oletuksena (default)
- **Vapaa tila** – ei ohjeviestejä, loki kiinni oletuksena
- Toggle-nappi oikeassa yläkulmassa pelin aikana (🎓 / 🃏)
- Proppi: `hints: boolean` jokaisessa pelissä — lisää vaikutuksia tarpeen mukaan

## Players
- Human player: "Hero"
- AI opponents: "Tekoäly" (1–3 bots)
- Player count per game varies: see Games table above

## Tech
- React functional components + hooks only (no class components)
- Tailwind core utilities only (no custom compiler)
- No localStorage / sessionStorage (use useState/useReducer)
- Single-file artifacts (.jsx) — no separate CSS/JS files
- Touch + stylus primary input (tablet), no hover-dependent interactions

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
