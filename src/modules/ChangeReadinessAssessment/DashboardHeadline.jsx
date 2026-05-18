/**
 * CHANGE READINESS ASSESSMENT — DashboardHeadline.jsx
 *
 * Gradient banner with the AI-generated headline and a confidence tag
 * (color-coded from synthesis.overallReadiness.confidence).
 * Per v1.1 spec Screen 06 (lines 1608-1611).
 */
import React from 'react';
import { Sparkles } from 'lucide-react';

const CONFIDENCE_STYLE = {
  high:   { bg: '#10B981', label: 'High confidence' },
  medium: { bg: '#F59E0B', label: 'Medium confidence' },
  low:    { bg: '#DC2626', label: 'Low confidence' },
};

const BANNER_GRADIENT = 'linear-gradient(135deg, #2E308E 0%, #2F78C4 100%)';

export default function DashboardHeadline({ synthesis, fallback }) {
  const headline = synthesis?.overallReadiness?.headline || fallback || 'Awaiting analysis…';
  const confidence = synthesis?.overallReadiness?.confidence;
  const style = confidence ? CONFIDENCE_STYLE[String(confidence).toLowerCase()] : null;

  return (
    <div
      className="rounded-xl px-5 py-4 text-white mb-4"
      style={{ background: BANNER_GRADIENT }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles size={16} />
        </div>
        <div className="flex-1">
          <p className="text-base font-medium leading-relaxed">{headline}</p>
          {synthesis?.overallReadiness?.summary && (
            <p className="text-xs opacity-80 mt-2 leading-relaxed">
              {synthesis.overallReadiness.summary}
            </p>
          )}
        </div>
        {style && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold text-white whitespace-nowrap"
            style={{ background: style.bg }}
          >
            {style.label}
          </span>
        )}
      </div>
    </div>
  );
}
