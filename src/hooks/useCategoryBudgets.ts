import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

import { getBudgetStatus } from "@/lib/budgetThresholds";
import { invalidateAfterCategoryBudget } from "@/lib/queryKeys";

export interface CategoryBudget {
  id: string;
  category_id: string;
  category_name: string;
  monthly_limit: number;
  is_active: boolean;
  updated_at: string;
}

export function useCategoryBudgets() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["category_budgets", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_budgets")
        .select("id, category_id, monthly_limit, is_active, updated_at, category:categories(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id, category_id: r.category_id, category_name: r.category?.name ?? "—",
        monthly_limit: Number(r.monthly_limit), is_active: r.is_active, updated_at: r.updated_at,
      })) as CategoryBudget[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: { category_id: string; monthly_limit: number; is_active?: boolean }) => {
      const { error } = await supabase
        .from("category_budgets")
        .upsert({ workspace_id: workspaceId, category_id: input.category_id, monthly_limit: input.monthly_limit, is_active: input.is_active ?? true }, { onConflict: "workspace_id,category_id" });
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterCategoryBudget(qc, "category budget upserted"),
  });

  const toggleActive = useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("category_budgets").update({ is_active: input.is_active }).eq("id", input.id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterCategoryBudget(qc, "category budget toggled"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("category_budgets").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterCategoryBudget(qc, "category budget removed"),
  });

  return { list, upsert, toggleActive, remove };
}

/* ── Spending by category for a month ── */
export interface CategorySpending { category_id: string; total_spent: number; }

export function useCategorySpending(startDate: string, endDate: string, accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["category_spending", workspaceId, accountId, startDate, endDate],
    queryFn: async () => {
      let q = supabase.from("transactions").select("category_id, amount, source")
        .eq("workspace_id", workspaceId).eq("type", "expense")
        .gte("date", startDate).lte("date", endDate);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        if (!r.category_id) continue;
        if (r.source === "manual" && (r as any).type === "transfer_out") continue;
        map.set(r.category_id, (map.get(r.category_id) ?? 0) + Number(r.amount));
      }
      return Array.from(map.entries()).map(([category_id, total_spent]) => ({ category_id, total_spent })) as CategorySpending[];
    },
  });
}

/* ── Combined: budget + spending → UI-ready rows ── */
export type BudgetStatus = "ok" | "warn1" | "warn2" | "over";

export interface BudgetSummaryRow {
  category_id: string;
  category_name: string;
  monthly_limit: number;
  spent: number;
  percent: number | null;
  status: BudgetStatus;
}

export function useBudgetSummary(startDate: string, endDate: string, accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  const spending = useCategorySpending(startDate, endDate, accountId);

  // Read limits from Supabase category_budgets table (cross-device)
  const budgetsQuery = useQuery({
    queryKey: ["category_budgets", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_budgets")
        .select("category_id, monthly_limit, is_active, category:categories(name)")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = spending.isLoading || budgetsQuery.isLoading;
  const error = spending.error || budgetsQuery.error;
  const rows: BudgetSummaryRow[] = [];

  if (spending.data && budgetsQuery.data) {
    const spendMap = new Map<string, number>();
    for (const s of spending.data) spendMap.set(s.category_id, s.total_spent);

    for (const b of budgetsQuery.data) {
      if (!b.is_active) continue;
      const limit = Number(b.monthly_limit);
      if (limit <= 0) continue;
      const spent = spendMap.get(b.category_id) ?? 0;
      const percent = limit > 0 ? spent / limit : null;
      const { status: budgetStatus } = getBudgetStatus(spent, limit);
      const status: BudgetStatus = budgetStatus === "none" ? "ok" : budgetStatus;
      const catName = (b.category as any)?.name ?? "—";
      rows.push({ category_id: b.category_id, category_name: catName, monthly_limit: limit, spent, percent, status });
    }
  }

  return { data: rows, isLoading, error };
}
