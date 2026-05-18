/**
 * CHANGE READINESS ASSESSMENT — TagResponsesModal.jsx
 *
 * Opens when an imported file has no recognized group column. Each row
 * needs a stakeholder-group tag before analysis can run. Tags are
 * sourced from planContext.stakeholderGroups (defined in FB-4 Phase 1).
 *
 * Per scaffolding prompt §7: bulk-tag is deferred. Single-row tagging
 * only for the baseline.
 *
 * Per scaffolding prompt §10 verification: every row must be tagged
 * before the Apply button enables.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { makeResponse } from './ImportFlow';

export default function TagResponsesModal({ pending, planContext, onApply, onCancel }) {
  // pending = { baseRecords, columnToQuestion, headers, filename }
  const [tags, setTags] = useState(() =>
    (pending?.baseRecords || []).map(rec => rec.groupFromFile || '')
  );

  if (!pending) return null;

  const definedGroups = (planContext?.stakeholderGroups || []).filter(g => (g.label || '').trim().length > 0);
  const allowedLabels = new Set(definedGroups.map(g => g.label));

  const tagged = tags.every(t => t && allowedLabels.has(t));
  const taggedCount = tags.filter(t => t && allowedLabels.has(t)).length;

  const handleApply = () => {
    const records = pending.baseRecords.map((rec, i) =>
      makeResponse({ ...rec, groupFromFile: tags[i] }, pending.columnToQuestion, allowedLabels)
    );
    onApply({
      responses: records,
      importMeta: {
        filename: pending.filename,
        importedAt: new Date().toISOString(),
        rowCount: records.length,
        columnsMatched: pending.columnToQuestion.size,
        columnsTotal: pending.headers.length,
        groupColumn: null, // tagged manually
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Tag respondents by stakeholder group</h3>
            <p className="text-xs text-text-muted mt-0.5">
              No <code>Stakeholder Group</code> column found in <strong>{pending.filename}</strong>.
              Tag each row using the groups you defined in Phase 1.
              ({taggedCount} of {tags.length} tagged.)
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {definedGroups.length === 0 && (
          <div className="m-5 px-3 py-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
            No stakeholder groups defined yet. Return to Phase 1 → Setup → Stakeholder Groups step and
            define at least one group before importing.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-[11px] uppercase tracking-wider text-text-muted border-b border-border">
                <th className="px-2 py-2 text-left font-semibold">Respondent</th>
                <th className="px-2 py-2 text-left font-semibold">Stakeholder group</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {pending.baseRecords.map((rec, i) => (
                <tr key={i}>
                  <td className="px-2 py-2 text-text-secondary">
                    {rec.respondentId || `Row ${i + 1}`}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={tags[i]}
                      onChange={e => setTags(prev => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent"
                    >
                      <option value="">— Select group —</option>
                      {definedGroups.map(g => (
                        <option key={g.id} value={g.label}>{g.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-xs text-text-muted">
            Bulk-tag is deferred. Tag each row individually for now.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-text-muted border border-border rounded-lg hover:border-text-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!tagged}
              className="px-4 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply tags &amp; analyze →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
