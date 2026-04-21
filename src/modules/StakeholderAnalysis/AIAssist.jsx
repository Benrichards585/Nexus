import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AI_SYSTEM_PROMPT, AI_ENGAGEMENT_PROMPT, emptyStakeholder } from './schema';
import { Sparkles, Loader2, AlertCircle, Bot, Wand2 } from 'lucide-react';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import { callClaude } from '../../utils/aiClient';

export default function AIAssist({ rows, setRows, aiRecommendations, setAiRecommendations, initiative, moduleId }) {
  const { apiKey, aiEnabled, proxyAvailable } = useApp();
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!aiEnabled) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot size={22} className="text-accent/40" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">AI Features Available</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto mb-3">
          Add your Anthropic API key in Settings to unlock AI-powered stakeholder extraction and engagement recommendations.
        </p>
        <span className="text-xs text-accent font-medium">Settings → API Key</span>
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
    });
  };

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await invokeAI(enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId), rawText);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      const newRows = (parsed.stakeholders || []).map(s => ({
        ...emptyStakeholder(),
        ...s,
        influence: Math.min(10, Math.max(1, parseInt(s.influence) || 5)),
        interest: Math.min(10, Math.max(1, parseInt(s.interest) || 5)),
      }));
      setRows(prev => [...prev, ...newRows]);
      setRawText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecs = async () => {
    if (rows.length === 0) return;
    setRecsLoading(true);
    setError('');
    try {
      const dataStr = JSON.stringify(rows.map(({ id, ...rest }) => rest), null, 2);
      const result = await invokeAI(
        enhancePromptWithContext('You are an OCM expert specializing in stakeholder engagement. Provide specific, actionable recommendations.', initiative, moduleId),
        AI_ENGAGEMENT_PROMPT + dataStr
      );
      setAiRecommendations(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-accent-50 rounded-lg flex items-center justify-center">
            <Wand2 size={14} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Extract Stakeholders from Text</h3>
            <p className="text-[11px] text-text-muted">Paste interview notes, meeting summaries, or emails — AI will identify and structure stakeholder data</p>
          </div>
        </div>

        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={6}
          placeholder="e.g. 'Spoke with Sarah Chen (CFO) today. She's generally supportive of the initiative but concerned about budget overruns. Marcus from Operations is our biggest champion — he's been pushing for this change for months...'"
          className="w-full px-3 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none"
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleExtract}
            disabled={loading || !rawText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Extracting...' : 'Extract Stakeholders'}
          </button>

          {rows.length > 0 && (
            <button
              onClick={handleGenerateRecs}
              disabled={recsLoading}
              className="flex items-center gap-2 px-4 py-2 border border-accent/30 text-accent font-medium rounded-lg text-sm hover:bg-accent-50 transition-colors disabled:opacity-50"
            >
              {recsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {recsLoading ? 'Generating...' : 'Generate Recommendations'}
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
