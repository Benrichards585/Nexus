/**
 * CHANGE READINESS ASSESSMENT — steps/LongTextStep.jsx
 *
 * Multi-line textarea step. Reads {step, value, onChange} per the
 * WIZARD_STEPS shape.
 */
import React from 'react';

export default function LongTextStep({ value, onChange }) {
  return (
    <div className="space-y-2">
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={6}
        placeholder="Type your answer..."
        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none"
        autoFocus
      />
    </div>
  );
}
