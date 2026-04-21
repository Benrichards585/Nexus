import React, { useState } from 'react';
import { IMPACT_COLORS, CHANGE_TYPES } from './schema';

export default function Visualization({ rows }) {
  const [tooltip, setTooltip] = useState(null);

  if (rows.length === 0) return null;

  const orgGroups = [...new Set(rows.map(r => r.orgGroup).filter(Boolean))];
  const changeTypes = CHANGE_TYPES.filter(ct => rows.some(r => r.changeType === ct));

  const getCell = (group, type) => rows.find(r => r.orgGroup === group && r.changeType === type);

  const labelWidth = 170;

  return (
    <div className="bg-white rounded-xl border border-border p-6 fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-text-primary">Impact Heatmap</h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-muted font-medium">Impact Level:</span>
          {Object.entries(IMPACT_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs text-text-secondary">{level}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ width: '100%' }}>
          {/* Header Row */}
          <div className="flex" style={{ marginLeft: labelWidth }}>
            {changeTypes.map(ct => (
              <div key={ct} className="text-sm font-semibold text-text-muted text-center flex-1" style={{ minWidth: 80, paddingBottom: 10 }}>
                {ct}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {orgGroups.map((group, gi) => (
            <div key={group} className="flex items-center">
              <div className="text-base font-medium text-text-primary pr-4 shrink-0" style={{ width: labelWidth }} title={group}>
                {group}
              </div>
              {changeTypes.map(ct => {
                const cell = getCell(group, ct);
                if (!cell) {
                  return (
                    <div key={ct} className="flex-1 border border-border-light bg-surface-secondary/50 rounded-md m-0.5"
                      style={{ minWidth: 76, height: 60 }} />
                  );
                }
                const bg = IMPACT_COLORS[cell.impactLevel] || '#e5e7eb';
                return (
                  <div
                    key={ct}
                    className="flex-1 rounded-md m-0.5 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md hover:z-10 relative"
                    style={{ minWidth: 76, height: 60, backgroundColor: bg }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ cell, x: rect.left + rect.width / 2, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <span className="text-white font-bold text-2xl drop-shadow-sm">{cell.readiness}</span>
                    <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Ready</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-border px-4 py-3 text-xs pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 10, transform: 'translate(-50%, -100%)', maxWidth: 280 }}
        >
          <div className="font-semibold text-text-primary mb-1.5">{tooltip.cell.orgGroup} — {tooltip.cell.changeType}</div>
          <div className="space-y-1 text-text-secondary">
            <div className="flex items-center gap-2">
              <span>Impact:</span>
              <span className="badge text-white" style={{ backgroundColor: IMPACT_COLORS[tooltip.cell.impactLevel] }}>
                {tooltip.cell.impactLevel}
              </span>
            </div>
            <div>People Affected: <span className="font-semibold text-text-primary">{tooltip.cell.peopleAffected.toLocaleString()}</span></div>
            <div>Timeline: <span className="font-semibold text-text-primary">{tooltip.cell.timelineSensitivity}</span></div>
            <div>Readiness: <span className="font-semibold text-text-primary">{tooltip.cell.readiness}/5</span></div>
            {tooltip.cell.notes && <div className="mt-1.5 pt-1.5 border-t border-border text-text-muted italic">"{tooltip.cell.notes}"</div>}
          </div>
        </div>
      )}
    </div>
  );
}
