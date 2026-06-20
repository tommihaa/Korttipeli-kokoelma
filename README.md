# Jako — korttipelikokoelma

> **"Ethnic games to conquer the world"** — suomalaiset, skandinaaviset, baltialaiset ja venäläiset korttipelit ansaitsevat paremman digitaalisen toteutuksen.

Selaimessa pelattava kokoelma: opi moninpelikorttipelit pelaamalla botteja vastaan. Ei tiliä, ei mainoksia, ei seurantaa.

- **Live:** https://tommi-jako.vercel.app
- **Stack:** React 18 + Vite, JSX, inline-tyylit. Ei TypeScriptiä, ei Vueta, ei Tailwind-kääntäjää, ei muita npm-riippuvuuksia. Oma kevyt i18n (23 kieltä).

## Komennot

```bash
npm run dev      # kehityspalvelin (http://localhost:5173/)
npm run build    # tuotantobuild
npm run deploy   # Vercel-tuotanto (ks. .claude/skills/deploy: hoitaa changelogin + git pushin)
```

## Mistä mikäkin löytyy

Tämä tiedosto pidetään tarkoituksella ohuena. Elävä tieto asuu ylläpidetyissä lähteissä — ei toistettuna tässä, ettei se rapistu:

| Tarvitset | Katso |
|-----------|-------|
| Agentin ohjeet, konventiot, arkkitehtuuri | `CLAUDE.md` |
| Pelikohtaiset säännöt | `KOPUTUS.md`, `LAEPSY.md`, `KULTAKALA.md`, `MAIJA.md`, `KASINO.md`, `MOSKA.md`, `SEISKA.md`, `RISTISEISKA.md`, `PASKAHOUSU.md` |
| Mitä on muuttunut | sovelluksen muutosloki (Info → Muutosloki) tai `git log` |
| Pelien lista + esittely | itse sovellus (live-linkki yllä) |
| Julkaisu | `.claude/skills/deploy` |
