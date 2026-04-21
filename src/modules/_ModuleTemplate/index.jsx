/**
 * MODULE TEMPLATE — index.jsx
 *
 * This is the main entry point for your module. It:
 *   1. Manages module-level state (rows, AI insights, active tab)
 *   2. Persists state to the initiative via setData()
 *   3. Renders tabs and delegates to sub-components
 *
 * To use this template:
 *   1. Copy the _ModuleTemplate folder and rename it (e.g., ResistanceManagement)
 *   2. Update schema.js with your domain-specific constants and AI prompts
 *   3. Adapt InputForm.jsx columns to your data shape
 *   4. Update AIAssist.jsx field mappings
 *   5. Register your module in src/modules/index.js
 *   6. (Optional) Add a summarizer in src/utils/initiativeContext.js
 */
import React, { useState, useEffect } from 'react';
import InputForm from './InputForm';
import AIAssist from './AIAssist';
import { MOCK_DATA } from './schema';
import { Table, Bot, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'data', label: 'Data', icon: Table },
  { id: 'ai', label: 'AI Assist', icon: Bot },
];

export default function ModuleTemplate({ data, setData, initiative, moduleId }) {
  const [rows, setRows] = useState(data?.rows || MOCK_DATA);
  const [aiInsights, setAiInsights] = useState(data?.aiInsights || '');
  const [activeTab, setActiveTab] = useState('data');

  // Persist state changes back to the initiative
  useEffect(() => {
    setData({ rows, aiInsights });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, aiInsights]);

  return (
    <div className="space-y-0 max-w-screen-xl slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Module Name</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Brief description of what this module does.
          </p>
        </div>
        {/* Add export controls here if needed */}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all -mb-px ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.id === 'data' && rows.length > 0 && (
              <span className="ml-1 text-[10px] bg-gray-100 text-text-muted px-1.5 py-0.5 rounded-full font-semibold">
                {rows.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'data' && (
        <div className="space-y-6 fade-in">
          <InputForm rows={rows} setRows={setRows} />
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="fade-in">
          <AIAssist
            rows={rows}
            setRows={setRows}
            aiInsights={aiInsights}
            setAiInsights={setAiInsights}
            initiative={initiative}
            moduleId={moduleId}
          />

          {aiInsights && (
            <div className="mt-6 bg-gradient-to-r from-accent-50 to-blue-50 rounded-xl border border-accent-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">AI Insights</h3>
              </div>
              <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {aiInsights}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
