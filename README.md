# Jako — projektin yhteenveto

> **"Ethnic games to conquer the world"** — suomalaiset, skandinaaviset, baltialaiset ja venäläiset korttipelit ansaitsevat paremman digitaalisen toteutuksen.

Selaimessa pelattava korttipelikokoelma: opi moninpelikorttipelit pelaamalla väsymättömiä botteja vastaan. Ei tiliä, ei mainoksia, ei seurantaa — sovellus muistaa vain asetuksesi tähän selaimeen.

- **Live:** https://tommi-jako.vercel.app
- **Repo:** https://github.com/tommihaa/Korttipeli-kokoelma
- **Versio:** 1.2.x (auto-kasvava buildissa) · 23 kieltä

## Kokoelman pelit

Yhdeksän valmista peliä. Pelin nimi pysyy suomenkielisenä kaikilla kielillä; muille kielille näytetään kulttuurinen vastinenimi alaotsikkona.

| Peli | Tyyppi | Taso | Pelaajat |
|------|--------|------|----------|
| **Kultakala** | Muistipeli | Helppo | 2–4 |
| **Läpsy** | Reaktiopeli | Helppo | 2–4 |
| **Seiska** | UNO-tyyppinen | Helppo | 2–4 |
| **Ristiseiska** | Kiusantekopeli | Helppo | 3–4 |
| **Koputus** | Muistipeli | Keskitaso | 2–4 |
| **Maija** | Kaatopeli | Keskitaso | 2–4 |
| **Kasino** | Kaappaaminen | Keskitaso | 2–4 |
| **Paskahousu** | Laituripeli | Keskitaso | 2–4 |
| **Moska** | Hyökkäily/puolustus (venäläinen Durak) | Vaativa | 2–4 |

Pelaajat: ihminen on **Hero**, vastustajat tekoälyä. Pelikohtaiset säännöt omissa tiedostoissaan (`KOPUTUS.md`, `LAEPSY.md`, `KULTAKALA.md`, `MAIJA.md`, `KASINO.md`, `MOSKA.md`, `SEISKA.md`, `RISTISEISKA.md`, `PASKAHOUSU.md`).

## Tekninen perusta

**Stack:** React 18 + Vite, JSX, ei TypeScriptiä. Tyylit inline-objekteina (brändipaletti `src/shared/colors.js`:n `C`); **ei Vueta, ei Tailwind-kääntäjää, ei css-in-js-kirjastoa**. Ei npm-riippuvuuksia React/Viten lisäksi.

**Yhteinen pohja (`src/shared/`):**
- `Card.jsx` + `FanStack.jsx` — korttikomponentti ja viuhka SVG-pakkadesigneilla
- `BACKS.jsx` — Ilves/Karhu/Korppi -korttipakat
- `colors.js` — `C`-paletti + `SUIT_COLOR` (nelivärinen ja kaksivärinen pakka)
- `audio.js` — Web Audio -äänimoottori (`SFX`-kokoelma)
- `helpers.js` — taivutus- ja korttiapurit
- `i18n.jsx` — kevyt oma käännösratkaisu (ei kirjastoa)
- `storage.js` — `loadPref`/`savePref`/`useStickySetting` (localStorage)
- `GameResult.jsx`, `StatsPanel.jsx`, `PlayerSetup.jsx`, `HandoffScreen.jsx`, `BotBattleBar.jsx`, `PakkaCount.jsx`, `PoytaPanel.jsx`, `ShuffleOverlay.jsx`, `Announcer.jsx`, `ShareQR.jsx`

**Ominaisuudet:**
- 3 koneälytasoa: Oppipoika / Kisälli / Mestari (`aiLevel`)
- Bottien taistelu (allBots) + askel-askeleelta Replay
- SFX-äänet (pois oletuksena), kaksivärinen pakka, opetustila vs. vapaa tila
- Pelikohtaiset tilastot (📊 Info-valikossa): pelatut/voitot/sijoitusjakauma/voitot vaikeustasoittain (localStorage `jako:stats` + `jako:sessions`)
- Jaa peli: linkki + QR-koodi (piirretään paikallisesti, ei verkkokutsua)
- Palaute Google Formsilla, lahjoitus Ko-fissä
- PWA: lisättävissä aloitusnäytölle, toimii kerran avattuna offline

**Asetusten muisti (localStorage, `jako:`-etuliite):** näkyvyystogglet, äänet, koneälytaso, vastustajaryhmä, pelikohtaiset sääntövalinnat (Paskahousu/Ristiseiska/Kasino), tilastot ja kieli. Poikkeukset (eivät tallennu): `seeAll` (cheat) ja `godMode` (placeholder).

## Kansainvälistys (i18n)

23 kieltä. `src/locales/fi.js` on totuuden lähde + fallback; muut kielet ovat omia laiskoja chunkkeja (`import.meta.glob`), ladataan vasta kun kieli aktivoidaan. Muutosloki (`src/changelogs/<koodi>.js`) on lokalisoitu samalla tavalla. Suomi on natiivitasoa; muut kielet web-/konevarmistettuja (osa "Testaamattomat"-ryhmässä, odottaa natiivitarkistusta).

## Kehitysprosessi

**Käyttäjä on pelisuunnittelija, malli on toteuttaja.** Sopimus määritellään yhdessä, malli toteuttaa, käyttäjä testaa, malli korjaa.

**Civilization-efekti:** ensimmäinen peli avasi teknologiapuun, seuraavat tulivat nopeammin valmiilla pohjalla (BACKS, äänimoottori, Card) — vain logiikka muuttuu peleittäin.

**Toistuva korjaussilmukka:** käyttäjä havaitsee bugin/parannustarpeen → malli korjaa → jos sama virhe toistuu, tehdään skill estämään se. Skill-muistiinpanot juuressa: `anti_slop_skill.md`, `laaduntarkistus_skill.md`, `lukittuminen_skill.md`, `toisto_skill.md`. Agentin ohjeet: `CLAUDE.md`. Julkaisu: `.claude/skills/deploy`.

## Opitut säännöt

**Tempo** — AI ei saa tuntua ylivoimaiselta: `setTimeout` 1.8–4.0 s tilanteen mukaan. Reaktiopeleissä (Läpsy/Koputus) ihmiselle enemmän aikaa kuin botille.

**Stale closure** — React + `setTimeout` = sudenkuoppa. Käytä ref-peilejä:
```js
const phaseRef = useRef('idle');
useEffect(() => { phaseRef.current = phase; }, [phase]);
// timeout-funktioissa: phaseRef.current EIKÄ phase
```

| Sudenkuoppa | Oikea tapa |
|-------------|-----------|
| `phase` suoraan timeoutissa | `phaseRef.current` |
| Ehdollinen render lisää/poistaa divin → layout-hyppii | Aina renderöity placeholder + kiinteä korkeus |
| Indeksi menee `-1` tai `>= length` | Tarkista reunatapaus erikseen |
| Async-ketju jatkuu pelin jo päätyttyä | `if (phaseRef.current === 'gameover') return;` |
| Locale-avain puuttuu jostain kielestä | Pidä rakenne 1:1 fi:n kanssa (parity-tarkistus) |

## Tiedostorakenne

```
Jako-pelini/
├── README.md              ← tämä yhteenveto
├── CLAUDE.md              ← agentin ohjeet (lue ennen sääntölogiikan muokkausta)
├── KOPUTUS.md … PASKAHOUSU.md  ← pelikohtaiset säännöt (9 kpl)
├── package.json · vite.config.js · index.html
├── public/                ← manifest.json, ikonit, service worker
├── src/
│   ├── App.jsx            ← valikko + globaali tila + modaalit
│   ├── games/             ← 9 peliä (Kasino, Koputus, Kultakala, Lapsy,
│   │                         Maija, Moska, Paskahousu, Ristiseiska, Seiska)
│   ├── shared/            ← Card, FanStack, GameResult, StatsPanel, i18n,
│   │                         storage, colors, audio, helpers, …
│   ├── locales/           ← 23 kielitiedostoa (fi = lähde)
│   └── changelogs/        ← 23 lokalisoitua muutoslokia (fi = lähde)
└── .claude/skills/deploy/ ← julkaisuskilli (GitHub + Vercel)
```

## Komennot

```bash
npm run dev      # kehityspalvelin (http://localhost:5173/)
npm run build    # tuotantobuild
npm run preview  # buildin esikatselu
npm run deploy   # Vercel-tuotanto (ks. .claude/skills/deploy: hoitaa myös changelogin + git pushin)
```
