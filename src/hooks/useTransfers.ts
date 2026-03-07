import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { logger } from "@/lib/logger";
import { invalidateAfterTransfer } from "@/lib/queryKeys";

export interface TransferRow {
  id: string;
  workspace_id: string;
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface NewTransfer {
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
}

/** Fetch transfers for a date range, optionally filtered by account */
export function useTransfersList(from: string, to: string, accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["transfers", from, to, accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("transfers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (accountId) {
        q = q.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TransferRow[];
    },
  });
}

export function useCreateTransfer() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (t: NewTransfer): Promise<{ transferId: string; outId: string; inId: string }> => {
      logger.log("[TRANSFER] Starting transfer creation...");
      logger.log("[TRANSFER] workspaceId:", workspaceId);
      logger.log("[TRANSFER] payload:", JSON.stringify(t, null, 2));

      // Step 1: Insert into transfers table
      const { data: transferData, error: transferError } = await supabase
        .from("transfers")
        .insert({
          workspace_id: workspaceId,
          date: t.date,
          from_account_id: t.from_account_id,
          to_account_id: t.to_account_id,
          amount: Math.abs(t.amount),
          description: t.description || null,
        })
        .select("id")
        .single();

      if (transferError) {
        logger.error("[TRANSFER] transfers insert failed:", { message: transferError.message, code: transferError.code, details: transferError.details, hint: transferError.hint });
        throw transferError;
      }

      if (!transferData?.id) {
        logger.error("[TRANSFER] transfers insert returned no id. RLS may be blocking.");
        throw new Error("Trasferimento non salvato: verifica di essere autenticato.");
      }

      const transferId = transferData.id;
      logger.log("[TRANSFER] Transfer header created:", transferId);

      // Step 2: Insert 2 transaction rows
      const txRows = [
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

      logger.log("[TRANSFER] Inserting transaction rows:", JSON.stringify(txRows, null, 2));

      const { data: txData, error: txError, status, statusText } = await supabase
        .from("transactions")
        .insert(txRows)
        .select("id, transfer_direction");

      logger.log("[TRANSFER] Transactions response:", { status, statusText, dataLength: txData?.length, error: txError });

      if (txError) {
        logger.error("[TRANSFER] transactions insert failed:", { message: txError.message, code: txError.code, details: txError.details, hint: txError.hint });
        // Cleanup: delete transfer header
        await supabase.from("transfers").delete().eq("id", transferId).eq("workspace_id", workspaceId);
        logger.log("[TRANSFER] Rolled back transfer header:", transferId);
        throw txError;
      }

      if (!txData || txData.length < 2) {
        logger.error("[TRANSFER] transactions insert returned insufficient rows. RLS may be blocking. data:", txData);
        // Cleanup
        await supabase.from("transfers").delete().eq("id", transferId).eq("workspace_id", workspaceId);
        throw new Error("Trasferimento non salvato: verifica di essere autenticato e di avere un workspace attivo.");
      }

      // Step 3: Verify both rows exist
      const out = (txData as any[]).find((r) => r.transfer_direction === "out");
      const ins = (txData as any[]).find((r) => r.transfer_direction === "in");

      if (!out?.id || !ins?.id) {
        logger.error("[TRANSFER] Missing out/in ids:", { out, ins, txData });
        await supabase.from("transfers").delete().eq("id", transferId).eq("workspace_id", workspaceId);
        throw new Error("Trasferimento incompleto: record mancanti.");
      }

      logger.log("[TRANSFER] Success:", { transferId, outId: out.id, inId: ins.id });
      return { transferId, outId: out.id, inId: ins.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["transfers"] });
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
      // Update transfer header
      const { error: hErr } = await supabase
        .from("transfers")
        .update({
          date: t.date,
          from_account_id: t.from_account_id,
          to_account_id: t.to_account_id,
          amount: Math.abs(t.amount),
          description: t.description || null,
        })
        .eq("id", t.transfer_id)
        .eq("workspace_id", workspaceId);
      if (hErr) throw hErr;

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
      qc.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useDeleteTransfer() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      logger.log("[TRANSFER] Deleting transfer:", transferId);
      // Delete transactions first (FK might not cascade)
      const { error: txErr } = await supabase
        .from("transactions")
        .delete()
        .eq("transfer_id", transferId)
        .eq("workspace_id", workspaceId);
      if (txErr) throw txErr;

      // Delete transfer header
      const { error: hErr } = await supabase
        .from("transfers")
        .delete()
        .eq("id", transferId)
        .eq("workspace_id", workspaceId);
      if (hErr) throw hErr;

      logger.log("[TRANSFER] Deleted successfully:", transferId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}
