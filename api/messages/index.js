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
  'claude-3-5-haiku-20241022',
];
const MAX_TOKENS_CAP = 16384;

module.exports = async function (context, req) {
  const startTime = Date.now();
  context.log(`[ocm-proxy] Request received at ${new Date().toISOString()}`);

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

  context.log(`[ocm-proxy] Sending to Anthropic — model: ${model}, max_tokens: ${cappedTokens}, input_chars: ${JSON.stringify(messages).length}`);

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

    const elapsed = Date.now() - startTime;
    if (!response.ok) {
      context.log.warn(`[ocm-proxy] Anthropic error ${response.status} after ${elapsed}ms:`, JSON.stringify(data));
    } else {
      context.log(`[ocm-proxy] Success ${response.status} after ${elapsed}ms — output_tokens: ${data?.usage?.output_tokens}`);
    }

    context.res = {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: data,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    context.log.error(`[ocm-proxy] Fetch failed after ${elapsed}ms:`, err.message);
    context.res = {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: { error: { message: 'Failed to reach Anthropic API: ' + err.message } },
    };
  }
};
