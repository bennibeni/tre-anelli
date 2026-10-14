// ─────────────────────────────────────────────────────────────
// Logica pura del gioco "Tre Anelli".
// Lo schema è la griglia di 3 esagoni (13 nodi, 15 archi) con
// versi casuali; il giocatore costruisce a mano un omomorfismo
// verso il torneo A6 (tournament.js), un nodo alla volta.
// ─────────────────────────────────────────────────────────────
import { COLORS, TOURNAMENT_ARCS } from './tournament';

export { COLORS, TOURNAMENT_ARCS };
export const COLOR_IDS = COLORS.map((c) => c.id);

const ARC = new Set(TOURNAMENT_ARCS.map(([a, b]) => `${a}>${b}`));
export const hasArc = (a, b) => ARC.has(`${a}>${b}`);

// Tre esagoni "a punta in su" in coordinate assiali: due sopra, uno sotto.
export const THREE_RINGS = [[0, 0], [1, 0], [0, 1]];

export function buildGrid(cells = THREE_RINGS, R = 52) {
  const SQRT3 = Math.sqrt(3);
  const nodeMap = new Map();
  const edgeMap = new Map();
  const key = (x, y) => `${Math.round(x * 10)},${Math.round(y * 10)}`;
  cells.forEach(([q, r]) => {
    const cx = R * SQRT3 * (q + r / 2);
    const cy = R * 1.5 * r;
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const a = ((i * 60 - 90) * Math.PI) / 180;
      const x = cx + R * Math.cos(a);
      const y = cy + R * Math.sin(a);
      const k = key(x, y);
      if (!nodeMap.has(k)) nodeMap.set(k, { id: nodeMap.size, x, y });
      ids.push(nodeMap.get(k).id);
    }
    for (let i = 0; i < 6; i++) {
      const u = Math.min(ids[i], ids[(i + 1) % 6]);
      const v = Math.max(ids[i], ids[(i + 1) % 6]);
      const k = `${u}-${v}`;
      if (!edgeMap.has(k)) edgeMap.set(k, { id: edgeMap.size, u, v });
    }
  });
  const nodes = [...nodeMap.values()];
  const edges = [...edgeMap.values()];
  const adj = nodes.map(() => []);
  edges.forEach((e) => {
    adj[e.u].push({ other: e.v, edgeId: e.id });
    adj[e.v].push({ other: e.u, edgeId: e.id });
  });
  return { nodes, edges, adj };
}

// Generatore pseudo-casuale riproducibile (mulberry32).
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// dir[e] = true → u → v ; false → v → u
export const randomDirections = (grid, rng) => grid.edges.map(() => rng() < 0.5);

/** true se la freccia dell'arco esce da `node`. */
export const pointsOut = (node, edge, dir) => (edge.u === node) === dir[edge.id];

/**
 * Primo vincolo violato colorando `node` con `color`, oppure null.
 * Restituisce { neighbor, out, neighborColor }: `out` dice se la freccia
 * va da `node` verso il vicino.
 */
export function firstViolation(grid, dir, colors, node, color) {
  for (const { other, edgeId } of grid.adj[node]) {
    const oc = colors[other];
    if (!oc) continue;
    const out = pointsOut(node, grid.edges[edgeId], dir);
    const ok = out ? hasArc(color, oc) : hasArc(oc, color);
    if (!ok) return { neighbor: other, out, neighborColor: oc };
  }
  return null;
}

/** Colori ammessi per `node` dato lo stato parziale (scelti tra `palette`). */
export const allowedColors = (grid, dir, colors, node, palette = COLOR_IDS) =>
  palette.filter((c) => !firstViolation(grid, dir, colors, node, c));

/**
 * Colori ammessi con la regola "al massimo k colori diversi": finché ne
 * sono stati usati meno di k vale qualsiasi colore, poi solo quelli già usati.
 */
export function allowedColorsWithin(grid, dir, colors, node, k) {
  return allowedColors(grid, dir, colors, node).filter((c) => !exceedsColorLimit(colors, c, k));
}

/** true se colorare con `color` porterebbe a più di k colori diversi. */
export function exceedsColorLimit(colors, color, k) {
  const used = new Set(colors.filter(Boolean));
  return !used.has(color) && used.size >= k;
}

/** Esiste una colorazione completa che usa solo i colori di `palette`? */
function colorableWith(grid, dir, palette) {
  const col = new Array(grid.nodes.length).fill(0);
  const rec = () => {
    let node = -1;
    let opts = null;
    for (let i = 0; i < col.length; i++) {
      if (col[i]) continue;
      const a = allowedColors(grid, dir, col, i, palette);
      if (!opts || a.length < opts.length) { node = i; opts = a; }
      if (a.length === 0) return false;
    }
    if (node < 0) return true;
    for (const c of opts) {
      col[node] = c;
      if (rec()) return true;
      col[node] = 0;
    }
    return false;
  };
  return rec();
}

/**
 * Numero minimo k di colori di A6 con cui lo schema si può colorare.
 * Prova i sottoinsiemi di colori in ordine di grandezza.
 */
export function minColors(grid, dir) {
  const subsets = [];
  for (let m = 1; m < 1 << COLOR_IDS.length; m++) {
    subsets.push(COLOR_IDS.filter((_, i) => (m >> i) & 1));
  }
  subsets.sort((x, y) => x.length - y.length);
  for (const sub of subsets) if (colorableWith(grid, dir, sub)) return sub.length;
  return COLOR_IDS.length;
}

/** Nodi non colorati con almeno un vicino colorato (tutti, se lo schema è vuoto). */
export function frontier(grid, colors) {
  const any = colors.some(Boolean);
  return grid.nodes
    .map((n) => n.id)
    .filter((i) => !colors[i] && (!any || grid.adj[i].some(({ other }) => colors[other])));
}

/** Può `node` essere colorato adesso (regola di adiacenza)? */
export const isPlayable = (grid, colors, node) => frontier(grid, colors).includes(node);

/**
 * Conta i completamenti della colorazione parziale (fino a `limit`).
 * Con limit = 1 risponde a "è ancora risolvibile?".
 */
export function countCompletions(grid, dir, colors, limit = Infinity) {
  const col = colors.slice();
  const n = col.length;
  let count = 0;
  const rec = () => {
    if (count >= limit) return;
    // MRV: il nodo libero con meno colori ammessi
    let node = -1;
    let opts = null;
    for (let i = 0; i < n; i++) {
      if (col[i]) continue;
      const a = allowedColors(grid, dir, col, i);
      if (!opts || a.length < opts.length) { node = i; opts = a; }
      if (a.length === 0) break;
    }
    if (node < 0) { count++; return; }
    for (const c of opts) {
      col[node] = c;
      rec();
      col[node] = 0;
      if (count >= limit) return;
    }
  };
  rec();
  return count;
}

export const isCompletable = (grid, dir, colors) => countCompletions(grid, dir, colors, 1) > 0;

/** Sorgenti (solo frecce uscenti) e pozzi (solo entranti) dello schema. */
export function sourcesAndSinks(grid, dir) {
  const indeg = grid.nodes.map(() => 0);
  const outdeg = grid.nodes.map(() => 0);
  grid.edges.forEach((e) => {
    const from = dir[e.id] ? e.u : e.v;
    const to = dir[e.id] ? e.v : e.u;
    outdeg[from]++;
    indeg[to]++;
  });
  return {
    sources: grid.nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id),
    sinks: grid.nodes.filter((n) => outdeg[n.id] === 0).map((n) => n.id),
  };
}

export const STRATEGIES = {
  percorso: 'Segue un percorso, colore a caso',
  frontiera: 'Nodo di frontiera a caso, colore a caso',
  forzate: 'Prima le mosse forzate, colore a caso',
};

/**
 * Gioca una partita automatica senza annullare mosse.
 * Restituisce true se colora tutto lo schema.
 */
export function playOnce(grid, dir, strategy, rng) {
  const n = grid.nodes.length;
  const colors = new Array(n).fill(0);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  let last = Math.floor(rng() * n);
  colors[last] = pick(COLOR_IDS);
  for (;;) {
    const front = frontier(grid, colors);
    if (!front.length) return true;
    const opts = new Map(front.map((i) => [i, allowedColors(grid, dir, colors, i)]));
    if ([...opts.values()].some((a) => a.length === 0)) return false; // vicolo cieco
    let node;
    if (strategy === 'forzate') {
      const min = Math.min(...[...opts.values()].map((a) => a.length));
      node = pick(front.filter((i) => opts.get(i).length === min));
    } else if (strategy === 'percorso') {
      const near = front.filter((i) => grid.adj[i].some(({ other }) => other === last));
      node = pick(near.length ? near : front);
    } else {
      node = pick(front);
    }
    colors[node] = pick(opts.get(node));
    last = node;
  }
}

export function winRate(grid, dir, strategy, games, rng) {
  let wins = 0;
  for (let g = 0; g < games; g++) wins += playOnce(grid, dir, strategy, rng) ? 1 : 0;
  return wins / games;
}
