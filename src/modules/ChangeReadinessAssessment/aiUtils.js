/**
 * CHANGE READINESS ASSESSMENT — aiUtils.js
 *
 * Shared helpers for the four AI surfaces in this module:
 *   FB-5  Suggest groups       (AI_SUGGEST_GROUPS_PROMPT)
 *   FB-6  Generate draft       (AI_PLAN_PROMPT)
 *   FB-8  Refine with Claude   (AI_REFINEMENT_SYSTEM_PROMPT)
 *   FB-13 Analyze responses    (AI_ANALYZE_PROMPT)
 */

// Bracket-counting JSON extractor per CLAUDE.md (handles trailing text safely).
export function extractFirstJsonObject(text) {
  if (typeof text !== 'string') return null;
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

// Format the wizard answers as a compact user message for the AI calls.
export function formatPlanContext(planContext) {
  if (!planContext) return '';
  const lines = [];
  if (planContext.changeType)       lines.push(`Change type: ${planContext.changeType}`);
  if (planContext.programName)      lines.push(`Program name: ${planContext.programName}`);
  if (planContext.phase)            lines.push(`Lifecycle phase: ${planContext.phase}`);
  if (planContext.priorActivities)  lines.push(`Prior activities: ${planContext.priorActivities}`);
  if (planContext.riskAreas)        lines.push(`Risk areas the practitioner is worried about: ${planContext.riskAreas}`);
  if (planContext.timeline)         lines.push(`Timeline for responses: ${planContext.timeline}`);

  const groups = Array.isArray(planContext.stakeholderGroups) ? planContext.stakeholderGroups : [];
  const labeled = groups.filter(g => (g.label || '').trim().length > 0);
  if (labeled.length > 0) {
    lines.push('Stakeholder groups:');
    labeled.forEach(g => {
      const size = g.approximateSize ? ` (${g.approximateSize})` : '';
      const notes = g.notes ? ` — ${g.notes}` : '';
      lines.push(`  - ${g.label}${size}${notes}`);
    });
  }
  return lines.join('\n');
}

// Aggregate the AppContext gates into a single boolean for AI surfaces.
export function aiAvailable({ aiEnabled, passwordRequired, accessGranted, canMakeAIRequest }) {
  if (!aiEnabled) return false;
  if (passwordRequired && !accessGranted) return false;
  if (!canMakeAIRequest) return false;
  return true;
}

// Short reason string for tooltips when AI is unavailable.
export function aiUnavailableReason({ aiEnabled, passwordRequired, accessGranted, canMakeAIRequest }) {
  if (!aiEnabled) return 'Add your Anthropic API key in Settings to enable AI features.';
  if (passwordRequired && !accessGranted) return 'Enter the team passphrase in Settings to enable AI features.';
  if (!canMakeAIRequest) return 'Daily token budget reached. AI features pause until tomorrow.';
  return '';
}
