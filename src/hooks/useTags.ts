import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

export interface TagRow {
  id: string;
  name: string;
  workspace_id: string;
}

export function useTags() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, workspace_id")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data as TagRow[];
    },
  });
}

export function useCreateTag() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("tags")
        .upsert({ workspace_id: workspaceId, name: name.toLowerCase().trim() }, { onConflict: "workspace_id,name" })
        .select("id, name, workspace_id")
        .single();
      if (error) throw error;
      return data as TagRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

/** Get tag IDs for a transaction */
export function useTransactionTags(transactionId: string | null) {
  return useQuery({
    queryKey: ["transaction_tags", transactionId],
    enabled: !!transactionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_tags")
        .select("tag_id")
        .eq("transaction_id", transactionId!);
      if (error) throw error;
      return data.map((r: any) => r.tag_id as string);
    },
  });
}

/** Get tag IDs for a recurring rule */
export function useRecurringTags(recurringId: string | null) {
  return useQuery({
    queryKey: ["recurring_tags", recurringId],
    enabled: !!recurringId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_tags")
        .select("tag_id")
        .eq("recurring_id", recurringId!);
      if (error) throw error;
      return data.map((r: any) => r.tag_id as string);
    },
  });
}

/** Sync tags for a transaction (replace all) */
export async function syncTransactionTags(transactionId: string, tagIds: string[]) {
  await supabase.from("transaction_tags").delete().eq("transaction_id", transactionId);
  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id }));
    const { error } = await supabase.from("transaction_tags").insert(rows);
    if (error) throw error;
  }
}

/** Sync tags for a recurring rule (replace all) */
export async function syncRecurringTags(recurringId: string, tagIds: string[]) {
  await supabase.from("recurring_tags").delete().eq("recurring_id", recurringId);
  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ recurring_id: recurringId, tag_id }));
    const { error } = await supabase.from("recurring_tags").insert(rows);
    if (error) throw error;
  }
}

/** Get tag IDs for a recurring rule (non-hook, for auto-generation) */
export async function fetchRecurringTagIds(recurringId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("recurring_tags")
    .select("tag_id")
    .eq("recurring_id", recurringId);
  if (error) return [];
  return data.map((r: any) => r.tag_id as string);
}
