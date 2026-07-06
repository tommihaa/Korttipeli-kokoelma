// Kaikkien SFX-tapahtumien (audio.js) nimet + suomenkieliset selitteet yhdessä
// paikassa. Käytetään sekä efektit.html-kehitystyökalussa että sovelluksen sisäisessä
// "Kokeile ääniä" -paneelissa (App.jsx), jotta lista ei toistu kahdessa paikassa.
export const SFX_CATALOG = [
  // Korttitoiminnot — card actions
  ['flip', 'Nosto/käännös'],
  ['play', 'Kortin pelaus'],
  ['capture', 'Korttien otto pöydältä'],
  ['leave', 'Lasku/syöttö'],
  ['swap', 'Korttien vaihto'],
  ['reveal', 'Piilokorttien paljastus'],
  ['take', 'Pakkootto (tappio)'],
  ['beat', 'Torjunta onnistuu'],
  ['build', 'Rakennus (Kasino)'],
  // Erityistapahtumat — special events
  ['tikki', 'Mokki/tikki (Kasino)'],
  ['maija', 'Maija-kortti'],
  ['slap', 'Läpsäys (Läpsy)'],
  ['wrongSlap', 'Väärä läpsäys'],
  ['winPile', 'Pino voitettu'],
  ['challenge', 'Haaste (Läpsy)'],
  ['reactWin', 'Reaktio onnistui'],
  ['reactWrong', 'Reaktio epäonnistui'],
  ['lastCardWin', 'Viimeinen kortti pelattu voittoon'],
  // Virstanpylväät — milestones
  ['score', 'Pistemerkki'],
  ['fanfare', 'Voitto'],
];
