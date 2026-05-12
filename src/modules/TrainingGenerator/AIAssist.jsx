import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AI_SYSTEM_PROMPT, PROGRAM_TYPE_PROMPTS } from './schema';
import { Sparkles, Loader2, AlertCircle, Bot, Download, Lock, MessageSquare, ArrowDown } from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import AIChat from '../../components/AIChat';
import { enhancePromptWithContext } from '../../utils/initiativeContext';
import { callClaude } from '../../utils/aiClient';
import { startLog, completeLog, failLog, formatForClipboard } from '../../utils/debugLog';

// Bracket-counting JSON extractor — avoids greedy regex capturing trailing text with braces.
function extractFirstJsonObject(text) {
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

export default function AIAssist({ formData, sourceText, templateFile, generatedTraining, setGeneratedTraining, initiative, moduleId }) {
  const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage, canMakeAIRequest, passwordRequired, accessGranted } = useApp();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [lastLogId, setLastLogId] = useState(null);
  const [debugCopied, setDebugCopied] = useState(false);

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

  // templateFile is not sent to the AI — only its name is logged in the prompt.
  // Excluding it from isReady lets users re-generate after a page reload, when
  // File objects cannot be restored from persisted state but sourceText can.
  const isReady = formData.programType && formData.trainingAudience && formData.outputFormat && sourceText;

  const buildUserMessage = () => {
    // Standard tier Azure Function supports up to ~10 min; no hard truncation needed.
    // Very large docs (>120K) are warned about in InputForm — soft cap here as a safety net.
    const truncatedSource = (sourceText || '').substring(0, 120000);
    return `Generate training material with these specifications:

Program Type: ${formData.programType}
Training Audience: ${formData.trainingAudience}
Output Format: ${formData.outputFormat}
Template File: ${templateFile?.name || 'None'}
${formData.additionalContext ? `Additional Instructions: ${formData.additionalContext}` : ''}

SOURCE MATERIAL:
${truncatedSource}`;
  };

  // Build a lightweight context message for the AIChat refinement panel.
  // Uses the generated JSON output — NOT the 30K source document — so every
  // refinement call stays small and fast through the corporate proxy.
  const buildRefinementContext = () => {
    if (!generatedTraining) return '';
    return `Please help me refine the following training material based on my feedback.

Program: ${formData.programType} · Audience: ${formData.trainingAudience} · Format: ${formData.outputFormat}

CURRENT TRAINING MATERIAL (return the full updated JSON structure when making changes):
${JSON.stringify(generatedTraining)}`;
  };

  const handleGenerate = async () => {
    if (!isReady) return;
    setLoading(true);
    setError('');

    const logId = startLog({
      module: 'TrainingGenerator',
      action: 'generate',
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 4096,
      sourceLength: (sourceText || '').length,
    });
    setLastLogId(logId);

    try {
      const userMessage = buildUserMessage();

      // Haiku 4.5 for initial generation — fast and cost-efficient for first draft.
      // Sonnet 4 remains available in the conversational refinement panel below.
      // Per-type system prompt ensures the right section structure for each training type.
      const typePrompt = PROGRAM_TYPE_PROMPTS[formData.programType] || PROGRAM_TYPE_PROMPTS['Topic Not Covered Here'];
      const text = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: enhancePromptWithContext(typePrompt, initiative, moduleId),
        messages: [{ role: 'user', content: userMessage }],
        apiKey,
        proxyAvailable,
        appPassword: accessPassword,
        onUsage: (inputTokens, outputTokens) => {
          recordUsage(inputTokens, outputTokens);
          completeLog(logId, { inputTokens, outputTokens });
        },
      });
      const jsonStr = extractFirstJsonObject(text);
      if (!jsonStr) throw new Error('Could not parse AI response');
      setGeneratedTraining(JSON.parse(jsonStr));
    } catch (err) {
      failLog(logId, { message: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PPTX export — Option C: template injection path + pptxgenjs fallback
  // ---------------------------------------------------------------------------

  // Drawing ML namespace constant.
  const _A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

  // Replace the contents of a <p:txBody> with the given lines. Preserves
  // paragraph- and run-properties from the template's first <a:p> so the
  // template's font, colour, and bullet styling is inherited.
  // If `autofit` is true, ensures the parent <a:bodyPr> has <a:normAutofit/>
  // so PowerPoint shrinks text to fit when content is too long.
  const _writeTxBodyLines = (doc, txBody, lines, { autofit = false } = {}) => {
    if (!txBody || lines.length === 0) return;

    // Enable autofit on the body properties (prevents overflow past placeholder bounds)
    if (autofit) {
      const txBodyChildren = txBody.childNodes;
      for (let i = 0; i < txBodyChildren.length; i++) {
        if (txBodyChildren[i].localName === 'bodyPr') {
          const bodyPr = txBodyChildren[i];
          // Remove any existing autofit setting
          const existing = Array.from(bodyPr.childNodes).filter(n =>
            ['normAutofit', 'spAutoFit', 'noAutofit'].includes(n.localName)
          );
          existing.forEach(e => bodyPr.removeChild(e));
          bodyPr.appendChild(doc.createElementNS(_A_NS, 'a:normAutofit'));
          break;
        }
      }
    }

    // Preserve first <a:p> as a formatting template, remove all existing paragraphs
    const existingParas = Array.from(txBody.childNodes).filter(n => n.localName === 'p');
    const formatPara = existingParas[0];
    existingParas.forEach(p => txBody.removeChild(p));

    const findChildByName = (parent, name) => {
      if (!parent) return null;
      for (let i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].localName === name) return parent.childNodes[i];
      }
      return null;
    };
    const templatePPr = findChildByName(formatPara, 'pPr');
    const templateRPr = findChildByName(findChildByName(formatPara, 'r'), 'rPr');

    lines.forEach(line => {
      const para = doc.createElementNS(_A_NS, 'a:p');
      if (templatePPr) para.appendChild(templatePPr.cloneNode(true));

      const run = doc.createElementNS(_A_NS, 'a:r');
      if (templateRPr) run.appendChild(templateRPr.cloneNode(true));

      const t = doc.createElementNS(_A_NS, 'a:t');
      t.textContent = line;
      run.appendChild(t);
      para.appendChild(run);
      txBody.appendChild(para);
    });
  };

  // Inject one section's content into a cloned copy of the template slide XML.
  //
  // Strategy:
  //   1. Scan all <p:sp> placeholder shapes to identify what's available.
  //   2. Title goes into the first title placeholder.
  //   3. Body content (paragraphs, bullets, steps, FAQ, comparison) goes into
  //      the first body placeholder, with normAutofit to prevent overflow.
  //   4. Screenshot description goes into the picture placeholder if one
  //      exists; otherwise it appends to the body.
  //   5. All other placeholders (slide numbers, dates, footers, secondary
  //      bodies) are left untouched.
  const _injectSectionIntoSlide = (templateXml, section) => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const doc = parser.parseFromString(templateXml, 'application/xml');

    // Build body content (excluding the screenshot description — handled separately)
    const bodyLines = [];
    if (section.content) bodyLines.push(section.content);
    if (section.keyPoints?.length) section.keyPoints.forEach(p => bodyLines.push(`•  ${p}`));
    if (section.steps?.length) section.steps.forEach(s => bodyLines.push(s));
    if (section.faqItems?.length) section.faqItems.forEach(f => { bodyLines.push(`Q: ${f.question}`); bodyLines.push(`A: ${f.answer}`); });
    if (section.comparison?.length) section.comparison.forEach(r => bodyLines.push(`${r.before || ''} → ${r.after || ''} (${r.impact || ''})`));

    const screenshotText = section.screenshotPlaceholder
      ? `📷 INSERT SCREENSHOT: ${section.screenshotPlaceholder}`
      : '';

    // Discover all placeholders in document order
    const placeholders = [];
    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.localName !== 'sp') continue;

      let ph = null, txBody = null;
      for (let j = 0; j < el.childNodes.length; j++) {
        const c = el.childNodes[j];
        if (c.localName === 'nvSpPr') {
          // Recurse into nvSpPr to find <p:ph>
          const nvSpChildren = c.getElementsByTagName('*');
          for (let k = 0; k < nvSpChildren.length; k++) {
            if (nvSpChildren[k].localName === 'ph') { ph = nvSpChildren[k]; break; }
          }
        }
        if (c.localName === 'txBody') txBody = c;
      }
      if (!ph || !txBody) continue;
      placeholders.push({
        sp: el,
        txBody,
        type: ph.getAttribute('type') || '',
        idx: ph.getAttribute('idx') || '',
      });
    }

    // Pick the first title and first body placeholder
    const titlePh = placeholders.find(p => p.type === 'title' || p.type === 'ctrTitle');
    const bodyPh = placeholders.find(p => {
      if (p === titlePh) return false;
      if (['pic', 'chart', 'tbl', 'sldNum', 'dt', 'ftr'].includes(p.type)) return false;
      return p.type === 'body' || p.type === 'subTitle' || p.idx === '1' || p.idx === '';
    });
    const picPh = placeholders.find(p => p.type === 'pic');

    // 1. Title
    if (titlePh && section.heading) {
      _writeTxBodyLines(doc, titlePh.txBody, [section.heading], { autofit: false });
    }

    // 2. Body — if no picture placeholder, append screenshot description to body
    const finalBodyLines = (!picPh && screenshotText)
      ? [...bodyLines, screenshotText]
      : bodyLines;
    if (bodyPh && finalBodyLines.length > 0) {
      _writeTxBodyLines(doc, bodyPh.txBody, finalBodyLines, { autofit: true });
    }

    // 3. Picture placeholder — inject screenshot description there if available
    if (picPh && screenshotText) {
      _writeTxBodyLines(doc, picPh.txBody, [screenshotText], { autofit: true });
    }

    return serializer.serializeToString(doc);
  };

  // Update [Content_Types].xml — add an Override entry for each new slide.
  const _updateContentTypes = (zip, slideCount) => {
    const ctXml = zip.file('[Content_Types].xml');
    if (!ctXml) return;
    ctXml.async('string').then(xml => {
      const slideType = 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';
      let updated = xml;
      for (let i = 1; i <= slideCount; i++) {
        const partName = `/ppt/slides/slide${i}.xml`;
        if (!updated.includes(partName)) {
          updated = updated.replace('</Types>', `  <Override PartName="${partName}" ContentType="${slideType}"/>\n</Types>`);
        }
      }
      zip.file('[Content_Types].xml', updated);
    });
  };

  // Update ppt/_rels/presentation.xml.rels and ppt/presentation.xml to register
  // any slides beyond what the template already declares.
  const _updatePresentationManifest = async (zip, templateSlideCount, newSlideCount) => {
    const relsPath = 'ppt/_rels/presentation.xml.rels';
    const presPath = 'ppt/presentation.xml';
    const relsFile = zip.file(relsPath);
    const presFile = zip.file(presPath);
    if (!relsFile || !presFile) return;

    let relsXml = await relsFile.async('string');
    let presXml = await presFile.async('string');

    // Find the highest existing rId number in rels
    const rIdMatches = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
    let maxRid = rIdMatches.reduce((m, r) => Math.max(m, parseInt(r[1], 10)), 0);

    // Find the highest existing slide id in presentation.xml
    const sldIdMatches = [...presXml.matchAll(/id="(\d+)"/g)];
    let maxSldId = sldIdMatches.reduce((m, r) => Math.max(m, parseInt(r[1], 10)), 255);

    const slideRelType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';

    for (let i = templateSlideCount + 1; i <= newSlideCount; i++) {
      maxRid++;
      maxSldId++;
      const rId = `rId${maxRid}`;
      // Insert new Relationship before closing </Relationships>
      relsXml = relsXml.replace('</Relationships>',
        `  <Relationship Id="${rId}" Type="${slideRelType}" Target="slides/slide${i}.xml"/>\n</Relationships>`);
      // Insert new sldId before closing </p:sldIdLst>
      presXml = presXml.replace('</p:sldIdLst>',
        `  <p:sldId id="${maxSldId}" r:id="${rId}"/>\n  </p:sldIdLst>`);
    }

    zip.file(relsPath, relsXml);
    zip.file(presPath, presXml);
  };

  // Generate a minimal notes slide XML containing one body placeholder with
  // the given speaker notes text. PowerPoint will render this in Notes Page
  // view and below the slide in editor view.
  const _buildNotesSlideXml = (slideNumber, notesText) => {
    const escaped = (notesText || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escaped}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="4" name="Slide Number Placeholder 3"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldNum" sz="quarter" idx="10"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id="{00000000-0000-0000-0000-000000000000}" type="slidenum"><a:rPr lang="en-US"/><a:t>${slideNumber}</a:t></a:fld><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;
  };

  // Attach a notes slide to a given slide N: writes notesSlideN.xml + its rels,
  // updates the slide's rels to point at the notes slide, and registers an
  // Override in [Content_Types].xml. Adds the notesMaster reference to
  // presentation.xml.rels on first call.
  const _addNotesSlide = async (zip, slideNumber, notesText) => {
    if (!notesText || !notesText.trim()) return;

    // 1. Write the notes slide XML
    zip.file(`ppt/notesSlides/notesSlide${slideNumber}.xml`, _buildNotesSlideXml(slideNumber, notesText));

    // 2. Write the notes slide's rels — points at the parent slide + the notesMaster
    const notesRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${slideNumber}.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/></Relationships>`;
    zip.file(`ppt/notesSlides/_rels/notesSlide${slideNumber}.xml.rels`, notesRels);

    // 3. Update the slide's rels to add a relationship to the notes slide
    const slideRelsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const slideRelsFile = zip.file(slideRelsPath);
    if (slideRelsFile) {
      let slideRels = await slideRelsFile.async('string');
      if (!slideRels.includes(`notesSlide${slideNumber}.xml`)) {
        // Pick a new rId greater than any existing one
        const ridMatches = [...slideRels.matchAll(/Id="rId(\d+)"/g)];
        const maxRid = ridMatches.reduce((m, r) => Math.max(m, parseInt(r[1], 10)), 0);
        const newRid = `rId${maxRid + 1}`;
        const insertion = `<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${slideNumber}.xml"/>`;
        slideRels = slideRels.replace('</Relationships>', insertion + '</Relationships>');
        zip.file(slideRelsPath, slideRels);
      }
    }

    // 4. Register the notes slide in [Content_Types].xml (idempotent)
    const ctFile = zip.file('[Content_Types].xml');
    if (ctFile) {
      let ct = await ctFile.async('string');
      const part = `/ppt/notesSlides/notesSlide${slideNumber}.xml`;
      if (!ct.includes(part)) {
        const override = `<Override PartName="${part}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`;
        ct = ct.replace('</Types>', override + '</Types>');
        zip.file('[Content_Types].xml', ct);
      }
    }
  };

  // Remove template slides that the generated training doesn't fill, and prune
  // their entries from [Content_Types].xml, presentation.xml.rels, and
  // presentation.xml. Templates frequently contain 15-20+ slides; without
  // pruning, the original content lingers at the end of the output.
  const _pruneExtraSlides = async (zip, finalSlideCount, templateSlideCount) => {
    if (templateSlideCount <= finalSlideCount) return;

    const slidesToDelete = [];
    for (let i = finalSlideCount + 1; i <= templateSlideCount; i++) slidesToDelete.push(i);
    const deleteSet = new Set(slidesToDelete);

    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    // 1. Prune ppt/_rels/presentation.xml.rels — track rIds we remove so we can
    //    delete the matching <p:sldId> entries from presentation.xml.
    const ridsToRemove = new Set();
    const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (relsFile) {
      const relsXml = await relsFile.async('string');
      const relsDoc = parser.parseFromString(relsXml, 'application/xml');
      const rels = Array.from(relsDoc.getElementsByTagName('Relationship'));
      rels.forEach(rel => {
        const target = rel.getAttribute('Target') || '';
        const m = target.match(/slides\/slide(\d+)\.xml$/);
        if (m && deleteSet.has(parseInt(m[1], 10))) {
          ridsToRemove.add(rel.getAttribute('Id'));
          rel.parentNode.removeChild(rel);
        }
      });
      zip.file('ppt/_rels/presentation.xml.rels', serializer.serializeToString(relsDoc));
    }

    // 2. Prune <p:sldId> entries from ppt/presentation.xml whose r:id matches.
    const presFile = zip.file('ppt/presentation.xml');
    if (presFile) {
      const presXml = await presFile.async('string');
      const presDoc = parser.parseFromString(presXml, 'application/xml');
      const sldIds = Array.from(presDoc.getElementsByTagName('*')).filter(e => e.localName === 'sldId');
      sldIds.forEach(sldId => {
        // r:id attribute uses the relationships namespace prefix
        const rId = sldId.getAttribute('r:id') || sldId.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        if (rId && ridsToRemove.has(rId)) {
          sldId.parentNode.removeChild(sldId);
        }
      });
      zip.file('ppt/presentation.xml', serializer.serializeToString(presDoc));
    }

    // 3. Prune Override entries in [Content_Types].xml for the deleted slides.
    const ctFile = zip.file('[Content_Types].xml');
    if (ctFile) {
      const ctXml = await ctFile.async('string');
      const ctDoc = parser.parseFromString(ctXml, 'application/xml');
      const overrides = Array.from(ctDoc.getElementsByTagName('Override'));
      overrides.forEach(o => {
        const part = o.getAttribute('PartName') || '';
        const slideM = part.match(/\/ppt\/slides\/slide(\d+)\.xml$/);
        const notesM = part.match(/\/ppt\/notesSlides\/notesSlide(\d+)\.xml$/);
        if ((slideM && deleteSet.has(parseInt(slideM[1], 10))) ||
            (notesM && deleteSet.has(parseInt(notesM[1], 10)))) {
          o.parentNode.removeChild(o);
        }
      });
      zip.file('[Content_Types].xml', serializer.serializeToString(ctDoc));
    }

    // 4. Delete the actual slide files (and any associated notes/rels).
    for (const n of slidesToDelete) {
      zip.remove(`ppt/slides/slide${n}.xml`);
      zip.remove(`ppt/slides/_rels/slide${n}.xml.rels`);
      zip.remove(`ppt/notesSlides/notesSlide${n}.xml`);
      zip.remove(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`);
    }
  };

  // Template injection path. Returns true if it succeeded, false to fall through.
  const _exportPptxFromTemplate = async () => {
    let JSZip;
    try {
      JSZip = (await import('jszip')).default;
    } catch {
      return false;
    }

    const arrayBuffer = await templateFile.arrayBuffer();
    const templateZip = await JSZip.loadAsync(arrayBuffer);

    // Use slide2 as the content-slide template (slide1 is the title slide).
    const templateSlideXml = await templateZip.file('ppt/slides/slide2.xml')?.async('string');
    const templateSlideRels = await templateZip.file('ppt/slides/_rels/slide2.xml.rels')?.async('string');
    if (!templateSlideXml) return false; // Template has no content slide

    // Count how many slides the template already declares
    const templateSlideCount = Object.keys(templateZip.files)
      .filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).length;

    // Clone the full template ZIP as our output base
    const outputZip = new JSZip();
    for (const [path, file] of Object.entries(templateZip.files)) {
      if (!file.dir) outputZip.file(path, await file.async('uint8array'));
    }

    // Inject the training title into slide1 (template's title slide). Pass
    // a section-shaped object so the same helper handles formatting consistently.
    const slide1Xml = await templateZip.file('ppt/slides/slide1.xml')?.async('string');
    if (slide1Xml) {
      const titleSection = {
        heading: generatedTraining.title || 'Training',
        content: `${formData.trainingAudience} · ${generatedTraining.estimatedDuration || 'Duration TBD'}`,
      };
      const newSlide1Xml = _injectSectionIntoSlide(slide1Xml, titleSection);
      outputZip.file('ppt/slides/slide1.xml', newSlide1Xml);
    }

    const sections = generatedTraining.sections || [];
    const isTrainTheTrainer = formData.trainingAudience === 'Train-the-Trainer';

    // slide1 = title (just injected above), slide2+ = content sections
    for (let i = 0; i < sections.length; i++) {
      const slideNum = i + 2;
      const section = sections[i];
      const slideXml = _injectSectionIntoSlide(templateSlideXml, section);
      outputZip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);
      if (templateSlideRels) {
        outputZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, templateSlideRels);
      }
      // Attach speaker notes for Train-the-Trainer audience when section has them
      if (isTrainTheTrainer && section.speakerNotes) {
        await _addNotesSlide(outputZip, slideNum, section.speakerNotes);
      }
    }

    const finalSlideCount = sections.length + 1;
    // Register any slides we added beyond what the template had
    if (finalSlideCount > templateSlideCount) {
      await _updatePresentationManifest(outputZip, templateSlideCount, finalSlideCount);
    }
    // Remove any leftover template slides we didn't use
    await _pruneExtraSlides(outputZip, finalSlideCount, templateSlideCount);
    _updateContentTypes(outputZip, finalSlideCount);

    const blob = await outputZip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    saveAs(blob, `Training-${formData.programType.replace(/\s+/g, '-')}.pptx`);
    return true;
  };

  // pptxgenjs fallback (Cognizant branding, no template).
  const _exportPptxDefault = async () => {
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

    // Content slides — handle all section types from the extended schema
    (generatedTraining.sections || []).forEach(section => {
      const slide = pptx.addSlide();
      slide.addText(section.heading, { x: 0.8, y: 0.4, w: 11.7, fontSize: 24, color: '000048', bold: true, fontFace: 'Arial' });
      slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.0, w: 2, h: 0.04, fill: { color: '6366f1' } });

      const hasScreenshot = !!section.screenshotPlaceholder;
      const contentH = hasScreenshot ? 4.1 : 5.6;
      let yPos = 1.25;

      if (section.content) {
        slide.addText(section.content, { x: 0.8, y: yPos, w: 11.7, h: 0.7, fontSize: 13, color: '475569', fontFace: 'Arial', wrap: true });
        yPos += 0.85;
      }
      if (section.keyPoints?.length) {
        const bullets = section.keyPoints.map(p => ({ text: `•  ${p}`, options: { fontSize: 14, color: '334155', breakLine: true, lineSpacingMultiple: 1.4 } }));
        slide.addText(bullets, { x: 0.8, y: yPos, w: 11.7, h: contentH - (yPos - 1.25), fontFace: 'Arial' });
      }
      if (section.steps?.length) {
        const stepRows = section.steps.map(s => ({ text: s, options: { fontSize: 13, color: '1e3a5f', breakLine: true, lineSpacingMultiple: 1.45 } }));
        slide.addShape(pptx.ShapeType.rect, { x: 0.75, y: yPos - 0.05, w: 11.8, h: contentH - (yPos - 1.25) + 0.05, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.75 } });
        slide.addText(stepRows, { x: 0.95, y: yPos, w: 11.4, h: contentH - (yPos - 1.25), fontFace: 'Arial' });
      }
      if (section.comparison?.length) {
        const headerRow = [
          { text: 'Before', options: { bold: true, fontSize: 12, color: 'FFFFFF', fill: { color: '000048' }, align: 'center' } },
          { text: 'After', options: { bold: true, fontSize: 12, color: 'FFFFFF', fill: { color: '5128F2' }, align: 'center' } },
          { text: 'Impact', options: { bold: true, fontSize: 12, color: 'FFFFFF', fill: { color: '007E1C' }, align: 'center' } },
        ];
        const dataRows = section.comparison.map(row => [
          { text: row.before || '', options: { fontSize: 11, color: '334155' } },
          { text: row.after || '', options: { fontSize: 11, color: '334155' } },
          { text: row.impact || '', options: { fontSize: 11, color: '334155', italic: true } },
        ]);
        slide.addTable([headerRow, ...dataRows], { x: 0.8, y: yPos, w: 11.7, fontFace: 'Arial', border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, align: 'left', valign: 'middle' });
      }
      if (section.faqItems?.length) {
        const faqPairs = section.faqItems.flatMap(faq => [
          { text: `Q: ${faq.question}`, options: { bold: true, fontSize: 13, color: '000048', breakLine: true } },
          { text: `A: ${faq.answer}`, options: { fontSize: 12, color: '475569', breakLine: true, lineSpacingMultiple: 1.3 } },
          { text: ' ', options: { fontSize: 8, breakLine: true } },
        ]);
        slide.addText(faqPairs, { x: 0.8, y: yPos, w: 11.7, h: contentH, fontFace: 'Arial' });
      }
      if (hasScreenshot) {
        slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 5.55, w: 11.7, h: 1.65, fill: { color: 'FFFBEB' }, line: { color: 'F59E0B', pt: 1 } });
        slide.addText(`📷  INSERT SCREENSHOT: ${section.screenshotPlaceholder}`, { x: 0.95, y: 5.6, w: 11.4, h: 1.55, fontSize: 10, color: '92400E', italic: true, fontFace: 'Arial', wrap: true, valign: 'middle' });
      }
      if (section.speakerNotes) slide.addNotes(section.speakerNotes);
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
  };

  const exportPptx = async () => {
    if (!generatedTraining) return;
    setExporting(true);
    try {
      if (templateFile) {
        const ok = await _exportPptxFromTemplate();
        if (!ok) {
          // Template injection failed — fall back and inform user
          setError('Could not apply template (unsupported format). Exported with default Cognizant branding.');
          await _exportPptxDefault();
        }
      } else {
        await _exportPptxDefault();
      }
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
.steps-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px 12px; margin: 6px 0 14px; }
.step { margin: 3px 0 3px 4px; font-size: 13px; color: #1e3a5f; }
.screenshot-placeholder { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 4px; padding: 8px 12px; margin: 8px 0 14px; font-size: 12px; color: #92400e; font-style: italic; }
.comparison-table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; font-size: 12px; }
.comparison-table th { background: #000048; color: #ffffff; padding: 6px 8px; text-align: left; }
.comparison-table th:nth-child(2) { background: #5128f2; }
.comparison-table th:nth-child(3) { background: #007e1c; }
.comparison-table td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; color: #334155; }
.comparison-table td.impact { font-style: italic; color: #1e3a5f; }
.comparison-table tr:nth-child(even) td { background: #f8fafc; }
.faq-block { margin: 6px 0 14px; }
.faq-q { margin: 8px 0 2px; font-size: 13px; font-weight: bold; color: #000048; }
.faq-a { margin: 0 0 6px 12px; font-size: 13px; color: #475569; }
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

        // Key-point bullets
        if (section.keyPoints?.length) {
          section.keyPoints.forEach(pt => {
            html += `<p class="point">&bull; ${pt}</p>`;
          });
        }

        // Numbered steps (process_step sections)
        if (section.steps?.length) {
          html += `<div class="steps-box">`;
          section.steps.forEach(step => {
            html += `<p class="step">${step}</p>`;
          });
          html += `</div>`;
        }

        // Screenshot placeholder callout
        if (section.screenshotPlaceholder) {
          html += `<div class="screenshot-placeholder"><b>📷 INSERT SCREENSHOT:</b> ${section.screenshotPlaceholder}</div>`;
        }

        // Before / After / Impact comparison table
        if (section.comparison?.length) {
          html += `<table class="comparison-table"><thead><tr><th>Before</th><th>After</th><th>Impact</th></tr></thead><tbody>`;
          section.comparison.forEach(row => {
            html += `<tr><td>${row.before || ''}</td><td>${row.after || ''}</td><td class="impact">${row.impact || ''}</td></tr>`;
          });
          html += `</tbody></table>`;
        }

        // FAQ items
        if (section.faqItems?.length) {
          html += `<div class="faq-block">`;
          section.faqItems.forEach(faq => {
            html += `<p class="faq-q">Q: ${faq.question}</p>`;
            html += `<p class="faq-a">A: ${faq.answer}</p>`;
          });
          html += `</div>`;
        }

        // Speaker notes (Train-the-Trainer only)
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
          <span className="text-xs text-text-muted">Complete all required fields and upload source material to generate</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span>{error}</span>
            {lastLogId && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(formatForClipboard(lastLogId)).then(() => {
                    setDebugCopied(true);
                    setTimeout(() => setDebugCopied(false), 2000);
                  });
                }}
                className="mt-1.5 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 underline underline-offset-2 transition-colors"
              >
                {debugCopied ? 'Copied!' : 'Copy debug info'}
              </button>
            )}
          </div>
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
                    <span className="text-[10px] text-text-muted">
                      {section.sectionType || 'section'}
                      {section.steps?.length ? ` · ${section.steps.length} steps` : ''}
                      {section.keyPoints?.length ? ` · ${section.keyPoints.length} points` : ''}
                      {section.comparison?.length ? ` · ${section.comparison.length} comparisons` : ''}
                      {section.faqItems?.length ? ` · ${section.faqItems.length} Q&As` : ''}
                    </span>
                  </summary>
                  <div className="px-4 py-3 space-y-2.5 border-t border-border-light">
                    {/* Narrative paragraph */}
                    {section.content && (
                      <p className="text-xs text-text-secondary leading-relaxed">{section.content}</p>
                    )}

                    {/* Key-point bullets */}
                    {section.keyPoints?.length > 0 && (
                      <ul className="space-y-1 mt-1">
                        {section.keyPoints.map((pt, j) => (
                          <li key={j} className="text-xs text-text-secondary flex items-start gap-1.5">
                            <span className="text-accent mt-0.5 shrink-0">•</span> {pt}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Numbered steps */}
                    {section.steps?.length > 0 && (
                      <div className="mt-1 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                        <span className="text-[9px] text-blue-700 font-semibold uppercase tracking-wider">Step-by-Step</span>
                        <ol className="mt-1.5 space-y-1">
                          {section.steps.map((step, j) => (
                            <li key={j} className="text-xs text-blue-900 leading-relaxed">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Screenshot placeholder */}
                    {section.screenshotPlaceholder && (
                      <div className="mt-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <span className="text-[9px] text-amber-700 font-semibold uppercase tracking-wider">📷 Screenshot Needed</span>
                        <p className="text-[11px] text-amber-900 mt-0.5 italic">{section.screenshotPlaceholder}</p>
                      </div>
                    )}

                    {/* Before / After / Impact comparison */}
                    {section.comparison?.length > 0 && (
                      <div className="mt-1 overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr>
                              <th className="text-left px-2 py-1.5 bg-navy text-white font-semibold rounded-tl">Before</th>
                              <th className="text-left px-2 py-1.5 bg-accent text-white font-semibold">After</th>
                              <th className="text-left px-2 py-1.5 bg-green-700 text-white font-semibold rounded-tr">Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.comparison.map((row, j) => (
                              <tr key={j} className={j % 2 === 0 ? 'bg-white' : 'bg-surface-secondary'}>
                                <td className="px-2 py-1.5 border border-border-light text-text-secondary">{row.before}</td>
                                <td className="px-2 py-1.5 border border-border-light text-text-secondary">{row.after}</td>
                                <td className="px-2 py-1.5 border border-border-light text-text-secondary italic">{row.impact}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* FAQ items */}
                    {section.faqItems?.length > 0 && (
                      <div className="mt-1 space-y-2">
                        {section.faqItems.map((faq, j) => (
                          <div key={j} className="border border-border-light rounded px-3 py-2 bg-surface-secondary">
                            <p className="text-xs font-semibold text-text-primary">Q: {faq.question}</p>
                            <p className="text-xs text-text-secondary mt-1 leading-relaxed">A: {faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Speaker notes (Train-the-Trainer) */}
                    {section.speakerNotes && (
                      <div className="mt-1 bg-amber-50 border border-amber-200 rounded px-3 py-2">
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

      {/* Refinement callout — prominent invitation to iterate on the output */}
      {generatedTraining && (
        <div className="bg-gradient-to-br from-accent-50 via-accent-50 to-white rounded-xl border-2 border-accent/40 p-6 shadow-sm fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-accent/30">
              <MessageSquare size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-text-primary mb-1">
                Not quite right? Refine it below.
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                This is a first draft. Tell the assistant in the chat below what you'd change — add sections, expand topics, simplify language, fix factual errors, or adjust the tone. Each refinement is fast and keeps everything else intact.
              </p>
              <div className="bg-white/60 rounded-lg border border-accent/20 p-3 mb-3">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">What would you change?</p>
                <p className="text-sm text-text-secondary italic">
                  Share your thoughts on the output — what's missing, what's off, what you'd want more of. Be specific.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">Example requests</p>
                <ul className="space-y-1 text-xs text-text-secondary">
                  <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">→</span> "Add a section on rollback procedures and what to do if the system goes down."</li>
                  <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">→</span> "Make section 3 more detailed — add more specific click-by-click steps."</li>
                  <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">→</span> "Rewrite the FAQ in plainer language for non-technical staff."</li>
                  <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">→</span> "The intro is too corporate — make it warmer and more conversational."</li>
                </ul>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-xs text-accent font-medium">
                <ArrowDown size={14} className="animate-bounce" />
                <span>Use the refinement chat below</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversational Refinement Chat */}
      <AIChat
        systemPrompt={PROGRAM_TYPE_PROMPTS[formData.programType] || AI_SYSTEM_PROMPT}
        initialUserMessage={buildRefinementContext()}
        onOutputUpdate={(updated) => setGeneratedTraining(updated)}
        hasOutput={!!generatedTraining}
        outputLabel="training material"
        initiative={initiative}
        moduleId={moduleId}
      />
    </div>
  );
}
