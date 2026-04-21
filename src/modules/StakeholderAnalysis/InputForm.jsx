import React, { useRef } from 'react';
import { SENTIMENTS, PRIORITIES, SENTIMENT_COLORS, emptyStakeholder } from './schema';
import { Plus, Trash2, Upload, AlertCircle, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

function StakeholderCard({ row, index, onUpdate, onRemove }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden card-hover group">
      {/* Card Header - always visible */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: SENTIMENT_COLORS[row.sentiment] }}>
          {row.name ? row.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">{row.name || 'New Stakeholder'}</span>
            <span className="badge bg-gray-50 text-text-muted border border-border">{row.role || 'No role'}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-muted">
            <span>{row.department || 'No dept'}</span>
            <span>·</span>
            <span>Inf: {row.influence}</span>
            <span>·</span>
            <span>Int: {row.interest}</span>
            <span>·</span>
            <span style={{ color: SENTIMENT_COLORS[row.sentiment] }} className="font-medium">{row.sentiment}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          row.priority === 'High' ? 'bg-red-50 text-red-700' :
          row.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-text-muted'
        }`}>{row.priority}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100">
          <Trash2 size={13} />
        </button>
        {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-surface-secondary border-t border-border space-y-3 fade-in">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Name</label>
              <input type="text" value={row.name} onChange={e => onUpdate('name', e.target.value)}
                placeholder="e.g. Sarah Chen" className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Role / Title</label>
              <input type="text" value={row.role} onChange={e => onUpdate('role', e.target.value)}
                placeholder="e.g. CFO" className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Department</label>
              <input type="text" value={row.department} onChange={e => onUpdate('department', e.target.value)}
                placeholder="e.g. Finance" className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">
                Influence <span className="text-accent font-bold">{row.influence}</span>/10
              </label>
              <input type="range" min="1" max="10" value={row.influence} onChange={e => onUpdate('influence', parseInt(e.target.value))}
                className="w-full accent-accent h-1.5" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">
                Interest <span className="text-accent font-bold">{row.interest}</span>/10
              </label>
              <input type="range" min="1" max="10" value={row.interest} onChange={e => onUpdate('interest', parseInt(e.target.value))}
                className="w-full accent-accent h-1.5" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Sentiment</label>
              <select value={row.sentiment} onChange={e => onUpdate('sentiment', e.target.value)}
                className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white">
                {SENTIMENTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Priority</label>
              <select value={row.priority} onChange={e => onUpdate('priority', e.target.value)}
                className="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent bg-white">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Key Concerns</label>
              <textarea value={row.concerns} onChange={e => onUpdate('concerns', e.target.value)}
                rows={2} placeholder="Main concerns..." className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent resize-none bg-white" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-semibold uppercase mb-1 block">Recommended Actions</label>
              <textarea value={row.actions} onChange={e => onUpdate('actions', e.target.value)}
                rows={2} placeholder="Engagement actions..." className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent resize-none bg-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InputForm({ rows, setRows }) {
  const fileRef = useRef(null);

  const addRow = () => setRows(prev => [...prev, emptyStakeholder()]);
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
        'stakeholder name': 'name', 'name': 'name', 'stakeholder': 'name',
        'role': 'role', 'title': 'role', 'role / title': 'role', 'role/title': 'role',
        'department': 'department', 'dept': 'department',
        'influence level': 'influence', 'influence': 'influence',
        'interest level': 'interest', 'interest': 'interest',
        'current sentiment': 'sentiment', 'sentiment': 'sentiment',
        'engagement priority': 'priority', 'priority': 'priority',
        'key concerns': 'concerns', 'concerns': 'concerns',
        'recommended actions': 'actions', 'actions': 'actions',
      };
      const mapped = jsonData.map(row => {
        const newRow = emptyStakeholder();
        Object.entries(row).forEach(([key, val]) => {
          const field = fieldMap[key.toLowerCase().trim()];
          if (field) {
            if (field === 'influence' || field === 'interest') newRow[field] = Math.min(10, Math.max(1, parseInt(val) || 5));
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Stakeholders</h3>
          <span className="text-[10px] bg-gray-100 text-text-muted px-1.5 py-0.5 rounded-full font-semibold">
            {rows.length}
          </span>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Delete all stakeholders? This cannot be undone.')) setRows([]); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <XCircle size={13} /> Delete All
            </button>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-text-secondary rounded-lg hover:bg-gray-50 transition-colors">
            <Upload size={13} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors">
            <Plus size={13} /> Add Stakeholder
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 px-6">
          <AlertCircle size={28} className="text-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-text-muted mb-1">No stakeholders yet</p>
          <p className="text-xs text-text-muted">Add stakeholders manually, import a spreadsheet, or use AI Assist.</p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {rows.map((row, idx) => (
            <StakeholderCard
              key={row.id}
              row={row}
              index={idx}
              onUpdate={(field, value) => updateRow(row.id, field, value)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
