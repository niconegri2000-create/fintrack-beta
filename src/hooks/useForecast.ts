import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { useRecurringSyncReady } from "@/contexts/RecurringSyncContext";

export interface ForecastMonth {
  month: string; label: string; income: number; expense: number; balance: number; warnings: string[];
}
export type ForecastGranularity = "monthly" | "yearly";
export interface ForecastResult { data: ForecastMonth[]; granularity: ForecastGranularity; }

const MONTH_LABELS: Record<string, string> = {
  "01": "Gen", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mag", "06": "Giu", "07": "Lug", "08": "Ago",
  "09": "Set", "10": "Ott", "11": "Nov", "12": "Dic",
};

export function useForecast(baseMonth: string, horizonMonths: number = 6, accountId: string | null = null, openingBalance: number = 0) {
  const workspaceId = useWorkspaceId();
  const syncReady = useRecurringSyncReady();
  return useQuery({
    queryKey: ["forecast", baseMonth, horizonMonths, accountId, openingBalance, workspaceId],
    enabled: syncReady,
    queryFn: async (): Promise<ForecastResult> => {
      const [baseY, baseM] = baseMonth.split("-").map(Number);
      const lastDay = new Date(baseY, baseM, 0).getDate();
      const endDate = `${baseMonth}-${String(lastDay).padStart(2, "0")}`;

      // Fetch ALL transactions up to end of base month to compute real cumulative balance
      let txQ = supabase.from("transactions").select("amount, type")
        .eq("workspace_id", workspaceId).lte("date", endDate);
      if (accountId) txQ = txQ.eq("account_id", accountId);
      const { data: txns, error: tErr } = await txQ;
      if (tErr) throw tErr;

      let baseIncome = 0, baseExpense = 0;
      for (const t of txns ?? []) {
        if (t.type === "transfer_in" || t.type === "transfer_out") continue;
        const amt = Number(t.amount);
        if (t.type === "income") baseIncome += amt; else baseExpense += amt;
      }

      let rulesQ = supabase.from("recurring_rules")
        .select("id, name, type, amount, category_id, day_of_month, start_date, interval_months, end_date, category:categories(name, is_active)")
        .eq("workspace_id", workspaceId).eq("is_active", true);
      if (accountId) rulesQ = rulesQ.eq("account_id", accountId);
      const { data: rules, error: rErr } = await rulesQ;
      if (rErr) throw rErr;

      const monthlyResults: ForecastMonth[] = [];
      for (let offset = 0; offset <= horizonMonths; offset++) {
        const totalMonths = (baseY * 12 + (baseM - 1)) + offset;
        const y = Math.floor(totalMonths / 12);
        const m = (totalMonths % 12) + 1;
        const mm = String(m).padStart(2, "0");
        const monthKey = `${y}-${mm}`;
        const label = `${MONTH_LABELS[mm]} ${String(y).slice(2)}`;

        if (offset === 0) { monthlyResults.push({ month: monthKey, label, income: baseIncome, expense: baseExpense, balance: openingBalance + baseIncome - baseExpense, warnings: [] }); continue; }

        let income = 0, expense = 0;
        const warnings: string[] = [];
        for (const r of rules ?? []) {
          const cat = r.category as any;
          if (r.category_id && cat && cat.is_active === false) { warnings.push(r.name || "Senza nome"); continue; }
          const forecastMonthStart = `${y}-${mm}-01`;
          if ((r as any).end_date && (r as any).end_date < forecastMonthStart) continue;
          const sd = new Date(r.start_date);
          const monthsDiff = (y - sd.getFullYear()) * 12 + (m - 1 - sd.getMonth());
          if (monthsDiff < 0) continue;
          const interval = r.interval_months || 1;
          if (monthsDiff % interval !== 0) continue;
          const amt = Number(r.amount);
          if (r.type === "income") income += amt; else expense += amt;
        }
        monthlyResults.push({ month: monthKey, label, income, expense, balance: income - expense, warnings: [...new Set(warnings)] });
      }

      let cumulative = openingBalance;
      for (const fm of monthlyResults) { cumulative += fm.balance; fm.balance = cumulative; }

      const granularity: ForecastGranularity = horizonMonths > 24 ? "yearly" : "monthly";
      if (granularity === "monthly") return { data: monthlyResults, granularity };

      const yearMap = new Map<string, { income: number; expense: number; balance: number; warnings: string[] }>();
      for (const fm of monthlyResults) {
        const year = fm.month.slice(0, 4);
        const entry = yearMap.get(year);
        if (entry) { entry.income += fm.income; entry.expense += fm.expense; entry.balance = fm.balance; entry.warnings.push(...fm.warnings); }
        else yearMap.set(year, { income: fm.income, expense: fm.expense, balance: fm.balance, warnings: [...fm.warnings] });
      }
      const yearlyResults: ForecastMonth[] = [];
      for (const [year, v] of yearMap) yearlyResults.push({ month: year, label: year, income: v.income, expense: v.expense, balance: v.balance, warnings: [...new Set(v.warnings)] });
      return { data: yearlyResults, granularity };
    },
  });
}
