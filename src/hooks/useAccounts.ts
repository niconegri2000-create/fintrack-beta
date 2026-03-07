import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { invalidateAfterAccount } from "@/lib/queryKeys";

export interface AccountRow {
  id: string;
  workspace_id: string;
  name: string;
  opening_balance: number;
  min_balance_threshold: number | null;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

function mapRow(a: any): AccountRow {
  return {
    id: a.id,
    workspace_id: a.workspace_id,
    name: a.name,
    opening_balance: Number(a.opening_balance ?? 0),
    min_balance_threshold: a.min_balance_threshold != null ? Number(a.min_balance_threshold) : null,
    is_default: a.is_default,
    sort_order: a.sort_order ?? 0,
    is_active: a.is_active ?? true,
    created_at: a.created_at,
  };
}

/** Active accounts ordered by sort_order */
export function useAccounts() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["accounts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
  });
}

/** ALL accounts including archived, ordered by sort_order */
export function useAllAccounts() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["accounts-all", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
  });
}

export function useDefaultAccount() {
  const { data: accounts, ...rest } = useAccounts();
  const defaultAccount = accounts?.find((a) => a.is_default) ?? accounts?.[0] ?? null;
  return { data: defaultAccount, accounts, ...rest };
}

export function useCreateAccount() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, is_default = false, sort_order = 0 }: { name: string; is_default?: boolean; sort_order?: number }) => {
      const { error } = await supabase
        .from("accounts")
        .insert({ workspace_id: workspaceId, name, is_default, sort_order } as any);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterAccount(qc, "account created"),
  });
}

export function useUpdateAccount() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; opening_balance?: number; min_balance_threshold?: number | null; sort_order?: number; is_active?: boolean; is_default?: boolean }) => {
      const { error } = await supabase
        .from("accounts")
        .update(updates as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterAccount(qc, "account updated"),
  });
}

/** Batch-update sort_order for a list of account ids */
export function useReorderAccounts() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, i) =>
        supabase.from("accounts").update({ sort_order: i } as any).eq("id", id).eq("workspace_id", workspaceId)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => invalidateAfterAccount(qc, "account reordered"),
  });
}

/** Archive (soft-hide) an account */
export function useArchiveAccount() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .update({ is_active: false } as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterAccount(qc, "account archived"),
  });
}

/** Restore an archived account */
export function useRestoreAccount() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .update({ is_active: true } as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterAccount(qc, "account restored"),
  });
}

/** Check if an account has linked transactions or recurring rules */
export async function checkAccountHasLinkedData(accountId: string): Promise<boolean> {
  const [txRes, rrRes] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("recurring_rules").select("id", { count: "exact", head: true }).eq("account_id", accountId),
  ]);
  return ((txRes.count ?? 0) + (rrRes.count ?? 0)) > 0;
}

/** Hard-delete an archived account (only if no linked data) */
export function useDeleteAccount() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const hasData = await checkAccountHasLinkedData(id);
      if (hasData) throw new Error("HAS_LINKED_DATA");
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterAccount(qc, "account deleted"),
  });
}
