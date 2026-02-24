import { OpeningBalanceSection } from "./OpeningBalanceSection";
import { MinBalanceThresholdSection } from "./MinBalanceThresholdSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, Check, Pencil } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useAccountContext } from "@/contexts/AccountContext";
import { useUpdateAccount, useCreateAccount } from "@/hooks/useAccounts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Alerts {
  belowThreshold: boolean;
  budgetExceeded: boolean;
}

const STORAGE_KEY = "account_management_prefs";
const MAX_ACCOUNTS = 5;

function loadPrefs(): { privacyMode: boolean; alerts: Alerts } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { privacyMode: false, alerts: { belowThreshold: true, budgetExceeded: true } };
}

export function AccountManagementSection() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const { accounts, setSelectedAccountId, selectedAccountId } = useAccountContext();
  const createAccount = useCreateAccount();

  const persist = useCallback((next: typeof prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPrefs(next);
  }, []);

  const toggleAlert = (key: keyof Alerts) => {
    persist({ ...prefs, alerts: { ...prefs.alerts, [key]: !prefs.alerts[key] } });
  };

  const handleCountChange = async (newCount: string) => {
    const target = parseInt(newCount, 10);
    const current = accounts.length;
    if (target <= current) {
      toast({
        title: "Nota",
        description: "Ridurre il numero non elimina i conti esistenti. Puoi rinominarli o lasciarli inutilizzati.",
      });
      return;
    }
    // Create missing accounts
    for (let i = current + 1; i <= target; i++) {
      await createAccount.mutateAsync({ name: `Conto ${i}`, is_default: false });
    }
    toast({ title: `${target - current} conto/i creato/i` });
  };

  // If selected account no longer in visible list, fallback
  useEffect(() => {
    if (selectedAccountId && !accounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(null);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold">Gestione conti</h2>
        <p className="text-muted-foreground text-sm">
          Configura i tuoi conti e come vengono monitorati.
        </p>
      </div>

      {/* Numero conti */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Numero di conti</p>
          <p className="text-muted-foreground text-xs">
            Scegli quanti conti gestire (max {MAX_ACCOUNTS}). Il Conto Master è una vista aggregata e non conta.
          </p>
        </div>
        <Select value={String(accounts.length)} onValueChange={handleCountChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: MAX_ACCOUNTS }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)} disabled={n < accounts.length}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista conti con rename */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Nomi conti</p>
          <p className="text-muted-foreground text-xs">
            Rinomina i conti esistenti. Il primo conto è quello predefinito.
          </p>
        </div>
        <div className="space-y-2">
          {accounts.map((account) => (
            <AccountRenameRow key={account.id} accountId={account.id} currentName={account.name} isDefault={account.is_default} />
          ))}
        </div>
      </div>

      {/* Saldo iniziale — per conto selezionato o default */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Saldo iniziale</p>
          <p className="text-muted-foreground text-xs">
            Importo da cui parte il calcolo del tuo patrimonio.
          </p>
        </div>
        <OpeningBalanceInline />
      </div>

      {/* Soglia minima */}
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

/* --- Account rename row --- */

function AccountRenameRow({ accountId, currentName, isDefault }: { accountId: string; currentName: string; isDefault: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const mutation = useUpdateAccount();

  useEffect(() => { setName(currentName); }, [currentName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Il nome non può essere vuoto", variant: "destructive" });
      setName(currentName);
      setEditing(false);
      return;
    }
    if (trimmed === currentName) {
      setEditing(false);
      return;
    }
    mutation.mutate(
      { id: accountId, name: trimmed },
      {
        onSuccess: () => {
          toast({ title: "Nome aggiornato" });
          setEditing(false);
        },
        onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1 max-w-[200px]"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setName(currentName); setEditing(false); } }}
          />
          <Button size="sm" variant="ghost" onClick={handleSave} disabled={mutation.isPending}>
            <Check className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm flex-1">{currentName}</span>
          {isDefault && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">default</span>}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
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
