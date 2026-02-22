import { useState, useCallback } from "react";

export interface Preferences {
  currency: string;
  firstDayOfWeek: "monday" | "sunday";
  dateFormat: "dd/mm/yyyy" | "mm/dd/yyyy";
  numberFormat: "1.000,00" | "1,000.00";
}

const DEFAULTS: Preferences = {
  currency: "EUR",
  firstDayOfWeek: "monday",
  dateFormat: "dd/mm/yyyy",
  numberFormat: "1.000,00",
};

const STORAGE_KEY = "app_preferences";

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPrefs({ ...DEFAULTS });
  }, []);

  return { prefs, update, reset, DEFAULTS };
}
