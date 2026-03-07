import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { invalidateAfterGoal } from "@/lib/queryKeys";

export interface Goal {
  id: string;
  workspace_id: string;
  account_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  status: "active" | "paused" | "completed" | "archived";
  note: string | null;
  created_at: string | null;
  saved: number;
}

export function useGoals(accountId?: string | null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["goals", workspaceId, accountId],
    queryFn: async (): Promise<Goal[]> => {
      let query = supabase
        .from("goals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (accountId) query = query.eq("account_id", accountId);

      const { data: goals, error } = await query;
      if (error) throw error;

      const { data: contributions, error: cErr } = await supabase
        .from("goal_contributions")
        .select("goal_id, amount")
        .eq("workspace_id", workspaceId);
      if (cErr) throw cErr;

      const savedMap: Record<string, number> = {};
      (contributions ?? []).forEach((c: any) => {
        savedMap[c.goal_id] = (savedMap[c.goal_id] ?? 0) + Number(c.amount);
      });

      return (goals ?? []).map((g: any) => ({
        id: g.id, workspace_id: g.workspace_id, account_id: g.account_id,
        name: g.name, target_amount: Number(g.target_amount),
        target_date: g.target_date, status: g.status as Goal["status"],
        note: g.note, created_at: g.created_at, saved: savedMap[g.id] ?? 0,
      }));
    },
  });
}

export interface NewGoal {
  name: string;
  target_amount: number;
  target_date?: string | null;
  note?: string | null;
  account_id: string;
}

export function useCreateGoal() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: NewGoal) => {
      const { error } = await supabase.from("goals").insert({
        workspace_id: workspaceId, name: goal.name,
        target_amount: goal.target_amount,
        target_date: goal.target_date ?? null,
        note: goal.note ?? null, account_id: goal.account_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterGoal(qc, "goal created"),
  });
}

export function useUpdateGoalStatus() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Goal["status"] }) => {
      const { error } = await supabase.from("goals").update({ status } as any).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterGoal(qc, "goal status updated"),
  });
}

export function useUpdateGoal() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NewGoal> & { id: string }) => {
      const { error } = await supabase.from("goals").update(updates as any).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterGoal(qc, "goal updated"),
  });
}

export function useDeleteGoal() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterGoal(qc, "goal deleted"),
  });
}
