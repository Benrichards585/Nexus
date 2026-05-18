/**
 * CHANGE READINESS ASSESSMENT — index.jsx
 *
 * Module entry point. Two phases inside one module (Plan / Analyze)
 * toggle at the top. Phase 1 has a secondary mode switch (Setup /
 * Review Draft / Refine). Phase 2 progresses Import → Tagging →
 * Dashboard. State persists via setData() on every change.
 *
 * Per SCAFFOLDING_NOTES in schema.js: no "Extract from text" workflow.
 * Phase 1 input is the wizard; Phase 2 input is Excel/CSV import.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardEdit, LineChart } from 'lucide-react';
import {
  SCHEMA_VERSION,
  PHASES,
  WIZARD_MODES,
  WIZARD_STEPS,
  emptyPlanContext,
  emptyDeliveryPlan,
  emptyAnalytics,
  emptyStakeholderGroup,
  emptyQuestion,
  AI_SUGGEST_GROUPS_PROMPT,
  AI_PLAN_PROMPT,
  AI_ANALYZE_PROMPT,
} from './schema';
import { useApp } from '../../context/AppContext';
import { callClaude } from '../../utils/aiClient';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import WizardProgress from './WizardProgress';
import WizardStep, { stepIsAnswered } from './WizardStep';
import DraftSurveyView from './DraftSurveyView';
import DeliveryPanel from './DeliveryPanel';
import RefinePanel from './RefinePanel';
import ImportFlow from './ImportFlow';
import TagResponsesModal from './TagResponsesModal';
import Visualization from './Visualization';
import { exportPhase1Pdf, exportPhase1Excel, exportPhase2Pdf, exportPhase2Excel } from './ExportControls';
import { computeAnalytics } from './analytics';
import {
  extractFirstJsonObject,
  formatPlanContext,
  aiAvailable as computeAiAvailable,
  aiUnavailableReason as computeAiReason,
} from './aiUtils';

const PHASE_TABS = [
  { id: PHASES.PLAN.id,    label: PHASES.PLAN.label,    icon: ClipboardEdit },
  { id: PHASES.ANALYZE.id, label: PHASES.ANALYZE.label, icon: LineChart },
];

const MODE_PILLS = [
  { id: WIZARD_MODES.WIZARD.id,    label: WIZARD_MODES.WIZARD.label },
  { id: WIZARD_MODES.REVIEWING.id, label: WIZARD_MODES.REVIEWING.label },
  { id: WIZARD_MODES.REFINING.id,  label: WIZARD_MODES.REFINING.label },
];

export default function ChangeReadinessAssessment({ data, setData, initiative, moduleId }) {
  const {
    apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage,
    canMakeAIRequest, passwordRequired, accessGranted,
  } = useApp();

  const aiAvailable = computeAiAvailable({ aiEnabled, passwordRequired, accessGranted, canMakeAIRequest });
  const aiUnavailableReason = computeAiReason({ aiEnabled, passwordRequired, accessGranted, canMakeAIRequest });

  const [moduleData, setModuleData] = useState(() => ({
    schemaVersion: SCHEMA_VERSION,
    phase: data?.phase || 'plan',
    planContext: data?.planContext || emptyPlanContext(),
    wizardStep: typeof data?.wizardStep === 'number' ? data.wizardStep : 0,
    wizardMode: data?.wizardMode || 'wizard',
    survey: data?.survey || { questions: [], delivery: emptyDeliveryPlan() },
    refinementHistory: data?.refinementHistory || [],
    responses: data?.responses || [],
    importMeta: data?.importMeta || null,
    analytics: data?.analytics || emptyAnalytics(),
    synthesis: data?.synthesis || {},
  }));

  const [saveBadge, setSaveBadge] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    setData(moduleData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleData]);

  // Recompute analytics whenever responses (or the survey/groups they map to) change.
  useEffect(() => {
    const fresh = computeAnalytics({
      survey: moduleData.survey,
      planContext: moduleData.planContext,
      responses: moduleData.responses,
    });
    // Preserve openTextThemes if synthesis has populated them (FB-13).
    const merged = { ...fresh, openTextThemes: moduleData.analytics?.openTextThemes || [] };
    setModuleData(prev => ({ ...prev, analytics: merged }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleData.responses, moduleData.survey.questions, moduleData.planContext.stakeholderGroups]);

  const updateData = useCallback((patch) => {
    setModuleData(prev => ({ ...prev, ...patch }));
  }, []);

  const setPhase = (id) => updateData({ phase: id });
  const setWizardMode = (id) => updateData({ wizardMode: id });

  const hasSurvey = moduleData.survey.questions.length > 0;
  const modePillIsEnabled = (id) =>
    id === WIZARD_MODES.WIZARD.id || hasSurvey;

  // ---- Wizard state helpers ----
  const currentStep = WIZARD_STEPS[moduleData.wizardStep];
  const isFirstStep = moduleData.wizardStep === 0;
  const isLastStep = moduleData.wizardStep === WIZARD_STEPS.length - 1;
  const stepValue = currentStep ? moduleData.planContext[currentStep.id] : undefined;

  const updateStepValue = (next) => {
    updateData({
      planContext: { ...moduleData.planContext, [currentStep.id]: next },
    });
  };

  const goToStep = (idx) => {
    if (idx < 0 || idx >= WIZARD_STEPS.length) return;
    updateData({ wizardStep: idx });
  };

  const handleNext = () => goToStep(moduleData.wizardStep + 1);
  const handleBack = () => goToStep(moduleData.wizardStep - 1);
  const handleSaveAndClose = () => {
    setSaveBadge('Saved ✓');
    setTimeout(() => setSaveBadge(''), 1500);
  };

  // ---- AI: suggest stakeholder groups (FB-5) ----
  const handleSuggest = async () => {
    if (!aiAvailable || suggesting) return;
    setSuggesting(true);
    setSuggestError('');
    try {
      const systemPrompt = enhancePromptWithContext(AI_SUGGEST_GROUPS_PROMPT, initiative, moduleId);
      const userMessage = formatPlanContext(moduleData.planContext) ||
        'The practitioner has not yet completed earlier wizard steps. Suggest a generic starting set of stakeholder groups for an organizational change initiative.';

      const result = await callClaude({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });

      const jsonStr = extractFirstJsonObject(result);
      if (!jsonStr) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonStr);
      const suggestedGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
      if (suggestedGroups.length === 0) {
        throw new Error('AI returned no groups. Try refining your earlier wizard answers and resuggesting.');
      }

      // Append (don't replace) — per v1.1 spec annotation line 1166.
      const newGroups = suggestedGroups.map(g => ({
        ...emptyStakeholderGroup(),
        label: typeof g.label === 'string' ? g.label : '',
        approximateSize: typeof g.approximateSize === 'string' ? g.approximateSize : '',
        notes: typeof g.notes === 'string' ? g.notes : '',
      }));
      const existing = Array.isArray(moduleData.planContext.stakeholderGroups)
        ? moduleData.planContext.stakeholderGroups
        : [];
      updateData({
        planContext: {
          ...moduleData.planContext,
          stakeholderGroups: [...existing, ...newGroups],
        },
      });
    } catch (err) {
      setSuggestError(err.message || 'Failed to fetch suggestions.');
    } finally {
      setSuggesting(false);
    }
  };

  // ---- Review-draft handlers (FB-7) ----
  const updateQuestion = (next) => {
    updateData({
      survey: {
        ...moduleData.survey,
        questions: moduleData.survey.questions.map(q => (q.id === next.id ? next : q)),
      },
    });
  };

  const deleteQuestion = (id) => {
    updateData({
      survey: {
        ...moduleData.survey,
        questions: moduleData.survey.questions.filter(q => q.id !== id),
      },
    });
  };

  const updateDelivery = (next) => {
    updateData({ survey: { ...moduleData.survey, delivery: next } });
  };

  const goToRefine = () => updateData({ wizardMode: WIZARD_MODES.REFINING.id });
  const [exporting, setExporting] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [synthesizeError, setSynthesizeError] = useState('');

  // ---- Phase 2: import handlers (FB-10) ----
  const handleImportParsed = ({ responses, importMeta }) => {
    updateData({
      responses,
      importMeta,
      analytics: emptyAnalytics(), // FB-11 will recompute on responses change
      synthesis: {},
    });
  };
  const handleClearImport = () => {
    updateData({
      responses: [],
      importMeta: null,
      analytics: emptyAnalytics(),
      synthesis: {},
    });
  };
  const handleExportPdf = () => {
    setExporting(true);
    try {
      exportPhase1Pdf({
        initiative,
        survey: moduleData.survey,
        planContext: moduleData.planContext,
      });
    } catch (err) {
      setGenerateError(err.message || 'PDF export failed.');
    } finally {
      setExporting(false);
    }
  };
  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportPhase1Excel({
        initiative,
        survey: moduleData.survey,
        planContext: moduleData.planContext,
      });
    } catch (err) {
      setGenerateError(err.message || 'Excel export failed.');
    } finally {
      setExporting(false);
    }
  };

  // ---- Phase 2: synthesis + export handlers (FB-13 / FB-14) ----
  const handleAnalyze = async () => {
    if (!aiAvailable || analyzing) return;
    if (moduleData.responses.length === 0) return;
    setAnalyzing(true);
    setSynthesizeError('');
    try {
      const systemPrompt = enhancePromptWithContext(AI_ANALYZE_PROMPT, initiative, moduleId);
      // User message includes the survey, the responses (anonymized), and pre-computed analytics.
      const compactSurvey = (moduleData.survey.questions || []).map((q, i) => ({
        number: i + 1,
        id: q.id,
        dimension: q.dimension,
        prompt: q.prompt,
        followUpPrompt: q.followUpPrompt,
        scale: q.scale,
      }));
      const compactResponses = moduleData.responses.map(r => ({
        respondentId: r.respondentId,
        stakeholderGroup: r.stakeholderGroup,
        answers: r.answers,
      }));
      const userMessage = [
        'SURVEY:',
        JSON.stringify(compactSurvey, null, 2),
        '',
        'RESPONSES:',
        JSON.stringify(compactResponses, null, 2),
        '',
        'PRE-COMPUTED ANALYTICS:',
        JSON.stringify({
          heatmapData: moduleData.analytics.heatmapData,
          weakestCells: moduleData.analytics.weakestCells,
          strongestCells: moduleData.analytics.strongestCells,
          flaggedRespondents: moduleData.analytics.flaggedRespondents,
        }, null, 2),
      ].join('\n');

      const result = await callClaude({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });

      const jsonStr = extractFirstJsonObject(result);
      if (!jsonStr) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonStr);

      const synthesis = {
        overallReadiness: parsed.overallReadiness || {},
        keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
        actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
        watchOuts: Array.isArray(parsed.watchOuts) ? parsed.watchOuts : [],
      };

      // openTextThemes can be derived from the AI's action sources for now.
      const openTextThemes = synthesis.actionPlan
        .filter(a => Array.isArray(a.sourceQuotes) && a.sourceQuotes.length > 0)
        .map(a => ({
          theme: a.action,
          mentionCount: a.sourceQuotes.length,
          exampleQuotes: a.sourceQuotes.slice(0, 3),
          affectedGroups: a.targetAudience ? [a.targetAudience] : [],
        }));

      updateData({
        synthesis,
        analytics: { ...moduleData.analytics, openTextThemes },
      });
    } catch (err) {
      setSynthesizeError(err.message || 'Failed to analyze responses.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportPhase2Pdf = () => {
    setExporting(true);
    try {
      exportPhase2Pdf({
        initiative,
        survey: moduleData.survey,
        planContext: moduleData.planContext,
        responses: moduleData.responses,
        analytics: moduleData.analytics,
        synthesis: moduleData.synthesis,
      });
    } catch (err) {
      setSynthesizeError(err.message || 'PDF export failed.');
    } finally {
      setExporting(false);
    }
  };
  const handleExportPhase2Excel = () => {
    setExporting(true);
    try {
      exportPhase2Excel({
        initiative,
        survey: moduleData.survey,
        planContext: moduleData.planContext,
        analytics: moduleData.analytics,
        synthesis: moduleData.synthesis,
      });
    } catch (err) {
      setSynthesizeError(err.message || 'Excel export failed.');
    } finally {
      setExporting(false);
    }
  };

  // ---- AI: generate the survey draft + delivery plan (FB-6) ----
  const handleGenerate = async () => {
    if (!aiAvailable || generating) return;
    // Final-step gate: require the current step (timeline) to be answered.
    if (!stepIsAnswered(currentStep, stepValue)) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const systemPrompt = enhancePromptWithContext(AI_PLAN_PROMPT, initiative, moduleId);
      const userMessage = formatPlanContext({ ...moduleData.planContext, completed: true });

      const result = await callClaude({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });

      const jsonStr = extractFirstJsonObject(result);
      if (!jsonStr) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonStr);

      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      if (rawQuestions.length === 0) {
        throw new Error('AI returned no questions. Try adjusting your inputs and retrying.');
      }
      const questions = rawQuestions.map(q => ({
        ...emptyQuestion(),
        type: typeof q.type === 'string' ? q.type : 'pair',
        prompt: typeof q.prompt === 'string' ? q.prompt : '',
        followUpPrompt: typeof q.followUpPrompt === 'string' ? q.followUpPrompt : '',
        scale: typeof q.scale === 'string' ? q.scale : 'likert',
        dimension: typeof q.dimension === 'string' ? q.dimension : '',
        rationale: typeof q.rationale === 'string' ? q.rationale : '',
      }));

      const deliveryRaw = parsed.delivery || {};
      const delivery = {
        ...emptyDeliveryPlan(),
        method: typeof deliveryRaw.method === 'string' ? deliveryRaw.method : '',
        cadence: typeof deliveryRaw.cadence === 'string' ? deliveryRaw.cadence : '',
        timing: typeof deliveryRaw.timing === 'string' ? deliveryRaw.timing : '',
        channel: typeof deliveryRaw.channel === 'string' ? deliveryRaw.channel : '',
        estimatedDuration: typeof deliveryRaw.estimatedDuration === 'string' ? deliveryRaw.estimatedDuration : '',
        considerations: typeof deliveryRaw.considerations === 'string' ? deliveryRaw.considerations : '',
      };

      updateData({
        planContext: { ...moduleData.planContext, completed: true },
        survey: { questions, delivery },
        wizardMode: WIZARD_MODES.REVIEWING.id,
      });
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate draft.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-0 max-w-screen-xl slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Change Readiness Assessment</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Design your survey instrument, then analyze responses when they come in.
          </p>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex items-center gap-0 border-b border-border mb-5">
        {PHASE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setPhase(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all -mb-px ${
              moduleData.phase === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mode pills — Plan phase only */}
      {moduleData.phase === 'plan' && (
        <div className="flex items-center gap-1.5 mb-6">
          {MODE_PILLS.map(pill => {
            const isActive = moduleData.wizardMode === pill.id;
            const isEnabled = modePillIsEnabled(pill.id);
            return (
              <button
                key={pill.id}
                onClick={() => isEnabled && setWizardMode(pill.id)}
                disabled={!isEnabled}
                title={!isEnabled ? 'Available after the draft is generated' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : isEnabled
                      ? 'text-text-muted border border-border hover:border-accent/30 hover:text-accent'
                      : 'text-text-muted/40 border border-border/60 cursor-not-allowed'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      {moduleData.phase === 'plan' && moduleData.wizardMode === 'wizard' && currentStep && (
        <div className="bg-white rounded-xl border border-border p-7">
          <WizardProgress
            totalSteps={WIZARD_STEPS.length}
            currentStep={moduleData.wizardStep}
            onJumpTo={goToStep}
          />
          <WizardStep
            step={currentStep}
            value={stepValue}
            onChange={updateStepValue}
            onBack={handleBack}
            onNext={handleNext}
            onSaveAndClose={handleSaveAndClose}
            onSuggest={handleSuggest}
            onGenerate={handleGenerate}
            suggesting={suggesting}
            generating={generating}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            saveBadge={saveBadge}
            aiAvailable={aiAvailable}
            aiUnavailableReason={aiUnavailableReason}
            suggestError={suggestError}
            generateError={generateError}
          />
        </div>
      )}

      {moduleData.phase === 'plan' && moduleData.wizardMode === 'reviewing' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <DraftSurveyView
            survey={moduleData.survey}
            onUpdateQuestion={updateQuestion}
            onDeleteQuestion={deleteQuestion}
          />
          <DeliveryPanel
            delivery={moduleData.survey.delivery}
            onUpdate={updateDelivery}
            onRefine={goToRefine}
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            aiAvailable={aiAvailable}
            aiUnavailableReason={aiUnavailableReason}
            exporting={exporting}
          />
        </div>
      )}

      {moduleData.phase === 'plan' && moduleData.wizardMode === 'refining' && (
        <RefinePanel
          survey={moduleData.survey}
          refinementHistory={moduleData.refinementHistory}
          onUpdateHistory={(next) => updateData({ refinementHistory: next })}
          onApplyProposal={(nextSurvey) => updateData({ survey: nextSurvey })}
          initiative={initiative}
          moduleId={moduleId}
        />
      )}

      {moduleData.phase === 'analyze' && moduleData.responses.length === 0 && (
        <ImportFlow
          survey={moduleData.survey}
          planContext={moduleData.planContext}
          onParsed={handleImportParsed}
          onNeedsTagging={setPendingImport}
        />
      )}

      {moduleData.phase === 'analyze' && moduleData.responses.length > 0 && (
        <Visualization
          importMeta={moduleData.importMeta}
          analytics={moduleData.analytics}
          synthesis={moduleData.synthesis}
          onAnalyze={handleAnalyze}
          onClearImport={handleClearImport}
          onExportPdf={handleExportPhase2Pdf}
          onExportExcel={handleExportPhase2Excel}
          analyzing={analyzing}
          exporting={exporting}
          aiAvailable={aiAvailable}
          aiUnavailableReason={aiUnavailableReason}
          synthesizeError={synthesizeError}
        />
      )}

      <TagResponsesModal
        pending={pendingImport}
        planContext={moduleData.planContext}
        onApply={(payload) => { handleImportParsed(payload); setPendingImport(null); }}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  );
}

// Keep the helper exported so future FBs can reuse it without an extra import surface.
export { stepIsAnswered };
