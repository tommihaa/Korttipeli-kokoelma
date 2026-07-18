# Botbench — bottien voimamittari

Itsepeluu-benchmark joka mittaa AI-tasojen (Oppipoika/beginner, Kisälli/normal,
Mestari/hard) todellista voimaeroa: taso A vastaan taso B, istuimet vuorotellen
ABAB/BABA, 4 pelaajaa, siemennetty satunnaisuus (toistettava).

## Ajo

```powershell
$env:BOTBENCH='1'; npx vitest run test/botbench.test.jsx; Remove-Item Env:BOTBENCH
```

Valinnaiset ympäristömuuttujat: `BOTBENCH_N` (pelejä/pari, oletus 20),
`BOTBENCH_GAMES` (esim. `Moska,Kasino`), `BOTBENCH_PAIRS` (esim. `hard:beginner`),
`BOTBENCH_OUT` (JSON-rivien tulostiedosto). Ei aja osana `npm test`iä.

Tekninen perusta: pelien valinnainen `botLevels`-prop (istuinkohtainen AI-taso;
`null` = tuotantokäytös). Mittari yhdistää tulossijoitukset istuimiin
snapshot-framejen nimistä.

## Baseline 17.7.2026 (N=30/pari, siemennetty)

Luku = ensin mainitun tason voitto-osuus (tasapelit puolikkaina). Otoskoolla 30
keskivirhe on n. ±9 %-yks., joten yksittäinen 40–60 % on kohinaa; toistuva kuvio
yli pelien ei ole.

| Peli        | hard vs beginner | hard vs normal | normal vs beginner |
|-------------|-----------------:|---------------:|-------------------:|
| Läpsy       | 97 % | 87 % | 37 % → korjattu, ks. alla |
| Seiska      | 80 % | 60 % | 60 % |
| Paskahousu  | 70 % | 43 % | 53 % |
| Kultakala   | 67 % | 40 % | 30 % |
| Moska       | 67 % | 47 % | 57 % |
| Ristiseiska | 63 % | 57 % | 53 % |
| Koputus     | 58 % | 37 % | 38 % |
| Kasino      | 52 % | 40 % | 50 % |
| Maija       | 50 % | 47 % | 50 % |

Yhteenlaskettuna yli kaikkien pelien (270 peliä/pari):
hard vs beginner **67 %**, hard vs normal **51 %**, normal vs beginner **47 %**.

## Löydökset (baseline)

1. **Tasoladder ei ole monotoninen.** Mestari voittaa Oppipojan selvästi (67 %),
   mutta Kisälli EI voita Oppipoikaa (47 %) eikä Mestari Kisälliä (51 %).
   Nykyinen tasomekanismi (sama heuristiikka + virhekohina 0/15/50 %) ei tuota
   tasaista porrasta: 15 %:n kohina ei juuri haittaa, ja Mestarin lisäkyvyt
   näkyvät vain osassa pelejä.
2. **Läpsyn Kisälli oli hitaampi kuin Oppipoika** (37 % Oppipoikaa vastaan).
   Ajoitustaulukon suora seuraus: beginner-keskireaktio ~1550 ms, normal
   ~1700 ms (Lapsy.jsx, handleMatch). Oppipoika siis läpsyi nopeammin.
   **KORJATTU 17.7.2026**: Oppipoika hidastettu ~2400 ms:iin (normal/hard
   ennallaan, jotta ihmistä vastaan pelattavat tasot eivät muutu). Välivaihe
   ~2000 ms ei riittänyt (voitot 50/50, koska osa Läpsyn voitoista ratkeaa
   haastekorteilla eikä läpsynopeudella). Mitattu korjauksen jälkeen (N=30):
   hard vs beginner **100 %**, hard vs normal **87 %**, normal vs beginner
   **77 %** — porras monotoninen.
3. **Kasino ja Maija: tasoilla ei mitattavaa eroa** (52 %/50 % hard vs beginner).
   Kasinon hienostunut inferenssi ei realisoidu voitoiksi; Maijassa
   kohinavirheet eivät ilmeisesti maksa mitään. Molemmat ansaitsevat
   jatkotutkinnan ennen kuin tasoja mainostetaan pelaajalle vaikeuseroina.
4. **Kultakala ja Koputus: Kisälli häviää Oppipojalle** (30 %/38 %) — sama
   epämonotonisuus kuin Läpsyssä, syy selvittämättä.
5. **Paskahousun sekatasopeli pattiutui ilman yhtäkkistä kuolemaa.** Mestarin
   optimipeli tuottaa ikuisen loppupelisilmukan myös heikompaa vastaan; korjattu
   niin että pattikatkaisija virittyy kun vähintään yksi istuin on Mestari
   (tuotantokäytös ennallaan).

Terveimmät ladderit: Seiska, Ristiseiska, Moska (+ Läpsyn hard). Ne voivat
toimia referenssinä kun muiden pelien tasoja korjataan.

## Kyvykkyysporras 17.7.2026 (Kultakala, Koputus, Maija, Kasino)

Neljän rikkinäisen pelin tasoerot rakennettiin uudelleen kyvykkyyksinä
satunnaiskohinan (`aiShouldFumble`) sijaan: Oppipojalla on deterministisiä
inhimillisiä heikkouksia, Kisällillä täysi perusstrategia, Mestarilla lisäkyvyt.
Kohina poistettu näistä neljästä kokonaan.

| Peli      | Oppipoika (heikkoudet) | Kisälli | Mestari (lisäkyvyt) |
|-----------|------------------------|---------|----------------------|
| Kultakala | ketju jatkuu vain A-3:lla; ottaa poistopakasta "melkein hyvän" (+3) | täysi ketjuvaihto | EV-vertailu: huonoin tunnettu vs. tuntematon (EV 7), kynnys ≥3 |
| Koputus   | ei huomaa poistopakkaa; arka koputtaja (kynnys 5) | poistopakka; koputus 8; tuntemattoman täyttö vain A/2 | tuntemattoman EV-täyttö ≤4; realistisempi arvio (×6); poistopakasta EV-nosto |
| Maija     | isot kortit ensin; kohtelee Maijaa tavallisena patana (ei dumppausta, ei karttelua); polttaa valtit | pienimmät ensin + Maija-prioriteetti + valttiepäröinti | + valttilaskenta pakan loputtua + kaatoprioriteetti (Maija/korkeat ensin) |
| Kasino    | määräkaappaus (ei pisteitä); ei rakenna/varasta/bonuksia; jättää "pienimmän" numeroarvon mukaan (ässä!) | pistekaappaus + rakentaminen aina + varastus + bonukset | + inferenssi: jättövaara, A-suoja, rakennuksen varastusriskiportti |

Mittaustulokset muutosten jälkeen (N=40/pari):

| Peli      | hard vs beginner | hard vs normal | normal vs beginner |
|-----------|-----------------:|---------------:|-------------------:|
| Koputus   | 66 % | 68 % | 65 % |
| Kultakala | 70 % | 45 % | 65 % |
| Maija     | 63 % | 48 % | 60 % |
| Kasino    | 51 % | 50 % | 54 % |

(Kultakalan ja Maijan luvut päivitetty pelitesti-inhimillistyksen jälkeen,
ks. löydös 4.)

Opit ja rajat:

1. **Koputus korjautui täysin** (66/68/65, aiemmin 58/37/38). Kaksi mitattua
   oivallusta: aikainen koputus on ETU (alkuperäinen "aloittelija koputtaa
   liian aikaisin" -virhe oli oikeasti lahja → Oppipojan heikkous on nyt
   arkuus), ja tuntemattoman paikan EV-täyttö (KOPUTUS.md:n oma strategiaohje,
   jota botit eivät koskaan toteuttaneet) on Mestarin päävahvuus.
2. **Kultakala ja Maija**: porras beginneriä vastaan kunnossa (60-73 %), mutta
   hard ≈ normal. Nollahypoteesitesti (identtiset botit → sama jakauma kuin
   "erilaiset") osoitti että kärkiero hukkuu nosto-/jakotuuriin näillä
   otoksilla. Kirjattu pelin ominaisuutena, ei rikkinäisyytenä.
3. **Kasino on tuuripeli botti-erojen erotuskyvyn kannalta** (kaikki parit
   ~50 %). Viisi eri heikennystä/vahvennusta ei liikuttanut voittoja, vaikka
   mittari todistetusti reagoi Kasinon koodimuutoksiin (parinäkö-kokeilu
   liikutti lukuja). Tärkein löydös silti: Mestarin vanha rakennus-EV-portti
   ("rakenna vain jos arvo > 1.5 × kaappaus") oli HAITALLINEN (40 % Kisälliä
   vastaan kahdesti); rakentaminen on Kasinossa vahva siirto, ja portti
   korvattiin varastusriskirajalla.
4. **Pelitesti-inhimillistys (17.7. ilta):** kaksi Oppipojan heikkoutta näytti
   ihmispelaajalle absurdilta ja pehmennettiin mittaria vasten: Kultakalan
   ketjukielto heitti paljastuneita ässiä poistopakkaan (nyt: ketju jatkuu
   ilmiselvällä A-3-kortilla; ero haetaan poistopakka-ahneudella +3) ja Maijan
   Oppipoika hamstrasi Maijaa loppuun asti, koska kortti oli suljettu pois
   hyökkäysryhmistä (nyt: tavallinen pata, lähtee isot ensin -tyylillä).
   Mittaus inhimillistyksen jälkeen: Kultakala 70/45/65, Maija 63/48/60.
   Oppi: heikkouden pitää olla paitsi mitattava myös USKOTTAVA — "botti ei
   tee ilmeistä siirtoa" rikkoo illuusion nopeammin kuin heikko strategia.
5. Kuollutta koodia siivottu: Kultakalan käyttämätön "PHASE 1-3" -analyysi
   (uhka-arvio, dynaaminen kynnys, paikkavalinta) poistettu/otettu osin
   käyttöön; Kasinon findWorstCapture poistettu.

## Käyttö jatkossa

Jokainen AI-muutos todennetaan ajamalla sama mittaus ja vertaamalla tähän
tauluun. Päivitä taulu ja päivämäärä kun baseline muuttuu tarkoituksella.
