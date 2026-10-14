'use client';

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import A6TournamentVisualizer from './A6TournamentVisualizer';
import {
  COLORS, STRATEGIES, buildGrid, makeRng, randomDirections,
  allowedColorsWithin, exceedsColorLimit, firstViolation, frontier, countCompletions, minColors,
  sourcesAndSinks, winRate,
} from './gameLogic';

// ─────────────────────────────────────────────────────────────
// Tre Anelli — un gioco sugli omomorfismi orientati.
// Il giocatore colora lo schema a tre anelli un nodo alla volta:
// ogni nuovo nodo deve essere adiacente a uno già colorato e il suo
// colore deve rispettare, per OGNI vicino già colorato, il verso
// della freccia nel torneo A6 (tournament.js).
// Le mosse sono definitive: un vicolo cieco fa perdere la partita.
// ─────────────────────────────────────────────────────────────

// Pannello "Quanto è difficile questo schema?": nascosto, ma il codice resta.
const SHOW_ANALYSIS = false;

const GRID = buildGrid();
const N = GRID.nodes.length;
const NODE_R = 15;
const EMPTY = () => new Array(N).fill(0);
const colorById = (id) => COLORS.find((c) => c.id === id);

const PAD = NODE_R + 16;
const xs = GRID.nodes.map((n) => n.x);
const ys = GRID.nodes.map((n) => n.y);
const VIEWBOX = `${Math.min(...xs) - PAD} ${Math.min(...ys) - PAD} ${Math.max(...xs) - Math.min(...xs) + 2 * PAD} ${Math.max(...ys) - Math.min(...ys) + 2 * PAD}`;

const newSeed = () => Math.floor(Math.random() * 1e9);

// false durante il rendering sul server e l'idratazione, true poi nel browser.
const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export default function TreAnelliGame() {
  // Lo schema casuale viene mostrato solo nel browser: il server e la prima
  // idratazione rendono il segnaposto, quindi niente mismatch e niente effetto.
  const isClient = useIsClient();
  const [seed, setSeed] = useState(newSeed);
  const dir = useMemo(() => (isClient ? randomDirections(GRID, makeRng(seed)) : null), [isClient, seed]);
  // Regola restrittiva: al massimo k colori diversi, con k = minimo possibile per lo schema.
  const k = useMemo(() => (dir ? minColors(GRID, dir) : 6), [dir]);

  const [colors, setColors] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null); // { tone, text }
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [tHover, setTHover] = useState(null);

  const resetBoard = useCallback(() => {
    setColors(EMPTY());
    setSelected(null);
    setMessage(null);
  }, []);

  const newGame = () => { resetBoard(); setAnalysis(null); setSeed(newSeed()); };

  const front = useMemo(() => new Set(frontier(GRID, colors)), [colors]);
  const colored = colors.filter(Boolean).length;
  const won = colored === N;

  const options = useMemo(() => {
    if (!dir) return new Map();
    return new Map([...front].map((i) => [i, allowedColorsWithin(GRID, dir, colors, i, k)]));
  }, [dir, colors, front, k]);

  const deadNodes = colored > 0 ? [...options].filter(([, a]) => a.length === 0).map(([i]) => i) : [];
  const lost = deadNodes.length > 0;
  const over = won || lost;

  const usedColors = useMemo(() => new Set(colors.filter(Boolean)), [colors]);

  const clickNode = (i) => {
    if (over || colors[i]) return;
    if (!front.has(i)) {
      setMessage({ tone: 'warn', text: 'Puoi colorare solo un nodo collegato da un arco a un nodo già colorato.' });
      return;
    }
    setSelected(i === selected ? null : i);
    setMessage(null);
  };

  const assign = (c) => {
    if (over || !dir) return;
    if (selected == null) {
      setMessage({ tone: 'info', text: 'Prima scegli un nodo dello schema, poi il colore.' });
      return;
    }
    const v = firstViolation(GRID, dir, colors, selected, c);
    if (v) {
      const me = colorById(c).name;
      const other = colorById(v.neighborColor).name;
      const need = v.out ? `${me} → ${other}` : `${other} → ${me}`;
      const have = v.out ? `${other} → ${me}` : `${me} → ${other}`;
      setMessage({ tone: 'warn', text: `${me} non va: la freccia verso il vicino ${other} richiede ${need}, ma nel torneo c'è ${have}.` });
      return;
    }
    if (exceedsColorLimit(colors, c, k)) {
      const list = [...usedColors].sort().map((id) => colorById(id).name).join(', ');
      setMessage({ tone: 'warn', text: `Hai già usato ${k} colori diversi: puoi scegliere solo tra ${list}.` });
      return;
    }
    const next = colors.slice();
    next[selected] = c;
    setColors(next);
    setSelected(null);
    setMessage(null);
  };

  const analyze = () => {
    if (!dir) return;
    setAnalyzing(true);
    setTimeout(() => {
      const rng = makeRng(seed ^ 0x5bd1e995);
      const games = 600;
      const { sources, sinks } = sourcesAndSinks(GRID, dir);
      setAnalysis({
        solutions: countCompletions(GRID, dir, EMPTY()),
        sources: sources.length,
        sinks: sinks.length,
        rates: Object.keys(STRATEGIES).map((k) => ({ key: k, label: STRATEGIES[k], rate: winRate(GRID, dir, k, games, rng) })),
        games,
      });
      setAnalyzing(false);
    }, 20);
  };

  const allowedForSelected = selected != null ? options.get(selected) ?? [] : [];
  // Colori non selezionabili ora: tutti a fine partita, quelli non ammessi per il nodo scelto.
  // Valgono sia per la tavolozza sia per il torneo, così il cursore è coerente.
  const disabledColors = new Set(
    COLORS.map((c) => c.id).filter((id) => over || (selected != null && !allowedForSelected.includes(id))),
  );

  let status;
  if (won) status = { tone: 'ok', text: `Schema completato con ${usedColors.size} colori!` };
  else if (lost) status = { tone: 'error', text: `Partita persa: ${deadNodes.length === 1 ? 'un nodo non ammette' : `${deadNodes.length} nodi non ammettono`} più nessun colore (cerchio rosso).` };
  else if (colored === 0) status = { tone: 'info', text: 'Scegli un nodo qualsiasi da cui partire e assegnagli un colore.' };
  else status = { tone: 'info', text: `${colored} nodi colorati su ${N} · colori usati ${usedColors.size} su ${k}.` };

  if (!dir) return <div style={S.page}>Preparazione dello schema…</div>;

  return (
    <div style={S.page}>
      <h1 style={S.title}>Il gioco dei tre anelli</h1>
      <p style={S.tagline}>Un gioco sugli omomorfismi orientati</p>
      <p style={S.lead}>
        Colora tutto lo schema con i colori del torneo. Si parte da un nodo qualsiasi; poi ogni nuovo nodo deve essere
        collegato a uno già colorato. Per ogni freccia <b>u → v</b> tra nodi colorati, nel torneo deve esserci la freccia
        <br />
        <b>colore(u) → colore(v)</b>.
        <br />
        I colori si possono ripetere, ma in questo schema puoi usarne al massimo{' '}
        <span key={seed} className="r52-k" style={S.kBadge} aria-label={`${k} colori`}>{k}</span>
        {' '}<b>diversi:</b>
        <br />
        è il minimo numero di colori del torneo con cui questo schema si può colorare.
        Le mosse non si annullano: se un nodo resta senza colori possibili, la partita è persa.
      </p>

      <div style={S.toolbar}>
        <button type="button" onClick={newGame} style={btn(true)}>Nuova partita</button>
        <button type="button" onClick={resetBoard} style={btn(false)} disabled={!colored}>Ricomincia questo schema</button>
      </div>

      <div style={S.layout}>
        {/* ── Schema a tre anelli ── */}
        <div style={S.card}>
          <svg viewBox={VIEWBOX} style={{ width: '100%', maxWidth: 440, display: 'block', margin: '0 auto' }}
            role="group" aria-label="Schema a tre anelli da colorare">
            {GRID.edges.map((e) => {
              const a = GRID.nodes[dir[e.id] ? e.u : e.v];
              const b = GRID.nodes[dir[e.id] ? e.v : e.u];
              const len = Math.hypot(b.x - a.x, b.y - a.y);
              const ux = (b.x - a.x) / len;
              const uy = (b.y - a.y) / len;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const s = 6;
              const tip = [mx + ux * s, my + uy * s];
              const l = [mx - ux * s - uy * s * 0.8, my - uy * s + ux * s * 0.8];
              const r = [mx - ux * s + uy * s * 0.8, my - uy * s - ux * s * 0.8];
              const touchesSel = selected != null && (e.u === selected || e.v === selected);
              return (
                <g key={e.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={touchesSel ? '#111827' : '#9ca3af'} strokeWidth={touchesSel ? 2.8 : 2.2} />
                  <polygon points={`${tip} ${l} ${r}`} fill={touchesSel ? '#111827' : '#4b5563'} />
                </g>
              );
            })}

            {GRID.nodes.map((nd) => {
              const c = colors[nd.id] ? colorById(colors[nd.id]) : null;
              const dead = deadNodes.includes(nd.id);
              const isSel = selected === nd.id;
              const ring = dead ? '#dc2626' : isSel ? '#111827' : null;
              return (
                <g key={nd.id} transform={`translate(${nd.x}, ${nd.y})`}
                  aria-label={c ? `Nodo colorato ${c.name}` : 'Nodo da colorare'}
                  {...(c || over ? {} : {
                    role: 'button', tabIndex: 0, onClick: () => clickNode(nd.id),
                    onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); clickNode(nd.id); } },
                    style: { cursor: 'pointer' },
                  })}>
                  {ring && <circle r={NODE_R + 5} fill="none" stroke={ring} strokeWidth={2.5} />}
                  <circle r={NODE_R} fill={c ? c.hex : '#e5e7eb'} stroke="#fff" strokeWidth={2} style={{ transition: 'fill .2s' }} />
                  <text textAnchor="middle" dy=".35em" fill={c ? '#fff' : '#6b7280'} style={{ fontWeight: 700, fontSize: 10.5, userSelect: 'none' }}>
                    {c ? c.name : isSel ? '?' : ''}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tavolozza: con un nodo selezionato, i colori non ammessi sono spenti */}
          <div style={S.palette} aria-label="Colori">
            {COLORS.map((c) => {
              const dim = selected != null && !allowedForSelected.includes(c.id);
              const disabled = disabledColors.has(c.id);
              return (
                <button key={c.id} type="button" onClick={() => assign(c.id)} disabled={disabled}
                  title={dim ? `${c.name} non è ammesso qui` : `Colora con ${c.name}`}
                  style={{ ...S.swatch, background: c.hex, opacity: dim ? 0.25 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  {c.name}
                </button>
              );
            })}
          </div>

          <div style={S.status(status.tone)}>{status.text}</div>
          {message && !over && <div style={S.status(message.tone)}>{message.text}</div>}
          <div style={S.meta}>Schema n° <b>{seed}</b></div>
        </div>

        {/* ── Torneo ── */}
        <div style={{ ...S.card, minWidth: 260 }}>
          <A6TournamentVisualizer
            selectedColor={null}
            onSelectColor={(c) => c && assign(c)}
            hoverColor={tHover}
            onHoverColor={setTHover}
            usedColors={usedColors}
            disabledColors={disabledColors}
            disabled={over}
          />
          <div style={S.meta}>Puoi scegliere il colore anche cliccando un nodo del torneo.</div>
        </div>
      </div>

      {/* ── L'omomorfismo ── */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.subTitle}>Perché è un gioco di omomorfismi orientati</div>
        <p style={S.text}>
          Un <b>omomorfismo orientato</b> è una funzione che conserva le frecce: associa i vertici della griglia
          esagonale ai vertici di un piccolo grafo di colori, qui il torneo A₆. Ogni freccia della griglia deve
          trovare una freccia con lo stesso verso tra i colori corrispondenti: se nella griglia c’è <b>u → v</b>,
          nel torneo deve esserci <b>colore(u) → colore(v)</b>.
        </p>
        <p style={S.text}>
          Colorare lo schema significa quindi costruire un omomorfismo orientato un nodo alla volta. Più nodi possono
          ricevere lo stesso colore, perché la funzione non deve essere iniettiva: per questo i colori si ripetono e
          non serve usarli tutti. Il gioco chiede anzi di usarne il meno possibile: cerca un omomorfismo verso
          una parte del torneo con soli k colori. Due nodi collegati non possono invece avere lo stesso colore,
          perché nel torneo non esiste una freccia da un colore a se stesso. Il torneo funziona come un regolamento
          compatto: per ogni coppia di colori dice in quale verso possono essere collegati.
        </p>
        <p style={S.text}>
          Su Wikipedia (in inglese):{' '}
          <a href="https://en.wikipedia.org/wiki/Graph_homomorphism" target="_blank" rel="noopener noreferrer" style={S.link}>Graph homomorphism</a>
          {' '}e{' '}
          <a href="https://en.wikipedia.org/wiki/Oriented_coloring" target="_blank" rel="noopener noreferrer" style={S.link}>Oriented coloring</a>.
        </p>
      </div>

      {/* ── Il teorema ── */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.subTitle}>Perché il gioco è sempre risolvibile</div>
        <p style={S.text}>
          <b>Per la griglia esagonale in generale:</b> con il torneo A₆ mostrato, una colorazione valida esiste
          per ogni griglia e per ogni orientamento delle sue frecce. Sei colori bastano quindi sempre.
        </p>
        <p style={S.text}>
          <b>Per lo schema a tre anelli di questo gioco</b> ne segue che ogni partita ha almeno una soluzione,
          di solito molte. Lo schema è piccolo e sei colori non servono mai: su tutti i 32.768 orientamenti
          possibili, il minimo numero di colori di A₆ che basta è 4 in più del 90% dei casi, 3 o 5 negli
          altri e 2 solo in due casi. Le griglie formate da una o due
          file di esagoni, come questo schema, si colorano sempre con al massimo 5 colori.
        </p>
        <p style={S.text}>
          Il riferimento è il teorema sul numero cromatico orientato della griglia esagonale, che vale 6.
          Halina Bielak (2006) dimostrò che vale 5 o 6; Antoni Lozano chiuse la questione dimostrando,
          con una verifica al computer, che cinque colori non bastano. Il Teorema 1 dell’articolo di Lozano
          ridimostra il limite superiore di Bielak proprio tramite il torneo fisso A₆:{' '}
          <a href="https://arxiv.org/abs/2007.13111" target="_blank" rel="noopener noreferrer" style={S.link}>
            <i>The Oriented Chromatic Number of the Hexagonal Grid is 6</i>
          </a>.
        </p>
      </div>

      <style>{`
        @keyframes r52-pop { 0% { transform: scale(0.4); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
        .r52-k { animation: r52-pop .6s ease-out; }
        @media (prefers-reduced-motion: reduce) { .r52-k { animation: none; } }
      `}</style>

      {/* ── Analisi (nascosta) ── */}
      {SHOW_ANALYSIS && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={S.subTitle}>Quanto è difficile questo schema?</div>
          <p style={{ ...S.lead, marginBottom: 10 }}>
            Fa giocare al computer {analysis?.games ?? 600} partite per ciascuna strategia, senza mai annullare,
            e conta tutte le colorazioni possibili dello schema.
          </p>
          <button type="button" onClick={analyze} style={btn(false)} disabled={analyzing}>
            {analyzing ? 'Calcolo…' : analysis ? 'Ricalcola' : 'Analizza lo schema'}
          </button>
          {analysis && (
            <div style={{ marginTop: 12 }}>
              <div style={S.meta}>
                Colorazioni complete possibili: <b>{analysis.solutions.toLocaleString('it-IT')}</b> ·
                Sorgenti: <b>{analysis.sources}</b> · Pozzi: <b>{analysis.sinks}</b>
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {analysis.rates.map((r) => (
                  <div key={r.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 2fr 48px', gap: 10, alignItems: 'center', fontSize: 13 }}>
                    <span>{r.label}</span>
                    <div style={{ background: '#f1f5f9', borderRadius: 6, height: 14 }}>
                      <div style={{ width: `${r.rate * 100}%`, background: '#3B82F6', height: '100%', borderRadius: 6 }} />
                    </div>
                    <b style={{ textAlign: 'right' }}>{Math.round(r.rate * 100)}%</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btn = (primary) => ({
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid ' + (primary ? '#111827' : '#d1d5db'),
  background: primary ? '#111827' : '#fff',
  color: primary ? '#fff' : '#374151',
  fontSize: 13,
  cursor: 'pointer',
});

const TONES = {
  ok: ['#ecfdf5', '#065f46'],
  info: ['#f8fafc', '#334155'],
  warn: ['#fffbeb', '#92400e'],
  error: ['#fef2f2', '#991b1b'],
};

const S = {
  page: { maxWidth: 920, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif', color: '#111827' },
  title: { fontSize: '1.8rem', fontWeight: 800, margin: '0 0 2px', textAlign: 'center' },
  tagline: { color: '#6b7280', fontSize: '1rem', margin: '0 0 14px', textAlign: 'center' },
  lead: { color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: 14, maxWidth: 740 },
  toolbar: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 },
  layout: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  card: { flex: '1 1 320px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 },
  subTitle: { fontWeight: 600, fontSize: 15, marginBottom: 6 },
  text: { color: '#374151', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 10px', maxWidth: 760 },
  link: { color: '#2563eb', textDecoration: 'underline' },
  palette: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  swatch: { width: 46, height: 34, borderRadius: 8, border: 'none', color: '#fff', fontWeight: 700, fontSize: 12 },
  meta: { marginTop: 8, fontSize: 12.5, color: '#6b7280', textAlign: 'center' },
  kBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '1.6em', height: '1.6em', margin: '2px 4px', padding: '0 0.15em',
    fontSize: '2.4rem', fontWeight: 800, lineHeight: 1, verticalAlign: 'middle',
    color: '#fff', background: '#111827', borderRadius: 12,
  },
  status: (tone) => ({
    marginTop: 10, padding: '6px 10px', borderRadius: 8, fontSize: 13, textAlign: 'center',
    background: TONES[tone][0], color: TONES[tone][1],
  }),
};
