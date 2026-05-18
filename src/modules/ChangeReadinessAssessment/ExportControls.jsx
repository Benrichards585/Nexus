/**
 * CHANGE READINESS ASSESSMENT — ExportControls.jsx
 *
 * Export functions for both phases:
 *   Phase 1 (FB-9):  PDF (questions + delivery plan), Excel (one row per question)
 *   Phase 2 (FB-14): PDF (cover + dashboard landscape), Excel (scorecard + actions)
 *
 * Brand header per CLAUDE.md: Cognizant Midnight Blue #000048 navy bar
 * with teal #0498B7 wordmark. This module keeps the existing teal
 * pattern (decision #4) — no plum brand refresh for exports.
 *
 * PPTX export is deferred per scaffolding prompt §7.
 */
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const NAVY = [0, 0, 72];          // Cognizant Midnight Blue #000048
const TEAL = [4, 152, 183];       // Cognizant teal #0498B7
const WHITE = [255, 255, 255];
const MUTED_ON_NAVY = [180, 180, 200];
const INK = [0, 0, 72];           // Body ink — same as navy for headings
const TEXT_MUTED = [83, 86, 90];  // Cognizant Dark Gray #53565A

function drawHeader(pdf, { title, subtitle }) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageWidth, 26, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...TEAL);
  pdf.text('cognizant', 14, 9);

  pdf.setTextColor(...WHITE);
  pdf.setFontSize(7);
  pdf.text('|', 44, 9);

  pdf.setTextColor(...MUTED_ON_NAVY);
  pdf.setFontSize(7);
  pdf.text('OCM Nexus', 48, 9);

  pdf.setTextColor(...WHITE);
  pdf.setFontSize(14);
  pdf.text(title, 14, 20);

  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED_ON_NAVY);
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });

  if (subtitle) {
    pdf.setTextColor(...INK);
    pdf.setFontSize(10);
    pdf.text(subtitle, 14, 34);
  }
}

function ensureRoom(pdf, yPos, neededHeight) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (yPos + neededHeight <= pageHeight - 12) return yPos;
  pdf.addPage();
  return 20;
}

// ---- Phase 1 PDF ----
export function exportPhase1Pdf({ initiative, survey, planContext }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const programName = planContext?.programName || initiative?.name || 'Untitled program';
  const subtitle = `Phase 1 · Survey instrument & delivery plan — ${programName}`;
  drawHeader(pdf, { title: 'Change Readiness Assessment', subtitle });

  let yPos = 44;

  // Program context block
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  const contextLines = [];
  if (planContext?.changeType) contextLines.push(`Change type: ${planContext.changeType}`);
  if (planContext?.phase) contextLines.push(`Lifecycle phase: ${planContext.phase}`);
  if (planContext?.timeline) contextLines.push(`Timeline: ${planContext.timeline}`);
  contextLines.forEach(line => {
    pdf.text(line, 14, yPos);
    yPos += 4;
  });
  yPos += 4;

  // Questions
  pdf.setTextColor(...INK);
  pdf.setFontSize(12);
  pdf.text('Survey questions', 14, yPos);
  yPos += 6;

  const questions = survey?.questions || [];
  questions.forEach((q, i) => {
    yPos = ensureRoom(pdf, yPos, 26);
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(`Q${i + 1}`, 14, yPos);
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    if (q.dimension) pdf.text(q.dimension, 26, yPos);
    yPos += 5;

    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    const promptLines = pdf.splitTextToSize(q.prompt || '', pageWidth - 28);
    pdf.text(promptLines, 14, yPos);
    yPos += promptLines.length * 4.2 + 1;

    if (q.followUpPrompt) {
      pdf.setFontSize(8);
      pdf.setTextColor(...TEXT_MUTED);
      const followLines = pdf.splitTextToSize(`↳ ${q.followUpPrompt}`, pageWidth - 32);
      pdf.text(followLines, 18, yPos);
      yPos += followLines.length * 3.6 + 1;
    }

    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    const scale = q.scale === 'commitment' ? 'Commitment' : 'Likert';
    const paired = q.type === 'pair' && q.followUpPrompt ? ' · paired' : '';
    pdf.text(`${scale}${paired}`, 14, yPos);
    yPos += 7;
  });

  // Delivery plan
  yPos = ensureRoom(pdf, yPos, 60);
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text('Delivery plan', 14, yPos);
  yPos += 6;

  const delivery = survey?.delivery || {};
  const rows = [
    ['Method', delivery.method],
    ['Cadence', delivery.cadence],
    ['Timing', delivery.timing],
    ['Channel', delivery.channel],
    ['Duration', delivery.estimatedDuration],
    ['Notes', delivery.considerations],
  ];
  rows.forEach(([label, value]) => {
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label, 14, yPos);
    pdf.setTextColor(40, 40, 40);
    const lines = pdf.splitTextToSize(value || '—', pageWidth - 52);
    pdf.text(lines, 40, yPos);
    yPos += Math.max(5, lines.length * 4 + 1);
  });

  const safeName = (programName || 'cra').replace(/[^a-z0-9_-]+/gi, '_');
  pdf.save(`CRA_Phase1_${safeName}.pdf`);
}

// ---- Phase 1 Excel ----
export function exportPhase1Excel({ initiative, survey, planContext }) {
  const programName = planContext?.programName || initiative?.name || 'Untitled';
  const questions = survey?.questions || [];
  const wsData = questions.map((q, i) => ({
    Number: `Q${i + 1}`,
    Dimension: q.dimension || '',
    Type: q.type || '',
    Scale: q.scale === 'commitment' ? 'Commitment' : 'Likert',
    Prompt: q.prompt || '',
    'Follow-up Prompt': q.followUpPrompt || '',
    Rationale: q.rationale || '',
  }));
  const ws = XLSX.utils.json_to_sheet(wsData);
  // Set column widths (approximate)
  ws['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
    { wch: 70 }, { wch: 70 }, { wch: 60 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Survey questions');

  const safeName = (programName || 'cra').replace(/[^a-z0-9_-]+/gi, '_');
  XLSX.writeFile(wb, `CRA_Phase1_${safeName}.xlsx`);
}

// ---- Phase 2 PDF (FB-14) ----
export function exportPhase2Pdf({ initiative, survey, planContext, responses, analytics, synthesis }) {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const programName = planContext?.programName || initiative?.name || 'Untitled program';
  drawHeader(pdf, { title: 'Change Readiness Assessment', subtitle: `Phase 2 · Readiness dashboard — ${programName}` });

  let yPos = 44;
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  const stamp = [
    `${responses?.length || 0} responses`,
    `${analytics?.groupCount || 0} stakeholder groups`,
    `imported ${planContext?.importedAt || ''}`.trim(),
  ].filter(Boolean).join(' · ');
  pdf.text(stamp, 14, yPos);
  yPos += 6;

  // Headline
  const headline = synthesis?.overallReadiness?.headline;
  if (headline) {
    pdf.setFontSize(13);
    pdf.setTextColor(...INK);
    const lines = pdf.splitTextToSize(headline, pageWidth - 28);
    pdf.text(lines, 14, yPos);
    yPos += lines.length * 5 + 4;
  }

  // Heatmap table
  const heatmap = Array.isArray(analytics?.heatmapData) ? analytics.heatmapData : [];
  if (heatmap.length > 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text('Readiness heatmap', 14, yPos);
    yPos += 6;

    // Build a groups × dimensions grid in-memory
    const groupOrder = Array.from(new Set(heatmap.map(c => c.groupLabel)));
    const dimensionOrder = Array.from(new Set(heatmap.map(c => c.questionDimension || c.questionId)));
    const cellLookup = new Map();
    heatmap.forEach(c => cellLookup.set(`${c.groupLabel}::${c.questionDimension || c.questionId}`, c));

    const cellWidth = Math.min(28, (pageWidth - 70) / Math.max(1, dimensionOrder.length));
    const cellHeight = 8;

    // Header row
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    dimensionOrder.forEach((dim, i) => {
      pdf.text(String(dim).slice(0, 14), 70 + i * cellWidth + 2, yPos);
    });
    yPos += 4;

    // Body rows
    groupOrder.forEach(group => {
      yPos = ensureRoom(pdf, yPos, cellHeight + 2);
      pdf.setFontSize(8);
      pdf.setTextColor(...INK);
      pdf.text(String(group).slice(0, 32), 14, yPos + 5);

      dimensionOrder.forEach((dim, j) => {
        const cell = cellLookup.get(`${group}::${dim}`);
        if (!cell) return;
        const color = colorForBand(cell.ragLevel);
        pdf.setFillColor(...color);
        pdf.rect(70 + j * cellWidth, yPos, cellWidth - 1, cellHeight, 'F');
        pdf.setTextColor(...WHITE);
        pdf.setFontSize(8);
        const mean = typeof cell.mean === 'number' ? cell.mean.toFixed(1) : '—';
        pdf.text(mean, 70 + j * cellWidth + cellWidth / 2 - 1, yPos + 5, { align: 'center' });
      });

      yPos += cellHeight + 2;
    });
    yPos += 4;
  }

  // Key findings
  const findings = Array.isArray(synthesis?.keyFindings) ? synthesis.keyFindings : [];
  const actions = Array.isArray(synthesis?.actionPlan) ? synthesis.actionPlan : [];
  yPos = ensureRoom(pdf, yPos, 30);
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text('Key findings', 14, yPos);
  pdf.text('Action plan', pageWidth / 2 + 4, yPos);
  yPos += 6;

  const leftWidth = pageWidth / 2 - 16;
  const rightX = pageWidth / 2 + 4;
  const rightWidth = pageWidth / 2 - 18;
  const startY = yPos;
  let leftY = startY;
  let rightY = startY;

  findings.forEach(f => {
    pdf.setFontSize(9);
    pdf.setTextColor(...INK);
    const whatLines = pdf.splitTextToSize(f.finding || '', leftWidth);
    pdf.text(whatLines, 14, leftY);
    leftY += whatLines.length * 4 + 1;
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    const whyLines = pdf.splitTextToSize(f.supportingEvidence || '', leftWidth);
    pdf.text(whyLines, 14, leftY);
    leftY += whyLines.length * 3.6 + 3;
  });

  actions.forEach(a => {
    pdf.setFontSize(9);
    pdf.setTextColor(...INK);
    const actionLines = pdf.splitTextToSize(a.action || '', rightWidth);
    pdf.text(actionLines, rightX, rightY);
    rightY += actionLines.length * 4 + 1;
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    const meta = `${(a.priority || '').toUpperCase()} · ${a.effort || ''} · ${a.targetAudience || ''}`;
    pdf.text(meta, rightX, rightY);
    rightY += 3;
    if (a.rationale) {
      const rLines = pdf.splitTextToSize(a.rationale, rightWidth);
      pdf.text(rLines, rightX, rightY);
      rightY += rLines.length * 3.6;
    }
    rightY += 2;
  });

  // Avoid an empty page issue: yPos rolls to whichever column extended further
  yPos = Math.max(leftY, rightY);

  // Render disclaimer if we ran out of vertical room
  if (yPos > pageHeight - 12) {
    pdf.addPage();
  }

  const safeName = (programName || 'cra').replace(/[^a-z0-9_-]+/gi, '_');
  pdf.save(`CRA_Phase2_${safeName}.pdf`);
}

// ---- Phase 2 Excel ----
export function exportPhase2Excel({ initiative, survey, planContext, analytics, synthesis }) {
  const programName = planContext?.programName || initiative?.name || 'Untitled';

  // Sheet 1: scorecard — groups × questions × means (long format)
  const heatmap = Array.isArray(analytics?.heatmapData) ? analytics.heatmapData : [];
  const scorecard = heatmap.map(c => ({
    Group: c.groupLabel || '',
    Dimension: c.questionDimension || '',
    Question: c.questionPrompt || '',
    Mean: typeof c.mean === 'number' ? Number(c.mean.toFixed(2)) : '',
    N: c.n || 0,
    Band: c.ragLevel || '',
  }));
  const wsScorecard = XLSX.utils.json_to_sheet(scorecard);
  wsScorecard['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 60 }, { wch: 8 }, { wch: 6 }, { wch: 10 }];

  // Sheet 2: action items
  const actions = (synthesis?.actionPlan || []).map(a => ({
    Action: a.action || '',
    Rationale: a.rationale || '',
    'Target audience': a.targetAudience || '',
    Priority: a.priority || '',
    Effort: a.effort || '',
    'Derived from': a.derivedFrom || '',
    'Source quotes': Array.isArray(a.sourceQuotes) ? a.sourceQuotes.join(' || ') : '',
  }));
  const wsActions = XLSX.utils.json_to_sheet(actions);
  wsActions['!cols'] = [{ wch: 60 }, { wch: 50 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsScorecard, 'Scorecard');
  XLSX.utils.book_append_sheet(wb, wsActions, 'Action items');

  const safeName = (programName || 'cra').replace(/[^a-z0-9_-]+/gi, '_');
  XLSX.writeFile(wb, `CRA_Phase2_${safeName}.xlsx`);
}

// Map RAG band level (from HEATMAP_BANDS) to RGB tuple for PDF fill.
function colorForBand(level) {
  switch (level) {
    case 'Red':   return [220, 38, 38];   // #DC2626
    case 'Amber': return [245, 158, 11];  // #F59E0B
    case 'Green': return [16, 185, 129];  // #10B981
    default:      return [148, 163, 184]; // slate fallback
  }
}
