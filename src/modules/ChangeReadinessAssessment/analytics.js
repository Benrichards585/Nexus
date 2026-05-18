/**
 * CHANGE READINESS ASSESSMENT — analytics.js
 *
 * Pure functions that compute the emptyAnalytics() shape from
 * (survey, planContext, responses). Called reactively from index.jsx
 * whenever responses change.
 *
 * HEATMAP RAG BAND BOUNDARY:
 *   schema's HEATMAP_BANDS uses `max` as the *exclusive* upper bound:
 *     Red:   mean < 2.0
 *     Amber: 2.0 <= mean < 2.75
 *     Green: 2.75 <= mean (and exactly 4.0 falls back to Green)
 *   This matches v1.1 spec legend ("Green >= 2.75").
 */
import { HEATMAP_BANDS } from './schema';

function bandFor(mean) {
  if (typeof mean !== 'number' || Number.isNaN(mean)) return null;
  for (const band of HEATMAP_BANDS) {
    if (mean < band.max) return band;
  }
  return HEATMAP_BANDS[HEATMAP_BANDS.length - 1];
}

function isLikertValue(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 4;
}

export function computeAnalytics({ survey, planContext, responses }) {
  const questions = Array.isArray(survey?.questions) ? survey.questions : [];
  const allGroups = Array.isArray(planContext?.stakeholderGroups) ? planContext.stakeholderGroups : [];
  const groupByLabel = new Map(allGroups.filter(g => (g.label || '').trim()).map(g => [g.label, g]));
  const rows = Array.isArray(responses) ? responses : [];

  // Likert distribution per question (only counts numeric 1-4 values)
  const likertDistributions = {};
  const averageScores = {};
  questions.forEach(q => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let sum = 0, n = 0;
    rows.forEach(r => {
      const v = r.answers?.[q.id];
      if (isLikertValue(v)) {
        counts[v]++;
        sum += v;
        n++;
      }
    });
    likertDistributions[q.id] = counts;
    averageScores[q.id] = n > 0 ? sum / n : null;
  });

  // Heatmap cells: groups × questions
  const heatmapData = [];
  // Active groups are those that actually appear in responses, in the order they
  // were defined in Phase 1 (falling back to alpha order for any group label that
  // appears in responses but wasn't in planContext).
  const groupsInResponses = new Set(rows.map(r => r.stakeholderGroup).filter(Boolean));
  const orderedGroupLabels = [
    ...allGroups.map(g => g.label).filter(label => groupsInResponses.has(label)),
    ...[...groupsInResponses].filter(label => !groupByLabel.has(label)).sort(),
  ];

  orderedGroupLabels.forEach(groupLabel => {
    const group = groupByLabel.get(groupLabel);
    const groupRows = rows.filter(r => r.stakeholderGroup === groupLabel);
    questions.forEach(q => {
      const values = groupRows
        .map(r => r.answers?.[q.id])
        .filter(isLikertValue);
      const n = values.length;
      const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : null;
      const band = mean !== null ? bandFor(mean) : null;
      heatmapData.push({
        groupId: group?.id || null,
        groupLabel,
        questionId: q.id,
        questionPrompt: q.prompt,
        questionDimension: q.dimension || '',
        questionScale: q.scale === 'commitment' ? 'commitment' : 'likert',
        n,
        mean,
        ragLevel: band ? band.level : null,
        ragColor: band ? band.color : null,
      });
    });
  });

  // Weakest / strongest: lowest and highest cells by mean, where n > 0
  const ranked = heatmapData
    .filter(c => c.n > 0 && typeof c.mean === 'number')
    .slice();
  const weakestCells = [...ranked].sort((a, b) => a.mean - b.mean).slice(0, 3);
  const strongestCells = [...ranked].sort((a, b) => b.mean - a.mean).slice(0, 3);

  // Flagged respondents: any respondent whose answered Likert mean is <= 1.5
  // (mostly-Disagree pattern). Open text and missing answers are ignored.
  const flaggedRespondents = [];
  rows.forEach(r => {
    const vals = questions
      .map(q => r.answers?.[q.id])
      .filter(isLikertValue);
    if (vals.length === 0) return;
    const personalMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (personalMean <= 1.5) {
      flaggedRespondents.push({
        respondentId: r.respondentId,
        stakeholderGroup: r.stakeholderGroup,
        personalMean: Number(personalMean.toFixed(2)),
        answeredCount: vals.length,
      });
    }
  });

  return {
    responseCount: rows.length,
    groupCount: orderedGroupLabels.length,
    likertDistributions,
    averageScores,
    heatmapData,
    weakestCells,
    strongestCells,
    openTextThemes: [], // populated by FB-13 AI synthesis
    flaggedRespondents,
  };
}
