import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const UI_KEYS_PREFIXES = [
  "fintrack",
  "selected_account_",
  "app_preferences",
  "account_management_prefs",
];

/** Keys to NEVER remove (needed for bootstrap) */
const PROTECTED_KEYS = ["fintrack_workspace_id"];

function getResettableKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      UI_KEYS_PREFIXES.some((p) => key.startsWith(p)) &&
      !PROTECTED_KEYS.includes(key)
    ) {
      keys.push(key);
    }
  }
  return keys;
}

export function DebugSection() {
  const { toast } = useToast();

  const handleReset = () => {
    const keys = getResettableKeys();
    keys.forEach((k) => localStorage.removeItem(k));
    toast({
      title: "Preferenze ripristinate",
      description: "Ricarico l'app…",
    });
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-lg">Ripristino preferenze</CardTitle>
        </div>
        <CardDescription>
          Se l'app mostra filtri inattesi o dati che sembrano non aggiornarsi
          correttamente, puoi ripristinare le preferenze locali (conto
          selezionato, periodo e impostazioni dell'interfaccia).
          <br />
          I tuoi dati finanziari (conti, transazioni, obiettivi) non verranno
          cancellati.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleReset} className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Ripristina preferenze
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              <Info className="h-3 w-3" />
              Cosa viene ripristinato?
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-sm space-y-2">
            <p className="font-medium">Vengono ripristinati:</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Conto selezionato</li>
              <li>Periodo attivo (es. mese corrente)</li>
              <li>Stato di visualizzazione insight</li>
              <li>Preferenze locali dell'interfaccia</li>
            </ul>
            <p className="text-muted-foreground pt-1 border-t">
              Le transazioni, i conti e tutti i dati salvati nel database{" "}
              <span className="font-medium text-foreground">NON</span> vengono
              modificati.
            </p>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
