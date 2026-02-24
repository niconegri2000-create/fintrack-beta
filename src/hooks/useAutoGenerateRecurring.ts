import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

/**
 * MIGRATION NOTES (future SaaS migration)
 * ─────────────────────────────────────────
 * When migrating to full multi-tenant SaaS:
 *
 * 1. Add columns to `transactions`:
 *    - occurrence_date (date, nullable) — explicit occurrence date
 *    - Ensure `source` values are consistent ('recurring_generated')
 *
 * 2. Add to `recurring_rules`:
 *    - last_generated_at (timestamptz, nullable) — enables incremental generation
 *
 * 3. DB unique index already exists:
 *    uq_transactions_recurring_occurrence (workspace_id, recurring_rule_id, date)
 *    WHERE recurring_rule_id IS NOT NULL
 *
 * 4. Switch anti-duplicate strategy:
 *    - Current: fetch existing + in-memory Set + DB unique index (on conflict ignore)
 *    - Future:  use last_generated_at for incremental-only generation
 *
 * 5. RLS policies: replace USING(true) with auth.uid()-based policies
 * 6. Move generation to Edge Function / cron for server-side execution
 */

const MAX_HISTORY_MONTHS = 24; // Safety cap: never generate more than 24 months back

export function useAutoGenerateRecurring(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        // 1. Fetch active rules with category
        const { data: rules, error: rErr } = await supabase
          .from("recurring_rules")
          .select("id, name, type, amount, category_id, is_fixed, day_of_month, start_date, interval_months, end_date, account_id, category:categories(id, name, is_active)")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true);
        if (rErr || !rules || rules.length === 0) return;

        // 2. Filter out rules with inactive category
        const eligible = rules.filter((r: any) => {
          if (r.category_id && r.category && r.category.is_active === false) return false;
          return true;
        });
        if (eligible.length === 0) return;

        // 3. Determine generation horizon: today + 30 days
        const today = new Date();
        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 30);

        // 4. Compute the earliest allowed start (cap at MAX_HISTORY_MONTHS)
        const earliestAllowed = new Date(today);
        earliestAllowed.setMonth(earliestAllowed.getMonth() - MAX_HISTORY_MONTHS);
        const earliestStr = earliestAllowed.toISOString().slice(0, 10);

        // 5. For each rule, compute all occurrence months from start_date to horizon
        const allInserts: Array<{
          workspace_id: string;
          date: string;
          description: string | null;
          amount: number;
          type: string;
          category_id: string | null;
          is_fixed: boolean;
          source: string;
          recurring_rule_id: string;
          account_id: string;
        }> = [];

        const ruleIds = eligible.map((r: any) => r.id);

        // 6. Fetch ALL existing generated transactions for these rules (anti-duplicate layer 1)
        const { data: existing, error: eErr } = await supabase
          .from("transactions")
          .select("recurring_rule_id, date")
          .eq("workspace_id", workspaceId)
          .eq("source", "recurring_generated")
          .in("recurring_rule_id", ruleIds);
        if (eErr) return;

        const existingSet = new Set(
          (existing || []).map((t: any) => `${t.recurring_rule_id}_${t.date}`)
        );

        for (const rule of eligible as any[]) {
          const sd = new Date(rule.start_date);
          const interval = rule.interval_months || 1;
          const endDate = rule.end_date ? new Date(rule.end_date) : null;

          // Apply history cap: effective start is max(start_date, earliestAllowed)
          const effectiveStart = rule.start_date < earliestStr
            ? new Date(earliestAllowed.getFullYear(), earliestAllowed.getMonth(), 1)
            : new Date(sd.getFullYear(), sd.getMonth(), 1);

          // Walk through months from effectiveStart
          let current = new Date(effectiveStart);

          while (current <= horizon) {
            const y = current.getFullYear();
            const m = current.getMonth();

            // Check interval alignment relative to original start_date
            const monthsDiff = (y - sd.getFullYear()) * 12 + (m - sd.getMonth());
            if (monthsDiff >= 0 && monthsDiff % interval === 0) {
              const lastDay = new Date(y, m + 1, 0).getDate();
              const day = Math.min(rule.day_of_month || 1, lastDay);
              const occDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

              // Check end_date
              if (endDate && occDate > rule.end_date) break;

              // Only generate if on or after original start_date
              if (occDate >= rule.start_date) {
                const key = `${rule.id}_${occDate}`;
                if (!existingSet.has(key)) {
                  existingSet.add(key); // prevent intra-batch duplicates
                  allInserts.push({
                    workspace_id: workspaceId,
                    date: occDate,
                    description: rule.name,
                    amount: rule.amount,
                    type: rule.type,
                    category_id: rule.category_id,
                    is_fixed: rule.is_fixed,
                    source: "recurring_generated",
                    recurring_rule_id: rule.id,
                    account_id: rule.account_id,
                  });
                }
              }
            }

            current.setMonth(current.getMonth() + 1);
          }
        }

        // 7. Batch insert with ON CONFLICT DO NOTHING (DB-level idempotency)
        // The unique partial index uq_transactions_recurring_occurrence
        // on (workspace_id, recurring_rule_id, date) WHERE recurring_rule_id IS NOT NULL
        // guarantees no duplicates even with concurrent tabs.
        if (allInserts.length > 0) {
          const { error: iErr } = await supabase
            .from("transactions")
            .upsert(allInserts, {
              onConflict: "workspace_id,recurring_rule_id,date",
              ignoreDuplicates: true,
            });
          if (iErr) console.error("Auto-generate recurring error:", iErr);
          else {
            qc.invalidateQueries({ queryKey: ["transactions"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }
        }
      } catch (err) {
        console.error("Auto-generate recurring error:", err);
      }
    })();
  }, [workspaceId, qc]);
}
