/**
 * CHANGE READINESS ASSESSMENT — RefinePanel.jsx
 *
 * Conversational refinement panel for the survey draft. Mirrors the
 * conversational pattern in src/modules/CommunicationsGenerator/AIAssist.jsx
 * (per schema SCAFFOLDING_NOTES Deviation #2 and v1.1 spec Screen 4) —
 * but built locally so we don't modify the shared <AIChat>.
 *
 * Layout: left compact draft view; right chat stream + suggestion chips
 * + input. When Claude proposes a change, it lands as a .propose block
 * with explicit Apply / Reject buttons. The first "Qn" reference in
 * Claude's message highlights that question on the left.
 *
 * The schema's AI_REFINEMENT_SYSTEM_PROMPT does not constrain the JSON
 * shape Claude returns. We augment the user message with a brief
 * "proposal envelope" instruction so the UI can reliably surface
 * Apply / Reject. Claude is still free to reply in pure prose.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { AI_REFINEMENT_SYSTEM_PROMPT, emptyQuestion } from './schema';
import { useApp } from '../../context/AppContext';
import { callClaude } from '../../utils/aiClient';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import { extractFirstJsonObject, aiAvailable as computeAiAvailable, aiUnavailableReason as computeAiReason } from './aiUtils';

const AI_GRADIENT = 'linear-gradient(135deg, #2E308E 0%, #2F78C4 100%)';

// Default suggestion chips per v1.1 spec line 1413-1417 (three nudges).
const DEFAULT_CHIPS = [
  'Stress-test for the most resistant group',
  'Shorten to 5 questions',
  'Translate Q1 for non-technical staff',
];

// Wraps the practitioner's message with structured-output guidance.
function wrapUserMessage(userMessage, survey) {
  const summary = (survey?.questions || [])
    .map((q, i) => `Q${i + 1} [${q.dimension || 'untagged'}]: ${q.prompt}`)
    .join('\n');
  return [
    'Current draft:',
    summary || '(empty)',
    '',
    'Practitioner asks:',
    userMessage,
    '',
    'You can reply in prose. If you have a concrete proposal, also include a JSON object (after any prose) in ONE of these two shapes:',
    '{ "proposals": [ { "questionId": "<id>", "field": "prompt"|"followUpPrompt"|"dimension"|"rationale", "newValue": "...", "summary": "Q3 revised: ..." } ] }',
    '{ "questions": [ ...full revised array... ], "delivery": { ... } }',
    'Pure prose is fine when no concrete change is being proposed yet.',
  ].join('\n');
}

// Extract first Qn reference in a message (1-indexed), return matching question id or null.
function firstReferencedQuestionId(text, questions) {
  const match = (text || '').match(/Q(\d+)/);
  if (!match) return null;
  const idx = parseInt(match[1], 10) - 1;
  return questions[idx]?.id || null;
}

// Apply a partial proposal object to the survey. Returns the new survey or null if no-op.
function applyProposal(survey, proposal) {
  if (!proposal) return null;
  const next = { ...survey, questions: [...survey.questions], delivery: { ...survey.delivery } };

  // Form: { proposals: [{ questionId, field, newValue }] }
  if (Array.isArray(proposal.proposals)) {
    proposal.proposals.forEach(p => {
      const i = next.questions.findIndex(q => q.id === p.questionId);
      if (i >= 0 && typeof p.newValue === 'string' && typeof p.field === 'string') {
        next.questions[i] = { ...next.questions[i], [p.field]: p.newValue };
      }
    });
    return next;
  }

  // Form: { questions: [...], delivery: {...} } — full or partial replacement.
  if (Array.isArray(proposal.questions)) {
    next.questions = proposal.questions.map((q, i) => ({
      ...emptyQuestion(),
      // Preserve existing id when ordering matches, otherwise mint a new one.
      id: typeof q.id === 'string' ? q.id : (survey.questions[i]?.id || emptyQuestion().id),
      type: typeof q.type === 'string' ? q.type : 'pair',
      prompt: typeof q.prompt === 'string' ? q.prompt : '',
      followUpPrompt: typeof q.followUpPrompt === 'string' ? q.followUpPrompt : '',
      scale: typeof q.scale === 'string' ? q.scale : 'likert',
      dimension: typeof q.dimension === 'string' ? q.dimension : '',
      rationale: typeof q.rationale === 'string' ? q.rationale : '',
    }));
  }
  if (proposal.delivery && typeof proposal.delivery === 'object') {
    next.delivery = { ...next.delivery, ...proposal.delivery };
  }
  return next;
}

// Build a one-line summary of what the proposal will change.
function proposalSummary(proposal, survey) {
  if (!proposal) return '';
  if (Array.isArray(proposal.proposals) && proposal.proposals.length > 0) {
    return proposal.proposals.map(p => {
      const i = survey.questions.findIndex(q => q.id === p.questionId);
      const num = i >= 0 ? `Q${i + 1}` : '?';
      return p.summary || `${num} ${p.field}: ${truncate(p.newValue, 80)}`;
    }).join(' · ');
  }
  if (Array.isArray(proposal.questions)) {
    const newCount = proposal.questions.length;
    return `Replace draft with ${newCount} question${newCount === 1 ? '' : 's'}`;
  }
  if (proposal.delivery) return 'Update delivery plan';
  return '';
}

function truncate(s, n) {
  if (typeof s !== 'string') return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

export default function RefinePanel({ survey, refinementHistory, onUpdateHistory, onApplyProposal, initiative, moduleId }) {
  const {
    apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage,
    canMakeAIRequest, passwordRequired, accessGranted,
  } = useApp();

  const aiAvailable = computeAiAvailable({ aiEnabled, passwordRequired, accessGranted, canMakeAIRequest });
  const aiUnavailableReason = computeAiReason({ aiEnabled, passwordRequired, accessGranted, canMakeAIRequest });

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef(null);

  const history = Array.isArray(refinementHistory) ? refinementHistory : [];
  const questions = survey?.questions || [];

  // Find the most recent AI message that references a question for highlight.
  const highlightId = (() => {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role !== 'ai') continue;
      if (msg.proposal) {
        // Highlight the first question affected by the proposal.
        const proposals = msg.proposal.proposals;
        if (Array.isArray(proposals) && proposals[0]?.questionId) return proposals[0].questionId;
      }
      const ref = firstReferencedQuestionId(msg.content, questions);
      if (ref) return ref;
    }
    return null;
  })();

  // Auto-scroll chat to the latest message.
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [history.length, sending]);

  const send = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || sending || !aiAvailable) return;
    setError('');
    setInput('');

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
    const newHistory = [...history, userMsg];
    onUpdateHistory(newHistory);

    setSending(true);
    try {
      const systemPrompt = enhancePromptWithContext(AI_REFINEMENT_SYSTEM_PROMPT, initiative, moduleId);

      const result = await callClaude({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: wrapUserMessage(text, survey) }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });

      // Split the response into prose + (optional) JSON proposal.
      let prose = result;
      let proposal = null;
      const jsonStr = extractFirstJsonObject(result);
      if (jsonStr) {
        try {
          proposal = JSON.parse(jsonStr);
          prose = result.replace(jsonStr, '').trim();
        } catch {
          // Treat as plain prose if not JSON-parseable.
          proposal = null;
        }
      }
      const proposalApplied = !!proposal && !!proposalSummary(proposal, survey);

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: prose || (proposalApplied ? 'I have a specific change to propose:' : ''),
        proposal: proposalApplied ? proposal : null,
        proposalStatus: 'pending',
      };
      onUpdateHistory([...newHistory, aiMsg]);
    } catch (err) {
      setError(err.message || 'Failed to reach Claude.');
    } finally {
      setSending(false);
    }
  };

  const handleApply = (msgId) => {
    const msg = history.find(m => m.id === msgId);
    if (!msg || !msg.proposal) return;
    const nextSurvey = applyProposal(survey, msg.proposal);
    if (!nextSurvey) return;
    onApplyProposal(nextSurvey);
    onUpdateHistory(history.map(m => m.id === msgId ? { ...m, proposalStatus: 'applied' } : m));
  };

  const handleReject = (msgId) => {
    onUpdateHistory(history.map(m => m.id === msgId ? { ...m, proposalStatus: 'rejected' } : m));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
      {/* Left: compact draft view */}
      <div className="bg-white rounded-xl border border-border p-4 sticky top-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
        <div className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">
          Draft survey · {questions.length} questions
        </div>
        {questions.length === 0 && (
          <p className="text-xs text-text-muted">No draft yet — generate one first from Setup.</p>
        )}
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`p-2 mb-1 rounded-md text-xs leading-relaxed transition-colors ${
              q.id === highlightId
                ? 'bg-accent/10 border border-accent/40 text-text-primary'
                : 'text-text-secondary border border-transparent'
            }`}
          >
            <span className="font-semibold text-accent mr-1.5">Q{i + 1}</span>
            {q.prompt}
          </div>
        ))}
      </div>

      {/* Right: chat */}
      <div className="bg-white rounded-xl border border-border flex flex-col" style={{ minHeight: 480 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <h4 className="text-sm font-semibold text-text-primary">Refine with Claude</h4>
          </div>
          <span className={`text-[11px] font-medium ${aiAvailable ? 'text-emerald-600' : 'text-text-muted'}`}>
            {aiAvailable ? 'Connected' : 'AI offline'}
          </span>
        </div>

        <div ref={streamRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 480 }}>
          {history.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              Ask Claude to edit, add, or stress-test any part of the draft. Apply or reject each proposal as it comes in.
            </p>
          )}
          {history.map(msg => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              survey={survey}
              onApply={handleApply}
              onReject={handleReject}
            />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={12} className="animate-spin" /> Claude is thinking…
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border-light flex flex-wrap gap-1.5">
          {DEFAULT_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => send(chip)}
              disabled={!aiAvailable || sending}
              className="text-[11px] px-2.5 py-1 border border-border rounded-full text-text-muted hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="px-3 py-3 border-t border-border flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={aiAvailable ? 'Ask Claude to edit, add, or stress-test…' : aiUnavailableReason}
            disabled={!aiAvailable || sending}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent disabled:bg-gray-50 disabled:text-text-muted"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || !aiAvailable || sending}
            style={{ background: (!input.trim() || !aiAvailable || sending) ? undefined : AI_GRADIENT }}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-shadow ${
              (!input.trim() || !aiAvailable || sending)
                ? 'bg-gray-100 text-text-muted cursor-not-allowed'
                : 'text-white shadow-sm hover:shadow'
            }`}
          >
            <Send size={14} />
          </button>
        </div>

        {error && (
          <div className="mx-3 mb-3 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ msg, survey, onApply, onReject }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="ml-auto max-w-[85%] bg-accent text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm whitespace-pre-wrap">
        {msg.content}
      </div>
    );
  }

  return (
    <div className="mr-auto max-w-[90%]">
      {msg.content && (
        <div className="bg-surface-secondary text-text-primary text-sm px-3 py-2 rounded-2xl rounded-tl-sm whitespace-pre-wrap leading-relaxed">
          {msg.content}
        </div>
      )}
      {msg.proposal && (
        <div
          className="mt-2 px-3 py-3 rounded-lg text-sm border-l-4 bg-white shadow-sm"
          style={{ borderLeftColor: '#2E308E' }}
        >
          <div className="text-text-primary font-medium mb-1">Proposed change</div>
          <div className="text-xs text-text-secondary leading-relaxed mb-2">
            {proposalSummary(msg.proposal, survey) || 'See message above.'}
          </div>
          {msg.proposalStatus === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onApply(msg.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-medium rounded-md hover:bg-emerald-700 transition-colors"
              >
                <Check size={11} /> Apply
              </button>
              <button
                type="button"
                onClick={() => onReject(msg.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-border text-text-muted text-[11px] font-medium rounded-md hover:border-red-300 hover:text-red-600 transition-colors"
              >
                <X size={11} /> Reject
              </button>
            </div>
          )}
          {msg.proposalStatus === 'applied' && (
            <span className="text-[11px] text-emerald-700 font-medium">Applied ✓</span>
          )}
          {msg.proposalStatus === 'rejected' && (
            <span className="text-[11px] text-text-muted">Rejected</span>
          )}
        </div>
      )}
    </div>
  );
}
