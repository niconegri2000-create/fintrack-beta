import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

/**
 * Subscribes to Supabase realtime changes on key tables
 * scoped by workspace_id. Logs all events with [RT] prefix.
 */
export function useRealtimeSync() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  const lastEventRef = useRef<{ table: string; event: string; id: string; ts: number } | null>(null);

  useEffect(() => {
    console.info(`[RT] subscribing | workspaceId=${workspaceId}`);

    const logAndInvalidate = (table: string, payload: any, keys: string[][]) => {
      const eventType = payload.eventType;
      const recordId = payload.new?.id ?? payload.old?.id ?? "unknown";
      const wsId = payload.new?.workspace_id ?? payload.old?.workspace_id ?? "n/a";
      console.info(`[RT] event | table=${table} | type=${eventType} | id=${recordId} | workspace_id=${wsId}`);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("transactions", payload, [
          ["transactions"], ["dashboard"], ["forecast"], ["report"], ["category_spending"],
          ["historical_monthly_totals"],
        ])
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("accounts", payload, [
          ["accounts"], ["accounts-all"], ["forecast"], ["dashboard"],
        ])
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_rules", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("recurring_rules", payload, [
          ["recurring_rules"], ["forecast"],
        ])
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("goals", payload, [["goals"]])
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_contributions", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => logAndInvalidate("goal_contributions", payload, [
          ["goal_contributions"], ["goals"],
        ])
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => logAndInvalidate("categories", payload, [
          ["categories"], ["category_budgets"], ["categories_names"],
        ])
      )
      .subscribe((status) => {
        console.info(`[RT] subscription status=${status} | workspaceId=${workspaceId}`);
      });

    return () => {
      console.info(`[RT] unsubscribing | workspaceId=${workspaceId}`);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
