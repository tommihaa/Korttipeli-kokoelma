# Jako-pelini — Termistöstandardisointi - Tilannekatsaus

**Pvm:** 2026-05-14  
**Tila:** Neljä peliä valmis, loput käynnissä

## Valmistuneet pelit

### ✅ Koputus (Referenssimalli)
- **M-objekti:** Kyllä (linjan 39-54)
- **addLog() korvaukset:** 100% (kaikki kutsut korvattu)
- **Termit:** pöytäkortit, poistopakka, nostopakka
- **Status:** Testattavissa

### ✅ Kultakala  
- **M-objekti:** Kyllä (linjan 28-42)
- **addLog() korvaukset:** 100% (12 kutsua korvattu)
- **Termit:** nostopakka, poistopakka, pöytäkortit
- **Status:** Testattavissa

### ✅ Kasino
- **M-objekti:** Kyllä (linjan 139-150, päivitetty)
- **addLog() korvaukset:** 100% (12 kutsua korvattu)
- **Termit:** pöytäkortit, nostopakka, poistopakka
- **Status:** Testattavissa

### ✅ Lapsy
- **M-objekti:** Kyllä (linjan 87-103)
- **addLog() korvaukset:** 100% (15 kutsua korvattu)
- **Termit:** Lapsy-spesifit (haaste, täsmäys, läpsäys)
- **Status:** Testattavissa

### ✅ Maija
- **M-objekti:** Kyllä (linjan 164-181)
- **addLog() korvaukset:** 100% (15 kutsua korvattu)
- **Termit:** hyökkäys, puolustus, kaataminen, patakuningatar (Maija)
- **Status:** Testattavissa

## Keskeneräiset pelit

### ⏳ Moska
- **M-objekti:** Kyllä (linjan 193-207, luotu)
- **addLog() korvaukset:** Osittain (1 korvattu)
- **Termit:** hyökkääjä, puolustaja, kaataminen, siirto
- **Status:** Jatkuu

### ⏳ Paskahousu  
- **M-objekti:** Tarvitaan
- **addLog() korvaukset:** 0%
- **Termit:** kasa (keskellä), käsikortit, kaataminen
- **Status:** Aloittamatta

### ⏳ Ristiseiska
- **M-objekti:** Tarvitaan
- **addLog() korvaukset:** 0%
- **Termit:** kasa, nosto, pöytä
- **Status:** Aloittamatta

### ⏳ Seiska
- **M-objekti:** Tarvitaan  
- **addLog() korvaukset:** 0%
- **Termit:** käsikortit, poistopakka
- **Status:** Aloittamatta

## Testaussuunnitelma

### Testattavissa nyt (5 peliä)
Jokaisen pelin testauksessa:
1. Valitse 2-3 pelaajaa (Hero + 1-2 AI)
2. Pelaa 1 täydellinen kierros Hero vs AI
3. Tarkista termien johdonmukaisuus UI:ssa
4. Varmista ettei pelimekaniikat vioittuneita

**Seuraavat testattaviksi:**
- [ ] Koputus — 1 peli
- [ ] Kultakala — 1 peli  
- [ ] Kasino — 1 peli
- [ ] Lapsy — 1 peli
- [ ] Maija — 1 peli

### Keskeneräisten viimeistely (4 peliä)
Kun 5 peliä testattu ja todettu ok, jatka loput neljä peliä:
- [ ] Moska — addLog() korvaukset loppuun
- [ ] Paskahousu — M-objekti + addLog() korvaukset
- [ ] Ristiseiska — M-objekti + addLog() korvaukset  
- [ ] Seiska — M-objekti + addLog() korvaukset

Jokaisen jälkeen testi: 1 peli Hero vs AI.

## Globaalisti yhtenäistetyt
✅ Termistokirjasto: `src/shared/gameTerms.js` luotu  
✅ AI-nimet: shuffledAINames() (Fortuna, Loki, Tykhe)
✅ Kortin rakenne: { s, r, v, id }
✅ Värijärjestelmä: SUIT_COLOR
✅ SFX-mallit

## Seuraavat vaiheet
1. Testa 5 valmista peliä (1 peli kukin)
2. Viimeistele loput 4 peliä M-objektien ja addLog() korvausten avulla
3. Testa 4 loput peliä (1 peli kukin)
4. Koko kokoelma testaus (1 peli jokainen)
