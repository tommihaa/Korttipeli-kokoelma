let _ctx = null;
let _theme = 'oletus'; // 'oletus' | 'torvi-kannel' — ks. setTheme()

export function actx() {
  try {
    if (!_ctx || _ctx.state === 'closed')
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
  return _ctx;
}

/** Ääniteeman valinta (jako:soundTheme). "torvi-kannel" korvaa piippausäänet
 *  torvi-/kantelesynteesillä samassa suunnittelukuviossa kuin Superjatsissa
 *  ja Itussa (mekanismi jaetaan, koodi ei — kolme erillistä toteutusta). */
export function setTheme(theme) {
  _theme = theme === 'torvi-kannel' ? 'torvi-kannel' : 'oletus';
}

export function tone(freq, dur, gain = 0.22, type = 'sine', t0 = 0) {
  const c = actx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
  o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}

export function noise(dur, gain = 0.1, cutoff = 800, t0 = 0) {
  const c = actx(); if (!c) return;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = cutoff;
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(gain, c.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
  src.start(c.currentTime + t0); src.stop(c.currentTime + t0 + dur + 0.05);
}

/** Torviääneke: kaksi hieman eri viritettyä sahalaita-oskillaattoria alipäästö-
 *  suodattimen läpi + lyhyt attack-ramppi (vaskimainen, "huulistartti"). Sama
 *  resepti kuin Superjatsin `src/ui/sfx.ts`:n `horn()` — käytetään suurissa,
 *  harvinaisissa hetkissä (voitot). */
export function horn(freq, dur = 0.3, gain = 0.16, t0 = 0) {
  const c = actx(); if (!c) return;
  const start = c.currentTime + t0;
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 4, start);
  g.gain.setValueAtTime(0.001, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  [0, 6].forEach((detuneCents) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, start);
    o.detune.setValueAtTime(detuneCents, start);
    o.connect(lp);
    o.start(start); o.stop(start + dur + 0.05);
  });
  lp.connect(g).connect(c.destination);
}

/** Kantele-nypäisy: Karplus-Strong-synteesi (nypätty kieli). Kohinapurske
 *  syötetään DelayNode-silmukkaan, jonka paluuhaarassa alipäästösuodin tummen-
 *  taa sointia joka kierroksella ja gain (~0.98) hidastaa häipymää. Sama resepti
 *  kuin Superjatsin/Itun kantele() — Tommin oma 5-kielinen kantele inspiraationa,
 *  siksi taajuudet rajataan kutsujassa pieneen sävelvalikoimaan. */
export function kantele(freq, dur = 0.9, gain = 0.24, t0 = 0) {
  const c = actx(); if (!c) return;
  const start = c.currentTime + t0;
  const period = 1 / freq;
  const bufferSize = Math.max(2, Math.round(c.sampleRate * period));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;
  const delay = c.createDelay(1);
  delay.delayTime.setValueAtTime(period, start);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 3, start);
  const feedback = c.createGain();
  feedback.gain.setValueAtTime(0.98, start);
  const out = c.createGain();
  out.gain.setValueAtTime(gain, start);
  out.gain.exponentialRampToValueAtTime(0.001, start + dur);

  src.connect(delay);
  delay.connect(lp);
  lp.connect(feedback);
  feedback.connect(delay); // silmukka: kieli soi kunnes gain vaimentaa sen
  delay.connect(out).connect(c.destination);
  src.start(start);

  setTimeout(() => {
    [src, delay, lp, feedback, out].forEach((n) => n.disconnect());
  }, (dur + t0 + 0.15) * 1000);
}

/** Nouseva/laskeva sävelkulku jommallakummalla primitiivillä — yhteinen
 *  helper teemakohtaisille arpeggioille (esim. reveal, score, fanfare). */
function run(fn, freqs, { step = 0.1, ...opts } = {}) {
  freqs.forEach((f, i) => fn(f, { ...opts, t0: i * step }));
}

const oletusSfx = {
  // Korttitoiminnot — card actions
  flip:        () => { noise(0.04, 0.06, 1400); tone(900, 0.03, 0.08, 'sine'); },       // nosto/käännös
  play:        () => { noise(0.04, 0.07, 1200); tone(600, 0.05, 0.1, 'sine'); },        // kortin pelaus (hyökkäys)
  capture:     () => { noise(0.06, 0.12, 1000); tone(550, 0.1, 0.2, 'triangle'); },     // korttien otto pöydältä
  leave:       () => { noise(0.04, 0.06, 800); tone(300, 0.05, 0.08, 'sine'); },        // lasku/syöttö
  swap:        () => { noise(0.06, 0.1, 900); tone(400, 0.08, 0.15, 'triangle'); },     // korttien vaihto
  reveal:      () => { tone(440, 0.15, 0.2, 'triangle'); tone(554, 0.15, 0.2, 'triangle', 0.15); tone(659, 0.4, 0.25, 'triangle', 0.3); }, // piilokortit paljastetaan
  take:        () => { tone(200, 0.3, 0.18, 'sawtooth'); noise(0.2, 0.12, 500, 0.05); }, // pakkootto (tappio)
  beat:        () => { tone(440, 0.08, 0.2, 'triangle'); tone(660, 0.12, 0.18, 'triangle', 0.06); }, // torjunta onnistuu
  build:       () => { tone(440, 0.1, 0.2, 'square'); tone(660, 0.15, 0.18, 'square', 0.1); },       // rakennus (Kasino)
  // Erityistapahtumat — special events
  tikki:       () => { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 0.25, 'triangle', i * 0.1)); }, // mokki/tikki (Kasino)
  maija:       () => { [180, 150, 120].forEach((f, i) => tone(f, 0.5, 0.2, 'sawtooth', i * 0.2)); },  // Maija-kortti
  slap:        () => { noise(0.08, 0.22, 900); tone(220, 0.15, 0.18, 'sawtooth'); },    // läpsäys (Läpsy)
  wrongSlap:   () => { tone(120, 0.3, 0.2, 'sawtooth'); tone(90, 0.4, 0.15, 'sawtooth', 0.15); },    // väärä läpsäys
  winPile:     () => { tone(523, 0.1, 0.2, 'triangle'); tone(659, 0.1, 0.2, 'triangle', 0.1); tone(784, 0.25, 0.25, 'triangle', 0.2); }, // pino voitettu
  challenge:   () => { tone(440, 0.08, 0.2, 'square'); tone(550, 0.12, 0.2, 'square', 0.08); },       // haaste (Läpsy)
  reactWin:    () => { tone(523, 0.12, 0.25, 'triangle', 0); tone(659, 0.12, 0.25, 'triangle', 0.1); tone(784, 0.18, 0.3, 'triangle', 0.2); },
  reactWrong:  () => { noise(0.5, 0.18, 0); tone(180, 0.4, 0.3, 'sawtooth', 0.05); tone(120, 0.5, 0.2, 'sawtooth', 0.3); },
  lastCardWin: () => { tone(523, 0.15, 0.3, 'triangle', 0); tone(659, 0.15, 0.3, 'triangle', 0.15); tone(784, 0.15, 0.3, 'triangle', 0.3); tone(1047, 0.6, 0.35, 'triangle', 0.45); },
  // Virstanpylväät — milestones
  score:       () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.1, 0.22, 'triangle', i * 0.11)); }, // pistemerkki
  fanfare:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.12, 0.25, 'triangle', i * 0.12)); }, // voitto
};

/** Torvi & kantele -teema: korttitoiminnot ja pienet reaktiot ovat kantele-
 *  nypäisyjä, harvinaiset isot voitot torvifanfaareja. Virhetilanteet (wrongSlap/
 *  reactWrong) pysyvät matalina kantele-nypäisyinä — torvi on juhlaa varten. */
const hornKanteleSfx = {
  flip:        () => kantele(880, 0.35, 0.16),
  play:        () => kantele(660, 0.4, 0.18),
  capture:     () => { kantele(587, 0.5, 0.2); kantele(880, 0.45, 0.14, 0.08); },
  leave:       () => kantele(392, 0.35, 0.14),
  swap:        () => { kantele(440, 0.4, 0.16); kantele(587, 0.4, 0.14, 0.08); },
  reveal:      () => run(kantele, [440, 554, 659], { step: 0.15, dur: 0.6, gain: 0.14 }),
  take:        () => kantele(220, 0.6, 0.18),
  beat:        () => { kantele(440, 0.3, 0.16); kantele(660, 0.35, 0.14, 0.06); },
  build:       () => { kantele(440, 0.35, 0.16); kantele(660, 0.4, 0.14, 0.1); },
  tikki:       () => run(kantele, [523, 659, 784], { step: 0.1, dur: 0.5, gain: 0.15 }),
  maija:       () => run(kantele, [180, 150, 120], { step: 0.2, dur: 0.6, gain: 0.18 }),
  slap:        () => kantele(220, 0.3, 0.2),
  wrongSlap:   () => { kantele(160, 0.4, 0.16); kantele(120, 0.45, 0.13, 0.1); },
  winPile:     () => [523, 659, 784].forEach((f, i) => horn(f, 0.28, 0.13, i * 0.1)),
  challenge:   () => { kantele(440, 0.3, 0.16); kantele(550, 0.35, 0.14, 0.08); },
  reactWin:    () => [523, 659, 784].forEach((f, i) => horn(f, 0.26, 0.13, i * 0.1)),
  reactWrong:  () => { kantele(180, 0.45, 0.16, 0.05); kantele(120, 0.55, 0.14, 0.3); },
  lastCardWin: () => { [523, 659, 784].forEach((f, i) => horn(f, 0.3, 0.14, i * 0.15)); horn(1047, 0.75, 0.06, 0.45); },
  score:       () => run(kantele, [523, 659, 784, 1047], { step: 0.11, dur: 0.5, gain: 0.15 }),
  fanfare:     () => { [523, 659, 784, 1047].forEach((f, i) => horn(f, 0.26, 0.14, i * 0.12)); horn(1047, 0.7, 0.06, 0.55); },
};

export const SFX = new Proxy({}, {
  get(_target, name) {
    return (_theme === 'torvi-kannel' ? hornKanteleSfx : oletusSfx)[name];
  },
});
