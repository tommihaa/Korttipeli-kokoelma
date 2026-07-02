---
name: deploy
description: Julkaise Jako-pelini täysimääräisesti niin että SEKÄ GitHub ETTÄ Vercel-tuotanto sisältävät kaiken — päivitä CHANGELOG + TODO, buildaa, committaa ja PUSHAA GitHubiin, deployaa Verceliin ja varmista. Käytä kun käyttäjä haluaa viedä muutokset liveen ("deploy", "julkaise", "vie tuotantoon").
---

# Deploy — Jako-pelini

**Periaate:** Vercelin git-integraatio on kytketty (todennettu 25.6.2026) → **`git push origin main` ON julkaisu**: se vie commitin GitHubiin JA laukaisee tuotantodeployn molempiin domaineihin. Erillinen `npm run deploy` olisi redundantti tupladeploy — se on vain hätävara (ks. loppu).

## Vaiheet

1. **Esiehto.** `git status` — olet `main`issa ja työpuu on juuri siinä tilassa jonka haluat julkaista.

2. **Changelog + TODO (käsin — build EI tee tätä).**
   - **CHANGELOG:** `src/changelogs/fi.js` = totuuden lähde. Lisää uusin `{ date, items }` taulukon alkuun, pelaajaystävällisesti suomeksi ilman jargonia. Lue teksti huolella — typot näkyvät suoraan käyttäjälle.
   - Käännä sama merkintä **kaikkiin muihin `src/changelogs/*.js`-tiedostoihin** — tarkista määrä ajossa `ls src/changelogs/*.js` (23 kieltä 6/2026, kieliä on lisätty ajan myötä). Rakenne 1:1 fi:n kanssa: sama `date`, sama items-määrä ja -järjestys. Pelien erisnimet pysyvät suomeksi; UI-termit kohdekielen `src/locales/<koodi>.js`:stä (Grep, älä lue koko tiedostoa). Vertaa entry-/items-määrät fi.js:ään Nodella ennen committia.
   - **TODO** (`src/App.jsx`, `const TODO`): valmistunut kohta → `status: 'done'`, tai lisää rivi. Näkyvät rivit tulevat `ui.infoPanel.todoItems`-taulukoista (`src/locales/fi.js` + `en.js`) **indeksijärjestyksessä** — jos muutat rivejä, päivitä molemmat taulukot samaan järjestykseen, muuten EN näyttää väärän rivin.
   - `APP_VERSION` kasvaa buildissa automaattisesti (`__APP_VERSION__`) — älä koske.

3. **Build.** `npm run build`. Virhe → **pysähdy ja raportoi**, älä committaa rikkinäistä. Lokaali `dist/` toimii vaiheen 6 todennusreferenssinä.

4. **Verifioi UI-muutos previewissä** (rakenteellinen DOM-tarkistus; äänet pois ellet testaa niitä). Jos todennus vaatisi ei-deterministisen pelitilan, jätä se käyttäjän testattavaksi.

5. **Commit + push = julkaisu.** Stage `git add src CLAUDE.md` + muuttuneet pelikohtaiset `*.md` (ei `node_modules/`, `dist/`, `package-lock.json`). Commit-viesti: `$ARGUMENTS` jos annettu, muuten lyhyt suomenkielinen `feat:`/`fix:`. Sitten `git push origin main` — tämä vie GitHubin JA tuotannon kerralla. **Älä ohita pushia.**

6. **Varmista tuotanto — odota ensin ~30–60 s.** Git-build + CDN-propagaatio; välitön tarkistus näyttää vanhan bundlen → väärä "ei mennyt perille" -tulkinta. Deterministinen todennus: hae live-sivulta `assets/index-*.js`-hash ja vertaa vaiheen 3 `dist`-buildiin (Vite on content-hash → täsmäys = tuotanto == lokaali). Vaihtoehto: `npx vercel ls jako-pelini` → uusin `● Ready` ja syntyi pushistasi. Molemmat tuotantodomainit päivittyvät: https://tommi-jako.vercel.app (ensisijainen) + https://tommi-jako52.vercel.app.

7. **Raportoi.** `APP_VERSION` + commit-hash + live-URL. Vahvista erikseen että SEKÄ GitHub ETTÄ Vercel-tuotanto ovat ajan tasalla — se on tämän skillin koko pointti.

## Varoitukset & hätävara

- **ÄLÄ käytä `vercel alias set`** julkiselle domainille — luo suojatun 401-aliaksen; domain-aliasointi hoidetaan Vercel-dashboardista.
- `unset GH_TOKEN GITHUB_TOKEN` ennen git/vercel-komentoja jos tokenit häiritsevät.
- **Hätävara** (vain jos push ei enää päivitä tuotantoa = git-integraatio irronnut): `npm run deploy` (= `npx vercel build --prod && npx vercel deploy --prebuilt --prod`); kertasetup per kone `npx vercel pull --yes --environment production`; kytke integraatio takaisin `npx vercel git connect <repo-url>`.
