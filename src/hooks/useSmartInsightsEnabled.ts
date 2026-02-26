import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "fintrack.smartInsights.enabled";

function read(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

export function useSmartInsightsEnabled() {
  const [enabled, setEnabledRaw] = useState(read);

  useEffect(() => {
    const handler = () => setEnabledRaw(read());
    window.addEventListener("storage", handler);
    const interval = setInterval(() => setEnabledRaw(read()), 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(v));
    setEnabledRaw(v);
  }, []);

  return { enabled, setEnabled };
}
