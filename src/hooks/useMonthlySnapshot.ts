import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export interface SnapshotTopCategory {
  category_id: string;
  name: string;
  total: number;
}

export interface MonthlySnapshot {
  id: string;
  workspace_id: string;
  account_id: string | null;
  month: string;
  income_total: number;
  expense_total: number;
  net_total: number;
  savings_rate: number;
  top_categories: SnapshotTopCategory[];
  critical_categories: SnapshotTopCategory[];
  notes: string[];
  created_at: string;
}

function monthKey(d: Date) {
  return format(startOfMonth(d), "yyyy-MM-dd");
}

/**
 * Fetches (or generates) the snapshot for the previous month
 * relative to the given reference date.
 */
export function useMonthlySnapshot(
  referenceDate: string,
  accountId: string | null,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
) {
  const qc = useQueryClient();
  const prevMonth = startOfMonth(subMonths(new Date(referenceDate), 1));
  const month = monthKey(prevMonth);

  const query = useQuery({
    queryKey: ["monthly_snapshot", workspaceId, accountId, month],
    queryFn: async (): Promise<MonthlySnapshot | null> => {
      let q = supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("month", month);

      if (accountId) {
        q = q.eq("account_id", accountId);
      } else {
        q = q.is("account_id", null);
      }

      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        workspace_id: data.workspace_id,
        account_id: data.account_id,
        month: data.month,
        income_total: Number(data.income_total),
        expense_total: Number(data.expense_total),
        net_total: Number(data.net_total),
        savings_rate: Number(data.savings_rate),
        top_categories: (data.top_categories ?? []) as unknown as SnapshotTopCategory[],
        critical_categories: (data.critical_categories ?? []) as unknown as SnapshotTopCategory[],
        notes: (data.notes ?? []) as unknown as string[],
        created_at: data.created_at,
      };
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const start = format(prevMonth, "yyyy-MM-dd");
      const end = format(endOfMonth(prevMonth), "yyyy-MM-dd");

      // Fetch transactions for the month
      let txQ = supabase
        .from("transactions")
        .select("amount, type, category_id, category:categories(name)")
        .eq("workspace_id", workspaceId)
        .gte("date", start)
        .lte("date", end);

      if (accountId) txQ = txQ.eq("account_id", accountId);

      const { data: txs, error: txErr } = await txQ;
      if (txErr) throw txErr;

      const rows = (txs ?? []) as unknown as {
        amount: number;
        type: string;
        category_id: string | null;
        category: { name: string } | null;
      }[];

      let income = 0;
      let expense = 0;
      const catMap = new Map<string, { id: string; name: string; total: number }>();

      for (const r of rows) {
        const amt = Number(r.amount);
        if (r.type === "income") income += amt;
        else expense += amt;

        if (r.type === "expense" && r.category_id) {
          const existing = catMap.get(r.category_id);
          if (existing) {
            existing.total += amt;
          } else {
            catMap.set(r.category_id, {
              id: r.category_id,
              name: r.category?.name ?? "Senza categoria",
              total: amt,
            });
          }
        }
      }

      const net = income - expense;
      const savingsRate = income > 0 ? (net / income) * 100 : 0;

      const sortedCats = Array.from(catMap.values()).sort((a, b) => b.total - a.total);
      const topCategories = sortedCats.slice(0, 3).map((c) => ({
        category_id: c.id,
        name: c.name,
        total: c.total,
      }));

      // Critical: categories that exceed budget (fetch budgets)
      const { data: budgets } = await supabase
        .from("category_budgets")
        .select("category_id, monthly_limit, category:categories(name)")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      const criticalCategories: SnapshotTopCategory[] = [];
      for (const b of (budgets ?? []) as any[]) {
        const limit = Number(b.monthly_limit);
        if (limit <= 0) continue;
        const spent = catMap.get(b.category_id)?.total ?? 0;
        if (spent > limit) {
          criticalCategories.push({
            category_id: b.category_id,
            name: b.category?.name ?? "—",
            total: spent,
          });
        }
      }

      // Generate notes
      const notes: string[] = [];
      if (savingsRate > 15) notes.push(`Ottimo risparmio: ${savingsRate.toFixed(1)}% nel mese.`);
      if (savingsRate < 0) notes.push(`Spese superiori alle entrate nel mese.`);
      if (criticalCategories.length > 0) {
        notes.push(`${criticalCategories.length} categorie hanno superato il budget.`);
      }
      if (income === 0 && expense > 0) notes.push("Nessuna entrata registrata nel mese.");

      // Upsert
      const payload = {
        workspace_id: workspaceId,
        account_id: accountId,
        month,
        income_total: income,
        expense_total: expense,
        net_total: net,
        savings_rate: Math.round(savingsRate * 10) / 10,
        top_categories: topCategories,
        critical_categories: criticalCategories,
        notes,
      };

      const { error } = await supabase
        .from("monthly_snapshots")
        .upsert(payload as any, { onConflict: "workspace_id,account_id,month" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_snapshot", workspaceId, accountId, month] });
    },
  });

  return {
    snapshot: query.data ?? null,
    isLoading: query.isLoading,
    generate,
    month,
  };
}

/**
 * Fetches an older snapshot (for comparison with previous month).
 */
export function usePreviousSnapshot(
  referenceDate: string,
  accountId: string | null,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
) {
  const twoMonthsAgo = startOfMonth(subMonths(new Date(referenceDate), 2));
  const month = monthKey(twoMonthsAgo);

  return useQuery({
    queryKey: ["monthly_snapshot", workspaceId, accountId, month],
    queryFn: async (): Promise<MonthlySnapshot | null> => {
      let q = supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("month", month);

      if (accountId) {
        q = q.eq("account_id", accountId);
      } else {
        q = q.is("account_id", null);
      }

      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        workspace_id: data.workspace_id,
        account_id: data.account_id,
        month: data.month,
        income_total: Number(data.income_total),
        expense_total: Number(data.expense_total),
        net_total: Number(data.net_total),
        savings_rate: Number(data.savings_rate),
        top_categories: (data.top_categories ?? []) as unknown as SnapshotTopCategory[],
        critical_categories: (data.critical_categories ?? []) as unknown as SnapshotTopCategory[],
        notes: (data.notes ?? []) as unknown as string[],
        created_at: data.created_at,
      };
    },
  });
}
