import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSummary } from '../api';

const StatusContext = createContext({
  isLive: true,
  lastChecked: null,
  summary: null,
  setBackendStatus: () => {},
  refreshStatus: () => {},
});

export function StatusProvider({ children }) {
  const [isLive, setIsLive] = useState(true);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [summary, setSummary] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      const data = await getSummary();
      setIsLive(true);
      setSummary(data);
      setLastChecked(new Date());
    } catch {
      setIsLive(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const setBackendStatus = useCallback((status) => {
    setIsLive(status);
    setLastChecked(new Date());
  }, []);

  return (
    <StatusContext.Provider
      value={{
        isLive,
        lastChecked,
        summary,
        setBackendStatus,
        refreshStatus: checkStatus,
      }}
    >
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  return useContext(StatusContext);
}

