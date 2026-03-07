import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

const MAX_HISTORY_MONTHS = 24;
const isDev = import.meta.env.DEV;

function logSync(msg: string, ...args: unknown[]) {
  if (isDev) logger.info(`[RECURRING_SYNC] ${msg}`, ...args);
}

/**
 * Materializes all due recurring transactions up to today + 30 days.
 * Returns { ready } so consumers can wait before querying data.
 */
export function useAutoGenerateRecurring() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  const ran = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        logSync("checking due recurring transactions");

        const { data: rules, error: rErr } = await supabase
          .from("recurring_rules")
          .select("id, name, type, amount, category_id, is_fixed, day_of_month, start_date, interval_months, end_date, account_id, category:categories(id, name, is_active)")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true);
        if (rErr || !rules || rules.length === 0) {
          logSync("no active rules found, marking ready");
          setReady(true);
          return;
        }

        const eligible = rules.filter((r: any) => {
          if (r.category_id && r.category && r.category.is_active === false) return false;
          return true;
        });
        if (eligible.length === 0) {
          logSync("no eligible rules after filtering, marking ready");
          setReady(true);
          return;
        }

        const today = new Date();
        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 30);

        const earliestAllowed = new Date(today);
        earliestAllowed.setMonth(earliestAllowed.getMonth() - MAX_HISTORY_MONTHS);
        const earliestStr = earliestAllowed.toISOString().slice(0, 10);

        const allInserts: Array<{
          workspace_id: string; date: string; description: string | null;
          amount: number; type: string; category_id: string | null;
          is_fixed: boolean; source: string; recurring_rule_id: string; account_id: string;
        }> = [];

        const ruleIds = eligible.map((r: any) => r.id);

        const { data: existing, error: eErr } = await supabase
          .from("transactions")
          .select("recurring_rule_id, date")
          .eq("workspace_id", workspaceId)
          .eq("source", "recurring_generated")
          .in("recurring_rule_id", ruleIds);
        if (eErr) {
          logSync("error fetching existing transactions, marking ready anyway");
          setReady(true);
          return;
        }

        const existingSet = new Set(
          (existing || []).map((t: any) => `${t.recurring_rule_id}_${t.date}`)
        );

        // Pre-fetch recurring tags for all eligible rules
        const { data: allRecurringTags } = await supabase
          .from("recurring_tags")
          .select("recurring_id, tag_id")
          .in("recurring_id", ruleIds);
        const recurringTagMap = new Map<string, string[]>();
        for (const rt of (allRecurringTags || []) as any[]) {
          const list = recurringTagMap.get(rt.recurring_id) || [];
          list.push(rt.tag_id);
          recurringTagMap.set(rt.recurring_id, list);
        }

        for (const rule of eligible as any[]) {
          const sd = new Date(rule.start_date);
          const interval = rule.interval_months || 1;
          const endDate = rule.end_date ? new Date(rule.end_date) : null;

          const effectiveStart = rule.start_date < earliestStr
            ? new Date(earliestAllowed.getFullYear(), earliestAllowed.getMonth(), 1)
            : new Date(sd.getFullYear(), sd.getMonth(), 1);

          let current = new Date(effectiveStart);

          while (current <= horizon) {
            const y = current.getFullYear();
            const m = current.getMonth();
            const monthsDiff = (y - sd.getFullYear()) * 12 + (m - sd.getMonth());
            if (monthsDiff >= 0 && monthsDiff % interval === 0) {
              const lastDay = new Date(y, m + 1, 0).getDate();
              const day = Math.min(rule.day_of_month || 1, lastDay);
              const occDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              if (endDate && occDate > rule.end_date) break;
              if (occDate >= rule.start_date) {
                const key = `${rule.id}_${occDate}`;
                if (!existingSet.has(key)) {
                  existingSet.add(key);
                  allInserts.push({
                    workspace_id: workspaceId, date: occDate, description: rule.name,
                    amount: rule.amount, type: rule.type, category_id: rule.category_id,
                    is_fixed: rule.is_fixed, source: "recurring_generated",
                    recurring_rule_id: rule.id, account_id: rule.account_id,
                  });
                  logSync(`created occurrence for recurring_rule_id=${rule.id} date=${occDate}`);
                } else {
                  logSync(`skipped existing occurrence for recurring_rule_id=${rule.id} date=${occDate}`);
                }
              }
            }
            current.setMonth(current.getMonth() + 1);
          }
        }

        if (allInserts.length > 0) {
          logSync(`inserting ${allInserts.length} materialized transactions`);
          const { data: insertedRows, error: iErr } = await supabase
            .from("transactions")
            .upsert(allInserts, { onConflict: "workspace_id,recurring_rule_id,date", ignoreDuplicates: true })
            .select("id, recurring_rule_id");
          
          if (iErr) {
            logger.error("[RECURRING_SYNC] Auto-generate recurring error:", iErr);
          } else {
            // Propagate tags from recurring rules to generated transactions
            const tagInserts: Array<{ transaction_id: string; tag_id: string }> = [];
            for (const row of (insertedRows || []) as any[]) {
              const tags = recurringTagMap.get(row.recurring_rule_id);
              if (tags) {
                for (const tagId of tags) {
                  tagInserts.push({ transaction_id: row.id, tag_id: tagId });
                }
              }
            }
            if (tagInserts.length > 0) {
              await supabase.from("transaction_tags").upsert(tagInserts, { onConflict: "transaction_id,tag_id", ignoreDuplicates: true });
            }

            logSync(`done, invalidating queries`);
            qc.invalidateQueries({ queryKey: ["transactions"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["forecast"] });
          }
        } else {
          logSync("no new transactions to materialize");
        }
      } catch (err) {
        logger.error("[RECURRING_SYNC] Auto-generate recurring error:", err);
      } finally {
        setReady(true);
      }
    })();
  }, [workspaceId, qc]);

  return { ready };
}
