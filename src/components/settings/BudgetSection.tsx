import { useState, useRef } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, RotateCcw } from "lucide-react";
import { useAllCategories } from "@/hooks/useCategories";
import { useCategoryBudgets, useBudgetSummary } from "@/hooks/useCategoryBudgets";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

function fmtEur(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function BudgetSection() {
  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: categories = [] } = useAllCategories();
  const { list, upsert } = useCategoryBudgets();
  const { data: summaryRows } = useBudgetSummary(start, end);

  const budgets = list.data ?? [];

  // Local edit state keyed by category_id
  const [edits, setEdits] = useState<Record<string, string>>({});

  const activeCategories = categories.filter((c) => c.is_active);

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b]));
  const summaryMap = new Map(summaryRows.map((r) => [r.category_id, r]));

  const handleSave = (categoryId: string) => {
    const val = parseFloat(edits[categoryId] ?? "");
    if (isNaN(val) || val < 0) {
      toast.error("Valore non valido");
      return;
    }
    const existing = budgetMap.get(categoryId);
    upsert.mutate(
      { category_id: categoryId, monthly_limit: val, is_active: existing?.is_active ?? true },
      {
        onSuccess: () => {
          toast.success("Budget salvato");
          setEdits((prev) => {
            const next = { ...prev };
            delete next[categoryId];
            return next;
          });
        },
        onError: () => toast.error("Errore nel salvataggio"),
      }
    );
  };

  const handleReset = (categoryId: string) => {
    const existing = budgetMap.get(categoryId);
    upsert.mutate(
      { category_id: categoryId, monthly_limit: 0, is_active: existing?.is_active ?? true },
      {
        onSuccess: () => {
          toast.success("Budget azzerato");
          setEdits((prev) => {
            const next = { ...prev };
            delete next[categoryId];
            return next;
          });
        },
        onError: () => toast.error("Errore nel reset"),
      }
    );
  };

  const handleToggle = (categoryId: string, newActive: boolean) => {
    const existing = budgetMap.get(categoryId);
    upsert.mutate(
      { category_id: categoryId, monthly_limit: existing?.monthly_limit ?? 0, is_active: newActive },
      {
        onSuccess: () => toast.success(newActive ? "Budget attivato" : "Budget disattivato"),
        onError: () => toast.error("Errore"),
      }
    );
  };

  const statusBadge = (status: string) => {
    if (status === "over")
      return <Badge variant="destructive" className="text-[11px]">OVER</Badge>;
    if (status === "warn")
      return <Badge className="text-[11px] bg-amber-500/20 text-amber-600 border-amber-500/30">WARN</Badge>;
    return <Badge variant="secondary" className="text-[11px]">OK</Badge>;
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <p className="text-sm font-medium">Budget per categoria</p>
          <p className="text-muted-foreground text-xs">Mese corrente: {format(now, "MMMM yyyy")}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">Imposta un limite mensile per controllare la spesa per ogni categoria.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {activeCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessuna categoria attiva</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-[140px]">Limite (€)</TableHead>
                <TableHead className="text-center w-[70px]">Attivo</TableHead>
                <TableHead className="text-right w-[120px]">Speso</TableHead>
                <TableHead className="text-center w-[80px]">%</TableHead>
                <TableHead className="text-right w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCategories.map((cat) => {
                const budget = budgetMap.get(cat.id);
                const summary = summaryMap.get(cat.id);
                const limit = budget?.monthly_limit ?? 0;
                const isActive = budget?.is_active ?? true;
                const spent = summary?.spent ?? 0;
                const editVal = edits[cat.id];
                const displayLimit = editVal !== undefined ? editVal : String(limit);
                const isDirty = editVal !== undefined && parseFloat(editVal) !== limit;

                return (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={10}
                        className="h-8 w-[120px] font-mono text-sm"
                        value={displayLimit}
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                        onBlur={() => {
                          if (isDirty) handleSave(cat.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && isDirty) handleSave(cat.id);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => handleToggle(cat.id, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmtEur(spent)}
                    </TableCell>
                    <TableCell className="text-center">
                      {limit === 0 ? (
                        <span className="text-xs text-muted-foreground">N/D</span>
                      ) : (
                        statusBadge(summary?.status ?? "ok")
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReset(cat.id)}
                        disabled={limit === 0}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
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
