import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { logger } from "@/lib/logger";

/**
 * Subscribes to Supabase realtime changes on ALL key tables
 * scoped by workspace_id. Logs all events with [RT] prefix.
 */
export function useRealtimeSync() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  const lastEventRef = useRef<{ table: string; event: string; id: string; ts: number } | null>(null);

  useEffect(() => {
    logger.info(`[RT] subscribing | workspaceId=${workspaceId}`);

    const logAndInvalidate = (table: string, payload: any, keys: string[][]) => {
      const eventType = payload.eventType;
      const recordId = payload.new?.id ?? payload.old?.id ?? "unknown";
      const wsId = payload.new?.workspace_id ?? payload.old?.workspace_id ?? "n/a";
      logger.info(`[RT] event | table=${table} | type=${eventType} | id=${recordId} | workspace_id=${wsId}`);
      logger.info(`[RT] invalidating keys: ${keys.map(k => k[0]).join(", ")}`);
      lastEventRef.current = { table, event: eventType, id: recordId, ts: Date.now() };

      // Emit custom event for debug panel
      try {
        window.dispatchEvent(new CustomEvent("fintrack-rt-event", { detail: lastEventRef.current }));
      } catch { /* noop */ }

      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key });
      }
    };

    const channel = supabase
      .channel(`workspace-sync-${workspaceId}`)
      // transactions
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("transactions", payload, [
          ["transactions"], ["dashboard"], ["forecast"], ["report"], ["category_spending"],
          ["historical_monthly_totals"], ["accounts"], ["accounts-all"],
        ])
      )
      // accounts
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("accounts", payload, [
          ["accounts"], ["accounts-all"], ["forecast"], ["dashboard"],
        ])
      )
      // recurring_rules
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_rules", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("recurring_rules", payload, [
          ["recurring_rules"], ["forecast"], ["transactions"], ["dashboard"],
        ])
      )
      // goals
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("goals", payload, [["goals"]])
      )
      // goal_contributions
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_contributions", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("goal_contributions", payload, [
          ["goal_contributions"], ["goals"],
        ])
      )
      // categories
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("categories", payload, [
          ["categories"], ["category_budgets"], ["categories_names"],
          ["dashboard"], ["report"], ["category_spending"],
        ])
      )
      // category_budgets — WAS MISSING
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "category_budgets", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("category_budgets", payload, [
          ["category_budgets"], ["category_spending"], ["dashboard"],
        ])
      )
      // transfers — WAS MISSING
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfers", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("transfers", payload, [
          ["transfers"], ["transactions"], ["accounts"], ["accounts-all"],
          ["dashboard"], ["forecast"],
        ])
      )
      // budget_settings — WAS MISSING
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budget_settings", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("budget_settings", payload, [
          ["budget_settings"], ["category_budgets"], ["category_spending"],
        ])
      )
      .subscribe((status) => {
        logger.info(`[RT] subscription status=${status} | workspaceId=${workspaceId}`);
      });

    return () => {
      logger.info(`[RT] unsubscribing | workspaceId=${workspaceId}`);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
