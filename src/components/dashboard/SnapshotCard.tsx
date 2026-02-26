import { useEffect } from "react";
import { CalendarCheck, TrendingUp, TrendingDown, AlertTriangle, ChevronRight } from "lucide-react";
import { useMonthlySnapshot } from "@/hooks/useMonthlySnapshot";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { format, parse } from "date-fns";
import { it } from "date-fns/locale";

interface SnapshotCardProps {
  onViewDetails: () => void;
}

export function SnapshotCard({ onViewDetails }: SnapshotCardProps) {
  const { selectedAccountId } = useAccountContext();
  const { dateRange } = useDateRange();
  const { formatAmount, isPrivacy } = usePrivacy();
  const { snapshot, isLoading, generate, month } = useMonthlySnapshot(
    dateRange.from,
    selectedAccountId,
  );

  // Auto-generate if snapshot doesn't exist
  useEffect(() => {
    if (!isLoading && !snapshot && !generate.isPending) {
      generate.mutate();
    }
  }, [isLoading, snapshot, generate.isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || generate.isPending) {
    return (
      <div className="rounded-xl border bg-card p-6 animate-pulse">
        <div className="h-4 w-40 bg-muted rounded mb-3" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (!snapshot) return null;

  const monthLabel = format(parse(snapshot.month, "yyyy-MM-dd", new Date()), "MMMM yyyy", { locale: it });
  const isPositive = snapshot.net_total >= 0;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Snapshot — {monthLabel}
          </p>
        </div>
        <button
          onClick={onViewDetails}
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          Dettagli <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Entrate</p>
          <p className="text-lg font-semibold text-accent">
            {isPrivacy ? "••••" : formatAmount(snapshot.income_total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Uscite</p>
          <p className="text-lg font-semibold text-destructive">
            {isPrivacy ? "••••" : formatAmount(snapshot.expense_total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Risparmio</p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-accent" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <p className={`text-lg font-semibold ${isPositive ? "text-accent" : "text-destructive"}`}>
              {isPrivacy ? "••••" : formatAmount(snapshot.net_total)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">% Risparmio</p>
          <p className="text-lg font-semibold text-foreground">
            {isPrivacy ? "••" : `${snapshot.savings_rate.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Quick info row */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
        {snapshot.top_categories.length > 0 && (
          <span>
            Top: <span className="font-medium text-foreground">{snapshot.top_categories[0].name}</span>
          </span>
        )}
        {snapshot.critical_categories.length > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {snapshot.critical_categories.length} budget superati
          </span>
        )}
      </div>
    </div>
  );
}
