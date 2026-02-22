import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface ReportData {
  currentMonth: {
    income: number;
    expense: number;
    savings: number;
    savingsRate: number;
  };
  avg3Months: {
    income: number;
    expense: number;
    savings: number;
  };
  comparison: {
    prevSavings: number;
    diff: number;
  };
}

function monthRange(offset: number): { start: string; end: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
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

export function useReport(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const cur = monthRange(0);
  const prev = monthRange(-1);
  const threeAgo = monthRange(-2);

  return useQuery({
    queryKey: ["report", workspaceId],
    queryFn: async (): Promise<ReportData> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount, type")
        .eq("workspace_id", workspaceId)
        .gte("date", threeAgo.start)
        .lte("date", cur.end);

      if (error) throw error;

      const rows = (data ?? []) as { date: string; amount: number; type: string | null }[];

      const curRows = rows.filter((r) => r.date >= cur.start && r.date <= cur.end);
      const prevRows = rows.filter((r) => r.date >= prev.start && r.date <= prev.end);
      const threeMonthRows = rows.filter((r) => r.date >= threeAgo.start && r.date <= cur.end);

      const curTotals = sumByType(curRows);
      const prevTotals = sumByType(prevRows);

      // Split 3-month rows by month for proper averaging
      const months = new Set<string>();
      for (const r of threeMonthRows) months.add(r.date.slice(0, 7));
      const monthCount = Math.max(months.size, 1);

      const threeTotals = sumByType(threeMonthRows);

      const curSavings = curTotals.income - curTotals.expense;
      const prevSavings = prevTotals.income - prevTotals.expense;

      return {
        currentMonth: {
          income: curTotals.income,
          expense: curTotals.expense,
          savings: curSavings,
          savingsRate: curTotals.income > 0 ? (curSavings / curTotals.income) * 100 : 0,
        },
        avg3Months: {
          income: threeTotals.income / monthCount,
          expense: threeTotals.expense / monthCount,
          savings: (threeTotals.income - threeTotals.expense) / monthCount,
        },
        comparison: {
          prevSavings,
          diff: curSavings - prevSavings,
        },
      };
    },
  });
}
