# Mitä selain tallentaa Jakosta

Mitattu 19.8.2026 lähdekoodista (`src/`), ei muistettu. Toistettavissa:

```bash
grep -rn "savePref(\|useStickySetting(\|localStorage.setItem\|sessionStorage.setItem" src
grep -rn "document.cookie\|gtag\|analytics\|sendBeacon\|fetch(" src index.html
```

**Miksi tämä on kirjattu.** Kysymys tuli levityksen puolelta: jaettavan linkin ja QR-koodin
saaja ei voi tietää mitä sovellus tekee hänen laitteellaan, eikä sitä tiennyt tarkkaan
tekijäkään. Vastaus on nyt mitattu, ja se on lyhyt: sovellus tallentaa asetuksia ja tilastoja
selaimeen, eikä lähetä mitään minnekään.

## 1. `localStorage`, etuliite `jako:` (19 avainta)

| Avain | Mitä |
|---|---|
| `lang` | valittu kieli |
| `soundOn`, `soundTheme` | äänet päällä tai pois, äänipankki |
| `twoColorDeck` | korttipakan väritila |
| `showLog`, `showCounts`, `showLastPlay`, `showIntention`, `showNextBtn`, `showAIKnown` | kuusi näkyvyysvalintaa |
| `uiPreset` | käyttöliittymän esiasetus |
| `aiLevel` | vastustajan taso |
| `playerGroup` | vastustajien nimiryhmä |
| `visited` | onko sovelluksessa käyty ennen |
| `kasino:rules`, `paskahousu:rules`, `ristiseiska:rules` | kolmen pelin sääntövalinnat |
| `stats` | pelikohtaiset tilastot (voitot, tappiot, sijoitukset) |
| `sessions` | sovelluskäyntien määrä |

Kirjoitus ja luku kulkevat `src/shared/storage.js`:n kautta, joka nielee virheet hiljaa: jos
selain estää tallennuksen (privaattitila, kiintiö täynnä), peli jatkaa istuntotilassa kaatumatta.

## 2. `sessionStorage`, yksi avain

`jako:sessionStarted` merkitsee että pelisessio on laskettu tälle selainistunnolle. Se säilyy
sivun uudelleenlatauksen yli ja nollautuu välilehden sulkeutuessa.

## 3. Palvelutyöntekijän välimuisti

`public/sw.js` pitää välimuistia nimeltä `jako-v2`. Se sisältää sovelluksen omat tiedostot
(hashatut `assets`-tiedostot, `index.html`, manifesti, ikoni) ja on olemassa offline-käyttöä
varten. Lähdekarttoja ei tallenneta.

## Mitä ei tallennu eikä lähde

- **Ei evästeitä.** `document.cookie` ei esiinny lähdekoodissa kertaakaan.
- **Ei analytiikkaa eikä telemetriaa.** Ei `gtag`ia, ei `sendBeacon`ia, ei kolmannen osapuolen
  skriptejä. `index.html` ei lataa mitään ulkopuoliselta isännältä.
- **Ei kutsuja ulos.** Ainoa `fetch` on `src/shared/audio.js`:ssä ja hakee neljä äänitiedostoa
  omasta `/sfx/`-polusta, vasta kun torvi-kannel-teema on valittuna ja äänet päällä.
- **Ei pelitilaa.** Kesken jäänyt peli ei säily uudelleenlatauksen yli.
- **Ei huijaustilaa.** `seeAll` on tietoinen poikkeus: se nollautuu joka latauksessa, jottei
  peli jää huomaamatta siihen tilaan.
- **Ei henkilötietoa.** Mikään yllä olevista ei yksilöi käyttäjää, ja siksi suostumusbanneria ei
  ole.

## Yksi löydös, korjattu mittauksen yhteydessä

`src/shared/storage.js`:n oma kommentti sanoi että pelitila ja edistyminen eivät tallennu.
Pelitila ei tallennukaan, mutta `stats` ja `sessions` kirjoitetaan `localStorage`en
(`App.jsx`), ja `StatsPanel.jsx`:n kommentti sanoi tämän oikein. Väärässä oli siis juuri se
rivi joka kuvaa yksityisyyttä. Korjattu 19.8.2026.

## Mikä jää auki

Tämä dokumentti vastaa kysymykseen *mitä tapahtuu*, ei kysymykseen *miten se osoitetaan
vastaanottajalle etukäteen*. Jälkimmäinen on levityksen kysymys ja se on yhä avoin: linkin tai
QR-koodin saaja ei näe tätä tiedostoa ennen kuin hän on jo avannut sovelluksen. Lähde
kysymykselle: `Lahteet/louhinnat/07-nimettyjen-ryhmien-loput.md` kohta 7 (21.5.2026).
