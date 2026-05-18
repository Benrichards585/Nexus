/**
 * CHANGE READINESS ASSESSMENT — KeyFindings.jsx
 *
 * Renders synthesis.keyFindings — one card per finding with the "what,"
 * "why," and affected-groups line. Per v1.1 spec Screen 06.
 */
import React from 'react';

export default function KeyFindings({ findings }) {
  const list = Array.isArray(findings) ? findings : [];
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h4 className="text-sm font-semibold text-text-primary mb-3">Key findings</h4>
      {list.length === 0 && (
        <p className="text-xs text-text-muted">No findings yet. Run analyze to surface signals.</p>
      )}
      <div className="space-y-4">
        {list.map((f, i) => (
          <div key={i} className="border-l-2 pl-3" style={{ borderLeftColor: '#2E308E' }}>
            <div className="text-sm text-text-primary font-medium leading-snug">
              {f.finding}
            </div>
            {f.supportingEvidence && (
              <div className="text-xs text-text-secondary mt-1 leading-relaxed">
                {f.supportingEvidence}
              </div>
            )}
            {(f.implication || (f.affectedGroups && f.affectedGroups.length)) && (
              <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
                {Array.isArray(f.affectedGroups) && f.affectedGroups.length > 0 && (
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    Affected: <span className="text-text-secondary normal-case">{f.affectedGroups.join(', ')}</span>
                  </span>
                )}
                {f.implication && (
                  <span className="text-[11px] text-text-secondary italic">{f.implication}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
