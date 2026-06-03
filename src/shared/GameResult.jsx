import { C, SUIT_COLOR } from './colors.js';
import Card from './Card.jsx';
import { useT } from './i18n.jsx';

// ranking:        [{name, place, score?, isHuman}]  – sorted by place asc
// revealCards:    [{name, cards: [...], label}]       – Koputus, Kultakala
// scoreBreakdown: [{name, score, items:[{label,pts}]}] – Kasino

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function colorLabel(label) {
  const parts = [];
  for (let i = 0; i < label.length; i++) {
    const ch = label[i];
    if (SUIT_COLOR[ch]) {
      parts.push(<span key={i} style={{ color: SUIT_COLOR[ch], fontWeight: 700 }}>{ch}</span>);
    } else {
      const last = parts[parts.length - 1];
      if (typeof last === 'string') parts[parts.length - 1] += ch;
      else parts.push(ch);
    }
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? label : <>{parts}</>;
}

function placeLabel(place) {
  return MEDALS[place]
    ? <span style={{ fontSize: 18 }}>{MEDALS[place]}</span>
    : <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: C.dim }}>{place}.</span>;
}

export default function GameResult({
  ranking = [],
  revealCards,
  scoreBreakdown,
  onNewGame,
  onMenu,
  isMobile = false,
}) {
  const t = useT();
  const total = ranking.length;
  const hasScores = ranking.some(r => r.score != null);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: isMobile ? '32px 12px 24px' : '48px 24px 32px',
      fontFamily: 'Georgia,serif',
      color: C.text,
      gap: 24,
    }}>

      {/* Otsikko */}
      <h1 style={{
        fontSize: isMobile ? 22 : 28,
        letterSpacing: 8,
        color: C.gold,
        margin: 0,
        textAlign: 'center',
      }}>
        {t('ui.result.title')}
      </h1>

      {/* Ranking-lista */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranking.map(r => (
          <div
            key={r.name}
            style={{
              borderRadius: 14,
              padding: isMobile ? '10px 14px' : '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: r.isHuman
                ? (r.place === 1 ? C.gold + '18' : 'rgba(201,168,76,0.06)')
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${r.isHuman ? (r.place === 1 ? C.gold + '77' : C.gold + '33') : C.panelBorder}`,
            }}
          >
            {/* Sijamerkki */}
            <div style={{ minWidth: 28, textAlign: 'center', flexShrink: 0 }}>
              {placeLabel(r.place)}
            </div>
            {/* Nimi */}
            <div style={{
              flex: 1,
              fontSize: isMobile ? 13 : 15,
              fontWeight: r.isHuman ? 700 : 400,
              color: r.isHuman ? C.gold : C.text,
            }}>
              {r.name}
              {r.place === 1 && !r.isHuman &&
                <span style={{ fontSize: 11, color: C.dim, marginLeft: 8, fontFamily: 'sans-serif' }}>{t('ui.result.won')}</span>
              }
            </div>
            {/* Pisteet */}
            {hasScores && r.score != null && (
              <div style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight: 700,
                color: r.isHuman ? C.gold : C.dim,
                fontFamily: 'Georgia,serif',
              }}>
                {r.score}<span style={{ fontSize: 11, opacity: 0.55 }}> {t('ui.result.pts')}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Paljastus — muistipelit: Koputus, Kultakala */}
      {revealCards && revealCards.length > 0 && (
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{
            fontFamily: 'sans-serif',
            fontSize: 10,
            color: C.dim,
            letterSpacing: 1.5,
            marginBottom: 10,
          }}>
            {t('ui.result.revealed')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {revealCards.map(p => (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.panelBorder}`,
                  borderRadius: 10,
                  padding: isMobile ? '6px 10px' : '8px 12px',
                }}
              >
                <div style={{
                  fontFamily: 'sans-serif',
                  fontSize: 11,
                  color: C.text,
                  minWidth: isMobile ? 54 : 80,
                  flexShrink: 0,
                }}>
                  {p.name}
                </div>
                {p.cards.length > 4
                  /* Kultakala: tuntematon + pieni väli + 5 kenttäkorttia */
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {p.cards[0]
                        ? <Card key={0} card={p.cards[0]} faceUp xsmall />
                        : <Card key={0} empty xsmall />
                      }
                      <div style={{ width: isMobile ? 6 : 10, flexShrink: 0 }} />
                      {p.cards.slice(1).map((c, i) =>
                        c ? <Card key={i + 1} card={c} faceUp xsmall /> : <Card key={i + 1} empty xsmall />
                      )}
                    </div>
                  /* Koputus: 4 kenttäkorttia vierekkäin */
                  : <div style={{ display: 'flex', gap: 2 }}>
                      {p.cards.map((c, i) =>
                        c ? <Card key={i} card={c} faceUp xsmall /> : <Card key={i} empty xsmall />
                      )}
                    </div>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pisteiden erittely — Kasino */}
      {scoreBreakdown && scoreBreakdown.length > 0 && (
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{
            fontFamily: 'sans-serif',
            fontSize: 10,
            color: C.dim,
            letterSpacing: 1.5,
            marginBottom: 10,
          }}>
            {t('ui.result.breakdown')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scoreBreakdown.map(p => (
              <div
                key={p.name}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.panelBorder}`,
                  borderRadius: 10,
                  padding: isMobile ? '8px 12px' : '10px 14px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: p.items.length ? 6 : 0,
                }}>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text, fontWeight: 700 }}>
                    {p.name}
                  </span>
                  <span style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: C.gold, fontWeight: 700 }}>
                    {p.score}<span style={{ fontSize: 10, opacity: 0.6 }}> {t('ui.result.pts')}</span>
                  </span>
                </div>
                {p.items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {p.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontFamily: 'sans-serif',
                          fontSize: 11,
                          color: C.text,
                          paddingLeft: 8,
                        }}
                      >
                        <span>{colorLabel(item.label)}</span>
                        <span style={{ color: item.pts > 0 ? '#4caf7d' : C.dim }}>
                          {item.pts > 0 ? `+${item.pts}` : item.pts === 0 ? '—' : item.pts}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Napit */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        <button
          onClick={onNewGame}
          style={{
            background: `linear-gradient(135deg,${C.gold},#a07830)`,
            border: 'none',
            borderRadius: 12,
            padding: isMobile ? '12px 28px' : '12px 36px',
            color: '#0d2118',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Georgia,serif',
            letterSpacing: 1,
          }}
        >
          {t('ui.result.newGame')}
        </button>
        <button
          onClick={onMenu}
          style={{
            background: 'transparent',
            border: `1px solid ${C.gold}55`,
            borderRadius: 12,
            padding: isMobile ? '12px 24px' : '12px 28px',
            color: C.dim,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'Georgia,serif',
          }}
        >
          {t('ui.menu.back')}
        </button>
      </div>
    </div>
  );
}
