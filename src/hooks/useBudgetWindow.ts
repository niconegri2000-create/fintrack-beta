import { format, startOfMonth, endOfMonth } from "date-fns";

/**
 * Returns the current budget window {start, end} — always the calendar month.
 * No manual reset logic; budget is purely monthly.
 */
export function useBudgetWindow() {
  const now = new Date();
  return {
    start: format(startOfMonth(now), "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
    isLoading: false,
  };
}
