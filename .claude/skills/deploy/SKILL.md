---
name: deploy
description: Julkaise Jako-pelini täysimääräisesti niin että SEKÄ GitHub ETTÄ Vercel-tuotanto sisältävät kaiken — päivitä CHANGELOG + TODO, buildaa, committaa ja PUSHAA GitHubiin, deployaa Verceliin ja varmista. Käytä kun käyttäjä haluaa viedä muutokset liveen ("deploy", "julkaise", "vie tuotantoon").
---

# Deploy — Jako-pelini

**Periaate:** Vercelin git-integraatio on kytketty (todennettu 25.6.2026) → **`git push origin main` ON julkaisu**: se vie commitin GitHubiin JA laukaisee tuotantodeployn molempiin domaineihin. Erillinen `npm run deploy` olisi redundantti tupladeploy — se on vain hätävara (ks. loppu).

## Vaiheet

1. **Esiehto.** `git status` — olet `main`issa ja työpuu on juuri siinä tilassa jonka haluat julkaista.

2. **Changelog + TODO (käsin — build EI tee tätä).**
   - **CHANGELOG:** `src/changelogs/fi.js` = ainoa tiedosto (vain suomeksi, päätös 3.7.2026 — 22 kielen käännös per julkaisu paisutti tiedostomäärää turhaan ~450 kt duplikaattidataa, selain kääntää tarvittaessa Käännä-toiminnollaan). Lisää uusin `{ date, items }` taulukon alkuun, pelaajaystävällisesti suomeksi ilman jargonia. Lue teksti huolella — typot näkyvät suoraan käyttäjälle.
   - **TODO** (`src/App.jsx`, `const TODO`): valmistunut kohta → `status: 'done'`, tai lisää rivi. Näkyvät rivit tulevat `ui.infoPanel.todoItems`-taulukoista (`src/locales/fi.js` + `en.js`) **indeksijärjestyksessä** — jos muutat rivejä, päivitä molemmat taulukot samaan järjestykseen, muuten EN näyttää väärän rivin.
   - **VERSIO (käsin — build EI enää laske tätä).** Bumppaa `package.json`in `version`-kentän patch-numeroa yhdellä (esim. `1.2.202` → `1.2.203`) ja committaa se samassa julkaisucommitissa. `vite.config.js` lukee luvun suoraan package.jsonista, joten committoitu luku on se mitä käyttäjä näkee.
     **Miksi käsin:** aiemmin versio johdettiin komennosta `git rev-list --count HEAD`, mutta Vercel kloonaa repon matalasti (shallow), joten laskuri palautti tuotannossa ~10 todellisen commit-määrän sijaan. Tuotannossa luki 1.2.010 kun lokaali build antoi 1.2.201, eikä mikään huutanut virhettä (todennettu 21.7.2026). Committoitu luku ei voi erota ympäristön mukaan.

3. **Build.** `npm run build`. Virhe → **pysähdy ja raportoi**, älä committaa rikkinäistä. Lokaali `dist/` toimii vaiheen 6 todennusreferenssinä. Tarkista tässä että versio meni bundleen: `grep -o 'To="1\.2\.[0-9]*"' dist/assets/index-*.js` vastaa package.jsonia.

4. **Verifioi UI-muutos previewissä** (rakenteellinen DOM-tarkistus; äänet pois ellet testaa niitä). Jos todennus vaatisi ei-deterministisen pelitilan, jätä se käyttäjän testattavaksi.

5. **Commit + push = julkaisu.** Stage `git add src CLAUDE.md` + muuttuneet pelikohtaiset `*.md` (ei `node_modules/`, `dist/`, `package-lock.json`). Commit-viesti: `$ARGUMENTS` jos annettu, muuten lyhyt suomenkielinen `feat:`/`fix:`. Sitten `git push origin main` — tämä vie GitHubin JA tuotannon kerralla. **Älä ohita pushia.**

6. **Varmista tuotanto — odota ensin ~30–60 s.** Git-build + CDN-propagaatio; välitön tarkistus näyttää vanhan bundlen → väärä "ei mennyt perille" -tulkinta. Deterministinen todennus: hae live-sivulta `assets/index-*.js`-hash ja vertaa vaiheen 3 `dist`-buildiin (Vite on content-hash → täsmäys = tuotanto == lokaali). **Tarkista samalla versionumero tuotantobundlesta** (`To="1.2.NNN"`) ja että se vastaa package.jsonia: hash-täsmäys yksin ei olisi paljastanut 21.7.2026 löytynyttä versiobugia. Vaihtoehto: `npx vercel ls jako-pelini` → uusin `● Ready` ja syntyi pushistasi. Molemmat tuotantodomainit päivittyvät: https://tommi-jako.vercel.app (ensisijainen) + https://tommi-jako52.vercel.app.

7. **Raportoi.** `APP_VERSION` + commit-hash + live-URL. Vahvista erikseen että SEKÄ GitHub ETTÄ Vercel-tuotanto ovat ajan tasalla — se on tämän skillin koko pointti.

## Varoitukset & hätävara

- **ÄLÄ käytä `vercel alias set`** julkiselle domainille — luo suojatun 401-aliaksen; domain-aliasointi hoidetaan Vercel-dashboardista.
- `unset GH_TOKEN GITHUB_TOKEN` ennen git/vercel-komentoja jos tokenit häiritsevät.
- **Hätävara** (vain jos push ei enää päivitä tuotantoa = git-integraatio irronnut): `npm run deploy` (= `npx vercel build --prod && npx vercel deploy --prebuilt --prod`); kertasetup per kone `npx vercel pull --yes --environment production`; kytke integraatio takaisin `npx vercel git connect <repo-url>`.
