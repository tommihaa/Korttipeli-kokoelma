import { useState, useEffect, useRef } from 'react';
import { BACKS } from './BACKS.jsx';
import { useT } from './i18n.jsx';

const SPREAD = [
  { x: -150, y:  -35, r: -45 },
  { x: -115, y:  -82, r: -30 },
  { x:  -65, y: -108, r: -17 },
  { x:   -5, y: -116, r:  -4 },
  { x:   55, y: -106, r:   9 },
  { x:  108, y:  -76, r:  21 },
  { x:  148, y:  -26, r:  33 },
  { x:  155, y:   42, r:  42 },
  { x:  102, y:   90, r:  26 },
  { x:  -30, y:  100, r:  10 },
];

// Jakamisanimaatio: 4 korttia lentää ruudun kulmiin (pelaajapaikat)
const DEAL_CORNERS = [
  { tx: '-44vw', ty: '-36vh', r: -15 }, // vasen ylä (Hero)
  { tx:  '44vw', ty: '-36vh', r:  15 }, // oikea ylä (AI 1)
  { tx:  '44vw',  ty: '32vh', r:  12 }, // oikea ala (AI 2)
  { tx: '-44vw',  ty: '32vh', r: -12 }, // vasen ala (AI 3)
];

export default function ShuffleOverlay({ visible, onDone, nPlayers = 4 }) {
  const t = useT();
  const [phase, setPhase] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    if (!visible) { setPhase(0); return; }
    timers.current = [
      setTimeout(() => setPhase(1), 30),
      setTimeout(() => setPhase(2), 835),
      setTimeout(() => setPhase(3), 1520),
      setTimeout(() => { setPhase(0); onDone(); }, 1920),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [visible]);

  if (!visible && phase === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(5,14,9,0.87)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 180,
    }}>
      <div style={{ position: 'relative', width: 44, height: 60 }}>
        {SPREAD.map((pos, i) => {
          const cornerIdx = [0, 2, 5, 8].indexOf(i);
          const isDealer  = cornerIdx !== -1 && cornerIdx < nPlayers;
          const corner    = isDealer ? DEAL_CORNERS[cornerIdx] : null;
          let transform, transition;
          if (phase === 1) {
            transform  = `translate(${pos.x}px,${pos.y}px) rotate(${pos.r}deg)`;
            transition = `transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 28}ms`;
          } else if (phase === 3 && corner) {
            transform  = `translate(${corner.tx},${corner.ty}) rotate(${corner.r}deg) scale(1.05)`;
            transition = `transform 0.32s cubic-bezier(0.4,0,0.2,1) ${cornerIdx * 55}ms, opacity 0.32s ease ${cornerIdx * 55}ms`;
          } else if (phase === 3 && !corner) {
            transform  = `translate(${(i - 4.5) * 0.5}px,${(i - 4.5) * 0.4}px) rotate(${(i - 4.5) * 0.8}deg) scale(0.7)`;
            transition = `transform 0.28s ease, opacity 0.28s ease ${i * 20}ms`;
          } else {
            transform  = `translate(${(i - 4.5) * 0.5}px,${(i - 4.5) * 0.4}px) rotate(${(i - 4.5) * 0.8}deg)`;
            transition = `transform 0.5s cubic-bezier(0.55,0,0.45,1) ${(9 - i) * 22}ms`;
          }
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 44, height: 60,
                left: '50%', top: '50%',
                marginLeft: -22, marginTop: -30,
                borderRadius: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.75)',
                overflow: 'hidden',
                transform,
                transition,
                opacity: phase === 3 && !corner ? 0 : 1,
                zIndex: phase === 1 ? i : 9 - i,
              }}
            >
              {BACKS.ilves.render(44, 60)}
            </div>
          );
        })}
      </div>
      <p style={{
        margin: 0,
        fontFamily: 'Georgia,serif',
        fontSize: 13,
        letterSpacing: 4,
        color: '#c9a84c',
        opacity: phase === 1 ? 0.85 : 0,
        transition: 'opacity 0.35s ease',
      }}>
        {t('ui.shared.shuffling')}
      </p>
    </div>
  );
}
