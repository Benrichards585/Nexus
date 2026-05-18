/**
 * CHANGE READINESS ASSESSMENT — ImportFlow.jsx
 *
 * Phase 2 entry. Accepts .xlsx and .csv (per IMPORT_FORMAT) and parses
 * with SheetJS into raw rows. Validates: hard-reject if Id column or
 * Likert-shaped answer columns are missing. If no group column is
 * detected via IMPORT_FORMAT.groupColumnAliases, opens TagResponsesModal.
 *
 * Maps column headers to question IDs by case-insensitive prompt
 * comparison. Unmatched columns are stored under a `raw` namespace for
 * future inspection but do not contribute to analytics.
 *
 * Per scaffolding prompt §6 (anonymization): the practitioner is trusted
 * to have anonymized upstream; we show a one-line reminder, no enforcement.
 */
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { IMPORT_FORMAT, emptyResponse } from './schema';

const RESERVED = new Set(IMPORT_FORMAT.reservedColumns.map(c => c.toLowerCase()));
const GROUP_ALIASES = IMPORT_FORMAT.groupColumnAliases.map(c => c.toLowerCase());

// Coerce a cell to a Likert value (1-4) when possible; otherwise return null.
function tryLikert(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n >= 1 && n <= 4 && Number.isInteger(n)) return n;
  // Match label-based values: "1 - Disagree", "Agree", etc.
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    const map = {
      'disagree': 1, 'somewhat disagree': 2, 'somewhat agree': 3, 'agree': 4,
      'not willing': 1, 'somewhat willing': 2, 'willing': 3, 'fully committed': 4,
    };
    if (map[trimmed]) return map[trimmed];
    // Leading digit ("3 - Somewhat Agree")
    const m = trimmed.match(/^([1-4])\b/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function buildColumnToQuestionMap(headers, questions) {
  const map = new Map();
  const promptIndex = new Map();
  (questions || []).forEach(q => {
    if (q.prompt) promptIndex.set(q.prompt.trim().toLowerCase(), q.id);
  });
  headers.forEach(h => {
    const norm = String(h || '').trim().toLowerCase();
    if (RESERVED.has(norm)) return;
    if (GROUP_ALIASES.includes(norm)) return;
    if (promptIndex.has(norm)) {
      map.set(h, promptIndex.get(norm));
    }
  });
  return map;
}

function detectGroupHeader(headers) {
  for (const h of headers) {
    const norm = String(h || '').trim().toLowerCase();
    if (GROUP_ALIASES.includes(norm)) return h;
  }
  return null;
}

// Heuristic: is there at least one column with any Likert-shaped cells?
function hasAnyLikertColumn(rows, headers, columnToQuestion) {
  const candidates = headers.filter(h => columnToQuestion.has(h));
  return candidates.some(col => rows.some(r => tryLikert(r[col]) !== null));
}

export default function ImportFlow({ survey, planContext, onParsed, onNeedsTagging }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const okExt = IMPORT_FORMAT.acceptedFormats.some(ext => lowerName.endsWith(ext));
    if (!okExt) {
      setError(`Unsupported file type. Accepted formats: ${IMPORT_FORMAT.acceptedFormats.join(', ')}.`);
      return;
    }
    setParsing(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('The file is empty. Export your responses again and retry.');
      }
      const headers = Object.keys(rows[0]);
      const hasId = headers.some(h => String(h).trim().toLowerCase() === 'id');
      if (!hasId) {
        throw new Error('Hard-reject: the file is missing the required "Id" column. Export from Microsoft Forms with row IDs intact.');
      }

      const columnToQuestion = buildColumnToQuestionMap(headers, survey?.questions);
      if (!hasAnyLikertColumn(rows, headers, columnToQuestion)) {
        throw new Error('Hard-reject: no Likert-shaped answer columns matched the survey draft. Confirm the column headers match your survey prompts.');
      }

      const groupHeader = detectGroupHeader(headers);

      const baseRecords = rows.map(row => ({
        respondentId: String(row[headers.find(h => h.toLowerCase() === 'id')] || ''),
        submittedAt: String(row['Completion time'] || row['Start time'] || ''),
        groupFromFile: groupHeader ? String(row[groupHeader] || '') : '',
        rawRow: row,
      }));

      // If file has a group column, build responses immediately. Otherwise hand off to tagging modal.
      const definedGroups = (planContext?.stakeholderGroups || []).filter(g => (g.label || '').trim().length > 0);
      const allowedLabels = new Set(definedGroups.map(g => g.label));

      if (groupHeader) {
        const records = baseRecords.map(rec => makeResponse(rec, columnToQuestion, allowedLabels));
        onParsed({
          responses: records,
          importMeta: {
            filename: file.name,
            importedAt: new Date().toISOString(),
            rowCount: records.length,
            columnsMatched: columnToQuestion.size,
            columnsTotal: headers.filter(h => !RESERVED.has(String(h).trim().toLowerCase())).length,
            groupColumn: groupHeader,
          },
        });
      } else {
        onNeedsTagging({
          baseRecords,
          columnToQuestion,
          headers,
          filename: file.name,
        });
      }
    } catch (err) {
      setError(err.message || 'Could not parse the file.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-7">
      <div className="flex items-start gap-2 text-[12px] text-text-secondary bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
        <Info size={13} className="mt-0.5 text-amber-700 shrink-0" />
        <span>
          Make sure your import does not contain respondent names or other identifying information.
          The module trusts you to have anonymized upstream.
        </span>
      </div>

      <div className="text-center py-6">
        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <FileSpreadsheet size={22} className="text-accent" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-1">Import responses</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto mb-5">
          Upload your Microsoft Forms export (.xlsx or .csv). One row per respondent. The first sheet is parsed.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={e => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className="inline-flex items-center gap-2 px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          <Upload size={14} />
          {parsing ? 'Parsing…' : 'Choose file'}
        </button>

        <p className="text-[11px] text-text-muted mt-4 max-w-md mx-auto">
          Required: an <code>Id</code> column and at least one Likert column matching your survey prompts.
          Optional but recommended: a <code>Stakeholder Group</code> column. If missing, you'll be prompted to tag each row.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Build one full emptyResponse() object from a raw record + column map.
export function makeResponse(rec, columnToQuestion, allowedGroupLabels) {
  const r = emptyResponse();
  r.respondentId = rec.respondentId;
  r.submittedAt = rec.submittedAt;
  if (rec.groupFromFile && allowedGroupLabels.has(rec.groupFromFile)) {
    r.stakeholderGroup = rec.groupFromFile;
  }
  r.answers = {};
  columnToQuestion.forEach((qid, col) => {
    const raw = rec.rawRow[col];
    const numeric = tryLikert(raw);
    r.answers[qid] = numeric !== null ? numeric : (raw === '' || raw === undefined || raw === null ? '' : String(raw));
  });
  return r;
}
