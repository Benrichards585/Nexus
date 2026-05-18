/**
 * CHANGE READINESS ASSESSMENT — steps/GroupsStep.jsx
 *
 * Stakeholder-groups builder. Inline table; one row per
 * emptyStakeholderGroup. Per v1.1 spec Screen 02 (lines 1043-1178).
 *
 * FB-4: scaffolds the table, add/remove rows, validation warning at <2
 * groups. Suggest-groups button renders with the plum→blue "AI happens
 * here" gradient; live AI call is wired in FB-5.
 */
import React from 'react';
import { Sparkles, Plus, X, AlertCircle } from 'lucide-react';
import { emptyStakeholderGroup } from '../schema';

const AI_GRADIENT = 'linear-gradient(135deg, #2E308E 0%, #2F78C4 100%)';

export default function GroupsStep({ value, onChange, onSuggest, suggesting, aiAvailable, aiUnavailableReason, suggestError }) {
  const groups = Array.isArray(value) ? value : [];

  const updateGroup = (id, field, fieldValue) => {
    onChange(groups.map(g => (g.id === id ? { ...g, [field]: fieldValue } : g)));
  };

  const addGroup = () => onChange([...groups, emptyStakeholderGroup()]);

  const removeGroup = (id) => onChange(groups.filter(g => g.id !== id));

  const labeledCount = groups.filter(g => (g.label || '').trim().length > 0).length;
  const showSparseWarning = labeledCount === 1;

  return (
    <div className="space-y-3">
      <div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={suggesting || !aiAvailable}
          title={!aiAvailable ? aiUnavailableReason : undefined}
          style={{ background: aiAvailable ? AI_GRADIENT : undefined }}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-shadow ${
            aiAvailable
              ? 'text-white shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed'
              : 'text-text-muted/60 bg-gray-100 border border-border cursor-not-allowed'
          }`}
        >
          <Sparkles size={14} />
          {suggesting ? 'Suggesting…' : 'Suggest groups'}
        </button>
        <span className="ml-3 text-[11px] text-text-muted">
          {aiAvailable
            ? 'Claude proposes a starting set from your earlier answers — you can edit, add, or remove.'
            : aiUnavailableReason}
        </span>
        {suggestError && (
          <div className="mt-2 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{suggestError}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary text-text-muted text-[11px] uppercase tracking-wider">
              <th className="px-4 py-2 text-left font-semibold" style={{ width: '40%' }}>Group label</th>
              <th className="px-4 py-2 text-left font-semibold" style={{ width: '18%' }}>Approx. size</th>
              <th className="px-4 py-2 text-left font-semibold">Notes</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">
                  No groups yet. Click <strong>Suggest groups</strong> for a starting set, or
                  <strong> Add group</strong> below to enter one manually.
                </td>
              </tr>
            ) : (
              groups.map(g => (
                <tr key={g.id} className="hover:bg-surface-secondary/40 transition-colors">
                  <td className="px-4 py-2">
                    <input
                      value={g.label}
                      onChange={e => updateGroup(g.id, 'label', e.target.value)}
                      className="w-full bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                      placeholder="e.g. Finance Operations"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={g.approximateSize}
                      onChange={e => updateGroup(g.id, 'approximateSize', e.target.value)}
                      className="w-full bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                      placeholder="e.g. 45"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={g.notes}
                      onChange={e => updateGroup(g.id, 'notes', e.target.value)}
                      className="w-full bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                      placeholder="Optional context"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => removeGroup(g.id)}
                      className="text-text-muted hover:text-red-500 transition-colors"
                      aria-label="Remove group"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-dark"
        >
          <Plus size={13} /> Add group
        </button>

        {showSparseWarning && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600">
            <AlertCircle size={12} />
            With only one group the heatmap collapses to a single row — add a second group for a comparison view.
          </span>
        )}
      </div>
    </div>
  );
}
