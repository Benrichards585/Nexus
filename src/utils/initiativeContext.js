/**
 * Cross-Module AI Context Sharing
 *
 * Generates a concise summary of all module data within an initiative.
 * This summary is automatically injected into every AI prompt so the AI
 * understands the full change landscape when working in any module.
 *
 * To add context from a new module, add a summarizer function below
 * and register it in MODULE_SUMMARIZERS.
 */

// --- Module Summarizers ---
// Each function receives the module's stored data and returns a short text summary.
// Return empty string if the module has no meaningful data.

function summarizeChangeImpact(data) {
  const rows = data?.rows || [];
  if (rows.length === 0) return '';

  const byLevel = {};
  rows.forEach(r => {
    byLevel[r.impactLevel] = (byLevel[r.impactLevel] || 0) + 1;
  });

  const totalPeople = rows.reduce((s, r) => s + (parseInt(r.peopleAffected) || 0), 0);
  const avgReadiness = (rows.reduce((s, r) => s + (r.readiness || 0), 0) / rows.length).toFixed(1);

  const levelSummary = Object.entries(byLevel)
    .map(([level, count]) => `${count} ${level}`)
    .join(', ');

  const orgGroups = [...new Set(rows.map(r => r.orgGroup).filter(Boolean))];
  const changeTypes = [...new Set(rows.map(r => r.changeType).filter(Boolean))];

  let summary = `CHANGE IMPACT ASSESSMENT: ${rows.length} impacts identified (${levelSummary}). `;
  summary += `~${totalPeople.toLocaleString()} people affected. Average readiness: ${avgReadiness}/5. `;
  if (orgGroups.length > 0) summary += `Impacted groups: ${orgGroups.join(', ')}. `;
  if (changeTypes.length > 0) summary += `Change types: ${changeTypes.join(', ')}. `;

  // Include high/critical items specifically
  const criticalItems = rows.filter(r => r.impactLevel === 'Critical' || r.impactLevel === 'High');
  if (criticalItems.length > 0) {
    summary += `Key risks: ${criticalItems.map(r => `${r.orgGroup} (${r.impactLevel} - ${r.changeType})`).join('; ')}. `;
  }

  return summary;
}

function summarizeStakeholders(data) {
  const rows = data?.rows || [];
  if (rows.length === 0) return '';

  const bySentiment = {};
  rows.forEach(r => {
    bySentiment[r.sentiment] = (bySentiment[r.sentiment] || 0) + 1;
  });

  const sentimentSummary = Object.entries(bySentiment)
    .map(([s, count]) => `${count} ${s}${count > 1 ? 's' : ''}`)
    .join(', ');

  const highPower = rows.filter(r => parseInt(r.influence) >= 7);
  const resistors = rows.filter(r => r.sentiment === 'Resistor' || r.sentiment === 'Skeptic');

  let summary = `STAKEHOLDER ANALYSIS: ${rows.length} stakeholders mapped (${sentimentSummary}). `;

  if (highPower.length > 0) {
    summary += `High-influence stakeholders: ${highPower.map(s => `${s.name} (${s.role}, ${s.sentiment})`).join('; ')}. `;
  }

  if (resistors.length > 0) {
    summary += `Stakeholders showing resistance: ${resistors.map(s => `${s.name} - ${s.department}: ${s.concerns || 'concerns not documented'}`).join('; ')}. `;
  }

  // Include departments represented
  const depts = [...new Set(rows.map(r => r.department).filter(Boolean))];
  if (depts.length > 0) summary += `Departments: ${depts.join(', ')}. `;

  return summary;
}

function summarizeCommunications(data) {
  const history = data?.history || [];
  if (history.length === 0) return '';

  const types = [...new Set(history.map(h => h.commType).filter(Boolean))];
  const audiences = [...new Set(history.map(h => h.audience).filter(Boolean))];

  let summary = `COMMUNICATIONS: ${history.length} communications generated. `;
  if (types.length > 0) summary += `Types: ${types.join(', ')}. `;
  if (audiences.length > 0) summary += `Audiences addressed: ${audiences.join(', ')}. `;

  return summary;
}

function summarizeTraining(data) {
  // Training data is stored as formData + generatedTraining
  if (!data?.formData?.programType) return '';

  let summary = `TRAINING: Program type: ${data.formData.programType}. `;
  summary += `Audience: ${data.formData.trainingAudience || 'not set'}. `;

  if (data.generatedTraining?.title) {
    summary += `Generated: "${data.generatedTraining.title}" `;
    summary += `(${data.generatedTraining.sections?.length || 0} sections, ${data.generatedTraining.estimatedDuration || 'TBD'}). `;
  }

  return summary;
}

// Future: Initiative Context module summarizer will go here
function summarizeInitiativeContext(data) {
  if (!data) return '';
  // This will be populated when the Initiative Context module is built
  // Expected fields: projectType, clientName, timeline, objectives, constraints, etc.
  return '';
}

/**
 * Registry mapping module IDs to their summarizer functions.
 * When you add a new module with data that should inform AI context,
 * add an entry here.
 */
const MODULE_SUMMARIZERS = {
  'initiative-context': summarizeInitiativeContext,
  'change-impact-assessment': summarizeChangeImpact,
  'stakeholder-analysis': summarizeStakeholders,
  'communications-generator': summarizeCommunications,
  'training-generator': summarizeTraining,
};

/**
 * Generates a complete initiative context string for AI prompts.
 *
 * @param {Object} initiative - The full initiative object from AppContext
 * @param {string} currentModuleId - The module currently being used (excluded from summary to avoid circular reference)
 * @returns {string} A formatted context block to prepend to AI system prompts
 */
export function getInitiativeContext(initiative, currentModuleId = '') {
  if (!initiative) return '';

  const parts = [];

  // Initiative metadata
  parts.push(`INITIATIVE: "${initiative.name}"${initiative.description ? ` — ${initiative.description}` : ''}`);

  // Summarize each module's data (except the current one)
  const modules = initiative.modules || {};
  for (const [moduleId, summarizer] of Object.entries(MODULE_SUMMARIZERS)) {
    if (moduleId === currentModuleId) continue;
    if (!modules[moduleId]) continue;

    const summary = summarizer(modules[moduleId]);
    if (summary) parts.push(summary);
  }

  if (parts.length <= 1) {
    // Only initiative name, no module data yet
    return '';
  }

  return `
=== INITIATIVE CONTEXT ===
The user is working within a specific change initiative. Here is the current state of data across all modules in this initiative. Use this context to inform your responses — reference specific stakeholders, impacts, and communications when relevant.

${parts.join('\n\n')}
=== END INITIATIVE CONTEXT ===`;
}

/**
 * Wraps a system prompt with initiative context.
 * This is the main function modules should call.
 *
 * @param {string} baseSystemPrompt - The module's own system prompt
 * @param {Object} initiative - The full initiative object
 * @param {string} currentModuleId - The current module's ID
 * @returns {string} Enhanced system prompt with initiative context
 */
export function enhancePromptWithContext(baseSystemPrompt, initiative, currentModuleId) {
  const context = getInitiativeContext(initiative, currentModuleId);
  if (!context) return baseSystemPrompt;

  return `${baseSystemPrompt}

${context}`;
}
