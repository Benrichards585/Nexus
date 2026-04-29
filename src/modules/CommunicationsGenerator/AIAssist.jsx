import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AI_SYSTEM_PROMPT } from './schema';
import { Sparkles, Loader2, AlertCircle, Bot, Copy, Check } from 'lucide-react';
import AIChat from '../../components/AIChat';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import { callClaude } from '../../utils/aiClient';

export default function AIAssist({ formData, generatedComm, setGeneratedComm, initiative, moduleId }) {
  const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage, canMakeAIRequest } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const initialMessageRef = useRef('');

  if (!aiEnabled) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot size={22} className="text-accent/40" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">AI Generation Required</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto mb-3">
          This module requires an Anthropic API key to generate communications. Add your key in Settings to get started.
        </p>
        <span className="text-xs text-accent font-medium">Settings → API Key</span>
      </div>
    );
  }

  if (!canMakeAIRequest) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-amber/40 p-8 text-center">
        <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot size={22} className="text-amber/60" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Daily Token Limit Reached</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          You've used your {(20000).toLocaleString()}-token daily budget. AI features will reset at midnight.
        </p>
      </div>
    );
  }

  const isFormValid = formData.subject.trim() && formData.audience.trim() && formData.keyPoints.trim();

  const buildUserMessage = () => {
    return `Generate a ${formData.commType} communication email with the following details:

Communication Type: ${formData.commType}
Subject/Topic: ${formData.subject}
Target Audience: ${formData.audience}
Audience Scope: ${formData.audienceScope === 'broad' ? 'Broad group — large audience with varied roles' : 'Specific group — targeted team or role'}
Audience Awareness: ${formData.audienceAwareness === 'yes' ? 'Recipients ARE expected to know why they are receiving this' : 'Recipients are NOT expected to know why they are receiving this — include context-setting introduction'}
Tone: ${formData.tone}
Key Points: ${formData.keyPoints}
${formData.dates ? `Important Dates/Deadlines: ${formData.dates}` : ''}
${formData.callToAction ? `Call to Action: ${formData.callToAction}` : ''}
${formData.additionalContext ? `Additional Context: ${formData.additionalContext}` : ''}`;
  };

  const handleGenerate = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError('');
    try {
      const userMessage = buildUserMessage();
      initialMessageRef.current = userMessage;

      const text = await callClaude({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId),
        messages: [{ role: 'user', content: userMessage }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      setGeneratedComm(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedComm) return;
    const text = `Subject: ${generatedComm.subjectLine}\n\n${generatedComm.emailBody}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Generate Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading || !isFormValid}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-lg text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-accent/20"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? 'Generating Communication...' : generatedComm ? 'Regenerate from Form' : 'Generate Communication'}
        </button>
        {!isFormValid && (
          <span className="text-xs text-text-muted">Fill in Subject, Audience, and Key Points to generate</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Output */}
      {generatedComm && (
        <div className="bg-white rounded-xl border border-border overflow-hidden fade-in">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-secondary">
            <h3 className="text-sm font-semibold text-text-primary">Generated Communication</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied ? 'bg-green-50 text-green-700' : 'border border-border text-text-secondary hover:bg-gray-50'
                }`}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy Email'}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Subject Line */}
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Subject Line</label>
              <div className="px-3 py-2.5 bg-surface-secondary rounded-lg border border-border-light text-sm font-medium text-text-primary">
                {generatedComm.subjectLine}
              </div>
            </div>

            {/* Email Body */}
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Email Body</label>
              <div className="px-4 py-4 bg-surface-secondary rounded-lg border border-border-light text-sm text-text-primary leading-relaxed whitespace-pre-line">
                {generatedComm.emailBody}
              </div>
            </div>

            {/* Tips */}
            {generatedComm.tipsForSender && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="text-[10px] text-amber-800 font-semibold uppercase mb-1">Tips for Sender</div>
                <div className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">{generatedComm.tipsForSender}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversational Refinement Chat */}
      <AIChat
        systemPrompt={AI_SYSTEM_PROMPT}
        initialUserMessage={initialMessageRef.current || buildUserMessage()}
        onOutputUpdate={(updated) => setGeneratedComm(updated)}
        hasOutput={!!generatedComm}
        outputLabel="communication"
        initiative={initiative}
        moduleId={moduleId}
      />
    </div>
  );
}
