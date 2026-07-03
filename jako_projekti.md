# JAKO — Korttipelien kokoelma
## Projektidokumentti

---

## Projektin kuvaus

**Jako** on korttipelisovellus joka kokoaa enimmäkseen suomalaisia versioita korttipelisuosikeistani yhteen. Nimi tulee korttipelien jako-termistä. Sovelluksessa on kaksi tilaa: opetustila ja vapaa tila. Kehitetty React-pohjaisena sovelluksena, tavoitteena toimia sekä säännöstönä että pelattavana sovelluksena selaimessa ja mobiilissa.

---

## Termistö

Yhtenäinen termistö jota käytetään kaikissa peleissä:

- **Pöytäkortti** — pelaajan omat piilossa olevat kortit (Koputus, Kultakala, Läpsy)
- **Pöytä** — yhteinen alue keskellä (Maija, Moska, Kasino)
- **Pino** — pelaajan nostamaton korttipino (Läpsy)
- **Kasa** — voitetut kortit (Läpsy) / kaapattavat kortit (Kasino)
- **Kaataa** — Maijassa ja Moskassa
- **Kaapata** — Kasinossa (eri mekaniikka, ei kaatopakkaa)
- **Hyökkääjä / Puolustaja** — Moskassa
- **Käsikortti** — pelaajan kädessä olevat kortit (Maija, Kasino)
- **Nostopakka** — pakka josta nostetaan
- **Kaatopakka** — poistettujen tai hylättyjen korttien pakka
- **Lyöntipakka** — keskelle lyödyt kortit; digitaalisessa versiossa siisti pino, livessä käytännössä härökasa kortteja suurin piirtein päällekkäin
- **Käsi** — pelaajan kädessä olevat kortit yleiskäsitteenä (vrt. *Käsikortti* joka on pelin sisäinen termi Maijassa ja Kasinossa)
- **Etukäsi** — jakajan vasemmalla puolella istuva pelaaja, joka yleensä aloittaa pelin

---

## Pelitilat

### Opetustila 🎓
- Ohjattu läpikäynti
- Tekoäly neuvoo ja selittää siirtoja
- Ei aikapaineita
- Säännöt auki sivussa tarvittaessa
- Visuaaliset värit: sininen (#5ba8d4)

### Vapaa tila 🃏
- Puhdas peli ilman opastusta
- Klassinen tunnelma, omat päätökset
- Visuaaliset värit: kulta/vihreä (#c9a84c)

---

## Ääni- ja efektiperiaatteet

- **Äänet oletuksena pois** kaikissa tiloissa — löydettävissä asetuksista
- **Boss-fight-hetket** joissa ääni on perusteltua (jos pelaaja sen sallinut):
  - Valttikakkonen vaihtuu automaattisesti → kultainen transformaatio
  - Patakuningatar jää viimeiselle → dramaattinen häviö
  - Läpsy: koko pakka kerätty yhdellä läpsäytyksellä
  - Kasino: täydellinen tikki joka tyhjentää pöydän ja ratkaisee pelin
  - Moska: viimeinen pelaaja jää yksin korttien kanssa
  - Kultakala: tuntematon paljastetaan tasatilanteessa

---

## Pelien kehitysjärjestys

Alkuperäiset kuusi:
1. Koputus (yksinkertaisin mekaniikka, hyvä aloituspiste)
2. Läpsy (reaktiopeli, sopii mobiiliin)
3. Kultakala (muistipeli, tuntematon elementti — lisätty ystävän pyynnöstä)
4. Maija (valttimaa, hyökkäys/puolustus)
5. Kasino (kaappausmekaniikka, pisteet)
6. Moska (monimutkaisin)

Myöhemmin lisätyt: Seiska, Ristiseiska, Paskahousu. Kokoelmassa on nyt **yhdeksän peliä**.

---

## Pelit ja säännöt

> **Kunkin pelin täydet säännöt ovat omassa kanonisessa PELI.md-tiedostossaan** —
> koodia vasten todennettuina. **Tähän dokumenttiin ei toisteta pelisääntöjä**, jotta ne
> eivät ajaudu erilleen totuudesta (aiemmin näin kävi: Kasinon pisteraja, Seiskan
> Lappu-sakko ja Paskahousun 10/7-säännöt olivat rapistuneet tänne). Muokkaa aina
> kanonista tiedostoa; lue se ennen sääntölogiikan koskemista (ks. `CLAUDE.md`).

| Peli | Tyyppi | Pelaajia | Kanoniset säännöt |
|---|---|---|---|
| Koputus | Muistipeli | 2–4 | [KOPUTUS.md](KOPUTUS.md) |
| Läpsy | Reaktiopeli | 2–4 | [LAEPSY.md](LAEPSY.md) |
| Kultakala | Muistipeli | 2–4 | [KULTAKALA.md](KULTAKALA.md) |
| Maija | Kaatopeli | 2–4 | [MAIJA.md](MAIJA.md) |
| Kasino | Kaappaaminen (pisteraja 16) | 2–4 | [KASINO.md](KASINO.md) |
| Moska | Hyökkäys/puolustus | 2–4 | [MOSKA.md](MOSKA.md) |
| Seiska | UNO-tyyppinen | 2–4 | [SEISKA.md](SEISKA.md) |
| Ristiseiska | Kiusantekopeli | 3–4 | [RISTISEISKA.md](RISTISEISKA.md) |
| Paskahousu | Laituripeli | 2–4 | [PASKAHOUSU.md](PASKAHOUSU.md) |

**Pelaajamäärä (2–4).** Perinteisesti moni näistä peleistä sallii jopa 6 pelaajaa,
mutta sovellus rajaa **enintään neljään**: kuuden pelaajan käsikortit eivät mahdu
kännykän näytölle luettavasti. Rajaus on tietoinen toteutuspäätös, ei alkuperäinen
korttipelin sääntö. `playerCount` valitaan kunkin pelin aloitusnäytöllä (2/3/4).

---

## Tekninen toteutus

**Teknologia:** React 18 + Vite, JSX, inline styles, CSS-animaatiot. Ei TypeScriptiä eikä ylimääräisiä npm-riippuvuuksia. Oma kevyt i18n (23 kieltä).
**Rakenne:**
- `src/App.jsx` — sovelluksen runko (valikko, asetukset, navigaatio)
- `src/games/*.jsx` — yhdeksän peliä (Koputus, Läpsy, Kultakala, Maija, Kasino, Moska, Seiska, Ristiseiska, Paskahousu)
- `src/shared/` — jaetut komponentit ja apurit (Card, FanStack, colors, helpers, audio)

**Navigaatiovirtaus:**
Etusivu → Pelin sivu → Säännöt TAI Tilanvalinta → Pelitila

**Väripaletti:**
- Tausta: #1f5a3f (tummanvihreä)
- Kulta: #c9a84c
- Teksti: #f0e6cc
- Opetustila: #5ba8d4
- Helppo: #4caf7d, Keskitaso: #e0a93b, Vaativa: #e05c3b

**Olio-rakenne:** Jokainen peli on objekti `games`-taulukossa. Uuden pelin lisääminen = uuden objektin lisääminen samassa muodossa.

---

## Muistiinpanot kehitykseen

- Äänet oletuksena pois — löydettävissä asetuksista
- Valttimaa aina pakan pohjimmaisesta kortista (Maija ja Moska yhdenmukaistettu)
- Kultakalan tuntematon-elementti on pelin keskeinen satunnaistaja
- Kultakalan noppafinaalit ovat spektaakkelihetki
- Moskan valttikakkosen automaattinen vaihto on live-pelin hienous joka säilytetään
