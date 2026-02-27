import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Bug, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** All fintrack-prefixed localStorage keys to clear on reset */
const FINTRACK_KEYS_PREFIXES = [
  "fintrack",
  "selected_account_",
  "app_preferences",
  "account_management_prefs",
];

function getFintrackKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && FINTRACK_KEYS_PREFIXES.some((p) => key.startsWith(p))) {
      keys.push(key);
    }
  }
  return keys;
}

export function DebugSection() {
  const { selectedAccountId, selectedAccount, accounts } = useAccountContext();
  const { dateRange } = useDateRange();
  const { toast } = useToast();

  const handleReset = () => {
    const keys = getFintrackKeys();
    keys.forEach((k) => localStorage.removeItem(k));
    toast({
      title: "Preferenze UI resettate",
      description: `${keys.length} chiavi rimosse. Ricaricamento...`,
    });
    setTimeout(() => window.location.reload(), 800);
  };

  const storedKeys = getFintrackKeys();

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-lg">Debug (test)</CardTitle>
        </div>
        <CardDescription>
          Stato interno dell'app. Usa il reset se l'app si comporta in modo anomalo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current state */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Conto selezionato</p>
            <p className="font-medium">
              {selectedAccountId
                ? selectedAccount?.name ?? <span className="text-destructive">ID non valido</span>
                : "Master (tutti)"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Periodo</p>
            <p className="font-medium">
              {dateRange.preset !== "custom" ? dateRange.preset : "Personalizzato"}{" "}
              <span className="text-muted-foreground text-xs">({dateRange.from} → {dateRange.to})</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Conti attivi (DB)</p>
            <p className="font-medium">{accounts.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Chiavi localStorage</p>
            <p className="font-medium">{storedKeys.length} chiavi fintrack</p>
          </div>
        </div>

        {/* Keys list */}
        {storedKeys.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {storedKeys.map((k) => (
              <Badge key={k} variant="outline" className="text-[10px] font-mono">
                {k}
              </Badge>
            ))}
          </div>
        )}

        {/* Reset button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset preferenze UI
        </Button>
        <p className="text-xs text-muted-foreground">
          Cancella solo le preferenze UI (localStorage). I dati finanziari nel database non vengono toccati.
        </p>
      </CardContent>
    </Card>
  );
}