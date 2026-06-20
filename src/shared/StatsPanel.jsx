import { useState } from 'react';
import { C } from './colors.js';
import { useT } from './i18n.jsx';

// Pelikohtaiset tilastot (localStorage: jako:stats). Käännökset ui.stats.* (fi = lähde);
// vaikeustasojen nimet uudelleenkäytetään ui.settings.ai.<lvl>.label-avaimista.
//
// stats: { [gameId]: { played, wins, places:{1..4}, byLevel:{beginner,normal,hard:{played,wins}} } }
// games: GAMES-taulukko [{ id, name, emoji, ... }]

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4.' };

const pct = (wins, played) => (played > 0 ? Math.round((wins / played) * 100) : 0);

export default function StatsPanel({ stats, games = [], sessions = 0, onClear, onClose, isMobile = false }) {
  const t = useT();
  const [openId, setOpenId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const explored = games.filter(g => (stats[g.id]?.played || 0) > 0).length;
  const totalPlayed = games.reduce((s, g) => s + (stats[g.id]?.played || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '16px 12px' : '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Otsikko + sulje */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>{t('ui.stats.title')}</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >{t('ui.info.close')}</button>
        </div>

        {/* Yhteenveto — kolme eri mittaria, yksiköt selvästi eroteltuina:
            eri pelityypit / yksittäiset pelikerrat / erilliset sovelluskäynnit */}
        <div style={{
          border: `1px solid ${C.panelBorder}`, borderRadius: 12,
          background: 'rgba(255,255,255,0.02)', padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {[
            [t('ui.stats.explored'), `${explored} / ${games.length}`, t('ui.stats.exploredHint')],
            [t('ui.stats.plays'), totalPlayed, t('ui.stats.playsHint')],
            [t('ui.stats.sessions'), sessions, t('ui.stats.sessionsHint')],
          ].map(([label, value, hint]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.text }} title={hint}>{label}</span>
              <strong style={{ fontFamily: 'sans-serif', fontSize: 14, color: C.gold }}>{value}</strong>
            </div>
          ))}
        </div>

        {totalPlayed === 0 && (
          <p style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, textAlign: 'center', lineHeight: 1.6 }}>
            {t('ui.stats.empty')}
          </p>
        )}

        {/* Pelilista */}
        {games.map(g => {
          const s = stats[g.id] || { played: 0, wins: 0, places: {}, byLevel: {} };
          const played = s.played || 0;
          const open = openId === g.id;
          if (played === 0) {
            return (
              <div key={g.id} style={{
                border: `1px solid ${C.panelBorder}`, borderRadius: 12,
                background: 'rgba(255,255,255,0.01)', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10, opacity: 0.45,
              }}>
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 13, color: C.text }}>{g.name}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>{t('ui.stats.notPlayed')}</span>
              </div>
            );
          }
          const maxPlace = Math.max(1, ...[1, 2, 3, 4].map(p => s.places?.[p] || 0));
          return (
            <div key={g.id} style={{
              border: `1px solid ${C.panelBorder}`, borderRadius: 12,
              background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenId(open ? null : g.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '12px 14px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{g.emoji}</span>
                <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 13, color: C.text }}>{g.name}</span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim }} title={t('ui.stats.winPctTooltip')}>
                  {t('ui.stats.winLine', { w: s.wins, p: played, pct: pct(s.wins, played) })}
                </span>
                <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
              </button>

              {open && (
                <div style={{ padding: '0 14px 14px' }}>
                  {/* Sijoitusjakauma */}
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>{t('ui.stats.placesTitle')}</div>
                  {[1, 2, 3, 4].map(p => {
                    const n = s.places?.[p] || 0;
                    return (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 22, fontSize: 13, flexShrink: 0, textAlign: 'center' }}>{MEDALS[p]}</span>
                        <div style={{ flex: 1, height: 8, background: `${C.panelBorder}55`, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${(n / maxPlace) * 100}%`, height: '100%', background: p === 1 ? C.gold : `${C.gold}66`, borderRadius: 4 }} />
                        </div>
                        <span style={{ width: 24, fontFamily: 'sans-serif', fontSize: 11, color: C.dim, textAlign: 'right' }}>{n}</span>
                      </div>
                    );
                  })}

                  {/* Vaikeustaso-erittely — vaikeustasojen nimet ui.settings.ai.<lvl>.label */}
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, letterSpacing: 1, margin: '12px 0 6px', textTransform: 'uppercase' }}>{t('ui.stats.levelsTitle')}</div>
                  {['beginner', 'normal', 'hard'].map(lvl => {
                    const lr = s.byLevel?.[lvl] || { played: 0, wins: 0 };
                    return (
                      <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontFamily: 'sans-serif', fontSize: 12 }}>
                        <span style={{ flex: 1, color: C.text }}>{t(`ui.settings.ai.${lvl}.label`)}</span>
                        <span style={{ color: C.dim }}>
                          {lr.played > 0
                            ? <>{lr.wins}/{lr.played} · <strong style={{ color: C.gold }} title={t('ui.stats.winPctTooltip')}>{pct(lr.wins, lr.played)}%</strong></>
                            : <span style={{ opacity: 0.5 }} title={t('ui.stats.levelNotPlayed')}>—</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Tyhjennä */}
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          {confirmClear ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{t('ui.stats.clearConfirm')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { onClear?.(); setConfirmClear(false); setOpenId(null); }}
                  style={{ background: 'transparent', border: `1px solid ${C.red}88`, color: C.red, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 12 }}
                >{t('ui.stats.clearYes')}</button>
                <button
                  onClick={() => setConfirmClear(false)}
                  style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 12 }}
                >{t('ui.stats.clearCancel')}</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={totalPlayed === 0}
              style={{
                background: 'transparent', border: `1px solid ${C.panelBorder}`,
                color: totalPlayed === 0 ? `${C.dim}66` : C.dim, borderRadius: 8, padding: '8px 16px',
                cursor: totalPlayed === 0 ? 'default' : 'pointer', fontFamily: 'sans-serif', fontSize: 12,
              }}
            >{t('ui.stats.clear')}</button>
          )}
        </div>

      </div>
    </div>
  );
}
