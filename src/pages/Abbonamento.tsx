import { useState } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Crown, Sparkles, ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AbbonamentoProps {
  onAccessGranted: () => void;
}

export default function Abbonamento({ onAccessGranted }: AbbonamentoProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Nessun URL di checkout ricevuto");
      }
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err?.message || "Impossibile avviare il pagamento. Riprova.",
        variant: "destructive",
      });
      setSubscribing(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSubmitting(true);

    // Refresh session so JWT email_verified claim is up-to-date
    await supabase.auth.refreshSession();

    // Redeem code via secure RPC (handles access_codes update + subscription insert server-side)
    const { error: rpcErr } = await supabase.rpc("redeem_access_code", { p_code: trimmed });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      let userMsg = "Impossibile attivare il codice. Riprova.";
      if (msg.includes("not authenticated") || msg.includes("not_authenticated")) {
        userMsg = "Devi effettuare l'accesso prima di riscattare un codice.";
      } else if (msg.includes("email_not_verified")) {
        userMsg = "Devi verificare la tua email prima di usare un codice di accesso.";
      } else if (msg.includes("invalid_code")) {
        userMsg = "Codice non trovato, già utilizzato o non associato a questa email.";
      }
      logger.error("[RedeemCode] RPC error:", msg);
      toast({
        title: "Errore",
        description: userMsg,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    toast({ title: "Accesso attivato!", description: "Benvenuto in TrackMyMoney Premium." });
    setCodeModalOpen(false);
    onAccessGranted();
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
            <Crown className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold">Sblocca TrackMyMoney</h1>
          <p className="text-muted-foreground">
            Per accedere alla dashboard è necessario un abbonamento Premium attivo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              TrackMyMoney Premium — €3,99 / mese
            </CardTitle>
            <CardDescription>
              Accesso completo alla gestione delle finanze personali.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Dashboard completa con analisi</li>
              <li>✓ Transazioni illimitate</li>
              <li>✓ Obiettivi di risparmio</li>
              <li>✓ Report e previsioni</li>
              <li>✓ Budget per categoria</li>
            </ul>
            <Button className="w-full" size="lg" onClick={handleSubscribe} disabled={subscribing}>
              {subscribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reindirizzamento a Stripe...
                </>
              ) : (
                "Abbonati — €3,99 / mese"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Rinnovo mensile automatico. Puoi annullare in qualsiasi momento.
            </p>
          </CardContent>
        </Card>

        {/* Tester access CTA */}
        <button
          type="button"
          onClick={() => setCodeModalOpen(true)}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ShieldCheck className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Ho un codice di accesso
        </button>

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

        {/* Access code modal */}
        <Dialog open={codeModalOpen} onOpenChange={setCodeModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Codice di Accesso
              </DialogTitle>
              <DialogDescription>
                Inserisci il codice ricevuto per attivare l'accesso tester.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access-code">Codice</Label>
                <Input
                  id="access-code"
                  type="text"
                  placeholder="es. TEST-ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={50}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Verifica in corso..." : "Attiva accesso"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
