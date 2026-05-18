/**
 * CHANGE READINESS ASSESSMENT — steps/TextStep.jsx
 *
 * Single-line input step. Reads {step, value, onChange} per the
 * WIZARD_STEPS shape.
 */
import React from 'react';

export default function TextStep({ value, onChange }) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Type your answer..."
        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent"
        autoFocus
      />
    </div>
  );
}
