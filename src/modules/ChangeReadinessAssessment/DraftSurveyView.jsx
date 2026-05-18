/**
 * CHANGE READINESS ASSESSMENT — DraftSurveyView.jsx
 *
 * Renders the generated survey draft as a list of question cards.
 * Each card edits in place; changes persist on blur (not on every
 * keystroke) per v1.1 spec annotation Screen 3 (lines 1313-1327).
 *
 * Drag-to-reorder is deferred per scaffolding prompt §7.
 */
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

const SCALE_LABEL = {
  likert:     'Likert',
  commitment: 'Commitment',
};

function isPaired(question) {
  return question.type === 'pair' && (question.followUpPrompt || '').trim().length > 0;
}

function QuestionCard({ index, question, onUpdate, onDelete, highlight }) {
  const [draft, setDraft] = useState(question);
  const [editingDimension, setEditingDimension] = useState(false);

  // Keep local draft in sync if parent replaces the question (e.g. Apply from refine panel).
  React.useEffect(() => {
    setDraft(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.prompt, question.followUpPrompt, question.dimension, question.scale, question.type]);

  const commit = (field, value) => {
    if (value === question[field]) return;
    onUpdate({ ...question, [field]: value });
  };

  const baseScale = draft.scale === 'commitment' ? 'commitment' : 'likert';
  const scaleChip = `${SCALE_LABEL[baseScale]}${isPaired(draft) ? ' · paired' : ''}`;

  return (
    <div
      className={`bg-white rounded-xl border p-5 mb-3 transition-colors ${
        highlight ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-accent/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/10 text-accent text-[11px] font-semibold">
            Q{index + 1}
          </span>
          {editingDimension ? (
            <input
              autoFocus
              value={draft.dimension}
              onChange={e => setDraft({ ...draft, dimension: e.target.value })}
              onBlur={() => { commit('dimension', draft.dimension); setEditingDimension(false); }}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              className="px-2 py-0.5 border border-accent/30 rounded-md text-[11px] font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingDimension(true)}
              className="px-2 py-0.5 bg-surface-secondary text-text-secondary text-[11px] font-semibold rounded-md hover:bg-accent/10 hover:text-accent transition-colors"
              title="Click to edit dimension"
            >
              {draft.dimension || 'Untagged'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(question.id)}
          className="text-text-muted hover:text-red-500 transition-colors"
          title="Delete question"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <textarea
        rows={2}
        value={draft.prompt}
        onChange={e => setDraft({ ...draft, prompt: e.target.value })}
        onBlur={() => commit('prompt', draft.prompt)}
        className="w-full bg-transparent border-0 text-sm text-text-primary leading-relaxed focus:outline-none focus:ring-0 resize-none"
        placeholder="Question prompt..."
      />

      <textarea
        rows={2}
        value={draft.followUpPrompt || ''}
        onChange={e => setDraft({ ...draft, followUpPrompt: e.target.value })}
        onBlur={() => commit('followUpPrompt', draft.followUpPrompt)}
        className="w-full bg-transparent border-0 text-sm text-text-secondary italic focus:outline-none focus:ring-0 resize-none mt-1"
        placeholder="↳ Optional open follow-up..."
      />

      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 bg-surface-secondary text-text-muted text-[10px] font-medium rounded-full">
          {scaleChip}
        </span>
        {draft.rationale && (
          <span
            className="text-[10px] text-text-muted"
            title={draft.rationale}
          >
            · why?
          </span>
        )}
      </div>
    </div>
  );
}

export default function DraftSurveyView({ survey, onUpdateQuestion, onDeleteQuestion, highlightId }) {
  const questions = Array.isArray(survey?.questions) ? survey.questions : [];

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-text-muted">No draft yet — finish the wizard and click <strong>Generate draft</strong>.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-accent/5 border border-accent/15 rounded-xl px-4 py-3 mb-4">
        <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Generated draft</h4>
        <p className="text-sm text-text-secondary leading-relaxed">
          {questions.length} questions, calibrated to your wizard answers. Edit anything inline — changes save when you click away.
        </p>
      </div>

      {questions.map((q, idx) => (
        <QuestionCard
          key={q.id}
          index={idx}
          question={q}
          onUpdate={onUpdateQuestion}
          onDelete={onDeleteQuestion}
          highlight={q.id === highlightId}
        />
      ))}
    </div>
  );
}
