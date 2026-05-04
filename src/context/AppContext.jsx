import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkProxyHealth, checkPasswordRequired } from '../utils/aiClient';

const AppContext = createContext();

const STORAGE_KEY = 'ocm-nexus-data';
const API_KEY_STORAGE = 'ocm-nexus-api-key';
const ACCESS_STORAGE_KEY = 'ocm-nexus-access';
const USAGE_STORAGE_KEY = 'ocm-nexus-usage';

// Daily token budget — roughly 10–15 typical AI interactions.
// Edit this number to adjust how many tokens each user gets per day.
export const DAILY_TOKEN_LIMIT = 20000;

// Migrate from old OCM Studio keys if present
function migrateOldStorage() {
  try {
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem('ocm-studio-data')) {
      localStorage.setItem(STORAGE_KEY, localStorage.getItem('ocm-studio-data'));
      localStorage.removeItem('ocm-studio-data');
    }
    if (!localStorage.getItem(API_KEY_STORAGE) && localStorage.getItem('ocm-studio-api-key')) {
      localStorage.setItem(API_KEY_STORAGE, localStorage.getItem('ocm-studio-api-key'));
      localStorage.removeItem('ocm-studio-api-key');
    }
  } catch {}
}
migrateOldStorage();

function loadFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function loadTokenUsage() {
  try {
    const data = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!data) return { date: '', tokensUsed: 0 };
    return JSON.parse(data);
  } catch {
    return { date: '', tokensUsed: 0 };
  }
}

export function AppProvider({ children }) {
  const [initiatives, setInitiatives] = useState(() => loadFromStorage(STORAGE_KEY, []));
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [proxyAvailable, setProxyAvailable] = useState(false);

  // Access gate state
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPasswordState] = useState(
    () => localStorage.getItem(ACCESS_STORAGE_KEY) || ''
  );

  // Daily token budget
  const [tokenUsage, setTokenUsage] = useState(loadTokenUsage);

  // Check proxy availability and whether a password is required on startup
  useEffect(() => {
    async function initAI() {
      const [available, needsPassword] = await Promise.all([
        checkProxyHealth(),
        checkPasswordRequired(),
      ]);
      setProxyAvailable(available);
      setPasswordRequired(needsPassword);

      if (!available || !needsPassword) {
        // No proxy running, or proxy doesn't enforce a password — grant access automatically.
        setAccessGranted(true);
      } else {
        // Proxy requires a password. If the user has one stored, trust it until the first
        // failed API call (which will surface an "Access denied" error in the UI).
        const stored = localStorage.getItem(ACCESS_STORAGE_KEY);
        if (stored) setAccessGranted(true);
      }
    }
    initAI();
  }, []);

  // AI features are enabled if we have a personal key OR the org proxy is available
  const aiEnabled = !!apiKey || proxyAvailable;

  // --- Daily token budget ---
  const today = new Date().toISOString().split('T')[0];
  const tokensUsedToday = tokenUsage.date === today ? tokenUsage.tokensUsed : 0;
  const tokensRemaining = Math.max(0, DAILY_TOKEN_LIMIT - tokensUsedToday);
  // Authenticated users (password holders) bypass the daily budget entirely —
  // the password is already the trust gate. Budget only applies to unauthenticated
  // users relying on a personal API key.
  const canMakeAIRequest = accessGranted || tokensRemaining >= 500;

  /**
   * Record actual token usage returned from the Anthropic API.
   * Called by aiClient.js via the onUsage callback after each successful request.
   */
  const recordUsage = useCallback((inputTokens, outputTokens) => {
    setTokenUsage(prev => {
      const currentDate = new Date().toISOString().split('T')[0];
      // Reset counter if it's a new day
      const base = prev.date === currentDate
        ? prev
        : { date: currentDate, tokensUsed: 0 };
      const updated = { ...base, tokensUsed: base.tokensUsed + inputTokens + outputTokens };
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /** Store a validated passphrase and mark the user as having access. */
  const grantAccess = useCallback((password) => {
    localStorage.setItem(ACCESS_STORAGE_KEY, password);
    setAccessPasswordState(password);
    setAccessGranted(true);
  }, []);

  /** Clear the stored passphrase (e.g. after an auth failure). */
  const revokeAccess = useCallback(() => {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
    setAccessPasswordState('');
    setAccessGranted(false);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initiatives));
  }, [initiatives]);

  const setApiKey = (key) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  };

  const createInitiative = (name, description) => {
    const initiative = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: new Date().toISOString(),
      modules: {},
    };
    setInitiatives(prev => [...prev, initiative]);
    return initiative.id;
  };

  const updateInitiativeModuleData = (initiativeId, moduleId, data) => {
    setInitiatives(prev => prev.map(i => {
      if (i.id !== initiativeId) return i;
      return { ...i, modules: { ...i.modules, [moduleId]: data } };
    }));
  };

  const deleteInitiative = (id) => {
    setInitiatives(prev => prev.filter(i => i.id !== id));
  };

  const getInitiative = (id) => initiatives.find(i => i.id === id);

  return (
    <AppContext.Provider value={{
      // Core data
      initiatives,
      apiKey,
      setApiKey,
      proxyAvailable,
      aiEnabled,
      createInitiative,
      updateInitiativeModuleData,
      deleteInitiative,
      getInitiative,
      // Access gate
      passwordRequired,
      accessGranted,
      accessPassword,
      grantAccess,
      revokeAccess,
      // Token budget
      tokensRemaining,
      tokensUsedToday,
      canMakeAIRequest,
      recordUsage,
      DAILY_TOKEN_LIMIT,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
