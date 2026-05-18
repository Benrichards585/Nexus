/**
 * CHANGE READINESS ASSESSMENT — WizardProgress.jsx
 *
 * Pure presentational. 7 dots + 6 lines + counter. Past dots clickable;
 * future dots not. Per v1.1 spec Screen 01 (lines 970-985).
 */
import React from 'react';
import { Check } from 'lucide-react';

export default function WizardProgress({ totalSteps, currentStep, onJumpTo }) {
  const dots = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div className="flex items-center gap-1.5 mb-7 text-[11px] font-medium">
      {dots.map((i, idx) => {
        const isDone = i < currentStep;
        const isCurrent = i === currentStep;
        const isPast = i <= currentStep;
        const isClickable = isPast && i !== currentStep;
        return (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => isClickable && onJumpTo(i)}
              disabled={!isClickable}
              aria-label={`Step ${i + 1}${isDone ? ' (complete)' : isCurrent ? ' (current)' : ''}`}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                isDone
                  ? 'bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 cursor-pointer'
                  : isCurrent
                    ? 'bg-accent text-white border border-accent shadow-sm'
                    : 'bg-white text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {isDone ? <Check size={11} strokeWidth={3} /> : i + 1}
            </button>
            {idx < dots.length - 1 && (
              <span
                className={`h-px flex-1 max-w-[40px] ${
                  i < currentStep ? 'bg-accent/40' : 'bg-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
      <span className="ml-3 text-text-muted">
        Step {currentStep + 1} of {totalSteps}
      </span>
    </div>
  );
}
