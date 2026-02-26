import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, Printer } from "lucide-react";
import { useMonthlySnapshot, usePreviousSnapshot } from "@/hooks/useMonthlySnapshot";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { format, parse } from "date-fns";
import { it } from "date-fns/locale";

interface SnapshotDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SnapshotDetailModal({ open, onOpenChange }: SnapshotDetailModalProps) {
  const { selectedAccountId } = useAccountContext();
  const { dateRange } = useDateRange();
  const { formatAmount, isPrivacy } = usePrivacy();
  const { snapshot } = useMonthlySnapshot(dateRange.from, selectedAccountId);
  const { data: prevSnapshot } = usePreviousSnapshot(dateRange.from, selectedAccountId);

  if (!snapshot) return null;

  const monthLabel = format(parse(snapshot.month, "yyyy-MM-dd", new Date()), "MMMM yyyy", { locale: it });

  const deltaIncome = prevSnapshot ? snapshot.income_total - prevSnapshot.income_total : null;
  const deltaExpense = prevSnapshot ? snapshot.expense_total - prevSnapshot.expense_total : null;
  const deltaNet = prevSnapshot ? snapshot.net_total - prevSnapshot.net_total : null;
  const deltaSavings = prevSnapshot ? snapshot.savings_rate - prevSnapshot.savings_rate : null;

  function fmtDelta(v: number | null, isCurrency = true) {
    if (v === null || isPrivacy) return "N/D";
    const sign = v >= 0 ? "+" : "";
    return isCurrency ? `${sign}${formatAmount(v)}` : `${sign}${v.toFixed(1)}%`;
  }

  function deltaColor(v: number | null, invertSign = false) {
    if (v === null) return "text-muted-foreground";
    const positive = invertSign ? v <= 0 : v >= 0;
    return positive ? "text-accent" : "text-destructive";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="capitalize">Snapshot — {monthLabel}</DialogTitle>
        </DialogHeader>

        {/* Riepilogo */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riepilogo</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Entrate", value: snapshot.income_total, delta: deltaIncome, invert: false },
              { label: "Uscite", value: snapshot.expense_total, delta: deltaExpense, invert: true },
              { label: "Netto", value: snapshot.net_total, delta: deltaNet, invert: false },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{isPrivacy ? "••••" : formatAmount(item.value)}</p>
                <p className={`text-xs ${deltaColor(item.delta, item.invert)}`}>
                  vs mese prec.: {fmtDelta(item.delta)}
                </p>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">% Risparmio</p>
              <p className="text-lg font-semibold">{isPrivacy ? "••" : `${snapshot.savings_rate.toFixed(1)}%`}</p>
              <p className={`text-xs ${deltaColor(deltaSavings)}`}>
                vs mese prec.: {fmtDelta(deltaSavings, false)}
              </p>
            </div>
          </div>
        </section>

        {/* Top 3 categorie */}
        {snapshot.top_categories.length > 0 && (
          <section className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top 3 categorie spesa</h3>
            <div className="space-y-1.5">
              {snapshot.top_categories.map((c, i) => (
                <div key={c.category_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm font-medium">{i + 1}. {c.name}</span>
                  <span className="text-sm font-semibold">{isPrivacy ? "••••" : formatAmount(c.total)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categorie critiche */}
        {snapshot.critical_categories.length > 0 && (
          <section className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Categorie critiche
            </h3>
            <div className="space-y-1.5">
              {snapshot.critical_categories.map((c) => (
                <div key={c.category_id} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-sm font-semibold text-destructive">{isPrivacy ? "••••" : formatAmount(c.total)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {snapshot.notes.length > 0 && (
          <section className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Note</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {snapshot.notes.map((n, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{isPrivacy ? "••••••" : n}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Export */}
        <div className="flex justify-end mt-6 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Esporta PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
