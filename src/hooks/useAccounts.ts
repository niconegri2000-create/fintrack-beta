import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface AccountRow {
  id: string;
  workspace_id: string;
  name: string;
  opening_balance: number;
  min_balance_threshold: number | null;
  is_default: boolean;
  created_at: string;
}

export function useAccounts(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  return useQuery({
    queryKey: ["accounts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        id: a.id,
        workspace_id: a.workspace_id,
        name: a.name,
        opening_balance: Number(a.opening_balance ?? 0),
        min_balance_threshold: a.min_balance_threshold != null ? Number(a.min_balance_threshold) : null,
        is_default: a.is_default,
        created_at: a.created_at,
      })) as AccountRow[];
    },
  });
}

export function useDefaultAccount(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const { data: accounts, ...rest } = useAccounts(workspaceId);
  const defaultAccount = accounts?.find((a) => a.is_default) ?? accounts?.[0] ?? null;
  return { data: defaultAccount, accounts, ...rest };
}

export function useCreateAccount(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, is_default = false }: { name: string; is_default?: boolean }) => {
      const { error } = await supabase
        .from("accounts")
        .insert({ workspace_id: workspaceId, name, is_default } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", workspaceId] });
    },
  });
}

export function useUpdateAccount(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; opening_balance?: number; min_balance_threshold?: number | null }) => {
      const { error } = await supabase
        .from("accounts")
        .update(updates as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts", workspaceId] });
      qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
    },
  });
}
