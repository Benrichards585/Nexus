import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AI_SYSTEM_PROMPT } from './schema';
import { Sparkles, Loader2, AlertCircle, Bot, Download, Lock } from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import AIChat from '../../components/AIChat';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import { callClaude } from '../../utils/aiClient';

export default function AIAssist({ formData, sourceText, templateFile, generatedTraining, setGeneratedTraining, initiative, moduleId }) {
  const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage, canMakeAIRequest, passwordRequired, accessGranted } = useApp();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const initialMessageRef = useRef('');

  if (!aiEnabled) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot size={22} className="text-accent/40" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">AI Generation Required</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto mb-3">
          This module requires an Anthropic API key to generate training materials. Add your key in Settings.
        </p>
        <span className="text-xs text-accent font-medium">Settings → API Key</span>
      </div>
    );
  }

  if (passwordRequired && !accessGranted) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Lock size={22} className="text-accent/40" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">AI Features Locked</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto mb-3">
          Enter the team passphrase to unlock AI features for this session.
        </p>
        <span className="text-xs text-accent font-medium">Settings ⚙ → AI Access</span>
      </div>
    );
  }

  if (!canMakeAIRequest) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-amber/40 p-8 text-center">
        <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Bot size={22} className="text-amber/60" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Daily Token Limit Reached</h3>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          You've used your {(20000).toLocaleString()}-token daily budget. AI features will reset at midnight.
        </p>
      </div>
    );
  }

  const isReady = formData.programType && formData.trainingAudience && formData.outputFormat && templateFile && sourceText;

  const buildUserMessage = () => {
    const truncatedSource = (sourceText || '').substring(0, 60000);
    return `Generate training material with these specifications:

Program Type: ${formData.programType}
Training Audience: ${formData.trainingAudience}
Output Format: ${formData.outputFormat}
Template File: ${templateFile?.name || 'None'}
${formData.additionalContext ? `Additional Instructions: ${formData.additionalContext}` : ''}

SOURCE MATERIAL:
${truncatedSource}`;
  };

  const handleGenerate = async () => {
    if (!isReady) return;
    setLoading(true);
    setError('');
    try {
      const userMessage = buildUserMessage();
      initialMessageRef.current = userMessage;

      // Haiku 4.5 for initial generation — fast and cost-efficient for first draft.
      // Sonnet 4 remains available in the conversational refinement panel below.
      const text = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId),
        messages: [{ role: 'user', content: userMessage }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: recordUsage,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      setGeneratedTraining(JSON.parse(jsonMatch[0]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPptx = async () => {
    if (!generatedTraining) return;
    setExporting(true);
    try {
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: 'CUSTOM', width: 13.33, height: 7.5 });
      pptx.layout = 'CUSTOM';

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000048' } });
      titleSlide.addText([
        { text: 'cognizant', options: { fontSize: 12, color: '0498B7', fontFace: 'Arial' } },
        { text: '  |  ', options: { fontSize: 10, color: '64748b', fontFace: 'Arial' } },
        { text: 'OCM Nexus', options: { fontSize: 10, color: '94a3b8', fontFace: 'Arial' } },
      ], { x: 0.8, y: 0.5, w: 11.7 });
      titleSlide.addText(generatedTraining.title, { x: 0.8, y: 2.2, w: 11.7, fontSize: 32, color: 'FFFFFF', bold: true, fontFace: 'Arial' });
      titleSlide.addText(`${formData.trainingAudience} Training`, { x: 0.8, y: 3.5, w: 11.7, fontSize: 18, color: '818cf8', fontFace: 'Arial' });
      titleSlide.addText(`Duration: ${generatedTraining.estimatedDuration || 'TBD'}`, { x: 0.8, y: 4.2, w: 11.7, fontSize: 14, color: '94a3b8', fontFace: 'Arial' });

      // Learning Objectives slide
      if (generatedTraining.learningObjectives?.length) {
        const objSlide = pptx.addSlide();
        objSlide.addText('Learning Objectives', { x: 0.8, y: 0.4, w: 11.7, fontSize: 24, color: '000048', bold: true, fontFace: 'Arial' });
        objSlide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.0, w: 2, h: 0.04, fill: { color: '6366f1' } });
        const objText = generatedTraining.learningObjectives.map(o => ({ text: `•  ${o}`, options: { fontSize: 16, color: '334155', bullet: false, breakLine: true, lineSpacingMultiple: 1.5 } }));
        objSlide.addText(objText, { x: 0.8, y: 1.4, w: 11.7, h: 5, fontFace: 'Arial' });
      }

      // Content slides
      (generatedTraining.sections || []).forEach(section => {
        const slide = pptx.addSlide();
        slide.addText(section.heading, { x: 0.8, y: 0.4, w: 11.7, fontSize: 24, color: '000048', bold: true, fontFace: 'Arial' });
        slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.0, w: 2, h: 0.04, fill: { color: '6366f1' } });
        if (section.keyPoints?.length) {
          const bullets = section.keyPoints.map(p => ({ text: `•  ${p}`, options: { fontSize: 15, color: '334155', breakLine: true, lineSpacingMultiple: 1.4 } }));
          slide.addText(bullets, { x: 0.8, y: 1.3, w: 11.7, h: 5.5, fontFace: 'Arial' });
        }
        if (section.speakerNotes) {
          slide.addNotes(section.speakerNotes);
        }
      });

      // Summary slide
      const sumSlide = pptx.addSlide();
      sumSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000048' } });
      sumSlide.addText([
        { text: 'cognizant', options: { fontSize: 12, color: '0498B7', fontFace: 'Arial' } },
        { text: '  |  ', options: { fontSize: 10, color: '64748b', fontFace: 'Arial' } },
        { text: 'OCM Nexus', options: { fontSize: 10, color: '94a3b8', fontFace: 'Arial' } },
      ], { x: 0.8, y: 0.5, w: 11.7 });
      sumSlide.addText('Thank You', { x: 0.8, y: 2.0, w: 11.7, fontSize: 36, color: 'FFFFFF', bold: true, fontFace: 'Arial', align: 'center' });
      if (generatedTraining.summary) {
        sumSlide.addText(generatedTraining.summary, { x: 1.5, y: 3.5, w: 10.3, fontSize: 14, color: '94a3b8', fontFace: 'Arial', align: 'center' });
      }

      await pptx.writeFile({ fileName: `Training-${formData.programType.replace(/\s+/g, '-')}.pptx` });
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportDocx = async () => {
    if (!generatedTraining) return;
    setExporting(true);
    try {
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body { font-family: Calibri, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
h1 { font-size: 28px; color: #000048; margin-top: 0; }
h2 { font-size: 20px; color: #000048; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin-top: 24px; }
.subtitle { font-size: 14px; color: #6366f1; margin-bottom: 24px; }
.objective { margin: 4px 0; font-size: 13px; }
.point { margin: 3px 0 3px 12px; font-size: 13px; }
.notes { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin: 8px 0 16px; font-size: 12px; color: #92400e; }
.notes b { color: #6366f1; }
.summary { background: #eef2ff; border-left: 3px solid #6366f1; padding: 8px 12px; margin-top: 24px; font-size: 13px; }
.branding { font-size: 11px; color: #94a3b8; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
.branding span { color: #0498B7; font-weight: 600; }
p { font-size: 13px; }
</style></head><body>`;

      html += `<p class="branding"><span>cognizant</span> &nbsp;|&nbsp; OCM Nexus</p>`;
      html += `<h1>${generatedTraining.title}</h1>`;
      html += `<p class="subtitle">${formData.trainingAudience} Training &middot; ${generatedTraining.estimatedDuration || 'TBD'}</p>`;

      if (generatedTraining.learningObjectives?.length) {
        html += `<h2>Learning Objectives</h2>`;
        generatedTraining.learningObjectives.forEach(obj => {
          html += `<p class="objective">&bull; ${obj}</p>`;
        });
      }

      (generatedTraining.sections || []).forEach(section => {
        html += `<h2>${section.heading}</h2>`;
        if (section.content) html += `<p>${section.content}</p>`;
        if (section.keyPoints?.length) {
          section.keyPoints.forEach(pt => {
            html += `<p class="point">&bull; ${pt}</p>`;
          });
        }
        if (section.speakerNotes && formData.trainingAudience === 'Train-the-Trainer') {
          html += `<div class="notes"><b>Facilitator Notes:</b> ${section.speakerNotes}</div>`;
        }
      });

      if (generatedTraining.summary) {
        html += `<h2>Summary</h2>`;
        html += `<div class="summary">${generatedTraining.summary}</div>`;
      }

      html += `</body></html>`;

      const blob = new Blob([html], { type: 'application/msword' });
      saveAs(blob, `Training-${formData.programType.replace(/\s+/g, '-')}.doc`);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (formData.outputFormat.includes('PowerPoint')) exportPptx();
    else exportDocx();
  };

  return (
    <div className="space-y-4">
      {/* Generate + Export buttons */}
      <div className="flex items-center gap-3">
        <button onClick={handleGenerate} disabled={loading || !isReady}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-lg text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-accent/20">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? 'Generating Training Content...' : generatedTraining ? 'Regenerate from Form' : 'Generate Training Material'}
        </button>

        {generatedTraining && (
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 border border-accent text-accent font-medium rounded-lg text-sm hover:bg-accent-50 transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? 'Exporting...' : `Download ${formData.outputFormat.includes('PowerPoint') ? '.pptx' : '.doc'}`}
          </button>
        )}

        {!isReady && (
          <span className="text-xs text-text-muted">Complete all required fields and upload both files to generate</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Preview */}
      {generatedTraining && (
        <div className="bg-white rounded-xl border border-border overflow-hidden fade-in">
          <div className="px-5 py-3 border-b border-border bg-surface-secondary">
            <h3 className="text-sm font-semibold text-text-primary">Generated Training Preview</h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              {generatedTraining.sections?.length || 0} sections · {generatedTraining.estimatedDuration || 'Duration TBD'}
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Title & Objectives */}
            <div>
              <h4 className="text-lg font-bold text-text-primary">{generatedTraining.title}</h4>
              {generatedTraining.learningObjectives?.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] text-text-muted font-semibold uppercase">Learning Objectives</span>
                  <ul className="mt-1 space-y-1">
                    {generatedTraining.learningObjectives.map((obj, i) => (
                      <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-accent-50 text-accent flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {(generatedTraining.sections || []).map((section, i) => (
                <details key={i} className="border border-border rounded-lg group" open={i === 0}>
                  <summary className="px-4 py-2.5 cursor-pointer select-none flex items-center justify-between bg-surface-secondary hover:bg-gray-50 rounded-lg transition-colors">
                    <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                      {section.heading}
                    </span>
                    <span className="text-[10px] text-text-muted">{section.keyPoints?.length || 0} points</span>
                  </summary>
                  <div className="px-4 py-3 space-y-2 border-t border-border-light">
                    {section.content && (
                      <p className="text-xs text-text-secondary leading-relaxed">{section.content}</p>
                    )}
                    {section.keyPoints?.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {section.keyPoints.map((pt, j) => (
                          <li key={j} className="text-xs text-text-secondary flex items-start gap-1.5">
                            <span className="text-accent mt-0.5">•</span> {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.speakerNotes && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        <span className="text-[9px] text-amber-700 font-semibold uppercase">Speaker Notes</span>
                        <p className="text-[11px] text-amber-900 mt-0.5">{section.speakerNotes}</p>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>

            {/* Summary */}
            {generatedTraining.summary && (
              <div className="bg-accent-50 rounded-lg px-4 py-3 border border-accent-100">
                <span className="text-[10px] text-accent font-semibold uppercase">Summary</span>
                <p className="text-xs text-text-secondary mt-1">{generatedTraining.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversational Refinement Chat */}
      <AIChat
        systemPrompt={AI_SYSTEM_PROMPT}
        initialUserMessage={initialMessageRef.current || buildUserMessage()}
        onOutputUpdate={(updated) => setGeneratedTraining(updated)}
        hasOutput={!!generatedTraining}
        outputLabel="training material"
        initiative={initiative}
        moduleId={moduleId}
      />
    </div>
  );
}
