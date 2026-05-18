/**
 * CHANGE READINESS ASSESSMENT — DeliveryPanel.jsx
 *
 * Sticky-style sidebar that renders emptyDeliveryPlan() fields and the
 * two CTAs per v1.1 spec Screen 3 (lines 1292-1305):
 *   - "Refine with Claude →" switches wizardMode to 'refining'
 *   - "Export survey (PDF)" triggers Phase 1 export (FB-9)
 *
 * All fields edit in place; save on blur.
 */
import React, { useState } from 'react';
import { Sparkles, FileDown, FileSpreadsheet } from 'lucide-react';

const AI_GRADIENT = 'linear-gradient(135deg, #2E308E 0%, #2F78C4 100%)';

const FIELDS = [
  { key: 'method',            label: 'Method' },
  { key: 'cadence',           label: 'Cadence' },
  { key: 'timing',            label: 'Timing' },
  { key: 'channel',           label: 'Channel' },
  { key: 'estimatedDuration', label: 'Duration' },
  { key: 'considerations',    label: 'Notes' },
];

function DeliveryRow({ field, value, onCommit }) {
  const [draft, setDraft] = useState(value || '');

  React.useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = () => {
    if (draft === (value || '')) return;
    onCommit(field.key, draft);
  };

  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border-light last:border-b-0">
      <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold whitespace-nowrap">
        {field.label}
      </span>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="—"
        className="flex-1 min-w-0 text-right bg-transparent border-0 text-sm text-text-primary focus:outline-none focus:ring-0"
      />
    </div>
  );
}

export default function DeliveryPanel({ delivery, onUpdate, onRefine, onExportPdf, onExportExcel, aiAvailable, aiUnavailableReason, exporting }) {
  const commit = (field, value) => {
    onUpdate({ ...delivery, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5 sticky top-4">
      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Delivery plan</h4>

      <div className="space-y-0">
        {FIELDS.map(field => (
          <DeliveryRow key={field.key} field={field} value={delivery?.[field.key]} onCommit={commit} />
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-5">
        <button
          type="button"
          onClick={onRefine}
          disabled={!aiAvailable}
          title={!aiAvailable ? aiUnavailableReason : undefined}
          style={{ background: aiAvailable ? AI_GRADIENT : undefined }}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-shadow ${
            aiAvailable
              ? 'text-white shadow-sm hover:shadow'
              : 'text-text-muted/60 bg-gray-100 border border-border cursor-not-allowed'
          }`}
        >
          <Sparkles size={14} />
          Refine with Claude →
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-text-primary border border-border rounded-lg hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
        >
          <FileDown size={14} />
          {exporting ? 'Exporting…' : 'Export survey (PDF)'}
        </button>
        <button
          type="button"
          onClick={onExportExcel}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-text-muted border border-border rounded-lg hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
        >
          <FileSpreadsheet size={13} />
          Export questions (Excel)
        </button>
      </div>
    </div>
  );
}
