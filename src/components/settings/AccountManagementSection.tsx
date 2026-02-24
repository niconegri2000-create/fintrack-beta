import { OpeningBalanceSection } from "./OpeningBalanceSection";
import { MinBalanceThresholdSection } from "./MinBalanceThresholdSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useAccountContext } from "@/contexts/AccountContext";
import { useUpdateAccount } from "@/hooks/useAccounts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Alerts {
  belowThreshold: boolean;
  budgetExceeded: boolean;
}

const STORAGE_KEY = "account_management_prefs";

function loadPrefs(): { privacyMode: boolean; alerts: Alerts } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { privacyMode: false, alerts: { belowThreshold: true, budgetExceeded: true } };
}

export function AccountManagementSection() {
  const [prefs, setPrefs] = useState(loadPrefs);

  const persist = useCallback((next: typeof prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPrefs(next);
  }, []);

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

      {/* Privacy */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Privacy</p>
          <p className="text-muted-foreground text-xs">
            Nasconde importi, percentuali e grafici.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prefs.privacyMode ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <Switch
            checked={prefs.privacyMode}
            onCheckedChange={(v) => persist({ ...prefs, privacyMode: v })}
          />
        </div>
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

/* Inline variants that use accounts table */

function OpeningBalanceInline() {
  const [value, setValue] = useState("");
  const { selectedAccount, accounts } = useAccountContext();
  const account = selectedAccount ?? accounts.find((a) => a.is_default) ?? accounts[0];
  const mutation = useUpdateAccount();

  useEffect(() => {
    if (account) setValue(String(account.opening_balance ?? 0));
  }, [account]);

  const handleSave = () => {
    if (!account) return;
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast({ title: "Il saldo iniziale non può essere negativo", variant: "destructive" });
      return;
    }
    mutation.mutate(
      { id: account.id, opening_balance: num },
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
  const { selectedAccount, accounts } = useAccountContext();
  const account = selectedAccount ?? accounts.find((a) => a.is_default) ?? accounts[0];
  const mutation = useUpdateAccount();

  useEffect(() => {
    if (account) setValue(String(account.min_balance_threshold ?? 0));
  }, [account]);

  const handleSave = () => {
    if (!account) return;
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast({ title: "La soglia non può essere negativa", variant: "destructive" });
      return;
    }
    mutation.mutate(
      { id: account.id, min_balance_threshold: num },
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
