/**
 * CHANGE READINESS ASSESSMENT — index.jsx
 *
 * FB-1 scaffold derived from src/modules/_ModuleTemplate/. Subsequent
 * Feature Briefs replace the template-style tabs/state with the Plan /
 * Analyze phase toggle, the wizard, and the dashboard. For FB-1 this
 * file exists only to render an empty module shell when the new entry
 * in src/modules/index.js mounts inside Workspace.
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

export default function ChangeReadinessAssessment({ data, setData, initiative, moduleId }) {
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
          <h2 className="text-xl font-bold text-text-primary">Change Readiness Assessment</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Design your survey instrument, then analyze responses when they come in.
          </p>
        </div>
        {/* Export controls land here in FB-9 / FB-14 */}
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
