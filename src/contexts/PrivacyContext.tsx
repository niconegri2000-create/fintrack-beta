import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { EyeOff } from "lucide-react";

interface PrivacyContextValue {
  isPrivacy: boolean;
  setPrivacy: (v: boolean) => void;
  formatAmount: (value: number) => string;
  /** Renders chart or privacy placeholder */
  renderSensitiveChart: (chart: React.ReactNode) => React.ReactNode;
}

const STORAGE_KEY = "account_management_prefs";

function readPrivacy(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.privacyMode === true;
    }
  } catch {}
  return false;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivacy: false,
  setPrivacy: () => {},
  formatAmount: (v) => v.toLocaleString("it-IT", { style: "currency", currency: "EUR" }),
  renderSensitiveChart: (c) => c,
});

function PrivacyPlaceholder() {
  return (
    <div className="h-56 flex flex-col items-center justify-center text-muted-foreground gap-2">
      <EyeOff className="h-8 w-8 opacity-40" />
      <p className="text-sm font-medium">Dati nascosti</p>
      <p className="text-xs">Disattiva Privacy per visualizzare grafici e valori.</p>
    </div>
  );
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacy, setIsPrivacy] = useState(readPrivacy);

  useEffect(() => {
    const handler = () => setIsPrivacy(readPrivacy());
    window.addEventListener("storage", handler);
    const interval = setInterval(() => setIsPrivacy(readPrivacy()), 500);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, []);

  const formatAmount = useCallback(
    (value: number): string => {
      if (isPrivacy) return "••••";
      return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
    },
    [isPrivacy]
  );

  const renderSensitiveChart = useCallback(
    (chart: React.ReactNode): React.ReactNode => {
      if (isPrivacy) return <PrivacyPlaceholder />;
      return chart;
    },
    [isPrivacy]
  );

  const setPrivacy = useCallback((v: boolean) => {
    setIsPrivacy(v);
  }, []);

  return (
    <PrivacyContext.Provider value={{ isPrivacy, setPrivacy, formatAmount, renderSensitiveChart }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
