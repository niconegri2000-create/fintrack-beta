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
}

export function useTransactions(month: string, workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const startDate = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const endDate = new Date(y, m, 0).toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["transactions", month, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, amount, type, is_fixed, source, notes, category:categories(id, name)")
        .eq("workspace_id", workspaceId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
