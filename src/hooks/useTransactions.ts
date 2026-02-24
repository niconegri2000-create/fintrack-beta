import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export interface TransactionRow {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string;
  is_fixed: boolean;
  source: string;
  notes: string | null;
  account_id: string | null;
  category: { id: string; name: string } | null;
}

export interface NewTransaction {
  date: string;
  type: string;
  amount: number;
  category_id: string | null;
  description: string;
  is_fixed: boolean;
  notes: string;
  account_id: string;
}

/**
 * @param accountId — null = MASTER (no filter), string = filter by account
 */
export function useTransactions(from: string, to: string, accountId: string | null = null, workspaceId: string = DEFAULT_WORKSPACE_ID) {
  return useQuery({
    queryKey: ["transactions", from, to, accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("id, date, description, amount, type, is_fixed, source, notes, account_id, category:categories(id, name)")
        .eq("workspace_id", workspaceId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as TransactionRow[];
    },
  });
}

export function useCreateTransaction(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tx: NewTransaction) => {
      const { error } = await supabase.from("transactions").insert({
        workspace_id: workspaceId,
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.category_id || null,
        description: tx.description || null,
        is_fixed: tx.is_fixed,
        notes: tx.notes || null,
        source: "manual",
        account_id: tx.account_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTransaction(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...tx }: { id: string; date: string; type: string; amount: number; category_id: string | null; description: string; notes: string }) => {
      const { error } = await supabase.from("transactions").update({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.category_id || null,
        description: tx.description || null,
        notes: tx.notes || null,
      }).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTransaction(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
