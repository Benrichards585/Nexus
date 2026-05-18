/**
 * CHANGE READINESS ASSESSMENT — steps/SelectStep.jsx
 *
 * Option-grid step. One value per step; clicking an option selects it.
 * Selecting does NOT auto-advance — practitioner taps Next.
 * Per v1.1 spec Screen 01 behavior note (line 1029).
 */
import React from 'react';

export default function SelectStep({ step, value, onChange }) {
  const options = step.options || [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(opt => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`text-left px-4 py-3 rounded-lg text-sm font-medium border transition-all ${
              isSelected
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-white border-border text-text-primary hover:border-accent/40'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
