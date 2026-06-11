---
name: deploy
description: Julkaise Jako-pelini täysimääräisesti niin että SEKÄ GitHub ETTÄ Vercel-tuotanto sisältävät kaiken — päivitä CHANGELOG + TODO, buildaa, committaa ja PUSHAA GitHubiin, deployaa Verceliin ja varmista. Käytä kun käyttäjä haluaa viedä muutokset liveen ("deploy", "julkaise", "vie tuotantoon").
---

# Deploy — Jako-pelini

**Tavoite: GitHub ja Vercel-tuotanto sisältävät molemmat kaiken.**
Huom: `npm run deploy` vie VAIN Verceliin. GitHub jää jälkeen ellei erikseen `git push`ata. Tämä skilli kattaa koko ketjun — älä oikaise.

## 0. Esiehto
Varmista että olet `main`-haarassa ja työpuu on siinä tilassa jonka haluat julkaista (`git status`).

## 1. Päivitä käyttäjälle näkyvä sisältö (käsin — build EI tee tätä automaattisesti)
- **CHANGELOG** (`src/changelogs/fi.js` = totuuden lähde): lisää uusin `{ date, items }` -objekti heti taulukon alkuun. Kirjoita **pelaajaystävällisesti, suomeksi, ilman teknistä jargonia**. Lue teksti huolella: typot näkyvät suoraan käyttäjälle.
- **CHANGELOG on lokalisoitu (10.6.2026 alkaen):** käännä uusi merkintä KAIKKIIN 16 muuhun `src/changelogs/*.js`-tiedostoon (en sv no da is de fr es it uk ru el pl et pt krl). Rakenne 1:1 fi:n kanssa: sama `date` sellaisenaan, sama items-määrä ja -järjestys. Pelien erisnimet pysyvät suomeksi; UI-termit haetaan kohdekielen `src/locales/<koodi>.js`:stä (Grep, älä lue koko tiedostoa). Tarkista rakenne Nodella ennen committia (entry-/items-määrien vertailu fi.js:ään).
- **TODO** (`src/App.jsx`, `const TODO`): jos jokin kohta valmistui, merkitse `status: 'done'`, tai lisää uusi rivi. **TODO on lokalisoitu**: näkyvät rivit tulevat `ui.infoPanel.todoItems`-taulukosta (`src/locales/fi.js` + `src/locales/en.js`) indeksijärjestyksessä, ei `item.label`-kentästä. Jos muutat TODO-rivejä, **päivitä molemmat locale-taulukot samaan järjestykseen (fi + en)** — muuten EN näyttää väärän rivin.
- **APP_VERSION** kasvaa automaattisesti buildissa (`__APP_VERSION__`, `src/App.jsx:8`) — älä koske.

## 2. Buildaa
Aja `npm run build`. Jos build ei käänny, **pysähdy ja raportoi virhe** — älä committaa rikkinäistä. (Stop-hook ajaa buildin muutenkin, mutta varmista vihreä tässä.)

## 3. Verifioi (jos muutos on UI:ssa)
Tarkista muutos previewssä (screenshot tai rakenteellinen DOM-tarkistus). Sammuta äänet ellet nimenomaan testaa niitä. Jos todennus vaatisi ei-deterministisen pelitilan, jätä se käyttäjän testattavaksi äläkä polta tokeneita läpipeluuseen.

## 4. GitHub  ← tämä puuttui aiemmasta /deploy-komennosta
- **Stage** lähde + dokumentit: `git add src CLAUDE.md` + muuttuneet pelikohtaiset `*.md`. Jätä pois `node_modules/`, `dist/`, `package-lock.json`. `.claude/` vain jos haluat versioida konfiguraation (huom: `settings.json` sisältää kovakoodatun konepolun, joka ei siirry toiselle koneelle).
- **Commit**: jos käyttäjä antoi viestin argumenttina (`$ARGUMENTS`), käytä sitä; muuten lyhyt suomenkielinen `feat:`/`fix:` -viesti muutosten perusteella.
- **`git push`** → tämä vie kaiken GitHubiin. **ÄLÄ ohita tätä vaihetta** — se on koko skillin ydin.

## 5. Vercel-tuotanto
Aja `npm run deploy` (= `npx vercel build --prod && npx vercel deploy --prebuilt --prod`; avaa selaimen automaattisesti).
- **ÄLÄ käytä `vercel alias set`** julkista domainia varten — se luo suojatun 401-aliaksen. Domain-aliasointi hoidetaan Vercel-dashboardista.
- Kertasetup per kone (jos ei tehty): `npx vercel pull --yes --environment production`.

## 6. Varmista tuotanto
- Huomioi **välimuisti-/aikavyöhykeviive** ennen kuin tulkitset ettei muutos mennyt perille.
- Deterministinen todennus ilman selainta: hae bundle (`Invoke-WebRequest 'https://tommi-jako.vercel.app/'` → poimi `assets/index-*.js` → hae se) ja vertaa hash deploy-lokin näyttämään hashiin. Täsmää = tuotanto == lokaali build.
- Molemmat domainit ovat tuotannossa ja päivittyvät joka deployssa: https://tommi-jako.vercel.app (ensisijainen) + https://tommi-jako52.vercel.app.

## 7. Raportoi
Versio (`APP_VERSION`) + commit-hash + live-URL. **Vahvista erikseen että SEKÄ GitHub (push OK) ETTÄ Vercel (deploy OK) ovat ajan tasalla** — se on tämän skillin koko pointti.
