/**
 * CHANGE READINESS ASSESSMENT — Heatmap.jsx
 *
 * Table-based heatmap (groups × question dimensions). Cells colored
 * from HEATMAP_BANDS (RAG); value is rounded mean with n=N sub-label.
 * Per v1.1 spec Screen 06.
 *
 * Sort dropdown with four options:
 *   - Alphabetical (default)
 *   - Weakest first  (row mean asc)
 *   - Strongest first (row mean desc)
 *   - Sample size    (row n desc)
 *
 * Tooltip on cell hover shows the full Likert distribution.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HEATMAP_BANDS, LIKERT_SCALE, COMMITMENT_SCALE } from './schema';

const SORT_OPTIONS = [
  { id: 'alpha',       label: 'Alphabetical' },
  { id: 'weakest',     label: 'Weakest first' },
  { id: 'strongest',   label: 'Strongest first' },
  { id: 'sample',      label: 'Sample size' },
];

// Restructure flat heatmap cells into a groups × dimensions grid.
function buildGrid(cells) {
  // Preserve dimension order from the question sequence (cells already arrive
  // grouped by group → questions order). Use the first group encountered to
  // capture the column ordering.
  const dimensionsSeen = [];
  const dimensionSet = new Set();
  cells.forEach(c => {
    const key = c.questionDimension || c.questionId;
    if (!dimensionSet.has(key)) {
      dimensionSet.add(key);
      dimensionsSeen.push({ key, label: c.questionDimension || '—' });
    }
  });

  const groupMap = new Map(); // groupLabel → { groupLabel, rowCells: {dimKey: cell}, n }
  cells.forEach(c => {
    const dimKey = c.questionDimension || c.questionId;
    let row = groupMap.get(c.groupLabel);
    if (!row) {
      row = { groupLabel: c.groupLabel, rowCells: {}, totalN: 0, sumWeighted: 0, count: 0 };
      groupMap.set(c.groupLabel, row);
    }
    row.rowCells[dimKey] = c;
    if (typeof c.mean === 'number' && c.n > 0) {
      row.sumWeighted += c.mean * c.n;
      row.totalN += c.n;
      row.count += 1;
    }
  });

  // rowMean: weighted mean across cells; max N per row used for the row label "n=N"
  groupMap.forEach(row => {
    row.rowMean = row.totalN > 0 ? row.sumWeighted / row.totalN : null;
    row.maxN = Math.max(0, ...Object.values(row.rowCells).map(c => c.n || 0));
  });

  return { dimensions: dimensionsSeen, rows: Array.from(groupMap.values()) };
}

function sortRows(rows, sortId) {
  const copy = [...rows];
  switch (sortId) {
    case 'weakest':
      copy.sort((a, b) => {
        if (a.rowMean === null) return 1;
        if (b.rowMean === null) return -1;
        return a.rowMean - b.rowMean;
      });
      break;
    case 'strongest':
      copy.sort((a, b) => {
        if (a.rowMean === null) return 1;
        if (b.rowMean === null) return -1;
        return b.rowMean - a.rowMean;
      });
      break;
    case 'sample':
      copy.sort((a, b) => b.maxN - a.maxN);
      break;
    case 'alpha':
    default:
      copy.sort((a, b) => String(a.groupLabel).localeCompare(String(b.groupLabel)));
      break;
  }
  return copy;
}

function bandForLevel(level) {
  return HEATMAP_BANDS.find(b => b.level === level) || HEATMAP_BANDS[HEATMAP_BANDS.length - 1];
}

function CellTooltip({ cell, likertDistributions }) {
  if (!cell || typeof cell.mean !== 'number') {
    return (
      <div className="absolute z-20 -top-1 left-full ml-2 px-3 py-2 bg-white text-text-primary border border-border rounded-lg shadow-lg w-60 text-xs">
        <div className="font-semibold">{cell?.questionDimension || 'No data'}</div>
        <div className="text-text-muted mt-1">No responses for this group on this question.</div>
      </div>
    );
  }
  const scaleDef = cell.questionScale === 'commitment' ? COMMITMENT_SCALE : LIKERT_SCALE;
  const distribution = likertDistributions?.[cell.questionId] || { 1: 0, 2: 0, 3: 0, 4: 0 };
  const total = (distribution[1] || 0) + (distribution[2] || 0) + (distribution[3] || 0) + (distribution[4] || 0);
  return (
    <div className="absolute z-20 -top-1 left-full ml-2 px-3 py-2 bg-white text-text-primary border border-border rounded-lg shadow-lg w-60 text-xs">
      <div className="font-semibold leading-tight">{cell.questionDimension || '—'}</div>
      <div className="text-text-muted mt-1 mb-2">
        Mean {cell.mean.toFixed(2)} · n={cell.n} for <strong>{cell.groupLabel}</strong>
      </div>
      <div className="space-y-1">
        {scaleDef.map(s => {
          const n = distribution[s.value] || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <div key={s.value} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="flex-1 truncate">{s.label}</span>
              <span className="text-text-muted">{n} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ cell, likertDistributions }) {
  const [hovering, setHovering] = useState(false);
  if (!cell || typeof cell.mean !== 'number') {
    return (
      <td
        className="relative p-0 align-middle text-center"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="m-0.5 px-2 py-2 rounded-md bg-gray-50 text-text-muted text-[11px]">
          —
        </div>
        {hovering && <CellTooltip cell={cell} likertDistributions={likertDistributions} />}
      </td>
    );
  }
  const band = bandForLevel(cell.ragLevel);
  return (
    <td
      className="relative p-0 align-middle text-center"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="m-0.5 px-2 py-2 rounded-md text-white"
        style={{ background: band.color }}
      >
        <div className="text-sm font-semibold leading-none">{cell.mean.toFixed(1)}</div>
        <div className="text-[9px] opacity-80 mt-0.5">n={cell.n}</div>
      </div>
      {hovering && <CellTooltip cell={cell} likertDistributions={likertDistributions} />}
    </td>
  );
}

export default function Heatmap({ analytics }) {
  const [sortId, setSortId] = useState('alpha');
  const [open, setOpen] = useState(false);

  const cellsRaw = analytics?.heatmapData;
  const cells = useMemo(() => Array.isArray(cellsRaw) ? cellsRaw : [], [cellsRaw]);
  const { dimensions, rows } = useMemo(() => buildGrid(cells), [cells]);
  const sortedRows = useMemo(() => sortRows(rows, sortId), [rows, sortId]);

  if (cells.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-text-muted">No heatmap data yet — import responses first.</p>
      </div>
    );
  }

  const sortLabel = SORT_OPTIONS.find(o => o.id === sortId)?.label || 'Alphabetical';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Readiness heatmap</h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted border border-border rounded-lg hover:border-accent/40 hover:text-accent transition-colors"
          >
            Sort: <span className="text-text-primary font-medium">{sortLabel}</span>
            <ChevronDown size={12} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-border rounded-lg shadow-lg w-44 py-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={() => { setSortId(opt.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-secondary ${
                    sortId === opt.id ? 'text-accent font-medium' : 'text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary text-text-muted text-[11px] uppercase tracking-wider">
              <th className="px-4 py-2 text-left font-semibold">Group</th>
              {dimensions.map(d => (
                <th
                  key={d.key}
                  className="px-2 py-2 text-center font-semibold whitespace-normal"
                  style={{ minWidth: 90 }}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {sortedRows.map(row => (
              <tr key={row.groupLabel} className="hover:bg-surface-secondary/30 transition-colors">
                <td className="px-4 py-2 text-text-primary font-medium whitespace-nowrap">
                  {row.groupLabel}
                  <span className="ml-1.5 text-text-muted font-normal">· n={row.maxN}</span>
                </td>
                {dimensions.map(d => (
                  <Cell
                    key={d.key}
                    cell={row.rowCells[d.key]}
                    likertDistributions={analytics?.likertDistributions}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-text-muted">
        {HEATMAP_BANDS.map(band => (
          <span key={band.level} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: band.color }} />
            {band.level === 'Red'   && 'Red < 2.0 — significant gap'}
            {band.level === 'Amber' && 'Amber 2.0–2.75 — partial readiness'}
            {band.level === 'Green' && 'Green ≥ 2.75 — ready'}
          </span>
        ))}
      </div>
    </div>
  );
}
