import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface BudgetSettings {
  id: string;
  workspace_id: string;
  period: "monthly" | "yearly";
  reset_mode: "auto" | "manual";
  alerts_enabled: boolean;
  alert_threshold: 80 | 90 | 100;
  reset_anchor_date: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "budget_settings";

export function useBudgetSettings(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, workspaceId],
    queryFn: async (): Promise<BudgetSettings> => {
      // Try to fetch existing row
      const { data, error } = await supabase
        .from("budget_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;

      if (data) return data as unknown as BudgetSettings;

      // Create default row if none exists
      const { data: created, error: insertErr } = await supabase
        .from("budget_settings")
        .insert({ workspace_id: workspaceId })
        .select()
        .single();
      if (insertErr) throw insertErr;
      return created as unknown as BudgetSettings;
    },
  });

  const update = useMutation({
    mutationFn: async (
      input: Partial<Pick<BudgetSettings, "period" | "alerts_enabled" | "alert_threshold">>
    ) => {
      const { error } = await supabase
        .from("budget_settings")
        .update(input)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
      // Also invalidate budget-dependent queries so spending recalculates with new window
      qc.invalidateQueries({ queryKey: ["category_spending"] });
      qc.invalidateQueries({ queryKey: ["category_budgets"] });
    },
  });

  return { data: query.data, isLoading: query.isLoading, error: query.error, update };
}
