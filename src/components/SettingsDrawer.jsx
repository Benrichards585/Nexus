import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Key, Check, Eye, EyeOff, Shield, Building2, Lock, Unlock, AlertCircle, Loader2 } from 'lucide-react';

const PROXY_URL = '/api/messages';

export default function SettingsDrawer({ open, onClose }) {
  const { apiKey, setApiKey, proxyAvailable, aiEnabled, passwordRequired, accessGranted, grantAccess, revokeAccess } = useApp();
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI passphrase state
  const [passphrase, setPassphrase] = useState('');
  const [passphraseLoading, setPassphraseLoading] = useState(false);
  const [passphraseError, setPassphraseError] = useState('');
  const [passphraseSuccess, setPassphraseSuccess] = useState(false);

  const handleSave = () => {
    setApiKey(inputKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setInputKey('');
    setApiKey('');
  };

  const handleUnlock = async () => {
    if (!passphrase.trim() || passphraseLoading) return;
    setPassphraseLoading(true);
    setPassphraseError('');
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-password': passphrase,
        },
        body: JSON.stringify({}),
      });
      if (response.status === 401) {
        setPassphraseError('Incorrect passphrase. Contact your OCM Nexus administrator.');
        setPassphraseLoading(false);
        return;
      }
      grantAccess(passphrase);
      setPassphraseSuccess(true);
      setPassphrase('');
      setTimeout(() => setPassphraseSuccess(false), 3000);
    } catch {
      setPassphraseError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPassphraseLoading(false);
    }
  };

  const handleLock = () => {
    revokeAccess();
    setPassphrase('');
    setPassphraseError('');
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col slide-right">
        <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-surface-secondary">
          <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">

            {/* --- AI Access Passphrase --- */}
            {passwordRequired && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-accent-50 rounded-lg flex items-center justify-center">
                    <Lock size={15} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">AI Access</h3>
                    <p className="text-[11px] text-text-muted">
                      Enter the team passphrase to enable AI features
                    </p>
                  </div>
                </div>

                {accessGranted ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-2.5 rounded-lg border border-green-100">
                      <Unlock size={13} />
                      <span className="font-medium">AI features unlocked for this session.</span>
                    </div>
                    <button
                      onClick={handleLock}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border text-text-secondary rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Lock size={12} />
                      Lock AI access
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-700 px-3 py-2.5 rounded-lg border border-amber-100">
                      <Lock size={13} className="mt-0.5 shrink-0" />
                      <span>AI features are locked. Enter the team passphrase below to enable them.</span>
                    </div>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={e => setPassphrase(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                      placeholder="Team passphrase..."
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white"
                    />
                    {passphraseError && (
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{passphraseError}</span>
                      </div>
                    )}
                    {passphraseSuccess && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                        <Check size={12} />
                        <span>AI features unlocked!</span>
                      </div>
                    )}
                    <button
                      onClick={handleUnlock}
                      disabled={passphraseLoading || !passphrase.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {passphraseLoading ? (
                        <><Loader2 size={13} className="animate-spin" /> Verifying...</>
                      ) : (
                        <><Unlock size={13} /> Unlock AI Features</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Divider if both sections are visible */}
            {passwordRequired && <div className="border-t border-border" />}

            {/* AI Status Indicator */}
            {proxyAvailable && (
              <div className="flex items-center gap-2 text-xs bg-accent-50 text-accent px-3 py-2.5 rounded-lg border border-accent/20">
                <Building2 size={13} />
                <span className="font-medium">Organization AI available — no personal API key needed.</span>
              </div>
            )}

            {/* API Key Section — only shown in dev mode (no org proxy) */}
            {!proxyAvailable && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-accent-50 rounded-lg flex items-center justify-center">
                  <Key size={15} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Anthropic API Key</h3>
                  <p className="text-[11px] text-text-muted">Powers AI features across all modules</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={e => setInputKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      saved
                        ? 'bg-green-500 text-white'
                        : 'bg-accent text-white hover:bg-accent-dark'
                    }`}
                  >
                    {saved ? <Check size={14} /> : null}
                    {saved ? 'Saved!' : 'Save Key'}
                  </button>
                  {apiKey && (
                    <button
                      onClick={handleClear}
                      className="px-4 py-2 border border-border text-text-secondary rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-2 text-xs bg-surface-secondary text-text-secondary px-3 py-2.5 rounded-lg border border-border">
                  <Shield size={13} className="mt-0.5 shrink-0" />
                  <span>Your key is stored locally in your browser and never sent to any server other than Anthropic's API.</span>
                </div>
              </div>
            </div>
            )}

            {/* Info Section */}
            <div className="border-t border-border pt-5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">AI Capabilities</h3>
              <div className="space-y-2.5">
                {[
                  { title: 'Impact Analysis', desc: 'Auto-extract change impacts from unstructured notes' },
                  { title: 'Stakeholder Mapping', desc: 'Extract stakeholder data from meeting notes' },
                  { title: 'Smart Insights', desc: 'AI-generated risk profiles and engagement strategies' },
                ].map(item => (
                  <div key={item.title} className={`p-3 rounded-lg border ${aiEnabled ? 'bg-white border-border' : 'bg-gray-50 border-border-light opacity-60'}`}>
                    <div className="text-sm font-medium text-text-primary">{item.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
