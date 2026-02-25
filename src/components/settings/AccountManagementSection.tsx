import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, Check, Pencil } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useAccountContext } from "@/contexts/AccountContext";
import { useUpdateAccount, useCreateAccount, type AccountRow } from "@/hooks/useAccounts";
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
import { resolveActiveAccounts, getActiveAccountIds } from "@/lib/activeAccounts";

interface Alerts {
  belowThreshold: boolean;
  budgetExceeded: boolean;
}

const STORAGE_KEY = "account_management_prefs";
const MAX_ACCOUNTS = 20;
const DEFAULT_STARTUP_KEY = "fintrack_default_startup_account";

function loadPrefs(): { privacyMode: boolean; alerts: Alerts } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { privacyMode: false, alerts: { belowThreshold: true, budgetExceeded: true } };
}

export function AccountManagementSection() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const { accounts, allAccounts, setSelectedAccountId, selectedAccountId } = useAccountContext();
  const createAccount = useCreateAccount();

  // Desired active count — stored locally to handle async creation
  const [desiredCount, setDesiredCount] = useState<number | null>(null);
  const activeCount = accounts.length;

  const persist = useCallback((next: typeof prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPrefs(next);
  }, []);

  const toggleAlert = (key: keyof Alerts) => {
    persist({ ...prefs, alerts: { ...prefs.alerts, [key]: !prefs.alerts[key] } });
  };

  const handleCountChange = async (newCount: string) => {
    const target = parseInt(newCount, 10);
    const allIds = allAccounts.map((a) => a.id);

    // Create missing DB accounts if needed
    if (target > allAccounts.length) {
      setDesiredCount(target);
      const toCreate = target - allAccounts.length;
      for (let i = 0; i < toCreate; i++) {
        await createAccount.mutateAsync({ name: `Conto ${allAccounts.length + i + 1}`, is_default: false });
      }
      toast({ title: `${toCreate} conto/i creato/i` });
      return; // the effect below will resolve active accounts once allAccounts updates
    }

    // Target <= allAccounts.length: just update active list (soft-hide)
    resolveActiveAccounts(allIds, target);
    setDesiredCount(null);
    toast({ title: target < activeCount ? "Conti nascosti (non eliminati)" : "Conti aggiornati" });
    window.dispatchEvent(new Event("active-accounts-changed"));
  };

  // Sync active accounts list whenever allAccounts changes (e.g. after creation)
  useEffect(() => {
    if (allAccounts.length === 0) return;
    const allIds = allAccounts.map((a) => a.id);
    const activeIds = getActiveAccountIds();

    if (activeIds.length === 0) {
      // First use: initialize with all
      resolveActiveAccounts(allIds, allAccounts.length);
      window.dispatchEvent(new Event("active-accounts-changed"));
    } else if (desiredCount !== null && allAccounts.length >= desiredCount) {
      // New accounts were created, expand active list to desired count
      resolveActiveAccounts(allIds, desiredCount);
      setDesiredCount(null);
      window.dispatchEvent(new Event("active-accounts-changed"));
    }
  }, [allAccounts, desiredCount]);

  // If selected account no longer in active list, fallback
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
        <Select value={String(activeCount)} onValueChange={handleCountChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: MAX_ACCOUNTS }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conti con dettagli per-conto */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Conti e valori</p>
          <p className="text-muted-foreground text-xs">
            Configura nome, saldo iniziale e soglia minima per ogni conto.
          </p>
        </div>

        {selectedAccountId === null && accounts.length > 0 && (
          <div className="rounded-lg border border-dashed p-4 space-y-1 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riepilogo Master (somma conti)</p>
            <p className="text-sm">Saldo iniziale: <span className="font-medium">€ {accounts.reduce((s, a) => s + a.opening_balance, 0).toFixed(2)}</span></p>
            <p className="text-sm">Soglia minima: <span className="font-medium">€ {accounts.reduce((s, a) => s + (a.min_balance_threshold ?? 0), 0).toFixed(2)}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Modifica i valori nei singoli conti.</p>
          </div>
        )}

        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountDetailRow key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* Conto predefinito all'avvio */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Conto predefinito all'avvio</p>
          <p className="text-muted-foreground text-xs">
            Se non selezioni nulla, verrà usato Conto Master. Se invece hai già selezionato un conto di recente, l'app manterrà l'ultimo conto usato.
          </p>
        </div>
        <DefaultStartupAccountPicker />
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

/* --- Account detail row (name + balance + threshold) --- */

function AccountDetailRow({ account }: { account: AccountRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(String(account.opening_balance ?? 0));
  const [threshold, setThreshold] = useState(String(account.min_balance_threshold ?? 0));
  const mutation = useUpdateAccount();

  useEffect(() => { setName(account.name); }, [account.name]);
  useEffect(() => { setBalance(String(account.opening_balance ?? 0)); }, [account.opening_balance]);
  useEffect(() => { setThreshold(String(account.min_balance_threshold ?? 0)); }, [account.min_balance_threshold]);

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast({ title: "Il nome non può essere vuoto", variant: "destructive" }); setName(account.name); setEditing(false); return; }
    if (trimmed === account.name) { setEditing(false); return; }
    mutation.mutate({ id: account.id, name: trimmed }, {
      onSuccess: () => { toast({ title: "Nome aggiornato" }); setEditing(false); },
      onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
    });
  };

  const handleSaveBalance = () => {
    const num = parseFloat(balance) || 0;
    if (num < 0) { toast({ title: "Il saldo iniziale non può essere negativo", variant: "destructive" }); return; }
    mutation.mutate({ id: account.id, opening_balance: num }, {
      onSuccess: () => toast({ title: "Saldo iniziale aggiornato" }),
      onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
    });
  };

  const handleSaveThreshold = () => {
    const num = parseFloat(threshold) || 0;
    if (num < 0) { toast({ title: "La soglia non può essere negativa", variant: "destructive" }); return; }
    mutation.mutate({ id: account.id, min_balance_threshold: num }, {
      onSuccess: () => toast({ title: "Soglia salvata" }),
      onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
    });
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Name row */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1 max-w-[200px] text-sm" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setName(account.name); setEditing(false); } }} />
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveName} disabled={mutation.isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium flex-1">{account.name}</span>
            {account.is_default && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">default</span>}
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      {/* Balance + Threshold */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Saldo iniziale</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
            <Input type="number" min={0} step={0.01} value={balance} onChange={(e) => setBalance(e.target.value)} className="h-8 w-28 pl-5 text-sm" />
          </div>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveBalance} disabled={mutation.isPending}>
            <Save className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Soglia min.</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
            <Input type="number" min={0} step={0.01} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="h-8 w-28 pl-5 text-sm" />
          </div>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveThreshold} disabled={mutation.isPending}>
            <Save className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DefaultStartupAccountPicker() {
  const { accounts } = useAccountContext();
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(DEFAULT_STARTUP_KEY) || "MASTER";
    } catch {
      return "MASTER";
    }
  });

  const handleChange = (v: string) => {
    setValue(v);
    localStorage.setItem(DEFAULT_STARTUP_KEY, v);
    toast({ title: "Preferenza salvata" });
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MASTER">Conto Master</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
