import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInviteValidation } from "@/hooks/useInviteValidation";
import { Skeleton } from "@/components/ui/skeleton";

interface InviteGateProps {
  children: React.ReactNode;
}

export function InviteGate({ children }: InviteGateProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { status, error, validateCode } = useInviteValidation(user);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (status === "valid") {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await validateCode(code);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-accent-foreground mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Accesso Beta</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci il codice invito ricevuto via email per accedere a FinTrack Beta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Codice Invito</Label>
            <Input
              id="invite-code"
              type="text"
              placeholder="es. BETA-XXXX-YYYY"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          {status === "error" && (
            <p className="text-sm text-destructive font-medium">
              Errore nel controllo dell'invito. Riprova più tardi.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Verifica in corso..." : "Verifica codice"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Esci
          </button>
        </div>
      </div>
    </div>
  );
}
