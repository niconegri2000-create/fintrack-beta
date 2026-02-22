import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface Goal {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  status: "active" | "paused" | "completed";
  note: string | null;
  created_at: string | null;
  saved: number;
}

export function useGoals(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  return useQuery({
    queryKey: ["goals", workspaceId],
    queryFn: async (): Promise<Goal[]> => {
      // Fetch goals
      const { data: goals, error } = await supabase
        .from("goals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch all contributions for this workspace in one query
      const { data: contributions, error: cErr } = await supabase
        .from("goal_contributions")
        .select("goal_id, amount")
        .eq("workspace_id", workspaceId);
      if (cErr) throw cErr;

      // Sum contributions per goal
      const savedMap: Record<string, number> = {};
      (contributions ?? []).forEach((c: any) => {
        savedMap[c.goal_id] = (savedMap[c.goal_id] ?? 0) + Number(c.amount);
      });

      return (goals ?? []).map((g: any) => ({
        id: g.id,
        workspace_id: g.workspace_id,
        name: g.name,
        target_amount: Number(g.target_amount),
        target_date: g.target_date,
        status: g.status as Goal["status"],
        note: g.note,
        created_at: g.created_at,
        saved: savedMap[g.id] ?? 0,
      }));
    },
  });
}

export interface NewGoal {
  name: string;
  target_amount: number;
  target_date?: string | null;
  note?: string | null;
}

export function useCreateGoal(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: NewGoal) => {
      const { error } = await supabase.from("goals").insert({
        workspace_id: workspaceId,
        name: goal.name,
        target_amount: goal.target_amount,
        target_date: goal.target_date ?? null,
        note: goal.note ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", workspaceId] }),
  });
}

export function useUpdateGoalStatus(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Goal["status"] }) => {
      const { error } = await supabase
        .from("goals")
        .update({ status } as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", workspaceId] }),
  });
}

export function useUpdateGoal(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NewGoal> & { id: string }) => {
      const { error } = await supabase
        .from("goals")
        .update(updates as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", workspaceId] }),
  });
}
