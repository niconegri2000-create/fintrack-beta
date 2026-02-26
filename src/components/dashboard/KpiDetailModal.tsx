import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import type { DashboardData } from "@/hooks/useDashboardData";
import type { BudgetSummaryRow } from "@/hooks/useCategoryBudgets";

interface KpiDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: DashboardData | undefined;
  budgetRows: BudgetSummaryRow[];
  accountLabel: string;
  periodLabel: string;
}

export function KpiDetailModal({
  open,
  onOpenChange,
  data,
  budgetRows,
  accountLabel,
  periodLabel,
}: KpiDetailModalProps) {
  const { formatAmount, isPrivacy } = usePrivacy();

  if (!data) return null;

  const topCategories = data.byCategory.slice(0, 5);
  const criticalBudgets = budgetRows.filter(
    (b) => b.monthly_limit > 0 && (b.status === "over" || b.status === "warn2")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="text-base">
            Dettagli — {accountLabel} — {periodLabel}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="riepilogo" className="mt-2">
          <TabsList className="w-full print:hidden">
            <TabsTrigger value="riepilogo" className="flex-1">Riepilogo</TabsTrigger>
            <TabsTrigger value="categorie" className="flex-1">Top categorie</TabsTrigger>
            <TabsTrigger value="critiche" className="flex-1">Critiche</TabsTrigger>
          </TabsList>

          {/* Riepilogo */}
          <TabsContent value="riepilogo" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Entrate", value: data.income, icon: TrendingUp, color: "text-accent" },
                { label: "Uscite", value: data.expense, icon: TrendingDown, color: "text-destructive" },
                { label: "Netto", value: data.balance, color: data.balance >= 0 ? "text-accent" : "text-destructive" },
                { label: "% Risparmio", value: null, display: `${data.savingsRate.toFixed(1)}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-semibold ${item.color ?? ""}`}>
                    {isPrivacy
                      ? "••••"
                      : item.display ?? formatAmount(item.value!)}
                  </p>
                </div>
              ))}
            </div>

            {/* Monthly breakdown if multiple months */}
            {data.byMonth.length > 1 && (
              <div className="space-y-2 mt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dettaglio mensile
                </h4>
                <div className="space-y-1.5">
                  {data.byMonth.map((m) => (
                    <div key={m.month} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="font-medium">{m.month}</span>
                      <div className="flex gap-3">
                        <span className="text-accent">{isPrivacy ? "••" : formatAmount(m.income)}</span>
                        <span className="text-destructive">{isPrivacy ? "••" : formatAmount(m.expense)}</span>
                        <span className="font-semibold">
                          {isPrivacy ? "••" : formatAmount(m.income - m.expense)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Top categorie */}
          <TabsContent value="categorie" className="space-y-2 mt-3">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessuna spesa nel periodo
              </p>
            ) : (
              <div className="space-y-1.5">
                {topCategories.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm font-medium">
                      {i + 1}. {c.name}
                    </span>
                    <span className="text-sm font-semibold">
                      {isPrivacy ? "••••" : formatAmount(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Critiche */}
          <TabsContent value="critiche" className="space-y-2 mt-3">
            {criticalBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessuna categoria critica nel periodo
              </p>
            ) : (
              <div className="space-y-1.5">
                {criticalBudgets.map((b) => (
                  <div
                    key={b.category_id}
                    className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
                  >
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      {b.category_name}
                    </span>
                    <span className="text-sm font-semibold text-destructive">
                      {isPrivacy ? "••••" : `${formatAmount(b.spent)} / ${formatAmount(b.monthly_limit)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Export */}
        <div className="flex justify-end mt-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Esporta PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
