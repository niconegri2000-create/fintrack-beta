import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const MAX_HISTORY_MONTHS = 24;
const isDev = import.meta.env.DEV;

function log(msg: string, ...args: unknown[]) {
  if (isDev) logger.info(`[RECURRING_DEBUG] ${msg}`, ...args);
}

interface RecurringRule {
  id: string;
  name: string | null;
  type: string;
  amount: number;
  category_id: string | null;
  is_fixed: boolean | null;
  day_of_month: number | null;
  start_date: string;
  interval_months: number;
  end_date: string | null;
  account_id: string;
}

/**
 * Materialize due transactions for a set of recurring rules.
 * Can be called at boot (all rules) or after creating/updating a single rule.
 * Returns the number of new transactions created.
 */
export async function materializeRecurringRules(
  workspaceId: string,
  rules: RecurringRule[]
): Promise<number> {
  if (rules.length === 0) {
    log("no rules to materialize");
    return 0;
  }

  log(`active rules found: ${rules.length}`);

  const today = new Date();
  // Materialize only due occurrences (up to today, NOT future)
  const horizon = today;

  const earliestAllowed = new Date(today);
  earliestAllowed.setMonth(earliestAllowed.getMonth() - MAX_HISTORY_MONTHS);
  const earliestStr = earliestAllowed.toISOString().slice(0, 10);

  const ruleIds = rules.map((r) => r.id);

  // Fetch existing generated transactions for these rules
  const { data: existing, error: eErr } = await supabase
    .from("transactions")
    .select("recurring_rule_id, date")
    .eq("workspace_id", workspaceId)
    .eq("source", "recurring_generated")
    .in("recurring_rule_id", ruleIds);

  if (eErr) {
    logger.error("[RECURRING_ERROR] error fetching existing transactions:", eErr);
    return 0;
  }

  const existingSet = new Set(
    (existing || []).map((t: any) => `${t.recurring_rule_id}_${t.date}`)
  );

  log(`existing materialized transactions for these rules: ${existingSet.size}`);

  // Pre-fetch recurring tags
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

  // Calculate all due occurrences
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

  for (const rule of rules) {
    const sd = new Date(rule.start_date);
    const interval = rule.interval_months || 1;
    const endDate = rule.end_date ? new Date(rule.end_date) : null;

    const effectiveStart =
      rule.start_date < earliestStr
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

        if (endDate && occDate > rule.end_date!) break;

        if (occDate >= rule.start_date) {
          const key = `${rule.id}_${occDate}`;
          if (!existingSet.has(key)) {
            existingSet.add(key);
            allInserts.push({
              workspace_id: workspaceId,
              date: occDate,
              description: rule.name,
              amount: rule.amount,
              type: rule.type,
              category_id: rule.category_id,
              is_fixed: rule.is_fixed ?? true,
              source: "recurring_generated",
              recurring_rule_id: rule.id,
              account_id: rule.account_id,
            });
            log(`creating transaction for recurring_rule_id=${rule.id} date=${occDate}`);
          } else {
            log(`existing occurrence skipped: recurring_rule_id=${rule.id} date=${occDate}`);
          }
        }
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  log(`due occurrences found: ${allInserts.length}`);

  if (allInserts.length === 0) return 0;

  // Insert in batches, handling unique constraint conflicts gracefully
  const insertResults: Array<{ id: string; recurring_rule_id: string }> = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < allInserts.length; i += BATCH_SIZE) {
    const batch = allInserts.slice(i, i + BATCH_SIZE);
    const { data: rows, error: iErr } = await supabase
      .from("transactions")
      .insert(batch)
      .select("id, recurring_rule_id");

    if (iErr) {
      if (iErr.code === "23505") {
        // Batch had a conflict — fall back to individual inserts for this batch
        log(`batch conflict detected, falling back to individual inserts for batch starting at index ${i}`);
        for (const ins of batch) {
          const { data: row, error: singleErr } = await supabase
            .from("transactions")
            .insert(ins)
            .select("id, recurring_rule_id")
            .single();
          if (singleErr) {
            if (singleErr.code === "23505") {
              log(`duplicate skipped for recurring_rule_id=${ins.recurring_rule_id} date=${ins.date}`);
            } else {
              logger.error("[RECURRING_ERROR]", singleErr, ins);
            }
          } else if (row) {
            insertResults.push(row);
          }
        }
      } else {
        logger.error("[RECURRING_ERROR] batch insert failed:", iErr);
      }
    } else if (rows) {
      for (const row of rows) {
        log(`transaction created id=${row.id} recurring_rule_id=${row.recurring_rule_id}`);
      }
      insertResults.push(...rows);
    }
  }

  // Propagate tags
  if (insertResults.length > 0) {
    const tagInserts: Array<{ transaction_id: string; tag_id: string }> = [];
    for (const row of insertResults) {
      const tags = recurringTagMap.get(row.recurring_rule_id);
      if (tags) {
        for (const tagId of tags) {
          tagInserts.push({ transaction_id: row.id, tag_id: tagId });
        }
      }
    }
    if (tagInserts.length > 0) {
      await supabase
        .from("transaction_tags")
        .upsert(tagInserts, { onConflict: "transaction_id,tag_id", ignoreDuplicates: true });
    }
  }

  log(`materialization complete: ${insertResults.length} new transactions created`);
  return insertResults.length;
}
