# Läpsy

## Pelitapa

Kaikki kortit jaetaan tasan pelaajille käsikorteiksi, joka on myös pino, kasvot alaspäin. Jokainen pelaaja kääntää vuorollaan käsikorteistaan päällimmäisen kortin keskelle, niin ettei hän näe kortin kasvopuolta ensimmäisenä. Tavoite: kerää kaikki kortit.

## Vuoron kulku

1. Jakajasta seuraava aloittaa kääntämällä pinonsa päällimmäisen kortin keskelle kasvot ylöspäin
2. Pelaajat jatkavat vuorotellen
3. **Jos kaksi päällimmäistä korttia ovat samat** → nopein läpsääjä voittaa kasan
4. Väärästä läpsäytyksestä → menetät pinosi päällimmäisen kortin kasaan
5. Voittaja ottaa kasan pinonsa alle

## Erityiskorttien haaste

Kun pelaaja lyö erityiskortin, hänelle asetetaan haaste:

- **Jätkä (J)** — seuraavalla pelaajalla on **1 kortti** aikaa vastata erityiskortilla
- **Kuningatar (Q)** — **2 korttia** aikaa
- **Kuningas (K)** — **3 korttia** aikaa  
- **Ässä (A)** — **4 korttia** aikaa

**Haasteeseen vastaaminen:**
- Jos vastaat **toisenlaisella erityiskortilla**, haaste siirtyy eteenpäin (esim. J:n jälkeen Q = 2 korttia lisää)
- Jos vastaat **samalla erityiskortilla**, nopein läpsääjä voittaa kasan
- Jos epäonnistut → erityiskortin lyönyt voittaa kasan

## Tietokoneversiossa

Tasapelitilanteet (kaksi läpsäävät samanaikaisesti) ratkaistaan sekuntilaskurilla — reaktionopeus ratkaisee.

## Pelaajien näkyvyys

- Jokainen pelaaja näkee **oman pinonsa** koko ajan
- Jokainen näkee **keskelle käännetyt kortit** (lyöntipakka)
- Muiden pelaajien pinojen **kokoa** näkee mutta ei sisältöä
- Voitettu kasa pistetään voittajan pinon alle — muut eivät näe sen sisältöä

## Pelin loppu

- Tavoite: kerää kaikki kortit.
- Muut jatkavat sijoituksista, jonka määrä pelistä poistumisjärjestys

## AI-strategia

AI:n pelilogiikka:
1. Nosta kortti pakasta ajanmukaisesti
2. Läpsää haasteen mukaisesti (1–4 korttia ennen kuin tulee haaste)
3. Nopea reaktio tasapelitilanteissa
4. Yksinkertainen strategia — näe peli enemmän reaktiopelinä kuin strategiapelinä

## Pelin luonne

Läpsy on **puhtaasti reaktiopeli** — strategian sijaan nopeus ja tarkkavaisuus ovat ratkaisevat. Erityiskorttien haasteet lisäävät jännitystä ja tekevät pelistä epäennustettavaa.
