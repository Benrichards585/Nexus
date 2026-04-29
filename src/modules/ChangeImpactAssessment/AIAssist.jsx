import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AI_SYSTEM_PROMPT, AI_INSIGHTS_PROMPT, emptyRow } from './schema';
import { Sparkles, Loader2, AlertCircle, Bot, Wand2 } from 'lucide-react';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import { callClaude } from '../../utils/aiClient';

export default function AIAssist({ rows, setRows, aiInsights, setAiInsights, initiative, moduleId }) {
  const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage, canMakeAIRequest, tokensRemaining } = useApp();
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!aiEnabled) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot size={22} className="text-accent/40" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">AI Features Available</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto mb-3">
          Add your Anthropic API key in Settings to unlock AI-powered impact extraction from unstructured notes and intelligent insights.
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

  const invokeAI = async (systemPrompt, userMessage) => {
    return callClaude({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      apiKey,
      proxyAvailable,
      appPassword: accessPassword,
      onUsage: recordUsage,
    });
  };

  const handleGenerateRows = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await invokeAI(enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId), rawText);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      const newRows = (parsed.rows || []).map(r => ({
        ...emptyRow(),
        ...r,
        peopleAffected: parseInt(r.peopleAffected) || 0,
        readiness: Math.min(5, Math.max(1, parseInt(r.readiness) || 3)),
      }));
      setRows(prev => [...prev, ...newRows]);
      setRawText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (rows.length === 0) return;
    setInsightsLoading(true);
    setError('');
    try {
      const dataStr = JSON.stringify(rows.map(({ id, ...rest }) => rest), null, 2);
      const result = await invokeAI(
        enhancePromptWithContext('You are an OCM expert analyst. Provide concise, actionable insights.', initiative, moduleId),
        AI_INSIGHTS_PROMPT + dataStr
      );
      setAiInsights(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Text Input Card */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-accent-50 rounded-lg flex items-center justify-center">
            <Wand2 size={14} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Extract Impacts from Text</h3>
            <p className="text-[11px] text-text-muted">Paste meeting notes, emails, or summaries — AI will structure them into impact rows</p>
          </div>
        </div>

        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={6}
          placeholder="e.g. 'In today's steering committee meeting, we discussed the ERP migration. Finance will be heavily impacted — about 120 people need to transition to the new system within Q1. Operations is concerned about the warehouse automation timeline...'"
          className="w-full px-3 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none"
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleGenerateRows}
            disabled={loading || !rawText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating...' : 'Generate Impact Rows'}
          </button>

          {rows.length > 0 && (
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              className="flex items-center gap-2 px-4 py-2 border border-accent/30 text-accent font-medium rounded-lg text-sm hover:bg-accent-50 transition-colors disabled:opacity-50"
            >
              {insightsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {insightsLoading ? 'Analyzing...' : 'Generate Insights'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
