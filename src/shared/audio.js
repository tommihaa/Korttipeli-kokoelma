let _ctx = null;

export function actx() {
  try {
    if (!_ctx || _ctx.state === 'closed')
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
  return _ctx;
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

export const SFX = {
  // Kasino
  capture: () => { noise(0.06, 0.12, 1000); tone(550, 0.1, 0.2, 'triangle'); },
  tikki:   () => { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 0.25, 'triangle', i * 0.1)); },
  leave:   () => { noise(0.04, 0.06, 800); tone(300, 0.05, 0.08, 'sine'); },
  build:   () => { tone(440, 0.1, 0.2, 'square'); tone(660, 0.15, 0.18, 'square', 0.1); },
  score:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.1, 0.22, 'triangle', i * 0.11)); },
  // Koputus
  flip:        () => { noise(0.04, 0.06, 1400); tone(900, 0.03, 0.08, 'sine'); },
  reactWin:    () => { tone(523, 0.12, 0.25, 'triangle', 0); tone(659, 0.12, 0.25, 'triangle', 0.1); tone(784, 0.18, 0.3, 'triangle', 0.2); },
  reactWrong:  () => { noise(0.5, 0.18, 0); tone(180, 0.4, 0.3, 'sawtooth', 0.05); tone(120, 0.5, 0.2, 'sawtooth', 0.3); },
  lastCardWin: () => { tone(523, 0.15, 0.3, 'triangle', 0); tone(659, 0.15, 0.3, 'triangle', 0.15); tone(784, 0.15, 0.3, 'triangle', 0.3); tone(1047, 0.6, 0.35, 'triangle', 0.45); },
  // Läpsy
  slap:      () => { noise(0.08, 0.22, 900); tone(220, 0.15, 0.18, 'sawtooth'); },
  wrongSlap: () => { tone(120, 0.3, 0.2, 'sawtooth'); tone(90, 0.4, 0.15, 'sawtooth', 0.15); },
  winPile:   () => { tone(523, 0.1, 0.2, 'triangle'); tone(659, 0.1, 0.2, 'triangle', 0.1); tone(784, 0.25, 0.25, 'triangle', 0.2); },
  challenge: () => { tone(440, 0.08, 0.2, 'square'); tone(550, 0.12, 0.2, 'square', 0.08); },
};
