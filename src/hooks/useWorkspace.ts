import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

export interface WorkspaceData {
  name: string;
  opening_balance: number;
  min_balance_threshold: number;
  forecast_horizon_months: number;
}

/**
 * Centralized workspace hook.
 * All workspace-level settings are fetched from a single query.
 */
export function useWorkspace() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async (): Promise<WorkspaceData> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name, opening_balance, min_balance_threshold, forecast_horizon_months")
        .eq("id", workspaceId)
        .single();
      if (error) throw error;
      return {
        name: data.name ?? "Workspace",
        opening_balance: Number(data.opening_balance ?? 0),
        min_balance_threshold: Number(data.min_balance_threshold ?? 0),
        forecast_horizon_months: Number(data.forecast_horizon_months ?? 6),
      };
    },
  });
}

export function useUpdateWorkspace() {
  const workspaceId = useWorkspaceId();
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
