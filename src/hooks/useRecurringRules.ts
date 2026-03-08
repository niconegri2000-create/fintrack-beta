import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { invalidateAfterRecurring } from "@/lib/queryKeys";
import { materializeRecurringRules } from "@/lib/materializeRecurring";
import { logger } from "@/lib/logger";

export interface RecurringRow {
  id: string;
  name: string | null;
  type: string;
  amount: number;
  day_of_month: number | null;
  is_fixed: boolean;
  is_active: boolean;
  category: { id: string; name: string } | null;
  category_id: string | null;
  interval_months: number;
  end_date: string | null;
  account_id: string;
  start_date: string;
}

export interface NewRecurring {
  name: string;
  type: string;
  amount: number;
  category_id: string | null;
  day_of_month: number;
  start_date: string;
  is_fixed: boolean;
  is_active: boolean;
  interval_months: number;
  end_date: string | null;
  account_id: string;
}

export function useRecurringRules(accountId: string | null = null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["recurring_rules", accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("recurring_rules")
        .select("id, name, type, amount, day_of_month, is_fixed, is_active, category_id, interval_months, end_date, account_id, start_date, category:categories(id, name)")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as RecurringRow[];
    },
  });
}

export function useCreateRecurring() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: NewRecurring): Promise<string> => {
      const { data, error } = await supabase.from("recurring_rules").insert({
        workspace_id: workspaceId,
        name: r.name, type: r.type, amount: r.amount,
        category_id: r.category_id || null, day_of_month: r.day_of_month,
        start_date: r.start_date, is_fixed: r.is_fixed, is_active: r.is_active,
        frequency: "monthly", interval_months: r.interval_months,
        end_date: r.end_date || null, account_id: r.account_id,
      }).select("id").single();
      if (error) throw error;

      // Immediately materialize transactions for this new rule if active
      if (r.is_active) {
        if (import.meta.env.DEV) logger.info("[RECURRING_DEBUG] materializing new rule immediately:", data.id);
        await materializeRecurringRules(workspaceId, [{
          id: data.id,
          name: r.name,
          type: r.type,
          amount: r.amount,
          category_id: r.category_id,
          is_fixed: r.is_fixed,
          day_of_month: r.day_of_month,
          start_date: r.start_date,
          interval_months: r.interval_months,
          end_date: r.end_date,
          account_id: r.account_id,
        }]);
      }

      return data.id;
    },
    onSuccess: () => invalidateAfterRecurring(qc, "recurring created"),
  });
}

export function useUpdateRecurring() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...r }: { id: string; name: string; type: string; amount: number; category_id: string | null; day_of_month: number; start_date: string; interval_months: number; end_date: string | null; is_active: boolean; is_fixed: boolean; account_id: string }) => {
      const { error } = await supabase.from("recurring_rules").update({
        name: r.name, type: r.type, amount: r.amount,
        category_id: r.category_id || null, day_of_month: r.day_of_month,
        start_date: r.start_date,
        interval_months: r.interval_months, end_date: r.end_date || null,
        is_active: r.is_active, is_fixed: r.is_fixed, account_id: r.account_id,
      }).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;

      // Re-materialize after update if active
      if (r.is_active) {
        if (import.meta.env.DEV) logger.info("[RECURRING_DEBUG] update recurring -> materializing updated rule:", id);
        await materializeRecurringRules(workspaceId, [{
          id,
          name: r.name,
          type: r.type,
          amount: r.amount,
          category_id: r.category_id,
          is_fixed: r.is_fixed,
          day_of_month: r.day_of_month,
          start_date: r.start_date,
          interval_months: r.interval_months,
          end_date: r.end_date,
          account_id: r.account_id,
        }]);
      }
    },
    onSuccess: () => invalidateAfterRecurring(qc, "recurring updated"),
  });
}

export function useDeleteRecurring() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: unlinkError } = await supabase
        .from("transactions")
        .update({ recurring_rule_id: null })
        .eq("recurring_rule_id", id)
        .eq("workspace_id", workspaceId);
      if (unlinkError) throw unlinkError;
      const { error } = await supabase.from("recurring_rules").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterRecurring(qc, "recurring deleted"),
  });
}
