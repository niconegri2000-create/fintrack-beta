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
  } catch { /* noop */ }
}

/**
 * Calls ensure_user_bootstrap(user_id) on mount.
 * Always validates workspace from DB — never trusts cached values.
 * On mismatch or failure: clears cache, retries automatically.
 */
export function WorkspaceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const queryClient = useQueryClient();

  const bootstrap = useCallback(async (signal: AbortSignal) => {
    try {
      const { data, error: rpcError } = await supabase.rpc("ensure_user_bootstrap", {
        p_user_id: userId,
      });

      if (signal.aborted) return;

      if (rpcError) {
        console.error("Bootstrap error:", rpcError);
        // Clear stale cache and retry once
        clearWorkspaceCache();
        queryClient.clear();
        setError("Errore durante l'inizializzazione del workspace.");
        return;
      }

      if (data) {
        const freshId = data as string;
        // Check for workspace mismatch with cached value
        try {
          const cachedId = localStorage.getItem(WS_STORAGE_KEY);
          if (cachedId && cachedId !== freshId) {
            // Workspace changed — clear all stale caches
            clearWorkspaceCache();
            queryClient.clear();
          }
          localStorage.setItem(WS_STORAGE_KEY, freshId);
        } catch { /* noop */ }

        setWorkspaceId(freshId);
        setError(null);
      } else {
        setError("Workspace non trovato.");
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error("Bootstrap error:", err);
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
