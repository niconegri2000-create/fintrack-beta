import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

export type PeriodPreset =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "ytd"
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
  }
}

function loadFromStorage(): DateRange {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.from && parsed.to && parsed.preset) return parsed as DateRange;
    }
  } catch { /* ignore */ }
  const r = presetToRange("current_month");
  return { ...r, preset: "current_month" };
}

interface DateRangeContextValue {
  dateRange: DateRange;
  applyPreset: (p: Exclude<PeriodPreset, "custom">) => void;
  applyCustom: (from: string, to: string) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
  }, [dateRange]);

  const applyPreset = useCallback((p: Exclude<PeriodPreset, "custom">) => {
    const r = presetToRange(p);
    setDateRange({ ...r, preset: p });
  }, []);

  const applyCustom = useCallback((from: string, to: string) => {
    // enforce from <= to
    const safeFrom = from <= to ? from : to;
    const safeTo = from <= to ? to : from;
    setDateRange({ from: safeFrom, to: safeTo, preset: "custom" });
  }, []);

  return (
    <DateRangeContext.Provider value={{ dateRange, applyPreset, applyCustom }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
