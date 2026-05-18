// ============================================================================
//   schema.js — Change Readiness Assessment module
//   DRAFT v0.4 — pre-Build release. Adds module identity, ergonomic aliases,
//   and explicit scaffolding guidance for Claude Code.
//
//   Changes from v0.3:
//   • MODULE_ID exported from schema.js (canonical identity, not just registry)
//   • emptyResponse aliased as emptyRow for ergonomic compatibility with
//     platform conventions (see SCAFFOLDING_NOTES below for why this is an
//     alias, not a rename — Claude Code should choose whichever name reads
//     more naturally in each component)
//   • SCAFFOLDING_NOTES block at the bottom — guidance to Claude Code about
//     non-standard module patterns it WILL encounter and should NOT try to
//     "fix" by retrofitting the standard _ModuleTemplate behavior
//   • Decisions from the architecture validation pass locked in:
//       - Phase 1 REFINING mode mirrors CommunicationsGenerator/AIAssist.jsx
//         conversational refinement pattern (not _ModuleTemplate)
//       - Wizard step components live inside the module folder, not shared
//       - handleExtract pattern from _ModuleTemplate does NOT apply here —
//         Phase 1 uses the wizard, Phase 2 uses file import
// ============================================================================

// ---------------------------------------------------------------------------
//   0. MODULE IDENTITY
//   Exported from schema so cross-module wiring (initiativeContext.js
//   summarizer, future agentic capabilities) is not coupled to the registry.
// ---------------------------------------------------------------------------
export const MODULE_ID = 'change-readiness-assessment';
export const MODULE_LABEL = 'Change Readiness Assessment';
export const MODULE_FRAMEWORK_PHASE = 'Prepare';
export const SCHEMA_VERSION = '0.4';

// ---------------------------------------------------------------------------
//   1. PHASES — the module's two modes of operation
// ---------------------------------------------------------------------------
export const PHASES = {
  PLAN:    { id: 'plan',    label: 'Plan the Assessment',  helper: 'Design your survey instrument and delivery approach.' },
  ANALYZE: { id: 'analyze', label: 'Analyze Responses',    helper: 'Visualize, theme, and turn responses into action.' },
};

export const PHASE_ORDER = ['plan', 'analyze'];

// ---------------------------------------------------------------------------
//   2. LIKERT SCALES — 4-point forced choice (per Urvi's Oracle deliverable)
// ---------------------------------------------------------------------------
export const LIKERT_SCALE = [
  { value: 1, label: 'Disagree',          color: '#DC2626' },
  { value: 2, label: 'Somewhat Disagree', color: '#F59E0B' },
  { value: 3, label: 'Somewhat Agree',    color: '#A3D977' },
  { value: 4, label: 'Agree',             color: '#10B981' },
];

export const COMMITMENT_SCALE = [
  { value: 1, label: 'Not willing',       color: '#DC2626' },
  { value: 2, label: 'Somewhat willing',  color: '#F59E0B' },
  { value: 3, label: 'Willing',           color: '#A3D977' },
  { value: 4, label: 'Fully committed',   color: '#10B981' },
];

// ---------------------------------------------------------------------------
//   3. PHASE 1 — WIZARD FLOW (guided, one step at a time)
// ---------------------------------------------------------------------------
export const WIZARD_MODES = {
  WIZARD:    { id: 'wizard',    label: 'Setup' },
  REVIEWING: { id: 'reviewing', label: 'Review Draft' },
  REFINING:  { id: 'refining',  label: 'Refine' },
};

// Each step is a discrete screen.
//   type = 'text'     → single-line input
//   type = 'longText' → multi-line textarea
//   type = 'select'   → dropdown with provided options
//   type = 'groups'   → custom UI: builds a list of stakeholder groups
export const WIZARD_STEPS = [
  {
    id: 'changeType',
    type: 'select',
    prompt: 'What kind of change are we measuring readiness for?',
    helper: 'This shapes the question style. System rollouts have different readiness signals than org restructures.',
    options: [
      'System implementation',
      'Organizational restructure',
      'Process change',
      'Merger or acquisition',
      'Strategy or operating-model shift',
      'Other',
    ],
  },
  {
    id: 'programName',
    type: 'text',
    prompt: "What's the program called?",
    helper: 'This appears in survey copy. Use the name your respondents will recognize.',
  },
  {
    id: 'phase',
    type: 'select',
    prompt: 'Where in the change lifecycle are you running this?',
    helper: "The lifecycle stage determines what is reasonable to ask. You can't assess readiness for activities that haven't happened.",
    options: [
      'Pre-launch (planning / design)',
      'Pre-launch (build / configure)',
      'Mid-implementation',
      'Approaching go-live',
      'Post-go-live (stabilization)',
      'Post-go-live (sustainment)',
    ],
  },
  {
    id: 'priorActivities',
    type: 'longText',
    prompt: 'What change activities have already happened with this audience?',
    helper: 'Deep-dives, town halls, training, workshops, comms. The questions should reference what people have actually experienced.',
  },
  {
    id: 'stakeholderGroups',
    type: 'groups',
    prompt: 'Which stakeholder groups are you assessing?',
    helper: 'Defining groups now lets us produce a heatmap in Phase 2 instead of just a list of averages. Claude can suggest groups based on your earlier answers — feel free to edit.',
    aiSuggest: true,
  },
  {
    id: 'riskAreas',
    type: 'longText',
    prompt: 'What are you most worried about going in?',
    helper: "Suspected weak spots. We'll make sure the survey probes here directly.",
  },
  {
    id: 'timeline',
    type: 'text',
    prompt: 'When do you need responses back?',
    helper: 'Determines cadence and delivery channel. A two-week window needs different infrastructure than a two-day one.',
  },
];

// Stakeholder group entry — used in the wizard's 'groups' step and as the
// unit of aggregation in Phase 2.
export const emptyStakeholderGroup = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  label: '',
  approximateSize: '',
  notes: '',
});

// Container for the wizard's answers.
export const emptyPlanContext = () => ({
  changeType: '',
  programName: '',
  phase: '',
  priorActivities: '',
  stakeholderGroups: [],
  riskAreas: '',
  timeline: '',
  completed: false,
});

// ---------------------------------------------------------------------------
//   4. PHASE 1 — SURVEY ARTIFACT (Claude's output from the wizard)
// ---------------------------------------------------------------------------
export const emptyQuestion = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  type: 'pair',           // 'likert' | 'open' | 'pair'
  prompt: '',
  followUpPrompt: '',
  scale: 'likert',        // 'likert' | 'commitment' | null
  dimension: '',
  rationale: '',
});

export const emptyDeliveryPlan = () => ({
  method: '',
  cadence: '',
  timing: '',
  channel: '',
  estimatedDuration: '',
  considerations: '',
});

// ---------------------------------------------------------------------------
//   5. AI PROMPTS — Phase 1
// ---------------------------------------------------------------------------
export const AI_PLAN_PROMPT = `You are an OCM consultant helping a Cognizant practitioner design a Change Readiness Assessment.

Based on the practitioner's wizard answers (provided below), produce a JSON object:

{
  "questions": [
    {
      "type": "pair",
      "prompt": "A Likert-style statement the respondent agrees/disagrees with",
      "followUpPrompt": "An open-ended follow-up that surfaces actionable detail",
      "scale": "likert",
      "dimension": "1-3 words describing what this question measures",
      "rationale": "One sentence explaining why this question is here"
    }
  ],
  "delivery": {
    "method": "online survey | interview | focus group | mixed",
    "cadence": "one-time baseline | pre/post | pulse",
    "timing": "when to deploy",
    "channel": "how respondents receive it",
    "estimatedDuration": "X minutes",
    "considerations": "anonymity, response bias, follow-up plan"
  }
}

Guidelines for question design:
- 5-8 questions total. Fatigue kills response rate above 10.
- Use 4-point Likert (Disagree / Somewhat Disagree / Somewhat Agree / Agree) — no neutral middle.
- Pair every Likert with an open follow-up wherever a Red/Amber answer would beg "why" or "what would help."
- Anchor to actual change activities that have happened — never ask about readiness for activities that haven't occurred yet.
- Include at least one advocacy/commitment question to surface change agents and resisters.
- Phrase statements positively ("I can explain...", "I feel confident...").

Guidelines for delivery design:
- Default to online survey for populations over 30 unless anonymity concerns suggest otherwise.
- Recommend interviews or focus groups for executive populations or when nuance matters more than scale.
- Specify when the assessment should run relative to change milestones.

Return only valid JSON. No preamble. No markdown fences.`;

export const AI_SUGGEST_GROUPS_PROMPT = `You are an OCM consultant suggesting stakeholder groups for a Change Readiness Assessment.

Given the change type and program described below, propose 3-6 stakeholder groups that should be assessed separately. These are the groups whose readiness will likely differ — segmenting them lets us produce a meaningful heatmap.

Return JSON only:
{
  "groups": [
    { "label": "Group name", "approximateSize": "estimate or empty string", "notes": "1 sentence on why this group matters" }
  ]
}

Guidelines:
- Use stakeholder names the practitioner can recognize on the client side, not generic labels.
- Differentiate by role and level (e.g., "Frontline Sales Managers" not just "Sales").
- Include at least one leadership group and at least one frontline group when appropriate.
- Note: the practitioner will edit your list. Optimize for "good starting point," not "exhaustive."

Return only valid JSON. No preamble.`;

export const AI_REFINEMENT_SYSTEM_PROMPT = `You are an OCM consultant helping a Cognizant practitioner refine a Change Readiness Assessment they're about to deploy.

The practitioner has just completed a guided setup wizard. You generated a draft survey instrument and delivery plan based on their answers. They now want to iterate.

You have access to:
- Their full wizard context (change type, program, phase, prior activities, stakeholder groups, risk areas, timeline)
- The draft survey questions you produced
- The draft delivery plan you produced

The practitioner may want to:
- Add, remove, edit, or reorder questions
- Adjust dimensions or rationales
- Change delivery method, cadence, channel, or timing
- Stress-test the survey against a particular concern ("would this catch resistance from the legal team?")
- Translate or simplify language for a specific audience

Be direct and editorial. Make specific proposals rather than asking what they want. When you propose changes, return them in the same JSON shape as the original draft so the UI can apply them — but you can also discuss freely in prose when prose is what's called for. Practitioners are experts; treat them as peers.

Never invent client details, system names, or stakeholder names that weren't provided.`;

// ---------------------------------------------------------------------------
//   6. PHASE 2 — RESPONSE DATA SHAPE
//   stakeholderGroup is REQUIRED — enforced by UI gate before analysis runs.
// ---------------------------------------------------------------------------
export const emptyResponse = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  respondentId: '',
  stakeholderGroup: '',     // REQUIRED before analysis
  submittedAt: '',
  answers: {},              // { questionId: value }  Likert = 1-4, open = string
});

// Ergonomic alias. The standard module pattern expects a function called
// emptyRow(); for CRA, the closest semantic match is a survey response.
// Claude Code: use whichever name reads more naturally in each component.
// Both refer to the same object shape.
export const emptyRow = emptyResponse;

// ---------------------------------------------------------------------------
//   7. IMPORT FORMAT — MVP CONSTRAINT (Microsoft Forms export shape)
// ---------------------------------------------------------------------------
export const IMPORT_FORMAT = {
  description: 'Microsoft Forms-style export: one row per respondent. Likert values must match a recognized scale. A "Stakeholder Group" column is required — if missing, the practitioner is prompted to tag each row via dropdown using groups defined in Phase 1.',
  requiredColumns: ['Id'],
  reservedColumns: ['Id', 'Start time', 'Completion time', 'Email'],
  groupColumnAliases: ['Stakeholder Group', 'Group', 'Segment', 'Role'],
  acceptedFormats: ['.xlsx', '.csv'],
  fallbackBehavior: 'If no group column found, open the tagging modal — practitioner selects a group from the Phase 1 list for each row.',
  // Decision locked at v0.4: hard reject with a one-line explanation when
  // format does not match. No best-effort column mapping in MVP. Revisit
  // if pilot feedback says otherwise.
  strictness: 'hard-reject',
};

// ---------------------------------------------------------------------------
//   8. DERIVED ANALYTICS — computed in-browser before AI synthesis
// ---------------------------------------------------------------------------
export const emptyAnalytics = () => ({
  responseCount: 0,
  groupCount: 0,
  likertDistributions: {},   // { questionId: { 1: n, 2: n, 3: n, 4: n } }
  averageScores:       {},   // { questionId: mean across all respondents }
  heatmapData:         [],   // [{ groupId, groupLabel, questionId, mean, n, ragLevel }]
  weakestCells:        [],   // sorted ascending — top 3
  strongestCells:      [],   // sorted descending — top 3
  openTextThemes:      [],   // [{ theme, mentionCount, exampleQuotes, affectedGroups }]
  flaggedRespondents:  [],   // all-Disagree or mostly-Disagree patterns
});

// RAG bands applied to average Likert scores per heatmap cell
export const HEATMAP_BANDS = [
  { max: 2.0,  level: 'Red',   color: '#DC2626', label: 'Significant gap' },
  { max: 2.75, level: 'Amber', color: '#F59E0B', label: 'Partial readiness' },
  { max: 4.0,  level: 'Green', color: '#10B981', label: 'Ready' },
];

// ---------------------------------------------------------------------------
//   9. ACTION PLAN — Claude's output for Phase 2
//   Standalone artifact in MVP. Future: feeds Change Strategy and Change Plan.
// ---------------------------------------------------------------------------
export const emptyActionItem = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  action: '',
  rationale: '',
  targetAudience: '',
  priority: 'medium',        // 'high' | 'medium' | 'low'
  effort: 'medium',          // 'small' | 'medium' | 'large'
  derivedFrom: '',           // 'open-text theme' | 'low Likert score' | 'flagged respondent'
  sourceQuotes: [],
});

export const AI_ANALYZE_PROMPT = `You are an OCM consultant analyzing Change Readiness Assessment responses.

You receive: (a) the survey instrument, (b) the responses with stakeholder-group tags, (c) pre-computed analytics including the heatmap (groups × questions, with RAG levels).

Produce a JSON object:

{
  "overallReadiness": {
    "summary": "2-3 sentence narrative — where this population sits overall",
    "headline": "One sentence the practitioner could put on a slide",
    "confidence": "high | medium | low — based on sample size and response variance"
  },
  "keyFindings": [
    {
      "finding": "What the data shows",
      "supportingEvidence": "Specific numbers, distributions, or quote patterns",
      "affectedGroups": ["group label", "group label"],
      "implication": "What it means for the program"
    }
  ],
  "actionPlan": [
    {
      "action": "Specific, concrete action",
      "rationale": "Which readiness signal this addresses",
      "targetAudience": "Which stakeholder group(s) this serves",
      "priority": "high | medium | low",
      "effort": "small | medium | large",
      "derivedFrom": "open-text theme | low Likert score | flagged respondent",
      "sourceQuotes": ["verbatim quote", "verbatim quote"]
    }
  ],
  "watchOuts": [
    "Risks or signals to monitor going forward"
  ]
}

Guidelines:
- Lead with the heatmap. Where you see Red cells, that's where the action plan focuses.
- Weight open-text heavily. Respondents typically describe their own interventions ("I would benefit from a hands-on demo") — these become actions almost verbatim.
- Cluster similar open-text answers across groups before recommending. If multiple groups ask for demos, that's one action with high priority, not several separate ones.
- Action priority reflects gap size × population reach. A small action that helps many often beats a large action that helps few.
- Quote respondents directly in sourceQuotes — practitioners need this to defend recommendations to sponsors.
- Be honest about confidence. Under 15 responses or under 3 per group → low confidence.

Return only valid JSON. No preamble. No markdown fences.`;

// ---------------------------------------------------------------------------
//   10. CROSS-MODULE SUMMARIZER
//   Add this function (or equivalent) to src/utils/initiativeContext.js so
//   other modules' AI calls automatically receive a CRA context line.
// ---------------------------------------------------------------------------
export const summarizeForOtherModules = (data) => {
  if (!data) return '';
  const responses = data.responses || [];
  const analytics = data.analytics || {};
  if (responses.length === 0) return '';

  const groupCount = analytics.groupCount || 0;
  const weakest = analytics.weakestCells?.[0];
  const topAction = data.synthesis?.actionPlan?.[0];

  let summary = `CHANGE READINESS ASSESSMENT: ${responses.length} responses across ${groupCount} stakeholder groups.`;
  if (weakest) {
    summary += ` Weakest readiness cell: ${weakest.groupLabel} on ${weakest.questionDimension} (mean ${weakest.mean.toFixed(1)}).`;
  }
  if (topAction) {
    summary += ` Top recommended action: ${topAction.action}`;
  }
  return summary;
};

// ---------------------------------------------------------------------------
//   11. MOCK_DATA — Urvi's Oracle CRA for demo mode
// ---------------------------------------------------------------------------
export const MOCK_SURVEY = {
  programName: 'Oracle Implementation',
  changeType: 'System implementation',
  questions: [
    { id: 'q1', type: 'pair',   prompt: 'Based on the deep-dive sessions, I can now explain how the Oracle processes will work in my specific area.', followUpPrompt: 'What specific areas would benefit from additional explanation or deep-dive before Implementation?', scale: 'likert', dimension: 'Understanding' },
    { id: 'q2', type: 'likert', prompt: 'I feel confident describing how the Oracle changes will affect the day-to-day activities of my team and the stakeholders I support.', scale: 'likert', dimension: 'Confidence' },
    { id: 'q3', type: 'likert', prompt: 'I have a clear view of any dependencies, gaps, or risks in my area that could affect the transition to Oracle.', scale: 'likert', dimension: 'Risk Awareness' },
    { id: 'q4', type: 'pair',   prompt: 'After attending the deep-dive sessions, my confidence in adopting the Oracle solution has increased.', followUpPrompt: 'What is the single biggest action that would help your readiness for implementation right now?', scale: 'likert', dimension: 'Belief Shift' },
    { id: 'q5', type: 'pair',   prompt: 'How willing are you to actively support and advocate for this change within your team?', followUpPrompt: 'What additional support can be provided to increase your willingness?', scale: 'commitment', dimension: 'Advocacy' },
  ],
};

// ---------------------------------------------------------------------------
//   12. SCAFFOLDING NOTES — for Claude Code
//   This module deviates from the standard _ModuleTemplate pattern in three
//   specific ways. These deviations are intentional, approved, and
//   architecturally compatible with the platform. Do not try to retrofit
//   the standard pattern.
// ---------------------------------------------------------------------------
export const SCAFFOLDING_NOTES = `
DEVIATIONS FROM _ModuleTemplate — these are intentional and approved:

1. NO "Extract from text" workflow.
   The standard AIAssist.jsx has a handleExtract() that takes pasted text and
   maps AI output to emptyRow(). This module does not work that way.
   - Phase 1 input is the multi-step wizard (WIZARD_STEPS) — that IS the
     input mechanism. Do not add a paste-text-to-extract path.
   - Phase 2 input is an Excel/CSV import that conforms to IMPORT_FORMAT.
     Do not add a paste-text-to-extract path here either.
   Remove the handleExtract scaffolding from the copied template entirely.

2. Phase 1 REFINING mode = Communications Generator pattern, NOT _ModuleTemplate.
   The free-chat refinement panel during Phase 1 (WIZARD_MODES.REFINING) is a
   conversational AI experience modeled on Communications Generator's
   AIAssist.jsx, not on _ModuleTemplate.
   - Read src/modules/CommunicationsGenerator/AIAssist.jsx FIRST and mirror
     its conversational refinement architecture (chat history, suggestion
     chips, in-place draft updates).
   - Use AI_REFINEMENT_SYSTEM_PROMPT as the system prompt.

3. Multi-step wizard is new to Nexus.
   No existing module has a multi-step wizard. CRA is establishing the
   pattern. Wizard sub-components live inside this module folder, NOT in
   shared components.
   - Create: src/modules/ChangeReadinessAssessment/WizardProgress.jsx
   - Create: src/modules/ChangeReadinessAssessment/WizardStep.jsx
   - Create: src/modules/ChangeReadinessAssessment/steps/ (one component
     per step type: TextStep.jsx, LongTextStep.jsx, SelectStep.jsx,
     GroupsStep.jsx)
   - The visual spec mockup (delivered separately) is the source of truth
     for wizard appearance.

NAMING — emptyRow vs emptyResponse:
   emptyResponse is the canonical factory. emptyRow is an alias. Use
   whichever reads more naturally in each component. Do not refactor away
   the alias — it preserves compatibility with platform conventions that
   expect emptyRow().

TOP-LEVEL UI in index.jsx:
   The Phase toggle (Plan / Analyze) is the top-level switch. WITHIN Plan,
   the Wizard / Reviewing / Refining mode toggle is a secondary switch.
   Standard Tab UI pattern from existing modules can be used for the Phase
   toggle. The internal mode switch is module-specific and lives inside
   index.jsx for Phase 1.

CROSS-MODULE WIRING:
   summarizeForOtherModules is exported from this schema. Register it in
   src/utils/initiativeContext.js MODULE_SUMMARIZERS under the key
   MODULE_ID. This is the only modification to a file outside the module
   folder that this build requires (per platform rules).
`;

// ---------------------------------------------------------------------------
//   13. OPEN DESIGN QUESTIONS — carried into Build with documented owners
// ---------------------------------------------------------------------------
//
//   Q4. (Deferred) MS Forms export of the Phase 1 survey instrument.
//       Not in v1.0 scope. Revisit after pilot.
//
//   Q5. (Open — needs answer before FB-10) Anonymization.
//       Should the module enforce anonymization on import, or trust the
//       practitioner to have done it upstream?
//       Recommended position: trust upstream. The module shows a one-line
//       reminder at import time and does not store names by default.
//
// ============================================================================
