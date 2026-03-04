import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";

export interface NewTransfer {
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
}

export function useCreateTransfer() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (t: NewTransfer): Promise<{ outId: string; inId: string }> => {
      const transferId = crypto.randomUUID();

      const rows = [
        {
          workspace_id: workspaceId,
          date: t.date,
          type: "transfer_out" as const,
          amount: Math.abs(t.amount),
          description: t.description || null,
          account_id: t.from_account_id,
          linked_account_id: t.to_account_id,
          transfer_id: transferId,
          transfer_direction: "out",
          source: "manual",
          is_fixed: false,
          category_id: null,
          notes: null,
        },
        {
          workspace_id: workspaceId,
          date: t.date,
          type: "transfer_in" as const,
          amount: Math.abs(t.amount),
          description: t.description || null,
          account_id: t.to_account_id,
          linked_account_id: t.from_account_id,
          transfer_id: transferId,
          transfer_direction: "in",
          source: "manual",
          is_fixed: false,
          category_id: null,
          notes: null,
        },
      ];

      console.log("[TRANSFER] Inserting rows:", JSON.stringify(rows, null, 2));

      const { data, error } = await supabase
        .from("transactions")
        .insert(rows)
        .select("id, transfer_direction");
      if (error) {
        console.error("[TRANSFER] Insert failed:", { message: error.message, code: error.code, details: error.details, hint: error.hint });
        throw error;
      }

      const out = (data as any[]).find((r) => r.transfer_direction === "out");
      const ins = (data as any[]).find((r) => r.transfer_direction === "in");
      return { outId: out?.id, inId: ins?.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTransfer() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (t: {
      transfer_id: string;
      date: string;
      from_account_id: string;
      to_account_id: string;
      amount: number;
      description: string;
    }) => {
      // Update out row
      const { error: e1 } = await supabase
        .from("transactions")
        .update({
          date: t.date,
          amount: Math.abs(t.amount),
          description: t.description || null,
          account_id: t.from_account_id,
          linked_account_id: t.to_account_id,
        })
        .eq("transfer_id", t.transfer_id)
        .eq("transfer_direction", "out")
        .eq("workspace_id", workspaceId);
      if (e1) throw e1;

      // Update in row
      const { error: e2 } = await supabase
        .from("transactions")
        .update({
          date: t.date,
          amount: Math.abs(t.amount),
          description: t.description || null,
          account_id: t.to_account_id,
          linked_account_id: t.from_account_id,
        })
        .eq("transfer_id", t.transfer_id)
        .eq("transfer_direction", "in")
        .eq("workspace_id", workspaceId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTransfer() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("transfer_id", transferId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
