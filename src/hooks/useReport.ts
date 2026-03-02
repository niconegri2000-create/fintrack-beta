import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

export interface DateRange { startDate: string; endDate: string; }

export interface ReportData {
  period: { income: number; expense: number; savings: number; savingsRate: number; };
  avgMonths: { income: number; expense: number; savings: number; monthCount: number; };
  compare: { income: number; expense: number; savings: number; savingsRate: number; } | null;
  diff: { savings: number; savingsPercent: number; } | null;
}

function sumByType(rows: { amount: number; type: string | null }[]) {
  let income = 0, expense = 0;
  for (const r of rows) { const amt = Number(r.amount); if (r.type === "income") income += amt; else if (r.type === "expense") expense += amt; }
  return { income, expense };
}

function countMonths(startDate: string, endDate: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ey, em] = endDate.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

export function useReport(range: DateRange, compareRange: DateRange | null, accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["report", range.startDate, range.endDate, compareRange?.startDate ?? null, compareRange?.endDate ?? null, accountId, workspaceId],
    queryFn: async (): Promise<ReportData> => {
      let earliest = range.startDate, latest = range.endDate;
      if (compareRange) {
        if (compareRange.startDate < earliest) earliest = compareRange.startDate;
        if (compareRange.endDate > latest) latest = compareRange.endDate;
      }
      let q = supabase.from("transactions").select("date, amount, type").eq("workspace_id", workspaceId).gte("date", earliest).lte("date", latest);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as { date: string; amount: number; type: string | null }[];
      const periodRows = rows.filter((r) => r.date >= range.startDate && r.date <= range.endDate);
      const pTotals = sumByType(periodRows);
      const pSavings = pTotals.income - pTotals.expense;
      const monthCount = Math.max(countMonths(range.startDate, range.endDate), 1);
      let compare: ReportData["compare"] = null;
      let diff: ReportData["diff"] = null;
      if (compareRange) {
        const compareRows = rows.filter((r) => r.date >= compareRange.startDate && r.date <= compareRange.endDate);
        const cTotals = sumByType(compareRows);
        const cSavings = cTotals.income - cTotals.expense;
        compare = { income: cTotals.income, expense: cTotals.expense, savings: cSavings, savingsRate: cTotals.income > 0 ? (cSavings / cTotals.income) * 100 : 0 };
        diff = { savings: pSavings - cSavings, savingsPercent: cSavings !== 0 ? ((pSavings - cSavings) / Math.abs(cSavings)) * 100 : 0 };
      }
      return {
        period: { income: pTotals.income, expense: pTotals.expense, savings: pSavings, savingsRate: pTotals.income > 0 ? (pSavings / pTotals.income) * 100 : 0 },
        avgMonths: { income: pTotals.income / monthCount, expense: pTotals.expense / monthCount, savings: pSavings / monthCount, monthCount },
        compare, diff,
      };
    },
  });
}
