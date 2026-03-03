import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface WorkspaceContextValue {
  workspaceId: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function useWorkspaceId(): string {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceId must be used within WorkspaceProvider");
  return ctx.workspaceId;
}

const WS_STORAGE_KEY = "fintrack_workspace_id";

function clearWorkspaceCache() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("selected_account_") || key === WS_STORAGE_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    console.info("[BOOT] cleared workspace cache keys:", keysToRemove);
  } catch { /* noop */ }
}

const BACKOFF_DELAYS = [250, 500, 1000];

async function rpcWithRetry<T>(
  fn: () => Promise<{ data: T; error: any }>,
  label: string
): Promise<{ data: T; error: any }> {
  for (let attempt = 0; attempt <= BACKOFF_DELAYS.length; attempt++) {
    const result = await fn();
    if (!result.error) return result;
    
    if (attempt < BACKOFF_DELAYS.length) {
      const delay = BACKOFF_DELAYS[attempt];
      console.warn(`[BOOT] ${label} failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, result.error.message);
      await new Promise((r) => setTimeout(r, delay));
    } else {
      return result; // final failure
    }
  }
  // unreachable
  return { data: null as any, error: { message: "exhausted retries" } };
}

export function WorkspaceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const queryClient = useQueryClient();

  const bootstrap = useCallback(async (signal: AbortSignal) => {
    const t0 = performance.now();
    console.info(`[BOOT] start | userId=${userId} | timestamp=${new Date().toISOString()}`);

    try {
      // Step 0: Validate session is still alive (Safari fix)
      const { data: sessionData } = await supabase.auth.getSession();
      if (signal.aborted) return;
      if (!sessionData.session) {
        console.warn("[BOOT] no active session during bootstrap — aborting");
        setError("Sessione scaduta. Effettua nuovamente il login.");
        return;
      }

      // Step 1: ensure bootstrap (idempotent) with retry
      console.info("[BOOT] ensure_user_bootstrap → start");
      const { data: bootstrapWid, error: rpcError } = await rpcWithRetry(
        () => Promise.resolve(supabase.rpc("ensure_user_bootstrap", { p_user_id: userId })),
        "ensure_user_bootstrap"
      );
      if (signal.aborted) return;
      console.info(`[BOOT] ensure_user_bootstrap → end | result=${bootstrapWid} | error=${rpcError?.message ?? "none"} | ${(performance.now() - t0).toFixed(0)}ms`);

      if (rpcError) {
        console.error("[BOOT] bootstrap RPC failed:", rpcError);
        clearWorkspaceCache();
        queryClient.clear();
        setError("Errore durante l'inizializzazione del workspace.");
        return;
      }

      // Step 2: authoritative fetch from DB with retry
      console.info("[BOOT] get_user_workspace_id → start");
      const { data: dbWid, error: fetchErr } = await rpcWithRetry(
        () => Promise.resolve(supabase.rpc("get_user_workspace_id")),
        "get_user_workspace_id"
      );
      if (signal.aborted) return;
      console.info(`[BOOT] get_user_workspace_id → end | wid=${dbWid} | error=${fetchErr?.message ?? "none"} | ${(performance.now() - t0).toFixed(0)}ms`);

      if (fetchErr || !dbWid) {
        console.error("[BOOT] workspace fetch failed or null:", fetchErr);
        clearWorkspaceCache();
        queryClient.clear();
        setError("Workspace non trovato.");
        return;
      }

      const freshId = dbWid as string;

      // Step 3: mismatch detection
      try {
        const cachedId = localStorage.getItem(WS_STORAGE_KEY);
        if (cachedId && cachedId !== freshId) {
          console.warn(`[BOOT] MISMATCH! cached=${cachedId} vs db=${freshId} — clearing all caches`);
          clearWorkspaceCache();
          queryClient.clear();
        }
        localStorage.setItem(WS_STORAGE_KEY, freshId);
      } catch { /* noop */ }

      // Step 4: set state → unblock children
      console.info(`[BOOT] setState workspaceId=${freshId} | total=${(performance.now() - t0).toFixed(0)}ms | render children`);
      setWorkspaceId(freshId);
      setError(null);
    } catch (err) {
      if (!signal.aborted) {
        console.error("[BOOT] unexpected error:", err);
        clearWorkspaceCache();
        queryClient.clear();
        setError("Errore durante l'inizializzazione.");
      }
    }
  }, [userId, queryClient]);

  useEffect(() => {
    const controller = new AbortController();
    setWorkspaceId(null);
    setError(null);
    bootstrap(controller.signal);
    return () => controller.abort();
  }, [bootstrap, retryCount]);

  const handleRetry = useCallback(() => {
    console.info("[BOOT] manual retry triggered");
    clearWorkspaceCache();
    queryClient.clear();
    setRetryCount((c) => c + 1);
  }, [queryClient]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={handleRetry} className="text-sm text-primary hover:underline">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Inizializzazione…</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
