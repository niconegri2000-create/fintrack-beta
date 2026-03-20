import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { useRecurringSyncReady } from "@/contexts/RecurringSyncContext";
import { invalidateAfterTransaction } from "@/lib/queryKeys";

export interface TransactionRow {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string;
  is_fixed: boolean;
  source: string;
  notes: string | null;
  account_id: string;
  category: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  transfer_id: string | null;
  linked_account_id: string | null;
  transfer_direction: string | null;
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
export function useTransactions(from: string, to: string, accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  const syncReady = useRecurringSyncReady();
  return useQuery({
    queryKey: ["transactions", from, to, accountId, workspaceId],
    enabled: syncReady,
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("id, date, description, amount, type, is_fixed, source, notes, account_id, transfer_id, linked_account_id, transfer_direction, category:categories(id, name), transaction_tags(tag:tags(id, name))")
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

export function useCreateTransaction() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tx: NewTransaction): Promise<string> => {
      const { data, error } = await supabase.from("transactions").insert({
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
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => invalidateAfterTransaction(qc, "transaction created"),
  });
}

export function useUpdateTransaction() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...tx }: { id: string; date: string; type: string; amount: number; category_id: string | null; description: string; notes: string; account_id: string }) => {
      const { error } = await supabase.from("transactions").update({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.category_id || null,
        description: tx.description || null,
        notes: tx.notes || null,
        account_id: tx.account_id,
      }).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterTransaction(qc, "transaction updated"),
  });
}

export function useDeleteTransaction() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterTransaction(qc, "transaction deleted"),
  });
}
