import React, { useState, useCallback, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, Check, Pencil, ChevronUp, ChevronDown, Archive, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useAccountContext } from "@/contexts/AccountContext";
import {
  useUpdateAccount,
  useCreateAccount,
  useReorderAccounts,
  useArchiveAccount,
  useRestoreAccount,
  useDeleteAccount,
  checkAccountHasLinkedData,
  type AccountRow,
} from "@/hooks/useAccounts";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Alerts {
  belowThreshold: boolean;
  budgetExceeded: boolean;
}

const STORAGE_KEY = "account_management_prefs";
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
  const reorderMutation = useReorderAccounts();
  const archiveMutation = useArchiveAccount();
  const updateAccount = useUpdateAccount();

  const archivedAccounts = allAccounts.filter((a) => !a.is_active);

  const persist = useCallback((next: typeof prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPrefs(next);
  }, []);

  const toggleAlert = (key: keyof Alerts) => {
    persist({ ...prefs, alerts: { ...prefs.alerts, [key]: !prefs.alerts[key] } });
  };

  // Move account up/down
  const moveAccount = (index: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= accounts.length) return;
    const newOrder = [...accounts];
    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    reorderMutation.mutate(newOrder.map((a) => a.id));
  };

  // Archive with confirmation state
  const [archiveTarget, setArchiveTarget] = useState<AccountRow | null>(null);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    const target = archiveTarget;
    setArchiveTarget(null);

    // If archiving the default account, reassign default first
    if (target.is_default) {
      const nextDefault = accounts.find((a) => a.id !== target.id);
      if (nextDefault) {
        await updateAccount.mutateAsync({ id: nextDefault.id, is_default: true });
        await updateAccount.mutateAsync({ id: target.id, is_default: false });
      }
    }

    archiveMutation.mutate(target.id, {
      onSuccess: () => toast({ title: "Conto archiviato" }),
      onError: () => toast({ title: "Errore nell'archiviazione", variant: "destructive" }),
    });
  };

  const handleAddAccount = () => {
    const nextSort = accounts.length;
    createAccount.mutate(
      { name: `Conto ${allAccounts.length + 1}`, is_default: false, sort_order: nextSort },
      {
        onSuccess: () => toast({ title: "Conto creato" }),
        onError: (err: any) => toast({ title: "Errore nella creazione", description: err?.message || "Errore sconosciuto", variant: "destructive" }),
      }
    );
  };

  // If selected account got archived, fallback
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

      {/* Active accounts list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Conti attivi</p>
            <p className="text-muted-foreground text-xs">
              Riordina trascinando o con le frecce. Archivia i conti che non usi più.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAddAccount} disabled={createAccount.isPending}>
            <Plus className="h-3.5 w-3.5" />
            Aggiungi
          </Button>
        </div>

        {selectedAccountId === null && accounts.length > 0 && (
          <div className="rounded-lg border border-dashed p-4 space-y-1 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riepilogo Master (somma conti)</p>
            <p className="text-sm">Saldo iniziale: <span className="font-medium">€ {accounts.reduce((s, a) => s + a.opening_balance, 0).toFixed(2)}</span></p>
            <p className="text-sm">Soglia minima: <span className="font-medium">€ {accounts.reduce((s, a) => s + (a.min_balance_threshold ?? 0), 0).toFixed(2)}</span></p>
          </div>
        )}

        <div className="space-y-3">
          {accounts.map((account, idx) => (
            <AccountDetailRow
              key={account.id}
              account={account}
              index={idx}
              total={accounts.length}
              onMove={moveAccount}
              onArchive={() => {
                if (accounts.length <= 1) {
                  toast({ title: "Non puoi archiviare l'ultimo conto attivo", variant: "destructive" });
                  return;
                }
                setArchiveTarget(account);
              }}
            />
          ))}
        </div>
      </div>

      {/* Archived accounts */}
      {archivedAccounts.length > 0 && (
        <ArchivedAccountsSection accounts={archivedAccounts} />
      )}

      {/* Default startup account */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Conto predefinito all'avvio</p>
          <p className="text-muted-foreground text-xs">
            Se non selezioni nulla, verrà usato Conto Master.
          </p>
        </div>
        <DefaultStartupAccountPicker />
      </div>

      {/* Privacy */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Privacy</p>
          <p className="text-muted-foreground text-xs">Nasconde importi, percentuali e grafici.</p>
        </div>
        <div className="flex items-center gap-2">
          {prefs.privacyMode ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          <Switch checked={prefs.privacyMode} onCheckedChange={(v) => persist({ ...prefs, privacyMode: v })} />
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Avvisi</p>
          <p className="text-muted-foreground text-xs">Attiva notifiche automatiche.</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="alert-threshold" className="text-sm">Avviso saldo sotto soglia</Label>
            <Switch id="alert-threshold" checked={prefs.alerts.belowThreshold} onCheckedChange={() => toggleAlert("belowThreshold")} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="alert-budget" className="text-sm">Avviso superamento budget</Label>
            <Switch id="alert-budget" checked={prefs.alerts.budgetExceeded} onCheckedChange={() => toggleAlert("budgetExceeded")} />
          </div>
        </div>
      </div>

      {/* Archive confirmation dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiviare "{archiveTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              I dati e le transazioni non verranno eliminati. Potrai ripristinare il conto in qualsiasi momento dalla sezione "Conti archiviati".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>Archivia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* --- Account detail row --- */

function AccountDetailRow({
  account,
  index,
  total,
  onMove,
  onArchive,
}: {
  account: AccountRow;
  index: number;
  total: number;
  onMove: (idx: number, dir: "up" | "down") => void;
  onArchive: () => void;
}) {
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
      {/* Name row with reorder + archive */}
      <div className="flex items-center gap-1">
        {/* Reorder buttons */}
        <div className="flex flex-col">
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" disabled={index === 0} onClick={() => onMove(index, "up")}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" disabled={index === total - 1} onClick={() => onMove(index, "down")}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

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

        {/* Archive button */}
        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={onArchive}>
          <Archive className="h-3.5 w-3.5" />
        </Button>
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

/* --- Archived accounts section --- */

function ArchivedAccountsSection({ accounts }: { accounts: AccountRow[] }) {
  const restoreMutation = useRestoreAccount();
  const deleteMutation = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [linkedDataMap, setLinkedDataMap] = useState<Record<string, boolean>>({});

  // Check linked data for all archived accounts when section opens
  useEffect(() => {
    if (!open) return;
    accounts.forEach((a) => {
      if (linkedDataMap[a.id] !== undefined) return;
      checkAccountHasLinkedData(a.id).then((has) =>
        setLinkedDataMap((prev) => ({ ...prev, [a.id]: has }))
      );
    });
  }, [open, accounts]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast({ title: "Conto eliminato" });
        setLinkedDataMap((prev) => { const n = { ...prev }; delete n[target.id]; return n; });
      },
      onError: (err) => {
        if (err.message === "HAS_LINKED_DATA") {
          toast({ title: "Il conto ha dati collegati e non può essere eliminato", variant: "destructive" });
        } else {
          toast({ title: "Errore nell'eliminazione", variant: "destructive" });
        }
      },
    });
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Archive className="h-3.5 w-3.5" />
            Conti archiviati ({accounts.length})
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {accounts.map((a) => {
            const hasLinked = linkedDataMap[a.id];
            const canDelete = hasLinked === false && !a.is_default;
            return (
              <div key={a.id} className="rounded-lg border border-dashed p-3 flex items-center justify-between opacity-60">
                <span className="text-sm">{a.name}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8"
                    disabled={restoreMutation.isPending}
                    onClick={() =>
                      restoreMutation.mutate(a.id, {
                        onSuccess: () => toast({ title: `"${a.name}" ripristinato` }),
                        onError: () => toast({ title: "Errore nel ripristino", variant: "destructive" }),
                      })
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Ripristina
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={!canDelete || deleteMutation.isPending}
                    title={
                      hasLinked === undefined
                        ? "Verifica in corso…"
                        : hasLinked
                          ? "Non eliminabile: contiene transazioni o ricorrenti collegati"
                          : a.is_default
                            ? "Non puoi eliminare il conto predefinito"
                            : "Elimina definitivamente"
                    }
                    onClick={() => setDeleteTarget(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </Button>
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare definitivamente "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Il conto verrà rimosso definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* --- Default startup account picker --- */

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
