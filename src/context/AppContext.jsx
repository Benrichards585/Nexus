import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkProxyHealth } from '../utils/aiClient';

const AppContext = createContext();

const STORAGE_KEY = 'ocm-nexus-data';
const API_KEY_STORAGE = 'ocm-nexus-api-key';

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

export function AppProvider({ children }) {
  const [initiatives, setInitiatives] = useState(() => loadFromStorage(STORAGE_KEY, []));
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [proxyAvailable, setProxyAvailable] = useState(false);

  // Check if the server-side API proxy is available on startup
  useEffect(() => {
    checkProxyHealth().then(setProxyAvailable);
  }, []);

  // AI features are enabled if we have a personal key OR the org proxy is available
  const aiEnabled = !!apiKey || proxyAvailable;

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
      initiatives,
      apiKey,
      setApiKey,
      proxyAvailable,
      aiEnabled,
      createInitiative,
      updateInitiativeModuleData,
      deleteInitiative,
      getInitiative,
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
