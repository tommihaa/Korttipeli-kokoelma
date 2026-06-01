import { C } from './colors.js';

// Yhtenäinen Pöytä-/keskialueen kehys. Vakioi taustan, reunan, borderRadiuksen,
// paddingin, marginin ja minimikorkeuden — sisältö (kortit) tulee childreninä,
// joten kunkin pelin oma asettelu (flex/grid/FanStack) säilyy.
//   title  — otsikkorivin vasen sisältö (esim. <span>PÖYTÄ — …</span>)
//   right  — otsikkorivin oikea sisältö (esim. <PakkaCount/>), valinnainen
//   border — reunaväri (oletuksena C.panelBorder; ohitettavissa esim. Moskan/Paskahousun dynaamiselle reunalle)
//   minHeight — { m, t } mobiili/tablet, pelkkä numero, tai null (ei minimiä). Oletus DEFAULT_MIN.
//   animation — paneelin oma animaatio (esim. Paskahousun kasaAnim)
const DEFAULT_MIN = { m: 130, t: 210 };

export default function PoytaPanel({
  title, right, children,
  isMobile = false,
  border = C.panelBorder,
  minHeight = DEFAULT_MIN,
  animation,
  style,
}) {
  const mh = minHeight == null ? undefined
    : typeof minHeight === 'number' ? minHeight
    : (isMobile ? minHeight.m : minHeight.t);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: isMobile ? '8px 10px' : '12px 14px',
      marginBottom: isMobile ? 4 : 10,
      minHeight: mh,
      animation,
      ...style,
    }}>
      <div style={{
        fontFamily: 'sans-serif', fontSize: 10, color: C.dim,
        marginBottom: 8, letterSpacing: 1.5,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        {title}
        {right}
      </div>
      {children}
    </div>
  );
}
