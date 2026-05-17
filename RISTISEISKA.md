# Ristiseiska

## Pelitapa

Kaikki kortit jaetaan tasan pelaajille. Pöytä on tyhjä — kortit rakennetaan pelissä. Tavoite: pääste kortit käsistä ensimmäisenä.

Se pelaaja, jolla on **ristiseiska (♣7)** aloittaa ja lyö sen pöytään.

## Pöydän rakentaminen

Pöytä rakentuu **neljän maan joukoiksi**. Kukin maa laajenee **seiskasta (7) kumpaankin suuntaan**:

- **Ylös**: 8 → 9 → 10 → J → Q → K
- **Alas**: 6 → 5 → 4 → 3 → 2 → A

**Esimerkki seiskan (♣7) ympärillä:**
```
        K
        Q
        J
        10
        9
        8
♠7 ♣7 ♥7 ♦7
A
2
3
4
5
6
```

## Vuoron kulku

1. Omalla vuorolla on **lyötävä yksi** sallittu kortti — **tai passattava**
2. **Sallitut kortit**:
   - Mikä tahansa **7** (avaa uuden maan, jos pöytä tyhjä)
   - Jatko **olemassa olevaan jonoon** (esim. jos ♣8 on pöydässä, voi lyödä ♣9)
3. Passaus on **sallittu vain jos ei käy** — mutta **voi lyödä vain yhden kortin per vuoro**


## Erityissäännöt ja kiusanteko

Ristiseiskan juoni on **kiusanteko-elementti**:

- **5 vaatii 8 ensin**: et voi lyödä 5:tä ennen kuin 8 on pöydässä (ala-pino lukittu)
- **8 vaatii 6 ensin**: et voi lyödä 8:ta (ylös) ennen kuin 6 on pöydässä (käänteis-rajoitus!)
- **6 vaatii 7 ensin**: et voi lyödä 6:ta (alas) ennen kuin 7 on pöydässä

**Bonusvuorot:**
- **A kaataa ala-pinon** (1–6) → saat yhden, ei pakollisen **bonusvuoron**
- **K kaataa ylä-pinon** (8–13) → saat yhden, ei pakollisen **bonusvuoron**

## Pelin loppu

- Ensimmäinen pelaaja joka **tyhjentää kätensä** voittaa
- Muut jatkavat **sijoituksista** (toinen, kolmas jne.)
- Viimeinen pelaaja jolla on kortit saa alin sijoitus

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman kätensä** koko ajan
- Pöydän kortit ovat **näkyvät kaikille** (kaikki lyödyt kortit)
- Muiden pelaajien kädet ovat **piilossa** (kortiluku näkyvä)
- Pöydän rakenne on **selvästi näkyvä** (mitkä maat aktiivisia)

## AI-strategia

### AI:n pelaamisen prioriteetti
1. **Seiskat ensin**: avaa uusia maita strategisesti
2. **Vältä porttikortteja** (6 ja 8) — käytä ne vain välttämättä
   - Syy: 6 lukitsee pöydän (5 ei voi astua vielä)
   - Syy: 8 lukitsee pöydän (väärin)
3. **Pelaa pienin arvo muista**: 2, 3, 4, 5, 9, 10, J, Q, K, A

### AI:n bonusvuorojen hyödyntäminen
- A ja K bonusvuorot: kaada aina kun voit, jatkaminen ei ole aina paras idea

### Passauslogiikka
- Passaa jos ei ole sallittua peliä

## Pelin luonne

Ristiseiska on **nerokas kiusantekopeli** jossa:
- Pöydän rakentaminen on **osittain säännellty** mutta avoin
- Kiusanteko-elementit (saman maan 5 vaatii 8, 8 vaatii 6, 6 vaatii 7) luovat **strategista syvyyttä**
- Bonusvuorot (A, K) antavat **kontrolli- ja palkkiota**
- Peli vaatii suunnitelmaa järjestyksestä, missä käyttää korttejaan. Monesti  sitä mahdollisuutta ei ole vaan pelaamainen on pakotettua.

Ristiseiska on **keskitason strateginen peli** jossa muistin, suunnittelun ja maan panttauksen balanssi on olennaista.
