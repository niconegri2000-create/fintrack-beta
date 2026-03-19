import { useState, useCallback, useEffect } from "react";
import { getBudgetStatus, getThresholds, scaleBudgetByDays, type BudgetStatusType } from "@/lib/budgetThresholds";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, RotateCcw } from "lucide-react";
import { useAllCategories } from "@/hooks/useCategories";
import { useCategoryBudgets, useCategorySpending } from "@/hooks/useCategoryBudgets";
import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { useBudgetWindow } from "@/hooks/useBudgetWindow";
import { useAccountContext } from "@/contexts/AccountContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Skeleton } from "@/components/ui/skeleton";

export function BudgetSection() {
  const { formatAmount } = usePrivacy();
  const { data: settings } = useBudgetSettings();
  const { start, end } = useBudgetWindow();
  const { selectedAccountId } = useAccountContext();
  const isMaster = selectedAccountId === null;

  const { data: categories = [] } = useAllCategories();
  const spending = useCategorySpending(start, end, selectedAccountId);
  const spendingData = spending.data ?? [];

  // Read budgets from Supabase (cross-device)
  const { list: budgetsList, upsert, remove } = useCategoryBudgets();
  const budgets = budgetsList.data ?? [];
  const isLoading = budgetsList.isLoading || spending.isLoading;

  const [edits, setEdits] = useState<Record<string, string>>({});

  const activeCategories = categories.filter((c) => c.is_active);
  const spendMap = new Map(spendingData.map((s) => [s.category_id, s.total_spent]));

  // Build limits map from Supabase data
  const limitsMap = new Map<string, number>();
  for (const b of budgets) {
    if (b.is_active && b.monthly_limit > 0) {
      limitsMap.set(b.category_id, b.monthly_limit);
    }
  }

  const alertsEnabled = settings?.alerts_enabled ?? true;
  const thresholds = getThresholds();

  const handleSave = (categoryId: string) => {
    if (isMaster) return;
    const val = parseFloat(edits[categoryId] ?? "");
    if (isNaN(val) || val < 0) {
      toast.error("Valore non valido");
      return;
    }
    upsert.mutate({ category_id: categoryId, monthly_limit: val, is_active: val > 0 });
    toast.success("Budget salvato");
    setEdits((prev) => { const next = { ...prev }; delete next[categoryId]; return next; });
  };

  const handleReset = (categoryId: string) => {
    if (isMaster) return;
    const existing = budgets.find((b) => b.category_id === categoryId);
    if (existing) {
      remove.mutate(existing.id);
    }
    toast.success("Budget azzerato");
    setEdits((prev) => { const next = { ...prev }; delete next[categoryId]; return next; });
  };

  // Clear edits when switching account
  useEffect(() => {
    setEdits({});
  }, [selectedAccountId]);

  const getStatus = (spent: number, limit: number): BudgetStatusType => {
    if (!alertsEnabled) return "none";
    return getBudgetStatus(spent, limit, thresholds).status;
  };

  const statusBadge = (status: BudgetStatusType) => {
    if (status === "over")
      return <Badge variant="destructive" className="text-[11px]">OVER</Badge>;
    if (status === "warn2")
      return <Badge className="text-[11px] bg-amber-500/20 text-amber-600 border-amber-500/30">WARN</Badge>;
    if (status === "warn1")
      return <Badge className="text-[11px] bg-yellow-500/20 text-yellow-600 border-yellow-500/30">WARN</Badge>;
    if (status === "none")
      return <span className="text-xs text-muted-foreground">N/D</span>;
    return <Badge variant="secondary" className="text-[11px]">OK</Badge>;
  };

  const periodLabel = "mese";

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <p className="text-sm font-medium">Budget per categoria</p>
          <p className="text-muted-foreground text-xs">
            Spese del {periodLabel} corrente ({format(new Date(start), "dd/MM")} – {format(new Date(end), "dd/MM/yyyy")})
            {isMaster && " — Vista aggregata di tutti i conti"}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[220px]">
                {isMaster
                  ? "In Conto Master i limiti sono la somma dei limiti dei singoli conti. Per modificarli, seleziona un conto specifico."
                  : "Imposta un limite per controllare la spesa per ogni categoria su questo conto."}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isMaster && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          💡 Il limite Master è la somma dei limiti dei singoli conti. Per modificarlo, seleziona un conto specifico dall'Account Switcher.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2 py-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      ) : activeCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessuna categoria attiva</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-[140px]">Limite (€)</TableHead>
                <TableHead className="text-right w-[120px]">Speso</TableHead>
                <TableHead className="text-center w-[80px]">Stato</TableHead>
                {!isMaster && <TableHead className="text-right w-[100px]">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCategories.map((cat) => {
                const limit = limitsMap.get(cat.id) ?? 0;
                const spent = spendMap.get(cat.id) ?? 0;
                const editVal = edits[cat.id];
                const displayLimit = editVal !== undefined ? editVal : String(limit);
                const isDirty = editVal !== undefined && parseFloat(editVal) !== limit;
                const status = getStatus(spent, limit);

                return (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      {isMaster ? (
                        <div>
                          <span className="ft-number text-sm text-muted-foreground">
                            {formatAmount(limit)}
                          </span>
                          {limit > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              ≈ {formatAmount(limit * 12)}/anno
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <Input
                            type="number"
                            min={0}
                            step={10}
                            className="h-8 w-[120px] ft-number text-sm"
                            value={displayLimit}
                            onChange={(e) =>
                              setEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))
                            }
                            onBlur={() => { if (isDirty) handleSave(cat.id); }}
                            onKeyDown={(e) => { if (e.key === "Enter" && isDirty) handleSave(cat.id); }}
                          />
                          {limit > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              ≈ {formatAmount(limit * 12)}/anno
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right ft-number text-sm">
                      {formatAmount(spent)}
                    </TableCell>
                    <TableCell className="text-center">
                      {statusBadge(status)}
                    </TableCell>
                    {!isMaster && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReset(cat.id)} disabled={limit === 0}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
