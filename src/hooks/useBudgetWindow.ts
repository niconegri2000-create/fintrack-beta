import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { format, startOfMonth, endOfMonth } from "date-fns";

/**
 * Returns the current budget window {start, end} based on budget_settings.
 * - auto reset: 1st of current month → end of current month
 * - manual reset: reset_anchor_date → end of current month
 */
export function useBudgetWindow() {
  const { data: settings, isLoading } = useBudgetSettings();

  const now = new Date();
  const resetMode = settings?.reset_mode ?? "auto";
  const anchor = settings?.reset_anchor_date;

  let windowStart: Date;
  if (resetMode === "manual" && anchor) {
    windowStart = new Date(anchor);
  } else {
    windowStart = startOfMonth(now);
  }

  return {
    start: format(windowStart, "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
    isLoading,
  };
}
