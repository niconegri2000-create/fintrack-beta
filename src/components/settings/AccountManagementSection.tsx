import { OpeningBalanceSection } from "./OpeningBalanceSection";
import { MinBalanceThresholdSection } from "./MinBalanceThresholdSection";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, PiggyBank, Wallet } from "lucide-react";
import { useState, useCallback } from "react";

type BalanceMode = "total" | "net_savings" | "hidden";

interface Alerts {
  belowThreshold: boolean;
  budgetExceeded: boolean;
}

const STORAGE_KEY = "account_management_prefs";

function loadPrefs(): { balanceMode: BalanceMode; alerts: Alerts } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balanceMode: "total", alerts: { belowThreshold: true, budgetExceeded: true } };
}

const pillActive = "bg-primary text-primary-foreground font-semibold shadow-sm";
const pillInactive = "text-muted-foreground";

export function AccountManagementSection() {
  const [prefs, setPrefs] = useState(loadPrefs);

  const persist = useCallback((next: typeof prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPrefs(next);
  }, []);

  const setBalanceMode = (v: string) => {
    if (v) persist({ ...prefs, balanceMode: v as BalanceMode });
  };

  const toggleAlert = (key: keyof Alerts) => {
    persist({ ...prefs, alerts: { ...prefs.alerts, [key]: !prefs.alerts[key] } });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold">Gestione conto</h2>
        <p className="text-muted-foreground text-sm">
          Configura come viene calcolato e monitorato il tuo saldo.
        </p>
      </div>

      {/* Saldo iniziale — embedded */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Saldo iniziale</p>
          <p className="text-muted-foreground text-xs">
            Importo da cui parte il calcolo del tuo patrimonio.
          </p>
        </div>
        <OpeningBalanceInline />
      </div>

      {/* Soglia minima — embedded */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Soglia minima conto</p>
          <p className="text-muted-foreground text-xs">
            Ricevi un avviso quando il saldo scende sotto questa cifra.
          </p>
        </div>
        <ThresholdInline />
      </div>

      {/* Modalità saldo */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Modalità saldo</p>
          <p className="text-muted-foreground text-xs">
            Scegli come visualizzare il saldo nell'app.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={prefs.balanceMode}
          onValueChange={setBalanceMode}
          className="rounded-lg border bg-muted/50 p-0.5"
        >
          <ToggleGroupItem
            value="total"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.balanceMode === "total" ? pillActive : pillInactive}`}
          >
            <Wallet className="mr-1 h-3.5 w-3.5" />
            Saldo totale
          </ToggleGroupItem>
          <ToggleGroupItem
            value="net_savings"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.balanceMode === "net_savings" ? pillActive : pillInactive}`}
          >
            <PiggyBank className="mr-1 h-3.5 w-3.5" />
            Risparmio netto
          </ToggleGroupItem>
          <ToggleGroupItem
            value="hidden"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.balanceMode === "hidden" ? pillActive : pillInactive}`}
          >
            <EyeOff className="mr-1 h-3.5 w-3.5" />
            Privacy
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Avvisi */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Avvisi</p>
          <p className="text-muted-foreground text-xs">
            Attiva notifiche automatiche.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="alert-threshold" className="text-sm">
              Avviso saldo sotto soglia
            </Label>
            <Switch
              id="alert-threshold"
              checked={prefs.alerts.belowThreshold}
              onCheckedChange={() => toggleAlert("belowThreshold")}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="alert-budget" className="text-sm">
              Avviso superamento budget
            </Label>
            <Switch
              id="alert-budget"
              checked={prefs.alerts.budgetExceeded}
              onCheckedChange={() => toggleAlert("budgetExceeded")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Inline variants that reuse hook logic but render only the input row */
import { useWorkspace, useUpdateWorkspace } from "@/hooks/useWorkspace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useEffect } from "react";

function OpeningBalanceInline() {
  const [value, setValue] = useState("");
  const { data: workspace } = useWorkspace();
  const mutation = useUpdateWorkspace();

  useEffect(() => {
    if (workspace) setValue(String(workspace.opening_balance ?? 0));
  }, [workspace]);

  const handleSave = () => {
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast({ title: "Il saldo iniziale non può essere negativo", variant: "destructive" });
      return;
    }
    mutation.mutate(
      { opening_balance: num },
      {
        onSuccess: () => toast({ title: "Saldo iniziale aggiornato" }),
        onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex items-center gap-3 max-w-sm">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
        <Input type="number" min={0} step={0.01} value={value} onChange={(e) => setValue(e.target.value)} className="pl-7" />
      </div>
      <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
        <Save className="h-4 w-4 mr-1" />
        Salva
      </Button>
    </div>
  );
}

function ThresholdInline() {
  const [value, setValue] = useState("");
  const { data: workspace } = useWorkspace();
  const mutation = useUpdateWorkspace();

  useEffect(() => {
    if (workspace) setValue(String(workspace.min_balance_threshold ?? 0));
  }, [workspace]);

  const handleSave = () => {
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast({ title: "La soglia non può essere negativa", variant: "destructive" });
      return;
    }
    mutation.mutate(
      { min_balance_threshold: num },
      {
        onSuccess: () => toast({ title: "Soglia salvata correttamente" }),
        onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex items-center gap-3 max-w-sm">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
        <Input type="number" min={0} step={0.01} value={value} onChange={(e) => setValue(e.target.value)} className="pl-7" />
      </div>
      <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
        <Save className="h-4 w-4 mr-1" />
        Salva
      </Button>
    </div>
  );
}
