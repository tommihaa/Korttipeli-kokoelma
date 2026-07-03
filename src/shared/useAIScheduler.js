import { useRef, useEffect } from 'react';

// Jaettu AI-vuoron ajastin-primitiivi kaikille peleille.
// Kapseloi ajastimen tila + siivous yhteen paikkaan; peli saa kahvan sen
// helpereihin (tm, schedAI) ja refeihin (pausedRef, allBotsRef, aiDelayRef).
//
// Refit palautetaan sellaisenaan, koska pelit kirjoittavat .current jatkuvasti
// (pausedRef.current = next togglePausessa, allBotsRef.current = mode Replayssa).
// useState-parit (setPaused/setAllBots/setAiDelayMs) + togglePause jäävät peliin —
// ne ohjaavat renderiä ja voivat sisältää pelikohtaista logiikkaa.
//
//   defaultDelay      — perusviive (Seiska 1200, muut 2000)
//   jitter            — satunnaislisä viiveeseen (Paskahousu 300, muut 400)
//   extraTimerRefs    — pelikohtaiset lisä-setTimeout-refit siivottavaksi (esim. [lastPlayTmr])
//   extraIntervalRefs — pelikohtaiset setInterval-refit siivottavaksi (esim. [reactInt])
export function useAIScheduler({
  defaultDelay = 2000,
  jitter = 400,
  extraTimerRefs = [],
  extraIntervalRefs = [],
} = {}) {
  const aiTmr      = useRef(null);
  const tmrs       = useRef(new Set());
  const pausedRef  = useRef(false);
  const allBotsRef = useRef(false);
  const aiDelayRef = useRef(defaultDelay);

  // Vahditon UI-ajastin — ei pysähdy Tauko-tilassa. Rekisteröi id:n siivousta varten.
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };

  // AI-siirtoajastin — pysähtyy Tauko-tilassa (recursive wait) ja skaalautuu
  // bottikamppailun (allBots) säädettävään viiveeseen.
  const schedAI = (fn, base) => {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    aiTmr.current = tm(() => {
      if (pausedRef.current) { const w = () => { if (!pausedRef.current) fn(); else tm(w, 300); }; w(); return; }
      fn();
    }, d + Math.random() * jitter);
  };

  // Pidä viimeisimmät lisärefit tallessa cleanupia varten (peli voi antaa uudet joka renderillä).
  const timerRefsRef    = useRef(extraTimerRefs);    timerRefsRef.current    = extraTimerRefs;
  const intervalRefsRef = useRef(extraIntervalRefs); intervalRefsRef.current = extraIntervalRefs;

  useEffect(() => () => {
    tmrs.current.forEach(clearTimeout);
    clearTimeout(aiTmr.current);
    timerRefsRef.current.forEach(r => r && clearTimeout(r.current));
    intervalRefsRef.current.forEach(r => r && clearInterval(r.current));
  }, []);

  return { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedAI };
}
