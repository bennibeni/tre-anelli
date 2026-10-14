import { describe, expect, it } from 'vitest';
import { COLORS, TOURNAMENT_ARCS } from '../../game/tournament';

const ids = COLORS.map(({ id }) => id);
const arcs = new Set(TOURNAMENT_ARCS.map(([a, b]) => `${a}>${b}`));
const hasArc = (a, b) => arcs.has(`${a}>${b}`);

describe('Torneo bersaglio A6', () => {
  it('ha un solo arco per coppia di colori, senza cappi', () => {
    expect(arcs.size).toBe(15);
    expect(TOURNAMENT_ARCS).toHaveLength(15);
    for (const a of ids) {
      expect(hasArc(a, a)).toBe(false);
      for (const b of ids.filter((id) => id > a)) {
        expect(Number(hasArc(a, b)) + Number(hasArc(b, a))).toBe(1);
      }
    }
  });

  // Proprietà 1: ogni cammino orientato di tre archi ammette un
  // omomorfismo in A6 con i colori dei due estremi già assegnati.
  // I colori possono ripetersi su vertici non adiacenti.
  for (const from of ids) {
    for (const to of ids) {
      for (let orientation = 0; orientation < 8; orientation++) {
        it(`estende C${from} a C${to}, orientamento ${orientation.toString(2).padStart(3, '0')}`, () => {
          const exists = ids.some((a) => ids.some((b) => {
            const path = [from, a, b, to];
            return [0, 1, 2].every((i) => orientation & (1 << i)
              ? hasArc(path[i], path[i + 1])
              : hasArc(path[i + 1], path[i]));
          }));
          expect(exists).toBe(true);
        });
      }
    }
  }
});
