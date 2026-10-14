'use client';

import React, { useState } from 'react';
import { COLORS, TOURNAMENT_ARCS } from './tournament';

const positions = Object.fromEntries(COLORS.map((color, index) => {
  const angle = (index * 60 - 90) * Math.PI / 180;
  return [color.id, { x: 200 + 145 * Math.cos(angle), y: 200 + 145 * Math.sin(angle) }];
}));

export default function A6TournamentVisualizer({
  selectedColor,
  onSelectColor,
  hoverColor,
  onHoverColor,
  usedColors,
  disabledColors, // facoltativo: Set di colori non selezionabili (cursore di divieto, clic ignorato)
  disabled = false, // facoltativo: torneo del tutto inerte (niente clic, passaggio del mouse, focus)
}) {
  const [localSelection, setLocalSelection] = useState(null);
  const [localHover, setLocalHover] = useState(null);
  const selected = selectedColor === undefined ? localSelection : selectedColor;
  const hovered = hoverColor === undefined ? localHover : hoverColor;
  const select = onSelectColor ?? setLocalSelection;
  const hover = onHoverColor ?? setLocalHover;
  const active = disabled ? null : selected ?? hovered;
  // La legenda mostra sempre entrambe le versioni sovrapposte (una invisibile),
  // così la sua altezza non cambia al passaggio del mouse e la pagina non "balla".
  const shown = active ?? COLORS[0].id;
  const outgoing = TOURNAMENT_ARCS.filter(([from]) => from === shown).map(([, to]) => `C${to}`);
  const incoming = TOURNAMENT_ARCS.filter(([, to]) => to === shown).map(([from]) => `C${from}`);
  const legendLayer = (visible) => ({
    gridArea: '1 / 1', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start',
    gap: '6px 14px', visibility: visible ? 'visible' : 'hidden',
  });

  return (
    <div style={{ color: '#1f2937', textAlign: 'center' }}>
      <h3 style={{ margin: '8px 0', fontWeight: 700 }}>Torneo bersaglio A₆</h3>
      <svg viewBox="0 0 400 400" role="group" aria-label="Torneo dei sei colori: seleziona un nodo per esplorare i suoi archi"
        style={{ width: '100%', maxWidth: 440, display: 'block', margin: '0 auto' }}>
        {TOURNAMENT_ARCS.map(([from, to]) => {
          const a = positions[from];
          const b = positions[to];
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          const ux = (b.x - a.x) / length;
          const uy = (b.y - a.y) / length;
          const x1 = a.x + ux * 23;
          const y1 = a.y + uy * 23;
          const x2 = b.x - ux * 23;
          const y2 = b.y - uy * 23;
          const cross = (from <= 3) !== (to <= 3);
          const related = from === active || to === active;
          const baseStroke = cross ? '#64748b' : from <= 3 ? '#f87171' : '#60a5fa';
          const stroke = from === active ? '#2563eb' : to === active ? '#dc2626' : baseStroke;
          const head = `${x2},${y2} ${x2 - ux * 9 - uy * 4.5},${y2 - uy * 9 + ux * 4.5} ${x2 - ux * 9 + uy * 4.5},${y2 - uy * 9 - ux * 4.5}`;
          return (
            <g key={`${from}-${to}`}>
              <title>{`C${from} → C${to}`}</title>
              <line x1={x1} y1={y1} x2={x2 - ux * 7} y2={y2 - uy * 7}
                stroke={stroke} strokeWidth={related ? 3 : 2} strokeDasharray={cross ? '5 4' : undefined} />
              <polygon points={head} fill={stroke} />
            </g>
          );
        })}
        {COLORS.map((color) => (disabled ? (
          <g key={color.id} transform={`translate(${positions[color.id].x}, ${positions[color.id].y})`}
            aria-label={`Colore ${color.name}${usedColors?.has(color.id) ? ', usato nella griglia' : ''}`}>
            {usedColors?.has(color.id) && <circle r={25} fill="none" stroke="#475569" strokeDasharray="3 3" />}
            <circle r={20} fill={color.hex} stroke="#fff" strokeWidth={1.5} />
            <text textAnchor="middle" dy=".35em" fill="#fff" style={{ fontSize: 12, fontWeight: 700, userSelect: 'none' }}>{color.name}</text>
          </g>
        ) : (
          <g key={color.id} transform={`translate(${positions[color.id].x}, ${positions[color.id].y})`}
            role="button" tabIndex={0} aria-label={`Colore ${color.name}${usedColors?.has(color.id) ? ', usato nella griglia' : ''}`}
            aria-pressed={selected === color.id}
            aria-disabled={disabledColors?.has(color.id) || undefined}
            onClick={() => { if (!disabledColors?.has(color.id)) select(selected === color.id ? null : color.id); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!disabledColors?.has(color.id)) select(selected === color.id ? null : color.id);
              }
              if (event.key === 'Escape') { select(null); hover(null); }
            }}
            onMouseEnter={() => hover(color.id)} onMouseLeave={() => hover(null)}
            onFocus={() => hover(color.id)} onBlur={() => hover(null)}
            style={{ cursor: disabledColors?.has(color.id) ? 'not-allowed' : 'pointer' }}>
            {usedColors?.has(color.id) && <circle r={25} fill="none" stroke="#475569" strokeDasharray="3 3" />}
            <circle r={20} fill={color.hex} stroke={active === color.id ? '#111827' : '#fff'} strokeWidth={active === color.id ? 3 : 1.5} />
            <text textAnchor="middle" dy=".35em" fill="#fff" style={{ fontSize: 12, fontWeight: 700, userSelect: 'none' }}>{color.name}</text>
          </g>
        )))}
      </svg>
      <div style={{ display: 'grid', fontSize: 13 }}>
        <div style={legendLayer(active == null)} aria-hidden={active != null}>
          <span style={{ color: '#b91c1c' }}>― Triangolo C1–C2–C3</span>
          <span style={{ color: '#1d4ed8' }}>― Triangolo C4–C5–C6</span>
          <span>┄ 9 archi incrociati</span>
        </div>
        <div style={legendLayer(active != null)} aria-hidden={active == null}>
          <span style={{ color: '#2563eb' }}>Uscenti da C{shown}: {outgoing.join(', ')}</span>
          <span style={{ color: '#dc2626' }}>Entranti in C{shown}: {incoming.join(', ')}</span>
        </div>
      </div>
      {usedColors && <p style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Anello tratteggiato: colore usato nella griglia.</p>}
      {selected != null && <button type="button" onClick={() => { select(null); hover(null); }}
        style={{ marginTop: 10, padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
        Mostra tutti gli archi
      </button>}
    </div>
  );
}
