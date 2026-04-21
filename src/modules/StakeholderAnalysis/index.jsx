import React, { useState, useRef, useEffect } from 'react';
import InputForm from './InputForm';
import AIAssist from './AIAssist';
import Visualization from './Visualization';
import ExportControls from './ExportControls';
import { MOCK_STAKEHOLDERS } from './schema';
import { Sparkles, Table, Grid3X3, Bot } from 'lucide-react';

const TABS = [
  { id: 'data', label: 'Stakeholder Data', icon: Table },
  { id: 'matrix', label: 'Power/Interest Matrix', icon: Grid3X3 },
  { id: 'ai', label: 'AI Assist', icon: Bot },
];

export default function StakeholderAnalysis({ data, setData, initiative, moduleId }) {
  const [rows, setRows] = useState(data?.rows || MOCK_STAKEHOLDERS);
  const [aiRecommendations, setAiRecommendations] = useState(data?.aiRecommendations || '');
  const [activeTab, setActiveTab] = useState('data');
  const vizRef = useRef(null);
  const matrixRef = useRef(null);

  useEffect(() => {
    setData({ rows, aiRecommendations });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, aiRecommendations]);

  return (
    <div className="space-y-0 max-w-screen-xl slide-up">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Stakeholder Analysis</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Map stakeholders by influence, interest, and sentiment to prioritize engagement
          </p>
        </div>
        <ExportControls rows={rows} aiRecommendations={aiRecommendations} vizRef={vizRef} matrixRef={matrixRef} />
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
              <Visualization rows={rows} matrixRef={matrixRef} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="fade-in">
          {rows.length > 0 ? (
            <div ref={activeTab === 'matrix' ? vizRef : undefined}>
              <Visualization rows={rows} matrixRef={matrixRef} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-12 text-center">
              <Grid3X3 size={32} className="text-text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-text-muted">Add stakeholders in the Data tab to generate the matrix.</p>
            </div>
          )}

          {aiRecommendations && (
            <div className="mt-6 bg-gradient-to-r from-accent-50 to-blue-50 rounded-xl border border-accent-100 p-5 fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">AI Engagement Recommendations</h3>
              </div>
              <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{aiRecommendations}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="fade-in">
          <AIAssist rows={rows} setRows={setRows} aiRecommendations={aiRecommendations} setAiRecommendations={setAiRecommendations} initiative={initiative} moduleId={moduleId} />
          {aiRecommendations && (
            <div className="mt-6 bg-gradient-to-r from-accent-50 to-blue-50 rounded-xl border border-accent-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">AI Engagement Recommendations</h3>
              </div>
              <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{aiRecommendations}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
