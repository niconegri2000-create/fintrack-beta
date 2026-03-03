import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Dev-only debug panel showing boot state, workspace, auth, and realtime events.
 * Only renders when import.meta.env.DEV is true.
 */
export function DevDiagnostics() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [lastRtEvent, setLastRtEvent] = useState<{ table: string; event: string; id: string; ts: number } | null>(null);
  const qc = useQueryClient();

  // Listen for RT events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLastRtEvent(detail);
    };
    window.addEventListener("fintrack-rt-event", handler);
    return () => window.removeEventListener("fintrack-rt-event", handler);
  }, []);

  const getActiveQueryKeys = useCallback(() => {
    const cache = qc.getQueryCache();
    const queries = cache.getAll();
    return queries
      .filter((q) => q.state.status !== "error" && q.observers.length > 0)
      .map((q) => JSON.stringify(q.queryKey))
      .slice(0, 15);
  }, [qc]);

  if (!import.meta.env.DEV) return null;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "NOT SET";

  // Read cached workspace from localStorage
  const cachedWs = (() => {
    try { return localStorage.getItem("fintrack_workspace_id") ?? "null"; } catch { return "err"; }
  })();

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-0 left-0 z-[9999] bg-black/80 text-[10px] text-green-400 font-mono px-3 py-1 hover:bg-black/90"
      >
        🐛 Debug
      </button>
    );
  }

  const activeKeys = getActiveQueryKeys();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/90 text-[10px] text-green-400 font-mono px-3 py-2 max-h-[40vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-green-300">🐛 DEBUG PANEL</span>
        <button onClick={() => setExpanded(false)} className="text-red-400 hover:text-red-300">✕</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
        <div>
          <span className="text-green-600">project:</span> {projectId}
        </div>
        <div>
          <span className="text-green-600">route:</span> {location.pathname}
        </div>
        <div>
          <span className="text-green-600">ws (cache):</span> {cachedWs.slice(0, 8)}…
        </div>
        <div>
          <span className="text-green-600">rt last:</span>{" "}
          {lastRtEvent
            ? `${lastRtEvent.table}.${lastRtEvent.event} ${lastRtEvent.id.slice(0, 8)}… ${((Date.now() - lastRtEvent.ts) / 1000).toFixed(0)}s ago`
            : "none"}
        </div>
      </div>

      {/* Active query keys */}
      <div className="mt-1">
        <span className="text-green-600">active queries ({activeKeys.length}):</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {activeKeys.map((k, i) => (
            <span key={i} className="bg-green-900/40 px-1 rounded text-[9px]">{k}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
