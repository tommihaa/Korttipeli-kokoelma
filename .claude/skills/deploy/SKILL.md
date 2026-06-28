---
name: deploy
description: Julkaise Jako-pelini täysimääräisesti niin että SEKÄ GitHub ETTÄ Vercel-tuotanto sisältävät kaiken — päivitä CHANGELOG + TODO, buildaa, committaa ja PUSHAA GitHubiin, deployaa Verceliin ja varmista. Käytä kun käyttäjä haluaa viedä muutokset liveen ("deploy", "julkaise", "vie tuotantoon").
---

# Deploy — Jako-pelini

**Tavoite: GitHub ja Vercel-tuotanto sisältävät molemmat kaiken.**
Avain: **Vercel git-integraatio on kytketty** (todennettu 25.6.2026 — pushista syntyvällä deploymentilla on alias `jako-pelini-git-main-…vercel.app`, jonka Vercel luo VAIN git-deeploille, + molemmat tuotantodomainit). Siksi **pelkkä `git push origin main` riittää: se vie commitin GitHubiin JA laukaisee Vercel-tuotantodeployn** (tommi-jako + tommi-jako52). **Älä aja erikseen `npm run deploy`** — se on redundantti toinen, identtinen deploy (turha build + deploy).

## 0. Esiehto
Varmista että olet `main`-haarassa ja työpuu on siinä tilassa jonka haluat julkaista (`git status`).

## 1. Päivitä käyttäjälle näkyvä sisältö (käsin — build EI tee tätä automaattisesti)
- **CHANGELOG** (`src/changelogs/fi.js` = totuuden lähde): lisää uusin `{ date, items }` -objekti heti taulukon alkuun. Kirjoita **pelaajaystävällisesti, suomeksi, ilman teknistä jargonia**. Lue teksti huolella: typot näkyvät suoraan käyttäjälle.
- **CHANGELOG on lokalisoitu (10.6.2026 alkaen):** käännä uusi merkintä KAIKKIIN 22 muuhun `src/changelogs/*.js`-tiedostoon (23 kieltä yhteensä: cs da de el en es et fr hu is it krl la no pl pt ro rom ru se sv uk). **Tarkista määrä aina ajossa** `ls src/changelogs/*.js` — kieliä on lisätty ajan myötä. Rakenne 1:1 fi:n kanssa: sama `date` sellaisenaan, sama items-määrä ja -järjestys. Pelien erisnimet pysyvät suomeksi; UI-termit haetaan kohdekielen `src/locales/<koodi>.js`:stä (Grep, älä lue koko tiedostoa). Tarkista rakenne Nodella ennen committia (entry-/items-määrien vertailu fi.js:ään).
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

## 5. Vercel-tuotanto = vaiheen 4 push (ei erillistä deployta)
Vaiheen 4 `git push` deployaa jo tuotantoon git-integraation kautta. **Älä aja `npm run deploy`** — tupladeploy, sama artefakti. Avaa halutessasi selain: `start https://tommi-jako.vercel.app`.
- **ÄLÄ käytä `vercel alias set`** julkista domainia varten — se luo suojatun 401-aliaksen. Domain-aliasointi hoidetaan Vercel-dashboardista.
- **Hätävara** (vain jos git-integraatio joskus irtoaa eikä push enää päivitä tuotantoa): `npm run deploy` (= `npx vercel build --prod && npx vercel deploy --prebuilt --prod`); kertasetup per kone `npx vercel pull --yes --environment production`.

## 6. Varmista tuotanto
- **Git-build kestää ~10–30 s + CDN-propagaatio → ÄLÄ tarkista heti.** Välitön tarkistus näyttää vanhan bundlen ja johtaa väärään "ei mennyt perille" -tulkintaan (juuri tämä virhe maksoi Itussa turhia CLI-deployja). Odota ~30–60 s.
- Deterministinen todennus: vertaa tuotannon bundle-hash lokaaliin `dist/assets/index-*.js`-hashiin (vaiheen 2 build). Vite on content-hash → sama lähde tuottaa saman hashin. Hae live: `Invoke-WebRequest 'https://tommi-jako.vercel.app/'` → poimi `assets/index-*.js` → hae se. Täsmää = tuotanto == lokaali build.
- Vaihtoehto: `npx vercel ls jako-pelini` → uusin deployment on `● Ready` ja syntyi pushistasi.
- Molemmat domainit ovat tuotannossa ja päivittyvät joka pushissa: https://tommi-jako.vercel.app (ensisijainen) + https://tommi-jako52.vercel.app.

## 7. Raportoi
Versio (`APP_VERSION`) + commit-hash + live-URL. **Vahvista erikseen että SEKÄ GitHub (push OK) ETTÄ Vercel (deploy OK) ovat ajan tasalla** — se on tämän skillin koko pointti.
