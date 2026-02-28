import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AbbonamentoProps {
  onAccessGranted: () => void;
}

export default function Abbonamento({ onAccessGranted }: AbbonamentoProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setSubmitting(true);

    const { data, error: fetchErr } = await supabase
      .from("invites")
      .select("*")
      .eq("invite_code", code.trim())
      .eq("email", user.email)
      .eq("used", false)
      .limit(1);

    if (fetchErr || !data || data.length === 0) {
      toast({
        title: "Codice non valido",
        description: "Il codice inserito non è valido o è già stato utilizzato.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from("invites")
      .update({ used: true })
      .eq("id", data[0].id);

    if (updateErr) {
      toast({
        title: "Errore",
        description: "Impossibile attivare il codice. Riprova.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    toast({ title: "Accesso attivato!", description: "Benvenuto in FinTrack Beta." });
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
          <h1 className="text-3xl font-bold">Sblocca FinTrack</h1>
          <p className="text-muted-foreground">
            Per accedere alla dashboard hai bisogno di un abbonamento attivo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Piano Premium
            </CardTitle>
            <CardDescription>
              Gestione completa delle finanze personali
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
            <Button className="w-full" size="lg" disabled>
              Prossimamente
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Il sistema di pagamento sarà disponibile a breve.
            </p>
          </CardContent>
        </Card>

        {/* Tester access CTA */}
        {!showCodeInput ? (
          <button
            type="button"
            onClick={() => setShowCodeInput(true)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldCheck className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Hai un codice di accesso?
          </button>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="access-code">Codice di Accesso</Label>
              <Input
                id="access-code"
                type="text"
                placeholder="es. BETA-XXXX-YYYY"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
              {submitting ? "Verifica in corso..." : "Attiva accesso"}
            </Button>
          </form>
        )}

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
