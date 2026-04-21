import React, { useRef } from 'react';
import { CHANGE_TYPES, IMPACT_LEVELS, TIMELINE_OPTIONS, emptyRow, IMPACT_COLORS } from './schema';
import { Plus, Trash2, Upload, AlertCircle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InputForm({ rows, setRows }) {
  const fileRef = useRef(null);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const updateRow = (id, field, value) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      const fieldMap = {
        'organizational group': 'orgGroup', 'org group': 'orgGroup', 'group': 'orgGroup', 'department': 'orgGroup', 'orggroup': 'orgGroup',
        'change type': 'changeType', 'changetype': 'changeType', 'type': 'changeType',
        'impact level': 'impactLevel', 'impactlevel': 'impactLevel', 'impact': 'impactLevel',
        'people affected': 'peopleAffected', 'peopleaffected': 'peopleAffected', 'headcount': 'peopleAffected', 'number of people affected': 'peopleAffected',
        'timeline sensitivity': 'timelineSensitivity', 'timelinesensitivity': 'timelineSensitivity', 'timeline': 'timelineSensitivity',
        'readiness': 'readiness', 'current readiness': 'readiness',
        'notes': 'notes', 'note': 'notes', 'comments': 'notes',
      };
      const mapped = jsonData.map(row => {
        const newRow = emptyRow();
        Object.entries(row).forEach(([key, val]) => {
          const field = fieldMap[key.toLowerCase().trim()];
          if (field) {
            if (field === 'peopleAffected') newRow[field] = parseInt(val) || 0;
            else if (field === 'readiness') newRow[field] = Math.min(5, Math.max(1, parseInt(val) || 3));
            else newRow[field] = String(val);
          }
        });
        return newRow;
      });
      if (mapped.length > 0) setRows(prev => [...prev, ...mapped]);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl border border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Impact Data</h3>
          <span className="text-[10px] bg-gray-100 text-text-muted px-1.5 py-0.5 rounded-full font-semibold">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </span>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Delete all rows? This cannot be undone.')) setRows([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              <XCircle size={13} /> Delete All
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-text-secondary rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={13} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            <Plus size={13} /> Add Row
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 px-6">
          <AlertCircle size={28} className="text-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-text-muted mb-1">No impact data yet</p>
          <p className="text-xs text-text-muted">Add rows manually, import a spreadsheet, or use AI Assist to extract data from notes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary border-b border-border">
                {['Org Group', 'Change Type', 'Impact', 'People', 'Timeline', 'Readiness', 'Notes', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-border-light hover:bg-surface-secondary/50 group transition-colors">
                  <td className="py-2 px-3">
                    <input type="text" value={row.orgGroup} onChange={e => updateRow(row.id, 'orgGroup', e.target.value)}
                      placeholder="e.g. Finance" className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent" />
                  </td>
                  <td className="py-2 px-3">
                    <select value={row.changeType} onChange={e => updateRow(row.id, 'changeType', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white appearance-none">
                      {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: IMPACT_COLORS[row.impactLevel] }} />
                      <select value={row.impactLevel} onChange={e => updateRow(row.id, 'impactLevel', e.target.value)}
                        className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white appearance-none">
                        {IMPACT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <input type="number" value={row.peopleAffected} onChange={e => updateRow(row.id, 'peopleAffected', parseInt(e.target.value) || 0)}
                      className="w-20 px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent" />
                  </td>
                  <td className="py-2 px-3">
                    <select value={row.timelineSensitivity} onChange={e => updateRow(row.id, 'timelineSensitivity', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white appearance-none">
                      {TIMELINE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <input type="range" min="1" max="5" value={row.readiness}
                        onChange={e => updateRow(row.id, 'readiness', parseInt(e.target.value))}
                        className="w-16 accent-accent h-1.5" />
                      <span className={`text-xs font-bold w-5 text-center ${
                        row.readiness <= 2 ? 'text-red-500' : row.readiness <= 3 ? 'text-amber' : 'text-green-600'
                      }`}>{row.readiness}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <input type="text" value={row.notes} onChange={e => updateRow(row.id, 'notes', e.target.value)}
                      placeholder="Notes..." className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent" />
                  </td>
                  <td className="py-2 px-2">
                    <button onClick={() => removeRow(row.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
