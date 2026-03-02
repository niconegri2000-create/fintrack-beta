import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

export interface DashboardData {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  byCategory: { name: string; amount: number }[];
  byMonth: { month: string; income: number; expense: number }[];
}

/**
 * @param accountId — null = MASTER (no filter), string = filter by account
 */
export function useDashboardData(startDate: string, endDate: string, accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["dashboard", startDate, endDate, accountId, workspaceId],
    queryFn: async (): Promise<DashboardData> => {
      let q = supabase
        .from("transactions")
        .select("date, amount, type, category:categories(name)")
        .eq("workspace_id", workspaceId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;

      if (error) throw error;

      const rows = (data ?? []) as unknown as {
        date: string;
        amount: number;
        type: string;
        category: { name: string } | null;
      }[];

      let income = 0;
      let expense = 0;
      const catMap = new Map<string, number>();
      const monthMap = new Map<string, { income: number; expense: number }>();

      for (const r of rows) {
        const amt = Number(r.amount);
        if (r.type === "income") income += amt;
        else expense += amt;

        if (r.type === "expense") {
          const cat = r.category?.name ?? "Senza categoria";
          catMap.set(cat, (catMap.get(cat) ?? 0) + amt);
        }

        const m = r.date.slice(0, 7);
        const entry = monthMap.get(m) ?? { income: 0, expense: 0 };
        if (r.type === "income") entry.income += amt;
        else entry.expense += amt;
        monthMap.set(m, entry);
      }

      const balance = income - expense;
      const savingsRate = income > 0 ? (balance / income) * 100 : 0;

      const byCategory = Array.from(catMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      const byMonth = Array.from(monthMap.entries())
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return { income, expense, balance, savingsRate, byCategory, byMonth };
    },
  });
}
