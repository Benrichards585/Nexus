import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Rocket, ChevronRight, Info, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CognizantLogo from '../components/CognizantLogo';

// System announcements — edit this array to show updates to users
const ANNOUNCEMENTS = [
  {
    id: 'welcome-v1',
    type: 'info',
    title: 'Welcome to OCM Nexus',
    message: 'Your AI-powered organizational change management toolkit. Create an initiative to get started.',
    date: '2026-04-14',
  },
  {
    id: 'modules-v1',
    type: 'new',
    title: '4 Modules Now Available',
    message: 'Change Impact Assessment, Stakeholder Analysis, Communications Generator, and Training Generator are ready to use.',
    date: '2026-04-14',
  },
];

// Progress tracker — edit these arrays to update the public roadmap
const PROGRESS = {
  completed: [
    'Change Impact Assessment Module',
    'Stakeholder Analysis Module',
    'Splash Page',
  ],
  inProgress: [
    'Cloud Hosting',
    'SSO',
    'Agentic Testing',
  ],
  backlog: [
    'AI Initialization Module',
    'Change Readiness Assessment',
    'RL Generator',
  ],
};

const TYPE_STYLES = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  update: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  new: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const TYPE_LABELS = {
  info: 'Info',
  update: 'Update',
  new: 'New',
};

export default function Welcome() {
  const navigate = useNavigate();
  const { initiatives, aiEnabled } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasInitiatives = initiatives.length > 0;
  const totalItems = PROGRESS.completed.length + PROGRESS.inProgress.length + PROGRESS.backlog.length;

  return (
    <div className="min-h-screen bg-navy relative overflow-hidden">
      {/* Background — subtle starfield effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-navy via-navy to-[#0f1225]" />
        {/* Subtle radial glow behind mascot area */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#0498B7]/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CognizantLogo variant="white" height={24} />
          <div className="w-px h-5 bg-white/20" />
          <span className="text-sm font-semibold text-white/80 tracking-tight">OCM Nexus</span>
        </div>
        {aiEnabled && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-medium text-accent-light">AI Connected</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-12 pt-4 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-160px)]">

          {/* Left: Mascot + Hero */}
          <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Mascot Image — left-aligned to match text block */}
            <div className="relative mb-6">
              <img
                src="/assets/nexus-mascot.png"
                alt="OCM Nexus Navigator"
                className="w-full max-w-2xl drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 40px rgba(99, 102, 241, 0.15))' }}
              />
            </div>

            {/* App title between mascot and tagline */}
            <div className="text-center lg:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0498B7] via-accent to-[#818cf8]">
                  OCM Nexus
                </span>
              </h2>

              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                Navigate Change.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#0498B7]">
                  Drive Results.
                </span>
              </h1>
              <p className="text-base text-white/60 max-w-lg leading-relaxed">
                Your ride into the future of OCM. An AI-powered Change Management platform built by
                Change Practitioners, for Change Practitioners. Nexus is a modular Change Management
                tool built to support everything from stakeholder mapping to training
                generation — enabled by sophisticated agentic AI models.
              </p>
            </div>
          </div>

          {/* Right: Action Panel */}
          <div className={`space-y-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Primary CTA Card */}
            <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-2">
                <Rocket size={18} className="text-accent" />
                <h2 className="text-lg font-bold text-white">Get Started</h2>
              </div>
              <p className="text-sm text-white/50 mb-6">
                {hasInitiatives
                  ? `You have ${initiatives.length} active initiative${initiatives.length > 1 ? 's' : ''}. Continue where you left off or start fresh.`
                  : 'Create your first change initiative to begin using the toolkit.'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-accent to-accent-dark text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-accent/20 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    {hasInitiatives ? 'Open My Portfolio' : 'Create New Initiative'}
                  </span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {hasInitiatives && initiatives.slice(0, 2).map(init => (
                  <button
                    key={init.id}
                    onClick={() => navigate(`/initiative/${init.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.04] border border-white/10 text-white/80 rounded-xl text-sm hover:bg-white/[0.08] hover:border-white/20 transition-all group"
                  >
                    <span className="truncate">{init.name}</span>
                    <ChevronRight size={16} className="text-white/30 group-hover:text-accent shrink-0 transition-colors" />
                  </button>
                ))}
                {hasInitiatives && initiatives.length > 2 && (
                  <p className="text-xs text-white/30 text-center pt-1">
                    +{initiatives.length - 2} more in your portfolio
                  </p>
                )}
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <ListTodo size={14} className="text-accent" />
                  Development Progress
                </h3>
                <span className="text-[11px] text-white/30">{totalItems} items</span>
              </div>

              {/* Progress table */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-3 bg-white/[0.06]">
                  <div className="px-3 py-2 flex items-center gap-1.5 border-r border-white/5">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Completed</span>
                  </div>
                  <div className="px-3 py-2 flex items-center gap-1.5 border-r border-white/5">
                    <Clock size={12} className="text-amber-400" />
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">In Progress</span>
                  </div>
                  <div className="px-3 py-2 flex items-center gap-1.5">
                    <ListTodo size={12} className="text-white/40" />
                    <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Backlog</span>
                  </div>
                </div>

                {/* Data rows */}
                <div className="grid grid-cols-3 divide-x divide-white/5">
                  <div className="p-3 space-y-2">
                    {PROGRESS.completed.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={11} className="text-emerald-400/60 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-white/50 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 space-y-2">
                    {PROGRESS.inProgress.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Clock size={11} className="text-amber-400/60 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-white/50 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 space-y-2">
                    {PROGRESS.backlog.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-[11px] h-[11px] rounded-full border border-white/20 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-white/40 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* System Announcements */}
            {ANNOUNCEMENTS.length > 0 && (
              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={14} className="text-white/40" />
                  <h3 className="text-sm font-semibold text-white/80">Updates</h3>
                </div>
                <div className="space-y-3">
                  {ANNOUNCEMENTS.map(a => (
                    <div key={a.id} className="flex items-start gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 mt-0.5 ${TYPE_STYLES[a.type]}`}>
                        {TYPE_LABELS[a.type]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-white/70 font-medium">{a.title}</p>
                        <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-8 py-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CognizantLogo variant="white" height={16} />
            <span className="text-[11px] text-white/30">OCM Nexus v1.5</span>
          </div>
          <span className="text-[11px] text-white/20">Organizational Change Management Toolkit</span>
        </div>
      </div>
    </div>
  );
}
