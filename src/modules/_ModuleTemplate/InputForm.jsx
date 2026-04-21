/**
 * MODULE TEMPLATE — InputForm.jsx
 *
 * Renders the data entry table/form. Users can add, edit, and delete rows.
 * Adapt the columns and fields to match your module's schema.
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { emptyRow, TEMPLATE_OPTIONS } from './schema';

export default function InputForm({ rows, setRows }) {
  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const deleteRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Data Entry</h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-dark transition-colors"
        >
          <Plus size={13} /> Add Row
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-text-muted">
          No data yet. Add a row manually or use the AI Assist tab to extract from text.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary text-text-muted text-[11px] uppercase tracking-wider">
                <th className="px-4 py-2 text-left font-semibold">Label</th>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-left font-semibold">Notes</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-4 py-2">
                    <input
                      value={row.label}
                      onChange={e => updateRow(row.id, 'label', e.target.value)}
                      className="w-full bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                      placeholder="Enter label..."
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={row.category}
                      onChange={e => updateRow(row.id, 'category', e.target.value)}
                      className="bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                    >
                      {TEMPLATE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={row.notes}
                      onChange={e => updateRow(row.id, 'notes', e.target.value)}
                      className="w-full bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                      placeholder="Notes..."
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => deleteRow(row.id)} className="text-text-muted hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
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
