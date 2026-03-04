import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

/** Fetch all transaction_tags for a list of transaction IDs, returns map: txId -> tagNames[] */
export function useTransactionTagsMap(transactionIds: string[]) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["transaction_tags_map", transactionIds.sort().join(","), workspaceId],
    enabled: transactionIds.length > 0,
    queryFn: async () => {
      // Fetch tag associations
      const { data: links, error: linkErr } = await supabase
        .from("transaction_tags")
        .select("transaction_id, tag_id")
        .in("transaction_id", transactionIds);
      if (linkErr) throw linkErr;
      if (!links || links.length === 0) return {} as Record<string, { id: string; name: string }[]>;

      // Fetch tag names
      const uniqueTagIds = [...new Set(links.map((l) => l.tag_id))];
      const { data: tags, error: tagErr } = await supabase
        .from("tags")
        .select("id, name")
        .in("id", uniqueTagIds);
      if (tagErr) throw tagErr;

      const tagMap = Object.fromEntries((tags || []).map((t) => [t.id, t.name]));
      const result: Record<string, { id: string; name: string }[]> = {};
      for (const link of links) {
        if (!result[link.transaction_id]) result[link.transaction_id] = [];
        result[link.transaction_id].push({ id: link.tag_id, name: tagMap[link.tag_id] || "?" });
      }
      return result;
    },
  });
}

/** Fetch all recurring_tags for a list of recurring IDs */
export function useRecurringTagsMap(recurringIds: string[]) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["recurring_tags_map", recurringIds.sort().join(","), workspaceId],
    enabled: recurringIds.length > 0,
    queryFn: async () => {
      const { data: links, error: linkErr } = await supabase
        .from("recurring_tags")
        .select("recurring_id, tag_id")
        .in("recurring_id", recurringIds);
      if (linkErr) throw linkErr;
      if (!links || links.length === 0) return {} as Record<string, { id: string; name: string }[]>;

      const uniqueTagIds = [...new Set(links.map((l) => l.tag_id))];
      const { data: tags, error: tagErr } = await supabase
        .from("tags")
        .select("id, name")
        .in("id", uniqueTagIds);
      if (tagErr) throw tagErr;

      const tagMap = Object.fromEntries((tags || []).map((t) => [t.id, t.name]));
      const result: Record<string, { id: string; name: string }[]> = {};
      for (const link of links) {
        if (!result[link.recurring_id]) result[link.recurring_id] = [];
        result[link.recurring_id].push({ id: link.tag_id, name: tagMap[link.tag_id] || "?" });
      }
      return result;
    },
  });
}
