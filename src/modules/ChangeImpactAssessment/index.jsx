import React, { useState, useRef, useEffect } from 'react';
import InputForm from './InputForm';
import AIAssist from './AIAssist';
import Visualization from './Visualization';
import ExportControls from './ExportControls';
import { MOCK_DATA } from './schema';
import { Sparkles, Table, BarChart3, Bot } from 'lucide-react';

const TABS = [
  { id: 'data', label: 'Data Entry', icon: Table },
  { id: 'heatmap', label: 'Heatmap', icon: BarChart3 },
  { id: 'ai', label: 'AI Assist', icon: Bot },
];

export default function ChangeImpactAssessment({ data, setData, initiative, moduleId }) {
  const [rows, setRows] = useState(data?.rows || MOCK_DATA);
  const [aiInsights, setAiInsights] = useState(data?.aiInsights || '');
  const [activeTab, setActiveTab] = useState('data');
  const vizRef = useRef(null);

  useEffect(() => {
    setData({ rows, aiInsights });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, aiInsights]);

  return (
    <div className="space-y-0 max-w-screen-xl slide-up">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Change Impact Assessment</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Assess how changes impact different parts of your organization
          </p>
        </div>
        <ExportControls rows={rows} aiInsights={aiInsights} vizRef={vizRef} />
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
          {rows.length > 0 && (
            <div ref={vizRef}>
              <Visualization rows={rows} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="fade-in">
          {rows.length > 0 ? (
            <div ref={activeTab === 'heatmap' ? vizRef : undefined}>
              <Visualization rows={rows} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-12 text-center">
              <BarChart3 size={32} className="text-text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-text-muted">Add impact data in the Data Entry tab to generate the heatmap.</p>
            </div>
          )}

          {aiInsights && (
            <div className="mt-6 bg-gradient-to-r from-accent-50 to-blue-50 rounded-xl border border-accent-100 p-5 fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">AI Insights</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{aiInsights}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="fade-in">
          <AIAssist rows={rows} setRows={setRows} aiInsights={aiInsights} setAiInsights={setAiInsights} initiative={initiative} moduleId={moduleId} />
          {aiInsights && (
            <div className="mt-6 bg-gradient-to-r from-accent-50 to-blue-50 rounded-xl border border-accent-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">AI Insights</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{aiInsights}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
