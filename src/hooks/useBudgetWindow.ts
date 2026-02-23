import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { format, startOfMonth, endOfMonth } from "date-fns";

/**
 * Returns the current budget window {start, end} based on budget_settings.
 * - auto: 1st of current month → end of current month (ignores anchor)
 * - manual: max(1st of month, reset_anchor_date) → end of current month
 */
export function useBudgetWindow() {
  const { data: settings, isLoading } = useBudgetSettings();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const resetMode = settings?.reset_mode ?? "auto";
  const anchor = settings?.reset_anchor_date;

  let windowStart: Date;
  if (resetMode === "manual" && anchor) {
    const anchorDate = new Date(anchor);
    // Use the later of: 1st of month or anchor date
    windowStart = anchorDate > monthStart ? anchorDate : monthStart;
  } else {
    windowStart = monthStart;
  }

  return {
    start: format(windowStart, "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
    isLoading,
  };
}
