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
}

export function useRecurringRules() {
  return useQuery({
    queryKey: ["recurring_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .select("id, name, type, amount, day_of_month, is_fixed, is_active, category_id, interval_months, end_date, category:categories(id, name)")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .order("name");
      if (error) throw error;
      return data as unknown as RecurringRow[];
    },
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: NewRecurring) => {
      const { error } = await supabase.from("recurring_rules").insert({
        workspace_id: DEFAULT_WORKSPACE_ID,
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
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_rules"] }),
  });
}

export function useGenerateRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (month: string): Promise<{ created: number; skipped: string[] }> => {
      const [y, m] = month.split("-").map(Number);

      // 1. fetch active rules with category info
      const { data: rules, error: rErr } = await supabase
        .from("recurring_rules")
        .select("id, name, type, amount, category_id, is_fixed, day_of_month, start_date, interval_months, end_date, category:categories(id, name, is_active)")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .eq("is_active", true);
      if (rErr) throw rErr;
      if (!rules || rules.length === 0) return { created: 0, skipped: [] };

      // 2. separate rules: skip those with inactive category
      const skipped: string[] = [];
      const eligible = rules.filter((r: any) => {
        if (r.category_id && r.category && r.category.is_active === false) {
          skipped.push(r.name || "Senza nome");
          return false;
        }
        return true;
      });

      if (eligible.length === 0) return { created: 0, skipped };

      // 3. filter by interval_months + end_date
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
      const targetEligible = eligible.filter((r: any) => {
        // Check end_date: if set, rule must not have ended before this month
        if (r.end_date && r.end_date < monthStart) return false;

        const sd = new Date(r.start_date);
        const startYear = sd.getFullYear();
        const startMonth = sd.getMonth(); // 0-indexed
        const monthsDiff = (y - startYear) * 12 + (m - 1 - startMonth);
        if (monthsDiff < 0) return false; // rule hasn't started yet
        const interval = r.interval_months || 1;
        return monthsDiff % interval === 0;
      });

      if (targetEligible.length === 0) return { created: 0, skipped };

      // 3. fetch existing generated transactions for the month
      const startDate = `${month}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

      const { data: existing, error: eErr } = await supabase
        .from("transactions")
        .select("recurring_rule_id")
        .eq("workspace_id", DEFAULT_WORKSPACE_ID)
        .eq("source", "recurring_generated")
        .gte("date", startDate)
        .lte("date", endDate);
      if (eErr) throw eErr;

      const existingIds = new Set((existing || []).map((t: any) => t.recurring_rule_id));

      // 5. build inserts for missing
      const toInsert = targetEligible
        .filter((r: any) => !existingIds.has(r.id))
        .map((r: any) => {
          const day = Math.min(r.day_of_month || 1, lastDay);
          const date = `${month}-${String(day).padStart(2, "0")}`;
          return {
            workspace_id: DEFAULT_WORKSPACE_ID,
            date,
            description: r.name,
            amount: r.amount,
            type: r.type,
            category_id: r.category_id,
            is_fixed: r.is_fixed,
            source: "recurring_generated" as const,
            recurring_rule_id: r.id,
          };
        });

      if (toInsert.length > 0) {
        const { error: iErr } = await supabase.from("transactions").insert(toInsert);
        if (iErr) throw iErr;
      }

      return { created: toInsert.length, skipped };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
