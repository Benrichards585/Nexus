import React, { useState } from 'react';
import { Lock, Loader2, AlertCircle, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CognizantLogo from './CognizantLogo';

const PROXY_URL = '/api/messages';

/**
 * Full-screen access gate shown when the server requires a passphrase.
 *
 * Renders as a fixed overlay on top of the app. Disappears once the user
 * enters a valid passphrase (validated against the Azure Function).
 *
 * The gate only activates when:
 *   1. The proxy is available (deployed to Azure), AND
 *   2. APP_ACCESS_PASSWORD is set in Azure Application Settings
 *
 * During local development (no proxy), or before APP_ACCESS_PASSWORD is
 * configured, the gate is never shown.
 */
export default function AccessGate() {
  const { passwordRequired, accessGranted, grantAccess } = useApp();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only render when proxy requires a password and user hasn't entered it yet
  if (!passwordRequired || accessGranted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      // Validate by pinging the API function with the candidate password.
      // 401 → wrong password. Any other JSON response → auth passed.
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-password': password,
        },
        body: JSON.stringify({}),
      });

      if (response.status === 401) {
        setError('Incorrect passphrase. Contact your OCM Nexus administrator for access.');
        setLoading(false);
        return;
      }

      // Any other status means auth passed (400 = missing fields, 500 = no API key configured)
      grantAccess(password);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: '#1a1f36' }}
    >
      {/* Radial glow — matches splash page aesthetic */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm mx-6">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CognizantLogo variant="white" height={24} />
            <div className="w-px h-5 bg-white/20" />
            <span className="text-white font-bold text-lg tracking-tight">OCM Nexus</span>
          </div>
          <p className="text-white/30 text-xs">Internal use only · Cognizant OCM Practice</p>
        </div>

        {/* Gate card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Lock icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-xl mx-auto mb-5"
            style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Lock size={22} className="text-accent-light" />
          </div>

          <h2 className="text-white text-center text-lg font-semibold mb-1">Access Required</h2>
          <p className="text-center text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Enter your team passphrase to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter passphrase..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm
                         focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onFocus={e => {
                e.target.style.border = '1px solid rgba(99,102,241,0.6)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
              }}
              onBlur={e => {
                e.target.style.border = '1px solid rgba(255,255,255,0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />

            {error && (
              <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5"
                style={{
                  color: '#f87171',
                  background: 'rgba(248,113,113,0.10)',
                  border: '1px solid rgba(248,113,113,0.20)',
                }}>
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-white font-semibold
                         rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield size={15} />
                  Enter OCM Nexus
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] mt-6" style={{ color: 'rgba(255,255,255,0.20)' }}>
          Need access? Contact your OCM Nexus administrator.
        </p>
      </div>
    </div>
  );
}
