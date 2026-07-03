# Jako – Finnish Card Game Collection

## Project
Mobile-responsive card game app (React/JSX + Vite). Dark green (#1f5a3f) + gold (#c9a84c) aesthetic.
Structure: `src/App.jsx` (entry), `src/games/*.jsx` (9 games), `src/shared/` (Card, FanStack, colors, helpers, audio, glossary).
Sanasto-termit + `splitWithGlossary` ovat `src/shared/glossary.js`:ssä (Lahja-kokoelman jaettu termiskeema, speksi Projects-juuren `TERMIMODUULI.md`; sisarkopio Itussa). MERKISTO on yhä App.jsx:ssä.
Reference docs: `jako_projekti.md` (general), pelikohtaiset säännöt: `KOPUTUS.md`, `LAEPSY.md`, `KULTAKALA.md`, `MAIJA.md`, `KASINO.md`, `MOSKA.md`, `SEISKA.md`, `RISTISEISKA.md`, `PASKAHOUSU.md`. Dev server: `http://localhost:5173/`.
Repo: `https://github.com/tommihaa/Korttipeli-kokoelma`
Responsive: Portrait phone (~375px) + tablet landscape (~768px+)

## Sääntölogiikan muokkaus
**Ennen minkään pelin näkyvyys-, vaihto- tai muun sääntölogiikan muokkaamista lue ensin kyseisen pelin `PELI.md` ja toista sääntö minulle vahvistettavaksi** (suunnat, mitkä kortit pysyvät piilossa, kynnykset). Säännöt ovat hienovaraisia ja niitä on luettu väärin — esim. Kultakalassa pelaaja EI näe omia pöytäkorttejaan alussa — hän oppii kunkin paikan (1–5) vasta vaihtaessaan kortin siihen (vaihtoketju oikealta vasemmalle 5→4→3→2→1); tuntematon (paikka 0) ei ole vaihdettavissa ja paljastuu vain lopussa. Älä päättele sääntöä koodista tai muistista, kun dokumentti on olemassa.

## Navigation
Valikko (päävalikko) → Peli (suoraan, ei välinäyttöä)
- `playerCount` valitaan kunkin pelin aloitusnäytöllä (Pelaajia 2/3/4); App.jsx välittää vain oletuksen (4) propsina, ei globaalia säädintä. Asetukset → Pelaajat sisältää enää vastustajien nimiryhmän valinnan.
- Ristiseiska: `Math.max(playerCount, game.minPlayers)` — varmistaa min 3 pelaajaa

## Global settings (App.jsx → props to all games)
| Prop | Default | Selitys |
|---|---|---|
| `showLog` | true | Tapahtumaloki auki |
| `soundOn` | false | Äänet (oletuksena pois) |
| `seeAll` | false | Cheat Mode — Hero näkee kaikki kortit |
| `showCounts` | true | Korttimäärät näkyvillä |
| `showLastPlay` | true | Kelluva viimeisin siirto -indikaattori |

Asetukset persistoidaan `useStickySetting`-hookilla (ks. Tech-osio). Poikkeus: `seeAll` ei tallennu (nollautuu joka latauksessa).

**Näkyvyysesiasetus (`uiPreset`):** Peliasetusten alussa segmented-valinta *Aloittelija/Kokenut* asettaa kuusi opastustoggea kerralla (`UI_PRESETS`-kartta App.jsx:ssä); yksittäiset togglet ovat "Lisäasetukset"-taitoksen takana (`showLisaasetukset`). Manuaalinen toggle-muutos → `uiPreset='custom'`.

**Intuitiivisuus-UI (kesäkuu 2026):** Päävalikon pelikorteissa suosikit (`g.suosikki`) merkitään ★:llä + ensikäynnin "aloita tästä" -vyö (näkyy kun yhtään peliä ei pelattu, `stats`-summasta). Säännöt avautuvat selkeästä "Säännöt"-pillistä (ei enää matalakontrastinen ℹ — ℹ tarkoittaa nyt vain yläpalkin sovellus-Infoa); laajennuksessa linkki Sanastoon. Jaetut komponentit: `shared/GroupPicker.jsx` (vastustajaryhmän valinta jokaisen pelin aloitusnäytöllä, data `shared/playerGroups.js` = `NAME_GROUPS`/`POOL_BY_GROUP`; App välittää `playerGroup`+`onPlayerGroupChange` kaikille peleille) ja `shared/TurnPrompt.jsx` (pysyvä "👉 Sinun vuorosi — <toiminto>" -banneri pelinäkymän yläosassa, kytketty kunkin pelin ihmisvuoro-ehtoon; tekstit `ui.turn.*`).

## Component props (kaikki 9 peliä)
App.jsx välittää saman propsijoukon kaikille peleille, mutta **jokainen peli destrukturoi vain tarvitsemansa** — yhtä kanonista signatuuria ei ole. Kaikille välitetään: `onResult, onSnapshot, game, hints, soundOn, seeAll, showCounts, showLastPlay, showIntention, showNextBtn, showAIKnown, isMobile, playerCount, playerNames, aiLevel, onAiLevelChange`.

Yhteiset (kaikki destrukturoivat): `onResult, hints, soundOn: initSoundOn, seeAll: initSeeAll, showCounts, showLastPlay, isMobile, playerCount, playerNames, aiLevel, onAiLevelChange, onSnapshot`.

Pelikohtaiset (vain osa ottaa):
- `game` — vain Kasino
- `showNextBtn` — vain Kasino, Moska
- `showAIKnown` — vain Koputus, Kultakala
- `showIntention: initShowIntention` — Kasino, Koputus, Maija, Seiska, Ristiseiska, Paskahousu, Moska (ei Läpsy/Kultakala)

## AI-tasot (3 kpl)
`Oppipoika | Kisälli | Mestari`
- **Mestari** = täysi strategia + muistaa pelattuja kortteja (aiempi "Yliluonnollinen"-logiikka)
- Sisäiset avaimet: `'beginner'` | `'normal'` | `'hard'`

## Session start
At the start of every session run `npm run dev` in the background so the dev server is available at http://localhost:5173/ for preview verification during development.

## Verifiointi
- **Jos muutos ei näy previewissä, epäile ensin vanhentunutta dev-palvelinta tai välimuistia — älä muokkaa jo oikeaa koodia.** Käynnistä dev-palvelin uudelleen + kova reload (ja tarkista `vite-error-overlay`) ennen kuin oletat koodin olevan vialla. Kerro mitä kokeilit.
- HMR-virheet konsolipuskurissa ovat usein vanhentuneita välitiloja kaksivaiheisten editien ajalta — täysi reload on luotettava totuus.

## Deploy
**Ennen deployta (käsin — ei automatisoitua):**
- Lisää `CHANGELOG`-merkintä `src/changelogs/fi.js`:ään (näkyy Info → Muutosloki). **Vain suomeksi** (päätös 3.7.2026: 22 kielen käännös per julkaisu paisutti tiedostomäärää ~450 kt duplikaattidataa ja toisti saman käännöstyön joka deployssa ilman käännösmuistia; selaimen natiivi Käännä-toiminto kattaa muut kielet kiinnostuneille, samoin kuin PWA-sovelluksissa Itu/Superjatsi joissa ei ole omaa käännösmekanismia lainkaan). Julkaisu EI päivitä tätä automaattisesti.
- Päivitä `TODO`-taulukko `src/App.jsx`:ssä (Asetukset → Tulossa), jos jokin kohta valmistui tai lisättiin.
- `APP_VERSION` kasvaa buildissa automaattisesti (`__APP_VERSION__`) — sitä ei tarvitse koskea.

Production deploy: **`git push origin main`** — Vercelin git-integraatio deployaa tuotantoon automaattisesti (todennettu 25.6.2026). Koko protokolla: `deploy`-skill (`.claude/skills/deploy/SKILL.md`).
Hätävara, vain jos git-integraatio irtoaa eikä push päivitä tuotantoa: `npm run deploy` (= `vercel build --prod && vercel deploy --prebuilt --prod`); kertasetup per kone `npx vercel pull --yes --environment production`.
Live URL: https://tommi-jako.vercel.app  (ensisijainen)
Vanha URL: https://tommi-jako52.vercel.app  (yhä voimassa — jaettu linkki kesälomalaisille; molemmat ovat tuotantodomaineja ja päivittyvät joka deployssa)

**Varoitukset:**
- Deploy vain git push -reittiä (hätävarana `npm run deploy`). **ÄLÄ käytä `vercel alias set`** julkista domainia varten — se luo suojatun 401-aliaksen; domain-aliasointi hoidetaan Vercel-dashboardista.
- Deployn jälkeen huomioi välimuisti-/aikavyöhykeviive ennen kuin tulkitset, ettei muutos mennyt perille. Todenna tuotanto hakemalla bundle (`assets/index-*.js`) ja vertaamalla hash lokaaliin buildiin, älä pelkästä selaimen näkymästä.

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
- localStorage asetuksille (lupa laajentaa 2026-06-19, kumoaa aiemman "preferenssit-vain"-linjan): kaikki Asetukset-paneelin togglet (`jako:showLog`, `jako:soundOn`, `jako:twoColorDeck`, `jako:showCounts`, `jako:showLastPlay`, `jako:showIntention`, `jako:showNextBtn`, `jako:showAIKnown`), näkyvyysesiasetus (`jako:uiPreset` = `beginner`|`experienced`|`custom`, ks. Global settings), AI-taso (`jako:aiLevel`), nimiryhmä (`jako:playerGroup`) sekä pelikohtaiset sääntövalinnat (`jako:paskahousu:rules`, `jako:ristiseiska:rules`, `jako:kasino:rules`) persistoidaan `useStickySetting`-hookilla (`src/shared/storage.js`, `loadPref`/`savePref`, try/catch-suojattu). Lisäksi **pelikohtaiset tilastot** (`jako:stats` — pelatut/voitot/sijoitusjakauma/vaikeustaso-erittely per peli) persistoidaan suoraan `loadPref`/`savePref`-parilla (`useStickySetting` ei sovi, koska tallenne pitää yhdistää oletuksiin `normalizeStats`-migraatiolla; ks. `StatsPanel.jsx` ja 📊-nappi). **POIKKEUKSET (eivät tallennu):** `seeAll` (cheat — nollautuu joka latauksessa tahallaan) ja `godMode` (disabloitu placeholder).
- Single-file artifacts (.jsx) — no separate CSS/JS files
- Touch + stylus primary input (phone + tablet), no hover-dependent interactions
- Responsive: `window.innerWidth < 600` = mobile, else tablet
- Mobile: 1-col game grid, smaller fonts (11-12px), reduced padding
- Tablet: 3-col game grid, fonts 12-14px, normal padding

## Code style
- Finnish variable names for game logic (e.g. `kortti`, `pelaaja`, `vuoro`)
- English for React/component internals
- Destructure imports: `import { useState } from "react"`

## Viestit (loki/viestikupla) — i18n-konventio
- **Tapahtumailmoitukset kolmannessa persoonassa** kaikille pelaajille, myös ihmiselle: `${name}: ...`, `Vuorossa ${name}.`, `${name} vei voiton`. Ihmisen nimi on aina `Hero`, joten "Vuorossa Hero.", "Hero: 7♣". Ei erillistä `isHuman ? 'Sinä…' : '${name}…'` -haaraa — yksi käännösmalli per viesti.
- **Poikkeus: säilytä toimintaohjeet/vihjeet 2. persoonassa** kun ne neuvovat ihmistä tekemään jotain (esim. Koputus/Kultakala "Nostit X. Vaihda…", Kasinon dynaaminen vihje, Ristiseiskan "…joten Passaa"). Nämä eivät ole ilmoituksia vaan ohjeita.

## DO NOT
- Break single-file structure without asking
- Add npm packages beyond what's in current prototype
- Assume desktop viewport — always design for ~1200px landscape tablet

## Compact instructions
When compacting: preserve current game logic state, component structure, and any
unresolved bugs. Drop conversation filler and superseded code versions.
