import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

/**
 * Forces invalidation of ALL financial queries when the page becomes visible
 * after being hidden (critical for mobile browsers that suspend tabs).
 *
 * React Query's built-in refetchOnWindowFocus uses the 'focus' event,
 * which does NOT reliably fire on mobile browsers when returning from
 * background. The 'visibilitychange' event is more reliable on mobile.
 */
export function useVisibilityRefresh() {
  const qc = useQueryClient();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const STALE_THRESHOLD_MS = 5_000; // 5 seconds hidden → force refetch

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      // visible again
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (!hiddenAt) return;

      const elapsed = Date.now() - hiddenAt;
      if (elapsed < STALE_THRESHOLD_MS) return;

      if (import.meta.env.DEV) {
        logger.info(`[VISIBILITY] tab resumed after ${(elapsed / 1000).toFixed(1)}s → invalidating all queries`);
      }

      // Invalidate everything — covers all financial, budget, category, forecast queries
      qc.invalidateQueries();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [qc]);
}
