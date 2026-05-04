import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Loader2, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { enhancePromptWithContext } from '../utils/initiativeContext';
import { callClaude } from '../utils/aiClient';

/**
 * Reusable AI Chat component for conversational refinement.
 *
 * Props:
 *   systemPrompt  – the system prompt for this module
 *   initialUserMessage – the structured first message built from form fields
 *   onOutputUpdate – callback(parsedJSON) when AI returns updated structured output
 *   hasOutput – boolean, whether initial generation has happened
 *   outputLabel – e.g. "communication" or "training material"
 *   initiative – the current initiative data (for cross-module context)
 *   moduleId – the current module's ID
 */
export default function AIChat({ systemPrompt, initialUserMessage, onOutputUpdate, hasOutput, outputLabel = 'output', initiative, moduleId }) {
  const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!aiEnabled || !hasOutput) return null;

  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return;

    const newUserMsg = { role: 'user', content: userText };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      // Build full conversation history for the API
      // Start with the original generation message, then all refinement messages
      const apiMessages = [
        { role: 'user', content: initialUserMessage },
        // We add a synthetic assistant acknowledgment so the conversation flows naturally
        ...(messages.length === 0
          ? [{ role: 'assistant', content: `I've generated the initial ${outputLabel}. How would you like me to refine it?` }]
          : []),
        ...updatedMessages,
      ];

      const contextEnhancedPrompt = enhancePromptWithContext(systemPrompt, initiative, moduleId);
      const refinementSystemPrompt = `${contextEnhancedPrompt}

IMPORTANT REFINEMENT INSTRUCTIONS:
You are now in a conversational refinement session. The user has already received an initial ${outputLabel} based on their inputs. They are now asking for changes or have questions.

Your behavior:
1. If the user asks you to modify, adjust, or improve the ${outputLabel}, return the COMPLETE updated output in the same JSON format as before. Always return the full structure, not just the changed parts.
2. If the user asks a clarifying question or wants advice (e.g. "should I include X?", "what tone works best for Y?"), respond conversationally in plain text WITHOUT JSON. Help them think through their decision.
3. If you need more information to make a good change, ask a specific clarifying question.
4. When returning updated JSON, wrap it in a brief explanation of what you changed. For example: "I've updated the tone to be more urgent and added the deadline prominently. Here's the revised version: {json}"
5. Be concise in your conversational responses — practitioners are busy.`;

      const assistantText = await callClaude({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: refinementSystemPrompt,
        messages: apiMessages,
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });

      const assistantMsg = { role: 'assistant', content: assistantText };
      setMessages(prev => [...prev, assistantMsg]);

      // Check if the response contains updated JSON output
      const jsonStr = extractFirstJsonObject(assistantText);
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          // Validate it has expected structure (at least a couple of expected keys)
          if (parsed.subjectLine || parsed.emailBody || parsed.title || parsed.sections) {
            onOutputUpdate(parsed);
          }
        } catch {
          // Not valid JSON — that's fine, it's a conversational response
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  // Quick suggestion chips
  const suggestions = outputLabel === 'communication'
    ? [
        'Make the tone more urgent',
        'Shorten to under 150 words',
        'Add a FAQ section',
        'Make it more executive-friendly',
        'Add more specific action items',
      ]
    : [
        'Add more hands-on exercises',
        'Simplify the language',
        'Add a troubleshooting section',
        'Make it shorter for a 30-min session',
        'Add more speaker notes',
      ];

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden fade-in">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-gradient-to-r from-accent-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
            <Sparkles size={13} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Refine with AI</h3>
            <p className="text-[10px] text-text-muted">Ask questions or request changes to your {outputLabel}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50">
            <Trash2 size={11} /> Clear chat
          </button>
        )}
      </div>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="max-h-80 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} className="text-accent" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-surface-secondary text-text-primary border border-border-light rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? formatAssistantMessage(msg.content) : msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} className="text-navy" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Bot size={13} className="text-accent" />
              </div>
              <div className="bg-surface-secondary rounded-xl rounded-bl-sm px-3.5 py-2.5 border border-border-light">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Loader2 size={12} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Quick Suggestions (shown when chat is empty) */}
      {messages.length === 0 && (
        <div className="px-4 py-3 border-b border-border-light">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-2">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="px-2.5 py-1.5 bg-surface-secondary text-text-secondary text-[11px] rounded-lg border border-border-light hover:bg-accent-50 hover:text-accent hover:border-accent/20 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 my-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border-light bg-surface-secondary/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question or describe changes to your ${outputLabel}...`}
            rows={1}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder:text-text-muted/60"
            style={{ minHeight: '38px', maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[9px] text-text-muted mt-1.5 px-1">
          Press Enter to send · Shift+Enter for new line · {outputLabel === 'communication' ? 'Updated emails appear above automatically' : 'Updated training content appears above automatically'}
        </p>
      </form>
    </div>
  );
}

// Helper: extract the outermost JSON object from text using bracket counting.
// Unlike a greedy regex, this correctly handles cases where trailing text
// contains braces (e.g. "Updated! {ok?}") and avoids mis-capturing garbage.
function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

// Helper: format assistant messages — strip raw JSON from display, show explanation text
function formatAssistantMessage(content) {
  // Check if message contains JSON — show a summary instead of raw JSON
  const jsonStr = extractFirstJsonObject(content);
  if (jsonStr) {
    const beforeJson = content.substring(0, content.indexOf(jsonStr)).trim();
    const afterJson = content.substring(content.indexOf(jsonStr) + jsonStr.length).trim();
    const explanation = beforeJson || afterJson;

    if (explanation) {
      return (
        <div>
          <p>{explanation}</p>
          <div className="mt-2 flex items-center gap-1.5 text-accent font-medium">
            <Sparkles size={11} />
            <span>Output updated ✓</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-accent font-medium">
        <Sparkles size={11} />
        <span>Output updated ✓</span>
      </div>
    );
  }
  // Plain text response — render with line breaks
  return <span className="whitespace-pre-line">{content}</span>;
}
