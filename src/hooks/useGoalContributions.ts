import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

export interface GoalContribution {
  id: string;
  goal_id: string;
  date: string;
  amount: number;
  note: string | null;
  created_at: string | null;
}

export function useGoalContributions(goalId?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["goal_contributions", workspaceId, goalId],
    enabled: !!goalId,
    queryFn: async (): Promise<GoalContribution[]> => {
      const { data, error } = await supabase
        .from("goal_contributions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("goal_id", goalId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id, goal_id: c.goal_id, date: c.date,
        amount: Number(c.amount), note: c.note, created_at: c.created_at,
      }));
    },
  });
}

export interface NewContribution {
  goal_id: string;
  date: string;
  amount: number;
  note?: string | null;
}

export function useAddContribution() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NewContribution) => {
      const { error } = await supabase.from("goal_contributions").insert({
        workspace_id: workspaceId, goal_id: c.goal_id,
        date: c.date, amount: c.amount, note: c.note ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["goals", workspaceId] });
      qc.invalidateQueries({ queryKey: ["goal_contributions", workspaceId, vars.goal_id] });
    },
  });
}

export function useDeleteContribution() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, goalId }: { id: string; goalId: string }) => {
      const { error } = await supabase.from("goal_contributions").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
      return goalId;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["goals", workspaceId] });
      qc.invalidateQueries({ queryKey: ["goal_contributions", workspaceId, vars.goalId] });
    },
  });
}
