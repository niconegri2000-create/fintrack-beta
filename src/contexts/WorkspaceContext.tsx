import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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

/**
 * Calls ensure_user_bootstrap(user_id) on mount.
 * Blocks rendering until the workspace is resolved.
 */
export function WorkspaceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("ensure_user_bootstrap", {
          p_user_id: userId,
        });

        if (cancelled) return;

        if (rpcError) {
          console.error("Bootstrap error:", rpcError);
          setError("Errore durante l'inizializzazione del workspace.");
          return;
        }

        if (data) {
          setWorkspaceId(data as string);
        } else {
          setError("Workspace non trovato.");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Bootstrap error:", err);
          setError("Errore durante l'inizializzazione.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
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
