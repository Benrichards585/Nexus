import React, { useState, useMemo } from 'react';
import { SENTIMENT_COLORS, PRIORITY_SIZES } from './schema';

export default function Visualization({ rows, matrixRef }) {
  const [tooltip, setTooltip] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const sortedRows = useMemo(() => {
    if (rows.length === 0) return [];
    return [...rows].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortField, sortDir]);

  if (rows.length === 0) return null;

  const gridWidth = 560;
  const gridHeight = 460;
  const padding = 50;

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const scaleX = (interest) => padding + ((interest - 1) / 9) * (gridWidth - 2 * padding);
  const scaleY = (influence) => (gridHeight - padding) - ((influence - 1) / 9) * (gridHeight - 2 * padding);
  const midX = gridWidth / 2;
  const midY = gridHeight / 2;

  const quadrants = [
    { label: 'Keep Satisfied', sub: 'High Power, Low Interest', x: (padding + midX) / 2, y: (padding + midY) / 2 },
    { label: 'Manage Closely', sub: 'High Power, High Interest', x: (midX + gridWidth - padding) / 2, y: (padding + midY) / 2 },
    { label: 'Monitor', sub: 'Low Power, Low Interest', x: (padding + midX) / 2, y: (midY + gridHeight - padding) / 2 },
    { label: 'Keep Informed', sub: 'Low Power, High Interest', x: (midX + gridWidth - padding) / 2, y: (midY + gridHeight - padding) / 2 },
  ];

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-text-muted/30 ml-0.5">↕</span>;
    return <span className="text-accent ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Power/Interest Grid */}
      <div ref={matrixRef} className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-text-primary">Power / Interest Matrix</h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-text-muted font-medium">Sentiment:</span>
            {Object.entries(SENTIMENT_COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-text-secondary">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto flex justify-center">
          <svg width={gridWidth} height={gridHeight + 15} className="block">
            {/* Quadrant backgrounds */}
            <rect x={padding} y={padding} width={midX - padding} height={midY - padding} fill="#fef3c7" opacity={0.2} rx={4} />
            <rect x={midX} y={padding} width={gridWidth - padding - midX} height={midY - padding} fill="#fee2e2" opacity={0.2} rx={4} />
            <rect x={padding} y={midY} width={midX - padding} height={gridHeight - padding - midY} fill="#f0fdf4" opacity={0.15} rx={4} />
            <rect x={midX} y={midY} width={gridWidth - padding - midX} height={gridHeight - padding - midY} fill="#eff6ff" opacity={0.2} rx={4} />

            {/* Quadrant labels */}
            {quadrants.map(q => (
              <g key={q.label}>
                <text x={q.x} y={q.y} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">{q.label}</text>
                <text x={q.x} y={q.y + 14} textAnchor="middle" fill="#cbd5e1" fontSize="8">{q.sub}</text>
              </g>
            ))}

            {/* Grid border */}
            <rect x={padding} y={padding} width={gridWidth - 2 * padding} height={gridHeight - 2 * padding}
              fill="none" stroke="#e2e8f0" rx={4} />

            {/* Midlines */}
            <line x1={midX} y1={padding} x2={midX} y2={gridHeight - padding} stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1={padding} y1={midY} x2={gridWidth - padding} y2={midY} stroke="#e2e8f0" strokeDasharray="3,3" />

            {/* Axis labels */}
            <text x={gridWidth / 2} y={gridHeight - 2} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">
              Interest Level →
            </text>
            <text x={10} y={gridHeight / 2} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500"
              transform={`rotate(-90, 10, ${gridHeight / 2})`}>
              Influence →
            </text>

            {/* Ticks */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <g key={`t-${n}`}>
                <text x={scaleX(n)} y={gridHeight - padding + 16} textAnchor="middle" fill="#94a3b8" fontSize="9">{n}</text>
                <text x={padding - 10} y={scaleY(n) + 3} textAnchor="end" fill="#94a3b8" fontSize="9">{n}</text>
              </g>
            ))}

            {/* Bubbles */}
            {rows.map(s => {
              const cx = scaleX(s.interest);
              const cy = scaleY(s.influence);
              const r = PRIORITY_SIZES[s.priority] || 10;
              const color = SENTIMENT_COLORS[s.sentiment] || '#9CA3AF';
              return (
                <g key={s.id}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ s, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className="cursor-pointer"
                >
                  <circle cx={cx} cy={cy} r={r + 2} fill={color} opacity={0.15} />
                  <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.9} stroke="white" strokeWidth={2} />
                  <text x={cx} y={cy - r - 5} textAnchor="middle" fill="#334155" fontSize="9" fontWeight="600">
                    {s.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-white rounded-lg shadow-xl border border-border px-4 py-3 text-xs pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 10, transform: 'translate(-50%, -100%)', maxWidth: 300 }}>
          <div className="font-semibold text-text-primary mb-1">{tooltip.s.name}</div>
          <div className="text-text-secondary space-y-0.5">
            <div>Role: <span className="text-text-primary font-medium">{tooltip.s.role}</span> · {tooltip.s.department}</div>
            <div>Influence: <strong>{tooltip.s.influence}</strong>/10 · Interest: <strong>{tooltip.s.interest}</strong>/10</div>
            <div className="flex items-center gap-1">
              Sentiment: <span className="badge text-white text-[10px]" style={{ backgroundColor: SENTIMENT_COLORS[tooltip.s.sentiment] }}>{tooltip.s.sentiment}</span>
              · Priority: <strong>{tooltip.s.priority}</strong>
            </div>
            {tooltip.s.concerns && <div className="mt-1.5 pt-1 border-t border-border text-text-muted italic">"{tooltip.s.concerns}"</div>}
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Stakeholder Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary border-b border-border">
                {[
                  { field: 'name', label: 'Name' }, { field: 'role', label: 'Role' },
                  { field: 'department', label: 'Dept' }, { field: 'influence', label: 'Influence' },
                  { field: 'interest', label: 'Interest' }, { field: 'sentiment', label: 'Sentiment' },
                  { field: 'priority', label: 'Priority' }, { field: 'concerns', label: 'Key Concerns' },
                ].map(col => (
                  <th key={col.field} onClick={() => toggleSort(col.field)}
                    className="text-left py-2.5 px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide cursor-pointer hover:text-text-primary select-none">
                    {col.label}<SortIcon field={col.field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(s => (
                <tr key={s.id} className="border-b border-border-light hover:bg-surface-secondary/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: SENTIMENT_COLORS[s.sentiment] }}>
                        {s.name.charAt(0)}
                      </div>
                      <span className="font-medium text-text-primary">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary">{s.role}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{s.department}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${s.influence * 10}%` }} />
                      </div>
                      <span className="text-[11px] text-text-muted font-medium w-4">{s.influence}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber rounded-full" style={{ width: `${s.interest * 10}%` }} />
                      </div>
                      <span className="text-[11px] text-text-muted font-medium w-4">{s.interest}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="badge text-white text-[10px]" style={{ backgroundColor: SENTIMENT_COLORS[s.sentiment] }}>
                      {s.sentiment}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[11px] font-semibold ${
                      s.priority === 'High' ? 'text-red-600' : s.priority === 'Medium' ? 'text-amber-600' : 'text-text-muted'
                    }`}>{s.priority}</span>
                  </td>
                  <td className="py-2.5 px-3 text-text-muted text-xs max-w-[180px] truncate" title={s.concerns}>
                    {s.concerns}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
