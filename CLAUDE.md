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

## Modes
- **Opetustila** – step-by-step guidance, move hints (default at startup)
- **Vapaa tila** – free play, no restrictions
- **Kilpailutila** – strict rules, scoring enforced

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
