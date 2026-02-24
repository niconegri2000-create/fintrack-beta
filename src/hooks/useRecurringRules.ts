import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

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
  account_id: string | null;
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

/**
 * @param accountId — null = MASTER (no filter), string = filter by account
 */
export function useRecurringRules(accountId: string | null = null, workspaceId: string = DEFAULT_WORKSPACE_ID) {
  return useQuery({
    queryKey: ["recurring_rules", accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("recurring_rules")
        .select("id, name, type, amount, day_of_month, is_fixed, is_active, category_id, interval_months, end_date, account_id, category:categories(id, name)")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as RecurringRow[];
    },
  });
}

export function useCreateRecurring(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: NewRecurring) => {
      const { error } = await supabase.from("recurring_rules").insert({
        workspace_id: workspaceId,
        name: r.name,
        type: r.type,
        amount: r.amount,
        category_id: r.category_id || null,
        day_of_month: r.day_of_month,
        start_date: r.start_date,
        is_fixed: r.is_fixed,
        is_active: r.is_active,
        frequency: "monthly",
        interval_months: r.interval_months,
        end_date: r.end_date || null,
        account_id: r.account_id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_rules"] }),
  });
}

export function useUpdateRecurring(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...r }: { id: string; name: string; type: string; amount: number; category_id: string | null; day_of_month: number; interval_months: number; end_date: string | null; is_active: boolean; is_fixed: boolean }) => {
      const { error } = await supabase.from("recurring_rules").update({
        name: r.name,
        type: r.type,
        amount: r.amount,
        category_id: r.category_id || null,
        day_of_month: r.day_of_month,
        interval_months: r.interval_months,
        end_date: r.end_date || null,
        is_active: r.is_active,
        is_fixed: r.is_fixed,
      }).eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_rules"] }),
  });
}

export function useDeleteRecurring(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_rules").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_rules"] }),
  });
}
