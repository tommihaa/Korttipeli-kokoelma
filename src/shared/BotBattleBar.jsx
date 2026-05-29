import { C } from './colors.js';

// Bottien Taistelu -tilan ohjauspalkki: tauko + tahdin liukusäädin.
// Korvaa aiemmin 6 peliin kopioidun KATSELUTILA-palkin.
export default function BotBattleBar({ paused, onTogglePause, aiDelayMs, onDelayChange, isMobile = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'rgba(123,47,190,0.12)', border: '1px solid rgba(123,47,190,0.4)', borderRadius: 12, padding: '8px 14px', marginBottom: isMobile ? 4 : 10 }}>
      <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.botMode, fontWeight: 700, letterSpacing: 1 }}>🤖 KATSELUTILA</span>
      <button onClick={onTogglePause} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 10, border: '1px solid rgba(123,47,190,0.5)', background: paused ? 'rgba(123,47,190,0.35)' : 'transparent', color: C.botMode, cursor: 'pointer', fontFamily: 'sans-serif' }}>{paused ? '▶ Jatka' : '⏸ Tauko'}</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 120 }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.botModeDim }}>Nopeus</span>
        <input type="range" min={500} max={4000} step={250} value={aiDelayMs} onChange={e => onDelayChange(Number(e.target.value))} style={{ flex: 1, minWidth: 80, accentColor: '#7B2FBE', cursor: 'pointer' }} />
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.botModeDim }}>{(aiDelayMs / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
}
