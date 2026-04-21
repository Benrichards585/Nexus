import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { moduleRegistry } from '../modules';
import { ChevronRight, BarChart3, Users, AlertTriangle, TrendingUp } from 'lucide-react';

function InitiativeOverview({ initiative }) {
  const impactData = initiative.modules?.['change-impact-assessment'];
  const stakeholderData = initiative.modules?.['stakeholder-analysis'];
  const impactRows = impactData?.rows || [];
  const stakeholderRows = stakeholderData?.rows || [];

  const criticalImpacts = impactRows.filter(r => r.impactLevel === 'Critical' || r.impactLevel === 'High').length;
  const avgReadiness = impactRows.length > 0
    ? (impactRows.reduce((s, r) => s + (r.readiness || 0), 0) / impactRows.length).toFixed(1)
    : '—';
  const highPriStakeholders = stakeholderRows.filter(s => s.priority === 'High').length;
  const resistors = stakeholderRows.filter(s => s.sentiment === 'Resistor' || s.sentiment === 'Skeptic').length;

  return (
    <div className="space-y-6 slide-up">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Change On A Page</h2>
        <p className="text-sm text-text-secondary mt-1">
          Summary view of this initiative's change landscape
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Impacts', value: impactRows.length, icon: BarChart3, color: 'text-accent bg-accent-50' },
          { label: 'High/Critical Risks', value: criticalImpacts, icon: AlertTriangle, color: criticalImpacts > 0 ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50' },
          { label: 'Avg Readiness', value: avgReadiness, icon: TrendingUp, color: 'text-teal bg-emerald-50' },
          { label: 'Stakeholders', value: stakeholderRows.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-muted">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={15} />
              </div>
            </div>
            <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Impact Summary */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-accent" />
            Impact Distribution
          </h3>
          {impactRows.length > 0 ? (
            <div className="space-y-3">
              {['Critical', 'High', 'Medium', 'Low'].map(level => {
                const count = impactRows.filter(r => r.impactLevel === level).length;
                const pct = Math.round((count / impactRows.length) * 100);
                const colors = { Critical: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-yellow-500', Low: 'bg-green-500' };
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-secondary">{level}</span>
                      <span className="text-xs text-text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[level]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No impact data yet. Open the Change Impact Assessment module to begin.</p>
          )}
        </div>

        {/* Stakeholder Summary */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Users size={15} className="text-blue-600" />
            Stakeholder Sentiment
          </h3>
          {stakeholderRows.length > 0 ? (
            <div className="space-y-3">
              {['Champion', 'Supporter', 'Neutral', 'Skeptic', 'Resistor'].map(sentiment => {
                const count = stakeholderRows.filter(s => s.sentiment === sentiment).length;
                const pct = Math.round((count / stakeholderRows.length) * 100);
                const colors = { Champion: 'bg-green-500', Supporter: 'bg-blue-500', Neutral: 'bg-gray-400', Skeptic: 'bg-orange-500', Resistor: 'bg-red-500' };
                return (
                  <div key={sentiment}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-secondary">{sentiment}</span>
                      <span className="text-xs text-text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[sentiment]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No stakeholder data yet. Open the Stakeholder Analysis module to begin.</p>
          )}
        </div>
      </div>

      {/* Key Risks */}
      {(criticalImpacts > 0 || resistors > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} />
            Key Attention Areas
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {criticalImpacts > 0 && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span className="text-amber-900">
                  <strong>{criticalImpacts}</strong> high/critical impact areas require immediate attention
                </span>
              </div>
            )}
            {resistors > 0 && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span className="text-amber-900">
                  <strong>{resistors}</strong> stakeholders showing skepticism or resistance
                </span>
              </div>
            )}
            {highPriStakeholders > 0 && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span className="text-amber-900">
                  <strong>{highPriStakeholders}</strong> high-priority stakeholders need close management
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getInitiative, updateInitiativeModuleData } = useApp();
  const initiative = getInitiative(id);
  const [activeModuleId, setActiveModuleId] = useState('overview');

  if (!initiative) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-muted mb-2">Initiative not found</h2>
          <button onClick={() => navigate('/dashboard')} className="text-accent hover:text-accent-dark font-medium text-sm">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeModule = moduleRegistry.find(m => m.id === activeModuleId);
  const ModuleComponent = activeModule?.component;

  const moduleData = initiative.modules?.[activeModuleId] || null;
  const setModuleData = (data) => {
    updateInitiativeModuleData(id, activeModuleId, data);
  };

  return (
    <div className="flex">
      <Sidebar activeModuleId={activeModuleId} onSelectModule={setActiveModuleId} />
      <div className="flex-1 min-h-[calc(100vh-56px)] overflow-x-hidden bg-surface-secondary">
        {/* Breadcrumb Bar */}
        <div className="border-b border-border bg-white px-6 h-12 flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-text-muted hover:text-text-primary transition-colors text-sm"
          >
            Portfolio
          </button>
          <ChevronRight size={13} className="text-text-muted" />
          <span className="text-sm font-medium text-text-primary truncate max-w-[200px]">{initiative.name}</span>
          {activeModuleId !== 'overview' && activeModule && (
            <>
              <ChevronRight size={13} className="text-text-muted" />
              <span className="text-sm text-accent font-medium">{activeModule.label}</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeModuleId === 'overview' ? (
            <InitiativeOverview initiative={initiative} />
          ) : ModuleComponent ? (
            <ModuleComponent data={moduleData} setData={setModuleData} initiativeId={id} initiative={initiative} moduleId={activeModuleId} />
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>Select a module from the sidebar to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
