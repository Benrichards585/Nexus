/**
 * CHANGE READINESS ASSESSMENT — Visualization.jsx
 *
 * Composes the Phase 2 dashboard: headline → meta strip → heatmap →
 * (findings | action plan) two-column. Per v1.1 spec Screen 06.
 */
import React from 'react';
import { Sparkles, FileDown, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react';
import DashboardHeadline from './DashboardHeadline';
import KeyFindings from './KeyFindings';
import ActionPlan from './ActionPlan';
import Heatmap from './Heatmap';

const AI_GRADIENT = 'linear-gradient(135deg, #2E308E 0%, #2F78C4 100%)';

export default function Visualization({
  importMeta,
  analytics,
  synthesis,
  onAnalyze,
  onClearImport,
  onExportPdf,
  onExportExcel,
  analyzing,
  exporting,
  aiAvailable,
  aiUnavailableReason,
  synthesizeError,
}) {
  const responseCount = analytics?.responseCount || 0;
  const groupCount = analytics?.groupCount || 0;
  const hasSynthesis = synthesis && (synthesis.overallReadiness || synthesis.keyFindings);

  const importedAt = importMeta?.importedAt
    ? new Date(importMeta.importedAt).toLocaleDateString()
    : '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-[11px] text-text-muted">
          <span className="font-medium text-text-secondary">{responseCount}</span> responses ·{' '}
          <span className="font-medium text-text-secondary">{groupCount}</span> stakeholder group{groupCount === 1 ? '' : 's'}
          {importedAt && <> · imported {importedAt}</>}
          {importMeta?.filename && <> · from <code className="text-text-muted">{importMeta.filename}</code></>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!aiAvailable || analyzing || responseCount === 0}
            title={!aiAvailable ? aiUnavailableReason : undefined}
            style={{ background: aiAvailable && !analyzing && responseCount > 0 ? AI_GRADIENT : undefined }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-shadow ${
              aiAvailable && !analyzing && responseCount > 0
                ? 'text-white shadow-sm hover:shadow'
                : 'text-text-muted/60 bg-gray-100 border border-border cursor-not-allowed'
            }`}
          >
            {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {hasSynthesis ? (analyzing ? 'Refreshing…' : 'Refresh analysis') : (analyzing ? 'Analyzing…' : 'Analyze responses')}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={exporting || !hasSynthesis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary border border-border rounded-lg hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
          >
            <FileDown size={12} />
            PDF
          </button>
          <button
            type="button"
            onClick={onExportExcel}
            disabled={exporting || !hasSynthesis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary border border-border rounded-lg hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={12} />
            Excel
          </button>
          <button
            type="button"
            onClick={onClearImport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted border border-border rounded-lg hover:border-red-300 hover:text-red-600 transition-colors"
            title="Clear current import and re-upload"
          >
            <RefreshCw size={12} />
            Re-upload
          </button>
        </div>
      </div>

      {synthesizeError && (
        <div className="px-3 py-2 text-[12px] text-red-700 bg-red-50 rounded-lg border border-red-100">
          {synthesizeError}
        </div>
      )}

      <DashboardHeadline
        synthesis={synthesis}
        fallback={hasSynthesis ? null : `${responseCount} responses imported. Click "Analyze responses" to surface findings.`}
      />

      <Heatmap analytics={analytics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <KeyFindings findings={synthesis?.keyFindings} />
        <ActionPlan
          actions={synthesis?.actionPlan}
          watchOuts={synthesis?.watchOuts}
        />
      </div>
    </div>
  );
}
