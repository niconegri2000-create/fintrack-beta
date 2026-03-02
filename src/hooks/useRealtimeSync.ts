import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

/**
 * Subscribes to Supabase realtime changes on key tables
 * scoped by workspace_id. Any insert/update/delete invalidates
 * the relevant React Query caches so all devices stay in sync.
 */
export function useRealtimeSync() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`workspace-sync-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["transactions"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["forecast"] });
          qc.invalidateQueries({ queryKey: ["report"] });
          qc.invalidateQueries({ queryKey: ["category_spending"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["accounts"] });
          qc.invalidateQueries({ queryKey: ["accounts-all"] });
          qc.invalidateQueries({ queryKey: ["forecast"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_rules", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["recurring_rules"] });
          qc.invalidateQueries({ queryKey: ["forecast"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["goals"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_contributions", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["goal_contributions"] });
          qc.invalidateQueries({ queryKey: ["goals"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          qc.invalidateQueries({ queryKey: ["categories"] });
          qc.invalidateQueries({ queryKey: ["category_budgets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
