import { startOfMonth, endOfMonth, format } from "date-fns";
import { useDateRange } from "@/contexts/DateRangeContext";

/**
 * Returns the budget window based on the global date range's "from" month.
 * Budget is always calculated on a monthly basis.
 */
export function useBudgetWindow() {
  const { dateRange } = useDateRange();
  const fromDate = new Date(dateRange.from);
  return {
    start: format(startOfMonth(fromDate), "yyyy-MM-dd"),
    end: format(endOfMonth(fromDate), "yyyy-MM-dd"),
    isLoading: false,
  };
}
