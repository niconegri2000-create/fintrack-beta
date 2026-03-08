import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { materializeRecurringRules } from "@/lib/materializeRecurring";

const isDev = import.meta.env.DEV;

/**
 * Materializes all due recurring transactions up to today + 30 days at boot.
 * Returns { ready } so consumers can wait before querying data.
 */
export function useAutoGenerateRecurring() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  const ranForWorkspace = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    if (ranForWorkspace.current === workspaceId) return;
    ranForWorkspace.current = workspaceId;
    setReady(false);

    (async () => {
      try {
        if (isDev) logger.info("[RECURRING_DEBUG] boot materialization starting for workspace", workspaceId);

        const { data: rules, error: rErr } = await supabase
          .from("recurring_rules")
          .select("id, name, type, amount, category_id, is_fixed, day_of_month, start_date, interval_months, end_date, account_id, category:categories(id, name, is_active)")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true);

        if (rErr) {
          logger.error("[RECURRING_ERROR] error fetching rules:", rErr);
          setReady(true);
          return;
        }

        // Filter out rules whose category is inactive
        const eligible = (rules || []).filter((r: any) => {
          if (r.category_id && r.category && r.category.is_active === false) return false;
          return true;
        });

        const count = await materializeRecurringRules(workspaceId, eligible as any);

        if (count > 0) {
          qc.invalidateQueries({ queryKey: ["transactions"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["forecast"] });
          qc.invalidateQueries({ queryKey: ["accounts"] });
        }
      } catch (err) {
        logger.error("[RECURRING_ERROR] unexpected:", err);
      } finally {
        setReady(true);
        if (isDev) logger.info("[RECURRING_DEBUG] boot materialization complete, ready=true");
      }
    })();
  }, [workspaceId, qc]);

  return { ready };
}
