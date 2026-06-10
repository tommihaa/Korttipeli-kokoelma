Julkaise projekti: build → commit → deploy.

1. Aja `npm run build`. Jos build epäonnistuu, pysähdy ja raportoi virhe.
2. Tarkista muutokset: `git diff --stat` ja `git log --oneline -5` tyylin varmistamiseksi.
3. **Päivitä CHANGELOG**: lisää uusin merkintä `CHANGELOG`-taulukkoon `src/changelog.js`:ssä (heti taulukon alkuun, uusi `{ date, items }` -objekti). Kirjoita muutokset lyhyesti, käyttäjäystävällisesti — ei teknistä jargonia.
4. Stage muutetut tiedostot: `src/`-kansio ja `CLAUDE.md`. Jätä pois `.claude/`, `package-lock.json`, `node_modules/`.
5. Jos käyttäjä antoi viestin argumenttina (`$ARGUMENTS`), käytä sitä commit-viestinä. Muuten tee lyhyt suomenkielinen viesti muutosten perusteella (tyyli: "fix: ..." tai "feat: ...").
6. Aja `git commit`.
7. Aja `npm run deploy` (= vercel build + deploy --prebuilt --prod, avaa selaimen automaattisesti).
8. Raportoi commit-hash ja Vercel-URL.
