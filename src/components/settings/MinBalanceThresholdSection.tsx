import { useState, useEffect } from "react";
import { useAccountContext } from "@/contexts/AccountContext";
import { useUpdateAccount } from "@/hooks/useAccounts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export function MinBalanceThresholdSection() {
  const [value, setValue] = useState("");
  const { selectedAccount, accounts } = useAccountContext();
  const account = selectedAccount ?? accounts.find((a) => a.is_default) ?? accounts[0];
  const mutation = useUpdateAccount();

  useEffect(() => {
    if (account) {
      setValue(String(account.min_balance_threshold ?? 0));
    }
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
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div>
        <p className="text-sm font-medium">Soglia minima conto</p>
        <p className="text-muted-foreground text-xs">
          Importo minimo sotto il quale il saldo è considerato a rischio.
        </p>
      </div>
      <div className="flex items-center gap-3 max-w-sm">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pl-7"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          Salva
        </Button>
      </div>
    </div>
  );
}
