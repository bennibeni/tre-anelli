import { describe, expect, it } from 'vitest';
import {
  buildGrid, makeRng, randomDirections, countCompletions, isCompletable,
  allowedColors, frontier, firstViolation, COLOR_IDS, winRate,
  minColors, allowedColorsWithin, exceedsColorLimit,
} from '../../game/gameLogic';

const grid = buildGrid();

describe('Schema a tre anelli', () => {
  it('ha 13 nodi e 15 archi', () => {
    expect(grid.nodes).toHaveLength(13);
    expect(grid.edges).toHaveLength(15);
  });

  it('è sempre risolvibile, da qualsiasi nodo e colore iniziale', () => {
    const rng = makeRng(42);
    for (let t = 0; t < 40; t++) {
      const dir = randomDirections(grid, rng);
      expect(countCompletions(grid, dir, new Array(13).fill(0), 1)).toBe(1);
      const node = Math.floor(rng() * 13);
      for (const c of COLOR_IDS) {
        const colors = new Array(13).fill(0);
        colors[node] = c;
        expect(isCompletable(grid, dir, colors)).toBe(true);
      }
    }
  });

  it('la frontiera contiene solo vicini dei nodi colorati', () => {
    const colors = new Array(13).fill(0);
    expect(frontier(grid, colors)).toHaveLength(13);
    colors[0] = 1;
    const f = frontier(grid, colors);
    expect(f.sort()).toEqual(grid.adj[0].map((a) => a.other).sort());
  });

  it('allowedColors e firstViolation sono coerenti', () => {
    const rng = makeRng(7);
    const dir = randomDirections(grid, rng);
    const colors = new Array(13).fill(0);
    colors[0] = 2;
    const node = grid.adj[0][0].other;
    for (const c of COLOR_IDS) {
      expect(allowedColors(grid, dir, colors, node).includes(c)).toBe(!firstViolation(grid, dir, colors, node, c));
    }
  });

  it('la strategia delle mosse forzate batte il gioco a caso', () => {
    const dir = randomDirections(grid, makeRng(3));
    const a = winRate(grid, dir, 'frontiera', 400, makeRng(1));
    const b = winRate(grid, dir, 'forzate', 400, makeRng(1));
    expect(b).toBeGreaterThan(a);
  });

  it('con al massimo k = minColors colori esiste sempre una soluzione, con k - 1 no', () => {
    const rng = makeRng(99);
    for (let t = 0; t < 30; t++) {
      const dir = randomDirections(grid, rng);
      const k = minColors(grid, dir);
      expect(k >= 2 && k <= 6).toBe(true);
      const solveWithin = (kk) => {
        const col = new Array(13).fill(0);
        const rec = () => {
          const i = col.indexOf(0);
          if (i < 0) return true;
          for (const c of allowedColorsWithin(grid, dir, col, i, kk)) {
            col[i] = c;
            if (rec()) return true;
            col[i] = 0;
          }
          return false;
        };
        return rec();
      };
      expect(solveWithin(k)).toBe(true);
      expect(solveWithin(k - 1)).toBe(false);
    }
  });

  it('nessuna sequenza di mosse supera mai k colori diversi', () => {
    const rng = makeRng(2024);
    for (let t = 0; t < 200; t++) {
      const dir = randomDirections(grid, rng);
      const k = minColors(grid, dir);
      for (let g = 0; g < 20; g++) {
        const colors = new Array(13).fill(0);
        colors[Math.floor(rng() * 13)] = 1 + Math.floor(rng() * 6);
        for (;;) {
          const front = frontier(grid, colors);
          if (!front.length) break;
          const node = front[Math.floor(rng() * front.length)];
          // Il giocatore prova un colore qualsiasi, come cliccando sul torneo:
          // la mossa passa solo se rispetta frecce e limite, come in assign().
          const c = 1 + Math.floor(rng() * 6);
          const legal = !firstViolation(grid, dir, colors, node, c) && !exceedsColorLimit(colors, c, k);
          expect(allowedColorsWithin(grid, dir, colors, node, k).includes(c)).toBe(legal);
          if (legal) colors[node] = c;
          else if (allowedColorsWithin(grid, dir, colors, node, k).length === 0) break; // vicolo cieco
          expect(new Set(colors.filter(Boolean)).size <= k).toBe(true);
        }
      }
    }
  });
});
