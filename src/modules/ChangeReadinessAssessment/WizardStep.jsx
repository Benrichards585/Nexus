/**
 * CHANGE READINESS ASSESSMENT — WizardStep.jsx
 *
 * Step wrapper. Renders the step label + question + helper text and
 * delegates body rendering to one of the four step components by
 * step.type. Owns the Back / Save & close / Next / Generate buttons.
 *
 * FB-5 wires onSuggest for the GroupsStep. FB-6 wires onGenerate when
 * isLastStep.
 */
import React from 'react';
import TextStep from './steps/TextStep';
import LongTextStep from './steps/LongTextStep';
import SelectStep from './steps/SelectStep';
import GroupsStep from './steps/GroupsStep';

function renderStepBody(step, value, onChange, onSuggest, suggesting, aiAvailable, aiUnavailableReason, suggestError) {
  switch (step.type) {
    case 'text':
      return <TextStep value={value} onChange={onChange} />;
    case 'longText':
      return <LongTextStep value={value} onChange={onChange} />;
    case 'select':
      return <SelectStep step={step} value={value} onChange={onChange} />;
    case 'groups':
      return (
        <GroupsStep
          value={value}
          onChange={onChange}
          onSuggest={onSuggest}
          suggesting={suggesting}
          aiAvailable={aiAvailable}
          aiUnavailableReason={aiUnavailableReason}
          suggestError={suggestError}
        />
      );
    default:
      return null;
  }
}

// Validation: a step is "answered" when its value passes the type-specific check.
export function stepIsAnswered(step, value) {
  switch (step.type) {
    case 'text':
    case 'longText':
      return typeof value === 'string' && value.trim().length > 0;
    case 'select':
      return typeof value === 'string' && value.length > 0;
    case 'groups':
      // Per v1.1 spec line 1175: ≥1 labeled group allowed (warning at 1, hard block at 0).
      return Array.isArray(value) && value.some(g => (g.label || '').trim().length > 0);
    default:
      return false;
  }
}

export default function WizardStep({
  step,
  value,
  onChange,
  onBack,
  onNext,
  onSaveAndClose,
  onSuggest,
  onGenerate,
  suggesting,
  generating,
  isFirstStep,
  isLastStep,
  saveBadge,
  aiAvailable,
  aiUnavailableReason,
  suggestError,
  generateError,
}) {
  const answered = stepIsAnswered(step, value);

  return (
    <div className="max-w-3xl">
      <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
        {labelForStep(step)}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">{step.prompt}</h3>
      {step.helper && (
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">{step.helper}</p>
      )}

      <div className="mb-7">
        {renderStepBody(step, value, onChange, onSuggest, suggesting, aiAvailable, aiUnavailableReason, suggestError)}
      </div>

      {isLastStep && generateError && (
        <div className="mb-4 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          <span>{generateError}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep}
          className="text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          {saveBadge && (
            <span className="text-[11px] text-emerald-600 font-medium">{saveBadge}</span>
          )}
          <button
            type="button"
            onClick={onSaveAndClose}
            className="px-3 py-1.5 text-xs font-medium text-text-muted border border-border rounded-lg hover:border-accent/40 hover:text-accent transition-colors"
          >
            Save &amp; close
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={!answered || generating}
              className="px-4 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating draft…' : 'Generate draft →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!answered}
              className="px-4 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step labels mirror the v1.1 spec's "wiz-step-label" pattern (e.g. "Change type").
const STEP_LABEL_OVERRIDES = {
  changeType:        'Change type',
  programName:       'Program',
  phase:             'Lifecycle phase',
  priorActivities:   'Prior activities',
  stakeholderGroups: 'Stakeholder groups',
  riskAreas:         'Risks to probe',
  timeline:          'Timeline',
};

function labelForStep(step) {
  return STEP_LABEL_OVERRIDES[step.id] || step.id;
}
