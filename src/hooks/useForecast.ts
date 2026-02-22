import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface ForecastMonth {
  month: string; // YYYY-MM
  label: string;
  income: number;
  expense: number;
  balance: number;
  warnings: string[]; // skipped rules (inactive category)
}

/**
 * 6-month forward forecast based on:
 * - current month real transactions as baseline (month 0)
 * - active recurring_rules projected for months 1-6
 * Respects interval_months and skips rules with inactive categories.
 */
export function useForecast(baseMonth: string) {
  return useQuery({
    queryKey: ["forecast", baseMonth],
    queryFn: async (): Promise<ForecastMonth[]> => {
      const [baseY, baseM] = baseMonth.split("-").map(Number);

      // 1. Fetch current month transactions for baseline
      const startDate = `${baseMonth}-01`;
      const lastDay = new Date(baseY, baseM, 0).getDate();
      const endDate = `${baseMonth}-${String(lastDay).padStart(2, "0")}`;

      const { data: txns, error: tErr } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .gte("date", startDate)
        .lte("date", endDate);
      if (tErr) throw tErr;

      let baseIncome = 0;
      let baseExpense = 0;
      for (const t of txns ?? []) {
        const amt = Number(t.amount);
        if (t.type === "income") baseIncome += amt;
        else baseExpense += amt;
      }

      // 2. Fetch active recurring rules with category info
      const { data: rules, error: rErr } = await supabase
        .from("recurring_rules")
        .select("id, name, type, amount, category_id, day_of_month, start_date, interval_months, end_date, category:categories(name, is_active)")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .eq("is_active", true);
      if (rErr) throw rErr;

      // 3. Build forecast months (0 = current, 1-6 = future)
      const MONTH_LABELS: Record<string, string> = {
        "01": "Gen", "02": "Feb", "03": "Mar", "04": "Apr",
        "05": "Mag", "06": "Giu", "07": "Lug", "08": "Ago",
        "09": "Set", "10": "Ott", "11": "Nov", "12": "Dic",
      };

      const results: ForecastMonth[] = [];

      for (let offset = 0; offset <= 6; offset++) {
        const totalMonths = (baseY * 12 + (baseM - 1)) + offset;
        const y = Math.floor(totalMonths / 12);
        const m = (totalMonths % 12) + 1;
        const mm = String(m).padStart(2, "0");
        const monthKey = `${y}-${mm}`;
        const label = `${MONTH_LABELS[mm]} ${String(y).slice(2)}`;

        if (offset === 0) {
          // baseline from real data
          results.push({
            month: monthKey,
            label,
            income: baseIncome,
            expense: baseExpense,
            balance: baseIncome - baseExpense,
            warnings: [],
          });
          continue;
        }

        // Project recurring rules for this month
        let income = 0;
        let expense = 0;
        const warnings: string[] = [];

        for (const r of rules ?? []) {
          const cat = r.category as any;
          // Skip if category is inactive
          if (r.category_id && cat && cat.is_active === false) {
            warnings.push(r.name || "Senza nome");
            continue;
          }

          // Check end_date: skip if rule ended before this month
          const forecastMonthStart = `${y}-${mm}-01`;
          if ((r as any).end_date && (r as any).end_date < forecastMonthStart) continue;

          // Check interval_months alignment
          const sd = new Date(r.start_date);
          const startYear = sd.getFullYear();
          const startMonth = sd.getMonth(); // 0-indexed
          const monthsDiff = (y - startYear) * 12 + (m - 1 - startMonth);
          if (monthsDiff < 0) continue; // not started yet
          const interval = r.interval_months || 1;
          if (monthsDiff % interval !== 0) continue;

          const amt = Number(r.amount);
          if (r.type === "income") income += amt;
          else expense += amt;
        }

        results.push({
          month: monthKey,
          label,
          income,
          expense,
          balance: income - expense,
          warnings: [...new Set(warnings)],
        });
      }

      // Fetch opening_balance from workspace
      const { data: ws, error: wErr } = await supabase
        .from("workspaces")
        .select("opening_balance")
        .eq("id", DEFAULT_WORKSPACE_ID)
        .single();
      if (wErr) throw wErr;
      const openingBalance = Number((ws as any)?.opening_balance ?? 0);

      // Compute cumulative balance starting from opening_balance
      let cumulative = openingBalance;
      for (const fm of results) {
        cumulative += fm.balance;
        fm.balance = cumulative;
      }

      return results;
    },
  });
}
