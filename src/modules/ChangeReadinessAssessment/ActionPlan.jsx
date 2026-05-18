/**
 * CHANGE READINESS ASSESSMENT — ActionPlan.jsx
 *
 * Renders synthesis.actionPlan — priority dot + label + meta + effort
 * tag. Source quotes optionally expanded. Per v1.1 spec Screen 06.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const PRIORITY_STYLE = {
  high:   { dot: '#DC2626', label: 'High' },
  medium: { dot: '#F59E0B', label: 'Medium' },
  low:    { dot: '#10B981', label: 'Low' },
};

const EFFORT_STYLE = {
  small:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  large:  'bg-red-50 text-red-700 border border-red-200',
};

function ActionItem({ action }) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_STYLE[String(action.priority || '').toLowerCase()] || PRIORITY_STYLE.medium;
  const effortClass = EFFORT_STYLE[String(action.effort || '').toLowerCase()] || EFFORT_STYLE.medium;
  const hasQuotes = Array.isArray(action.sourceQuotes) && action.sourceQuotes.length > 0;

  return (
    <div className="border-b border-border-light last:border-b-0 py-3">
      <div className="flex items-start gap-3">
        <span
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: priority.dot }}
          title={`${priority.label} priority`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary leading-snug">{action.action}</div>
          <div className="text-[11px] text-text-muted mt-1 flex flex-wrap items-center gap-2">
            <span>{priority.label} priority</span>
            <span>·</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${effortClass}`}>
              {String(action.effort || 'medium').toLowerCase()} effort
            </span>
            {action.targetAudience && (
              <>
                <span>·</span>
                <span>{action.targetAudience}</span>
              </>
            )}
          </div>
          {action.rationale && (
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{action.rationale}</p>
          )}
          {hasQuotes && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent font-medium hover:text-accent-dark"
            >
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {action.sourceQuotes.length} respondent quote{action.sourceQuotes.length === 1 ? '' : 's'}
            </button>
          )}
          {expanded && hasQuotes && (
            <ul className="mt-2 pl-3 border-l-2 border-border-light space-y-1.5">
              {action.sourceQuotes.map((q, i) => (
                <li key={i} className="text-[12px] text-text-secondary italic leading-relaxed">"{q}"</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActionPlan({ actions, watchOuts }) {
  const list = Array.isArray(actions) ? actions : [];
  const watch = Array.isArray(watchOuts) ? watchOuts : [];
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h4 className="text-sm font-semibold text-text-primary mb-2">Prioritized action plan</h4>
      {list.length === 0 && (
        <p className="text-xs text-text-muted">No actions yet. Run analyze to generate recommendations.</p>
      )}
      <div>
        {list.map((a, i) => <ActionItem key={i} action={a} />)}
      </div>
      {watch.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-light">
          <h5 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider mb-2">
            Watch-outs
          </h5>
          <ul className="space-y-1">
            {watch.map((w, i) => (
              <li key={i} className="text-xs text-text-secondary leading-relaxed">• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
