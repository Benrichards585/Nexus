import React from 'react';
import { moduleRegistry } from '../modules';
import { LayoutDashboard, ChevronRight } from 'lucide-react';
import CognizantLogo from './CognizantLogo';

export default function Sidebar({ activeModuleId, onSelectModule }) {
  const activeModules = moduleRegistry.filter(m => m.status === 'active');
  const comingSoonModules = moduleRegistry.filter(m => m.status === 'coming-soon');

  return (
    <nav className="w-60 bg-white border-r border-border min-h-[calc(100vh-56px)] flex flex-col">
      {/* Initiative Overview */}
      <div className="p-3">
        <button
          onClick={() => onSelectModule('overview')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModuleId === 'overview'
              ? 'bg-accent-50 text-accent font-semibold'
              : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
          }`}
        >
          <LayoutDashboard size={16} />
          <span>Overview</span>
        </button>
      </div>

      <div className="px-3 mb-1">
        <div className="border-t border-border" />
      </div>

      {/* Active Modules */}
      <div className="p-3 pt-2">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-2">
          Modules
        </p>
        <div className="space-y-0.5">
          {activeModules.map(mod => {
            const isActive = activeModuleId === mod.id;
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                  isActive
                    ? 'bg-accent-50 text-accent font-semibold'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-accent' : ''} />
                <span className="flex-1 truncate">{mod.label}</span>
                {isActive && <ChevronRight size={14} className="text-accent/50" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Coming Soon */}
      {comingSoonModules.length > 0 && (
        <div className="p-3 pt-1">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-2">
            Coming Soon
          </p>
          <div className="space-y-0.5">
            {comingSoonModules.map(mod => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-muted/50 cursor-not-allowed"
                >
                  <Icon size={16} />
                  <span className="flex-1 truncate">{mod.label}</span>
                  <span className="text-[9px] bg-gray-100 text-text-muted px-1.5 py-0.5 rounded-md font-medium">
                    Soon
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom branding */}
      <div className="mt-auto p-4 border-t border-border">
        <CognizantLogo variant="dark" height={14} className="mb-1.5 opacity-60" />
        <div className="text-[10px] text-text-muted">
          <span className="font-semibold">OCM Nexus</span> v1.5
        </div>
      </div>
    </nav>
  );
}
