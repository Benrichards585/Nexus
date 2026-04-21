/**
 * Centralized AI Client
 *
 * All AI calls in the app go through this single function.
 * Routes to either:
 *   - /api/messages (server-side proxy with org API key) — default
 *   - https://api.anthropic.com/v1/messages (direct, with personal key) — fallback
 *
 * This ensures the org API key is never exposed to the browser.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const PROXY_URL = '/api/messages';

/**
 * Call Claude via proxy or direct API.
 *
 * @param {Object} options
 * @param {string} options.model - Claude model ID
 * @param {number} options.max_tokens - Max tokens to generate
 * @param {string} [options.system] - System prompt
 * @param {Array} options.messages - Conversation messages
 * @param {string} [options.apiKey] - Personal API key (if set, bypasses proxy)
 * @param {boolean} [options.proxyAvailable] - Whether the server proxy is available
 * @returns {Promise<string>} The assistant's response text
 */
export async function callClaude({ model, max_tokens, system, messages, apiKey, proxyAvailable }) {
  // Guard: at least one path must be available
  if (!proxyAvailable && !apiKey) {
    throw new Error('No AI connection available. Add an API key in Settings or contact your admin.');
  }

  // Decide endpoint: prefer proxy if available (saves user's quota)
  // Falls back to direct API if user has a personal key and proxy is unavailable
  const url = proxyAvailable ? PROXY_URL : ANTHROPIC_API_URL;

  const headers = { 'Content-Type': 'application/json' };

  if (url === ANTHROPIC_API_URL) {
    // Direct mode: personal API key
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }
  // Proxy mode: no API key header needed — server adds it

  const body = { model, max_tokens, messages };
  if (system) body.system = system;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API request failed (${response.status})`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Check if the API proxy is available.
 * Called once on app startup to determine routing.
 *
 * @returns {Promise<boolean>}
 */
export async function checkProxyHealth() {
  try {
    // Send a minimal request — if the proxy responds (even with a 400 for missing fields),
    // it's available. We verify the response is JSON (not HTML from dev server fallback).
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Verify the response is actually from our proxy, not a dev server SPA fallback.
    // The proxy always returns JSON; the CRA dev server returns HTML (index.html).
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return false; // SPA fallback returned HTML — proxy not running
    }
    // A 400 (missing fields) means the proxy IS running. A 500 (no key) also means it's running.
    return true;
  } catch {
    // Network error — proxy not available (e.g., running locally without Azure Functions)
    return false;
  }
}
