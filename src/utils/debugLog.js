/**
 * Debug Log Utility — OCM Nexus
 *
 * Captures structured AI call metadata client-side for diagnosis.
 * Stores up to 50 entries in localStorage['ocm-nexus-debug-log'], newest-first.
 *
 * Pure browser APIs only — no external dependencies.
 * Every localStorage call is wrapped in try/catch (mirrors AppContext.jsx pattern)
 * so storage quota errors or private-mode restrictions never crash a generation call.
 *
 * In-flight calls are tracked in a module-level _pending object (memory only).
 * Partial entries are intentionally discarded on page reload — incomplete records
 * are not useful for diagnosis.
 */

const STORAGE_KEY = 'ocm-nexus-debug-log';
const MAX_ENTRIES = 50;

// Maps logId → { startTime, context } for in-flight calls.
const _pending = {};

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/**
 * Classify an error by message string and optional HTTP status code.
 * Because callClaude() in aiClient.js throws new Error(messageString) without
 * surfacing response.status, message-string matching is the primary path.
 * The status parameter is accepted for future use (e.g. if callClaude is extended).
 *
 * @param {string} message
 * @param {number|null} status
 * @returns {'PROXY_TIMEOUT'|'JSON_PARSE'|'AUTH_FAILURE'|'CONFIG_ERROR'|'NETWORK_ERROR'|'UNKNOWN'}
 */
function classifyError(message = '', status = null) {
  const msg = message.toLowerCase();
  if (msg.includes('backend call failure')) return 'PROXY_TIMEOUT';
  if (msg.includes('could not parse') || msg.includes('syntaxerror') || msg.includes('unexpected token')) return 'JSON_PARSE';
  if (status === 401 || msg.includes('access denied') || msg.includes('invalid or missing')) return 'AUTH_FAILURE';
  if (msg.includes('server api key') || msg.includes('model not allowed') || msg.includes('no ai connection')) return 'CONFIG_ERROR';
  if (status === 0 || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Read all log entries from localStorage. Returns newest-first array.
 * @returns {Array}
 */
export function getLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist a new or updated entry, trimming to MAX_ENTRIES.
 * @param {Object} entry
 */
function _persist(entry) {
  try {
    const existing = getLogs().filter(e => e.id !== entry.id);
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently no-op — never crash a generation call over a logging failure.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start timing a new AI call. Call this immediately before callClaude().
 *
 * @param {Object} context
 * @param {string} context.module      - Module display name, e.g. 'TrainingGenerator'
 * @param {string} context.action      - Action name, e.g. 'generate' | 'refine'
 * @param {string} context.model       - Model ID, e.g. 'claude-haiku-4-5-20251001'
 * @param {number} context.maxTokens   - max_tokens value passed to callClaude
 * @param {number} [context.sourceLength] - sourceText.length; defaults to 0
 * @returns {string} logId — pass to completeLog() or failLog()
 */
export function startLog({ module, action, model, maxTokens, sourceLength = 0 }) {
  const now = Date.now();
  const id = `${now}-${Math.random().toString(36).slice(2, 6)}`;
  _pending[id] = { startTime: now, context: { module, action, model, maxTokens, sourceLength } };
  return id;
}

/**
 * Mark a call as successful. Call this inside the onUsage callback or
 * immediately after a successful callClaude() return.
 *
 * @param {string} logId              - Returned from startLog()
 * @param {Object} [usage]
 * @param {number} [usage.inputTokens]
 * @param {number} [usage.outputTokens]
 */
export function completeLog(logId, { inputTokens = 0, outputTokens = 0 } = {}) {
  const pending = _pending[logId];
  if (!pending) return;
  const { startTime, context } = pending;
  delete _pending[logId];

  _persist({
    id: logId,
    timestamp: new Date(startTime).toISOString(),
    ...context,
    durationMs: Date.now() - startTime,
    result: 'success',
    errorClass: null,
    errorMessage: null,
    inputTokens,
    outputTokens,
  });
}

/**
 * Mark a call as failed. Call this in every catch block that handles callClaude() errors.
 *
 * @param {string} logId              - Returned from startLog()
 * @param {Object} [failure]
 * @param {string} [failure.message]  - err.message
 * @param {number|null} [failure.status] - HTTP status if known; null otherwise
 */
export function failLog(logId, { message = 'Unknown error', status = null } = {}) {
  const pending = _pending[logId];
  if (!pending) return;
  const { startTime, context } = pending;
  delete _pending[logId];

  _persist({
    id: logId,
    timestamp: new Date(startTime).toISOString(),
    ...context,
    durationMs: Date.now() - startTime,
    result: 'error',
    errorClass: classifyError(message, status),
    errorMessage: message,
    inputTokens: 0,
    outputTokens: 0,
  });
}

/**
 * Clear all stored log entries.
 */
export function clearLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Format a log entry as human-readable plain text suitable for clipboard paste.
 *
 * @param {string|null} [logId] - ID of the entry to format.
 *                                If omitted, formats the most recent entry.
 * @returns {string}
 */
export function formatForClipboard(logId = null) {
  const logs = getLogs();
  if (logs.length === 0) return 'No debug log entries found.';

  const entry = logId
    ? (logs.find(e => e.id === logId) || logs[0])
    : logs[0];

  const lines = [
    '=== OCM Nexus Debug Log ===',
    `Time:        ${entry.timestamp}`,
    `Module:      ${entry.module}`,
    `Action:      ${entry.action}`,
    `Model:       ${entry.model}`,
    `Max Tokens:  ${entry.maxTokens}`,
    `Source Len:  ${entry.sourceLength} chars`,
    `Duration:    ${entry.durationMs}ms`,
    `Result:      ${entry.result.toUpperCase()}`,
  ];

  if (entry.result === 'error') {
    lines.push(`Error Class:     ${entry.errorClass}`);
    lines.push(`Error Message:   ${entry.errorMessage}`);
  } else {
    lines.push(`Input Tokens:    ${entry.inputTokens}`);
    lines.push(`Output Tokens:   ${entry.outputTokens}`);
    lines.push(`Total Tokens:    ${entry.inputTokens + entry.outputTokens}`);
  }

  lines.push('===========================');
  return lines.join('\n');
}
