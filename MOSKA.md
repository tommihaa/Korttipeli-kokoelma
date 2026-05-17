# Moska

## Pelitapa

Jokaiselle jaetaan 6 käsikorttia. Pakan pohjakortti osoittaa valttimaan ja jää näkyville pakan alle.

Tavoite: pääse kortit käsistä ensimmäisenä. Viimeinen pelaaja jolla on kortit on **Moska**.

## Vuoron kulku

### Hyökkääjän vuoro
1. Hyökkääjä lyö pöytään yhden tai useamman **saman vahvuisen** kortin
2. **Rajoitus**: hyökkäyksessä ei saa käyttää enemmän kortteja kuin puolustajalla on kädessään

### Puolustajan vuoro
1. Puolustaja **kaataa** jokaisen kortin:
   - Saman maan **suuremmalla** kortilla **tai**
   - **Valttimalla** (maa ei merkitse)
2. **Seuraavassa pelaajassa** tulee **uusi puolustaja**, joka hänkin voi tehdä saman

### Hyökkäyksen jatkaminen
- Kuka tahansa hyökkääjä voi **lisätä samoja vahvuuksia** mitä puolustuksessa on käytetty
- Rajoitus: puolustajalla on oltava **riittävästi kortteja** kaataa ne

## Erityissäännöt

### Valttikakkosen automaattinen vaihto
- Valttikakkosen (2♣, 2♠, 2♥, 2♦ riippuen valttista) haltija saa **alkuperäisen pakan pohjakortin**
- Vaihto tapahtuu **automaattisesti** pelin alussa — dramaattinen hetki!

### Nostorutiini
1. Nostopakka käydessä vähiin pelaajat miettivät taktikointia
2. Oma käsi täydennetään **kuuteen** vasta **puolustusyrityksen päätyttyä**
3. **Puolustus onnistuu** → pöydän kortit poistopakkaan, hyökkääjät nostavat ensin (hyökkäysjarjestys), puolustaja viimeisenä
4. **Hyökkäys onnistuu** → puolustaja nostaa kaikki pöydän kortit, ei nosta pakasta

## Pisteet ja ranking

Pelin lopussa muodostuu ranking:
1. Ensimmäinen joka pääsi kortista eroon
2. Toinen, kolmas jne.
3. **Viimeinen jolla on kortit on Moska** — häviää

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Pöydän kortit ovat **näkyvät kaikille** (hyökkäys- ja puolustuskortti)
- Muiden pelaajien kädet ovat **piilossa**
- Valttimaa on **näkyvä kaikille** (pakan pohjalla)
- Nostopakan koko on **näkyvä kaikille**
- Kuka on hyökkääjä, puolustaja ja siirretyt puolustajat ovat **selviä** pelinjohdon kautta

## AI-strategia

### AI:n hyökkäys
1. Etsi korttiryhmiä saman vahvuuden mukaan
2. Lyö säästävästi — ei tarvitse lyödä kaikkia samaa vahvuutta kerralla
3. Huomioi puolustajan käden koko (rajoitus!)

### AI:n puolustus
1. **Priorisoi**: sama maa suuremmalla → valtti
2. Kaata pienimmällä voittavalla kortilla (säästää valtteja)
3. Jos ei voi kaataa → nosta kaikki pöydän kortit

### AI:n siirretyn puolustajan logiikka
1. Arvio: pystynkö kaatamaan paremmin kuin nykyinen puolustaja?
2. Siirry vain jos näet paremmat mahdollisuudet

### AI:n lisäämisen logiikka
1. Lisää vain saman vahvuuksia joita puolustus on käyttänyt
2. Huomioi puolustajan käden koko — riskiarvioi

## Pakka- ja kierroskoko

- **4 pelaajaa**: noin 6–10 kierrosta
- **3 pelaajaa**: noin 8–13 kierrosta
- **2 pelaajaa**: noin 13–20 kierrosta
- Riippuu hyökkäys/puolustus-dynamiikasta ja valteista

## Pelin luonne

Moska on **vaativin peli** kokoelmassa. Se yhdistää:
- **Hyökkäys/puolustus-dynamiikka** — puolustaja voi siirtää hyökkäyksen
- **Taktiikka** — hyökkäyksen jatkaminen ja rajoitukset
- **Psykologia** — mitä kortteja näytetään, milloin siirretään
- **Dramaattisuus** — valttikakkosen vaihto ja viimeinen pelaaja (Moska)

Valttikakkosen automaattinen vaihto on pelin keskeinen "plot twist" — voi vaihtaa pelin dynamiikkaa täysin.
