export const COLORS = [
  { id: 1, name: 'C1', hex: '#EF4444' },
  { id: 2, name: 'C2', hex: '#F59E0B' },
  { id: 3, name: 'C3', hex: '#10B981' },
  { id: 4, name: 'C4', hex: '#3B82F6' },
  { id: 5, name: 'C5', hex: '#8B5CF6' },
  { id: 6, name: 'C6', hex: '#EC4899' },
];

// Torneo A6, figura 3 e proprietà 1 di Antoni Lozano:
// https://arxiv.org/pdf/2007.13111 (pagina 3).
// Vertici dell'articolo 0, 1, 2, 3, 4, 5 -> colori C1, C4, C2, C6, C3, C5.
// Questa rinumerazione conserva i due cicli C1->C2->C3 e C4->C5->C6.
export const TOURNAMENT_ARCS = [
  [1, 2], [2, 3], [3, 1],
  [4, 5], [5, 6], [6, 4],
  [1, 4], [5, 1], [1, 6],
  [2, 5], [2, 6], [4, 2],
  [6, 3], [3, 4], [3, 5],
];
