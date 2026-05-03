import React, { useRef, useState } from 'react';
import { PROGRAM_TYPES, TRAINING_AUDIENCES, OUTPUT_FORMATS } from './schema';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

function FileUploadZone({ label, description, file, onFileChange, accept, required }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileChange(dropped);
  };

  return (
    <div>
      <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">
        {label} {required && '*'}
      </label>
      {file ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-green-800 truncate">{file.name}</div>
            <div className="text-[10px] text-green-600">{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button onClick={() => onFileChange(null)} className="p-1 hover:bg-green-100 rounded text-green-600">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            dragOver ? 'border-accent bg-accent-50' : 'border-border hover:border-accent/40 hover:bg-surface-secondary'
          }`}
        >
          <Upload size={20} className="text-text-muted mb-2" />
          <span className="text-xs font-medium text-text-secondary">{description}</span>
          <span className="text-[10px] text-text-muted mt-1">Click or drag & drop</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept={accept} onChange={e => onFileChange(e.target.files?.[0] || null)} className="hidden" />
    </div>
  );
}

export default function InputForm({ formData, setFormData, templateFile, setTemplateFile, sourceFile, setSourceFile, sourceText, setSourceText }) {
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const [extracting, setExtracting] = useState(false);

  const handleSourceFile = async (file) => {
    setSourceFile(file);
    if (!file) { setSourceText(''); return; }

    setExtracting(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        const text = await file.text();
        setSourceText(text);
      } else if (ext === 'csv') {
        const text = await file.text();
        setSourceText(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        let allText = '';
        wb.SheetNames.forEach(name => {
          const sheet = wb.Sheets[name];
          allText += `--- ${name} ---\n`;
          allText += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
        });
        setSourceText(allText);
      } else if (ext === 'docx') {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const docXml = await zip.file('word/document.xml').async('string');
        const matches = docXml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || [];
        const text = matches
          .map(m => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        setSourceText(
          text ||
          'No readable text found in document. Paste key content in the Additional Context field below.'
        );
      } else if (ext === 'pptx') {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const slideFiles = Object.keys(zip.files)
          .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const num = s => parseInt(s.match(/\d+/)[0]);
            return num(a) - num(b);
          });
        const slideTexts = await Promise.all(
          slideFiles.map(async (path, i) => {
            const xml = await zip.files[path].async('string');
            const matches = xml.match(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g) || [];
            const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').trim();
            return text ? `[Slide ${i + 1}] ${text}` : null;
          })
        );
        const text = slideTexts.filter(Boolean).join('\n\n');
        setSourceText(
          text ||
          'No readable text found in presentation. Paste key content in the Additional Context field below.'
        );
      } else if (ext === 'pdf') {
        setSourceText(
          'PDF text extraction is not supported in the browser. Please copy and paste the key content from your PDF into the Additional Context field below.'
        );
      } else {
        setSourceText('Unsupported file format. Please upload .txt, .csv, .xlsx, .docx, or .pptx files.');
      }
    } catch (err) {
      setSourceText('Error reading file. Please also paste key content in the Additional Context field below.');
    } finally {
      setExtracting(false);
    }
  };

  const isComplete = formData.programType && formData.trainingAudience && formData.outputFormat && templateFile && sourceFile;

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <FileText size={15} className="text-accent" />
          Training Configuration
        </h3>
        {!isComplete && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
            <AlertCircle size={11} /> All fields required
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Row 1: Program Type, Audience, Format */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Program Type *</label>
            <select value={formData.programType} onChange={e => update('programType', e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
              {PROGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Training Audience *</label>
            <div className="flex gap-2">
              {TRAINING_AUDIENCES.map(a => (
                <button key={a} onClick={() => update('trainingAudience', a)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.trainingAudience === a
                      ? 'border-accent bg-accent-50 text-accent'
                      : 'border-border text-text-secondary hover:bg-gray-50'
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Output Format *</label>
            <div className="flex gap-2">
              {OUTPUT_FORMATS.map(f => (
                <button key={f} onClick={() => update('outputFormat', f)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.outputFormat === f
                      ? 'border-accent bg-accent-50 text-accent'
                      : 'border-border text-text-secondary hover:bg-gray-50'
                  }`}>
                  {f.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-2 gap-4">
          <FileUploadZone
            label="Template File"
            description="Upload your slide deck or Word template"
            file={templateFile}
            onFileChange={setTemplateFile}
            accept=".pptx,.docx,.ppt,.doc"
            required
          />
          <FileUploadZone
            label="Source Material"
            description="Upload FDD, process docs, or reference material"
            file={sourceFile}
            onFileChange={handleSourceFile}
            accept=".docx,.pptx,.xlsx,.xls,.csv,.txt,.md"
            required
          />
        </div>

        {extracting && (
          <div className="text-xs text-accent font-medium animate-pulse">Extracting text from uploaded file...</div>
        )}

        {sourceText && !sourceText.startsWith('PDF text') && !sourceText.startsWith('Unsupported') && !sourceText.startsWith('Error') && !sourceText.startsWith('No readable') && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-text-muted font-semibold uppercase">
                Extracted Source Content ({sourceText.length.toLocaleString()} chars)
              </label>
              {sourceText.length > 40000 && (
                <span className="text-[10px] text-amber-600 font-medium">Large document — generation may take 2–4 min</span>
              )}
              {sourceText.length > 60000 && (
                <span className="text-[10px] text-amber-700 font-medium">
                  Only the first 60,000 characters will be sent to AI. Trim to the most relevant sections for best results.
                </span>
              )}
            </div>
            <textarea value={sourceText} onChange={e => setSourceText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none bg-surface-secondary" />
          </div>
        )}
        {sourceText && (sourceText.startsWith('PDF text') || sourceText.startsWith('Unsupported') || sourceText.startsWith('Error') || sourceText.startsWith('No readable')) && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">{sourceText}</div>
        )}

        {/* Additional Context */}
        <div>
          <label className="text-[10px] text-text-muted font-semibold uppercase mb-1.5 block">Additional Context / Instructions</label>
          <textarea value={formData.additionalContext} onChange={e => update('additionalContext', e.target.value)}
            rows={3} placeholder="Any specific focus areas, terminology to use, sections to emphasize, or additional content to include..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
        </div>
      </div>
    </div>
  );
}
