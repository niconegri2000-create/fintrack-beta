import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface WorkspaceData {
  opening_balance: number;
  min_balance_threshold: number;
  forecast_horizon_months: number;
}

/**
 * Centralized workspace hook.
 * All workspace-level settings are fetched from a single query.
 */
export function useWorkspace(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async (): Promise<WorkspaceData> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("opening_balance, min_balance_threshold, forecast_horizon_months")
        .eq("id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Workspace doesn't exist yet – return safe defaults
        return { opening_balance: 0, min_balance_threshold: 0, forecast_horizon_months: 6 };
      }
      return {
        opening_balance: Number(data.opening_balance ?? 0),
        min_balance_threshold: Number(data.min_balance_threshold ?? 0),
        forecast_horizon_months: Number(data.forecast_horizon_months ?? 6),
      };
    },
  });
}

export function useUpdateWorkspace(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Pick<WorkspaceData, "opening_balance" | "min_balance_threshold" | "forecast_horizon_months">>) => {
      const { error } = await supabase
        .from("workspaces")
        .update(updates as any)
        .eq("id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}
