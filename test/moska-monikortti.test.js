// Monikorttihyökkäys: MOSKA.md rivi 12 sallii useamman saman vahvuisen kortin ja rivi 13
// rajaa määrän puolustajan käteen. Mestari käyttää sitä vasta kun nostopakka on tyhjä,
// koska siihen asti käsi täydentyy eikä ryhmän purkamisesta ole hyötyä.
import { describe, it, expect } from 'vitest';
import { getAdvice } from '../src/games/Moska.jsx';
import { VAL } from '../src/shared/helpers.js';

const mk = (r, s) => ({ r, s, id: `${r}${s}`, v: VAL[r] });
const hand = () => [mk('7', '♦'), mk('7', '♥'), mk('9', '♣')];

function state({ deck = [], trumpCard = null, defHand = 3 } = {}) {
  return {
    phase: 'attack', primaryAtk: 0, defender: 1, ts: '♠', table: [],
    deck, trumpCard,
    players: [
      { hand: hand(), name: 'Hero', rank: null },
      { hand: Array.from({ length: defHand }, (_, i) => mk('K', ['♠','♥','♦','♣'][i])), name: 'Bot', rank: null },
    ],
  };
}

describe('Moska: monikorttihyökkäys', () => {
  it('lyö koko samanarvoisen ryhmän kun nostopakka on tyhjä', () => {
    const a = getAdvice(state(), new Set());
    expect(a.cards.map(c => c.id)).toEqual(['7♦', '7♥']);
    expect(a.type).toBe('attackMulti');
  });

  it('lyö yhden kortin niin kauan kuin käsi täydentyy', () => {
    const a = getAdvice(state({ deck: [mk('3', '♠')] }), new Set());
    expect(a.cards.map(c => c.id)).toEqual(['7♦']);
    expect(a.type).toBe('attack');
  });

  it('ei ylitä puolustajan käden kokoa (MOSKA.md rivi 13)', () => {
    const a = getAdvice(state({ defHand: 1 }), new Set());
    expect(a.cards).toHaveLength(1);
    expect(a.type).toBe('attack');
  });

  it('valttikortti pakan pohjalla estää vielä ryhmän lyömisen', () => {
    const a = getAdvice(state({ trumpCard: mk('2', '♠') }), new Set());
    expect(a.cards).toHaveLength(1);
  });
});
