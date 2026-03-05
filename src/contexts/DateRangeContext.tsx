import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

export type PeriodPreset =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "ytd"
  | "all"
  | "custom";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  preset: PeriodPreset;
}

const STORAGE_KEY = "fintrack_date_range";

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Derive a stable key for React Query cache segmentation */
export function dateRangeKey(dr: DateRange): string {
  return `${dr.from}|${dr.to}`;
}

export function presetToRange(preset: Exclude<PeriodPreset, "custom">): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "current_month":
      return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) };
    case "previous_month": {
      const prev = subMonths(today, 1);
      return { from: fmt(startOfMonth(prev)), to: fmt(endOfMonth(prev)) };
    }
    case "last_3_months":
      return { from: fmt(startOfMonth(subMonths(today, 2))), to: fmt(endOfMonth(today)) };
    case "last_6_months":
      return { from: fmt(startOfMonth(subMonths(today, 5))), to: fmt(endOfMonth(today)) };
    case "ytd":
      return { from: fmt(startOfYear(today)), to: fmt(endOfMonth(today)) };
    case "all":
      return { from: "2000-01-01", to: fmt(endOfMonth(today)) };
  }
}

function buildDefault(): DateRange {
  const r = presetToRange("current_month");
  return { ...r, preset: "current_month" as const };
}

function loadFromStorage(): DateRange {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.from && parsed.to && parsed.preset) {
        const fromValid = /^\d{4}-\d{2}-\d{2}$/.test(parsed.from);
        const toValid = /^\d{4}-\d{2}-\d{2}$/.test(parsed.to);
        if (fromValid && toValid && parsed.from <= parsed.to) {
          return parsed as DateRange;
        }
      }
    }
  } catch { /* ignore */ }
  const fallback = buildDefault();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback)); } catch {}
  return fallback;
}

interface DateRangeContextValue {
  dateRange: DateRange;
  dateRangeKey: string;
  isReady: boolean;
  applyPreset: (p: Exclude<PeriodPreset, "custom">) => void;
  applyCustom: (from: string, to: string) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Deterministic init: compute once on mount, then mark ready
  useEffect(() => {
    const loaded = loadFromStorage();
    if (import.meta.env.DEV) console.info(`[BOOT] DateRangeProvider init | from=${loaded.from} | to=${loaded.to} | preset=${loaded.preset}`);
    setDateRange(loaded);
    setIsReady(true);
  }, []);

  // Persist on change (skip initial null)
  useEffect(() => {
    if (dateRange) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
    }
  }, [dateRange]);

  const applyPreset = useCallback((p: Exclude<PeriodPreset, "custom">) => {
    const r = presetToRange(p);
    setDateRange({ ...r, preset: p });
  }, []);

  const applyCustom = useCallback((from: string, to: string) => {
    const safeFrom = from <= to ? from : to;
    const safeTo = from <= to ? to : from;
    setDateRange({ from: safeFrom, to: safeTo, preset: "custom" });
  }, []);

  // Block children until ready
  if (!isReady || !dateRange) {
    return null; // WorkspaceProvider already shows a loader above us
  }

  const drKey = dateRangeKey(dateRange);

  return (
    <DateRangeContext.Provider value={{ dateRange, dateRangeKey: drKey, isReady, applyPreset, applyCustom }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
