import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ReportData {
  period: {
    income: number;
    expense: number;
    savings: number;
    savingsRate: number;
  };
  avgMonths: {
    income: number;
    expense: number;
    savings: number;
    monthCount: number;
  };
  compare: {
    income: number;
    expense: number;
    savings: number;
    savingsRate: number;
  };
  diff: {
    savings: number;
    savingsPercent: number; // % change
  };
}

function sumByType(rows: { amount: number; type: string | null }[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amt = Number(r.amount);
    if (r.type === "income") income += amt;
    else if (r.type === "expense") expense += amt;
  }
  return { income, expense };
}

/** Count distinct YYYY-MM in a set of rows */
function countMonths(startDate: string, endDate: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ey, em] = endDate.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

export function useReport(
  range: DateRange,
  compareRange: DateRange,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
) {
  // figure out the earliest date we need
  const earliest = range.startDate < compareRange.startDate ? range.startDate : compareRange.startDate;
  const latest = range.endDate > compareRange.endDate ? range.endDate : compareRange.endDate;

  return useQuery({
    queryKey: ["report", range.startDate, range.endDate, compareRange.startDate, compareRange.endDate, workspaceId],
    queryFn: async (): Promise<ReportData> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount, type")
        .eq("workspace_id", workspaceId)
        .gte("date", earliest)
        .lte("date", latest);

      if (error) throw error;

      const rows = (data ?? []) as { date: string; amount: number; type: string | null }[];

      const periodRows = rows.filter((r) => r.date >= range.startDate && r.date <= range.endDate);
      const compareRows = rows.filter((r) => r.date >= compareRange.startDate && r.date <= compareRange.endDate);

      const pTotals = sumByType(periodRows);
      const cTotals = sumByType(compareRows);

      const pSavings = pTotals.income - pTotals.expense;
      const cSavings = cTotals.income - cTotals.expense;

      const monthCount = Math.max(countMonths(range.startDate, range.endDate), 1);

      return {
        period: {
          income: pTotals.income,
          expense: pTotals.expense,
          savings: pSavings,
          savingsRate: pTotals.income > 0 ? (pSavings / pTotals.income) * 100 : 0,
        },
        avgMonths: {
          income: pTotals.income / monthCount,
          expense: pTotals.expense / monthCount,
          savings: pSavings / monthCount,
          monthCount,
        },
        compare: {
          income: cTotals.income,
          expense: cTotals.expense,
          savings: cSavings,
          savingsRate: cTotals.income > 0 ? (cSavings / cTotals.income) * 100 : 0,
        },
        diff: {
          savings: pSavings - cSavings,
          savingsPercent: cSavings !== 0 ? ((pSavings - cSavings) / Math.abs(cSavings)) * 100 : 0,
        },
      };
    },
  });
}
