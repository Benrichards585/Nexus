/**
 * Azure Function: /api/messages
 *
 * Proxies requests to the Anthropic Claude API with a server-side API key.
 * This keeps the org API key secure — it never reaches the browser.
 *
 * The function validates the request, enforces model/token limits,
 * and forwards to Anthropic with the org key.
 *
 * Access control: if APP_ACCESS_PASSWORD is set in Azure Application Settings,
 * all requests must include a matching x-app-password header.
 */

const ALLOWED_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-haiku-4-20250414',
];
const MAX_TOKENS_CAP = 16384;

module.exports = async function (context, req) {
  // Only allow POST
  if (req.method !== 'POST') {
    context.res = { status: 405, body: { error: { message: 'Method not allowed' } } };
    return;
  }

  // --- Password gate ---
  // If APP_ACCESS_PASSWORD is configured, all requests must supply the matching header.
  // If the env var is not set, the gate is disabled (useful for local dev and initial setup).
  const appPassword = process.env.APP_ACCESS_PASSWORD;
  if (appPassword) {
    const provided = req.headers['x-app-password'];
    if (!provided || provided !== appPassword) {
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { error: { message: 'Access denied. Invalid or missing application password.' } },
      };
      return;
    }
  }

  const { model, max_tokens, system, messages } = req.body || {};

  // Validate required fields
  if (!model || !messages || !Array.isArray(messages)) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: { message: 'Missing required fields: model, messages' } },
    };
    return;
  }

  // Enforce model allowlist
  if (!ALLOWED_MODELS.includes(model)) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: { message: `Model not allowed. Allowed: ${ALLOWED_MODELS.join(', ')}` } },
    };
    return;
  }

  // Cap token limit
  const cappedTokens = Math.min(max_tokens || 4096, MAX_TOKENS_CAP);

  // Get the org API key from environment (set in Azure Application Settings)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: { message: 'Server API key not configured. Contact your administrator.' } },
    };
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: cappedTokens,
        system: system || undefined,
        messages,
      }),
    });

    // Always parse the body — surface Anthropic's error message even on non-200
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      context.res = {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
        body: { error: { message: `Anthropic returned status ${response.status} with non-JSON body` } },
      };
      return;
    }

    if (!response.ok) {
      // Log to Azure Function console for diagnostics
      context.log.warn(`Anthropic API error ${response.status}:`, JSON.stringify(data));
    }

    context.res = {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: data,
    };
  } catch (err) {
    context.log.error('Anthropic fetch failed:', err.message);
    context.res = {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: { error: { message: 'Failed to reach Anthropic API: ' + err.message } },
    };
  }
};
