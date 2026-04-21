import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, LayoutDashboard, Home } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SettingsDrawer from './SettingsDrawer';
import CognizantLogo from './CognizantLogo';

export default function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { aiEnabled } = useApp();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <>
      <header className="bg-navy text-white relative z-30">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <CognizantLogo variant="white" height={28} />
              <div className="w-px h-6 bg-white/20" />
              <span className="text-base font-bold tracking-tight">OCM Nexus</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/10 rounded-md transition-colors">
                <Home size={14} />
                Home
              </Link>
              <Link to="/dashboard" className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isDashboard ? 'text-white/90 bg-white/10' : 'text-white/60 hover:text-white/90 hover:bg-white/10'}`}>
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {aiEnabled && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 rounded-full mr-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[11px] font-medium text-accent-light">AI Connected</span>
              </div>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
