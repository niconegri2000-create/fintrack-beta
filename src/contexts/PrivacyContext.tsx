import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface PrivacyContextValue {
  isPrivacy: boolean;
  setPrivacy: (v: boolean) => void;
  formatAmount: (value: number) => string;
}

const STORAGE_KEY = "account_management_prefs";

function readPrivacy(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.balanceMode === "hidden";
    }
  } catch {}
  return false;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivacy: false,
  setPrivacy: () => {},
  formatAmount: (v) => v.toLocaleString("it-IT", { style: "currency", currency: "EUR" }),
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacy, setIsPrivacy] = useState(readPrivacy);

  // Listen for storage changes from the settings page
  useEffect(() => {
    const handler = () => setIsPrivacy(readPrivacy());
    window.addEventListener("storage", handler);
    // Also poll for same-tab changes
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

  const setPrivacy = useCallback((v: boolean) => {
    setIsPrivacy(v);
  }, []);

  return (
    <PrivacyContext.Provider value={{ isPrivacy, setPrivacy, formatAmount }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
