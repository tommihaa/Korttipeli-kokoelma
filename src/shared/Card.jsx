import { useState } from 'react';
import { C, suitColor } from './colors.js';
import { BACKS } from './BACKS.jsx';
import { isRed, cardName } from './helpers.js';

const isRuutuKymppi = c => c && c.r === '10' && c.s === '♦';
const isPataKakkonen = c => c && c.r === '2' && c.s === '♠';

export default function Card({
  card,
  faceUp = true,
  small,
  xsmall,
  large,
  highlight,
  advice,
  dim,
  selected,
  onClick,
  backStyle,
  special,
  empty,
  pulse,
  reactHL,
  justPlaced,
  disabled,
  showBadges = false,
}) {
  const [h, setH] = useState(false);
  const w = large ? 80 : xsmall ? 38 : small ? 50 : 66;
  const ht = large ? 108 : xsmall ? 52 : small ? 68 : 90;
  const back = backStyle || BACKS.ilves;
  const clickable = !!onClick && !disabled;

  if (empty) return (
    <div aria-hidden="true" style={{
      width: w, height: ht, borderRadius: 7, flexShrink: 0,
      border: '1.5px dashed #1a3a22', opacity: 0.3, background: 'transparent',
    }} />
  );

  // Ruudunlukija/näppäimistö: klikattava kortti = nappi, paljas kortti = kuva, selkäpuoli piiloon
  const a11y = clickable
    ? { role: 'button', tabIndex: 0, 'aria-label': faceUp && card ? cardName(card) : 'kortti', 'aria-disabled': disabled || undefined,
        onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } }
    : faceUp && card
      ? { role: 'img', 'aria-label': cardName(card) }
      : { 'aria-hidden': 'true' };

  const borderCol = justPlaced ? C.gold
    : reactHL ? C.red
    : selected ? C.blue
    : advice ? C.botMode
    : highlight ? C.gold
    : special === 'tikki' ? C.tikki
    : special === 'build' ? C.build
    : pulse ? 'rgba(91,168,212,0.55)'
    : back.border;

  const shadow = justPlaced ? '0 0 0 3px rgba(201,168,76,0.85),0 0 18px rgba(201,168,76,0.5)'
    : reactHL ? '0 0 12px rgba(224,92,59,0.55)'
    : selected ? '0 0 16px rgba(91,168,212,0.7)'
    : advice ? '0 0 14px rgba(192,132,252,0.65)'
    : highlight ? '0 0 14px rgba(201,168,76,0.6)'
    : pulse ? '0 0 8px rgba(91,168,212,0.35)'
    : h && clickable ? '0 6px 16px rgba(0,0,0,0.5)'
    : '0 2px 6px rgba(0,0,0,0.3)';

  const transform = [
    selected ? 'translateY(-8px)' : '',
    h && clickable ? 'translateY(-4px) scale(1.05)' : '',
  ].filter(Boolean).join(' ') || 'none';

  return (
    <div
      {...a11y}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: w, height: ht, borderRadius: 7, flexShrink: 0,
        userSelect: 'none', position: 'relative',
        background: faceUp ? C.card : back.bg,
        border: `2px solid ${borderCol}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: shadow,
        transform,
        opacity: dim || disabled ? (disabled ? 0.38 : 0.35) : 1,
        animation: reactHL ? 'reactPulse 0.9s ease infinite'
          : justPlaced ? 'slotFlash 2.2s ease forwards'
          : undefined,
        overflow: 'hidden',
      }}
    >
      {faceUp && card ? (
        <div style={{
          textAlign: 'center', fontFamily: 'Georgia,serif', lineHeight: 1.1,
          pointerEvents: 'none', position: 'relative', zIndex: 1,
          color: suitColor(card.s),
        }}>
          <div style={{ fontSize: large ? 20 : small ? 14 : 18, fontWeight: 700 }}>{card.r}</div>
          <div style={{ fontSize: large ? 24 : small ? 15 : 21 }}>{card.s}</div>
          {showBadges && isRuutuKymppi(card) && (
            <div style={{ fontSize: 7, color: C.gold, letterSpacing: 0.3 }}>2p</div>
          )}
          {showBadges && isPataKakkonen(card) && (
            <div style={{ fontSize: 7, color: C.gold, letterSpacing: 0.3 }}>1p</div>
          )}
        </div>
      ) : (
        <>{back.render(w, ht)}</>
      )}
    </div>
  );
}
