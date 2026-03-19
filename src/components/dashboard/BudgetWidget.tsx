import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { useBudgetSummary } from "@/hooks/useCategoryBudgets";
import { getBudgetStatus } from "@/lib/budgetThresholds";
import {
  DashboardPeriodPicker,
  type DashboardPeriodPreset,
  presetToLocalRange,
} from "./DashboardPeriodPicker";
import { scaleBudgetByDays } from "@/lib/budgetThresholds";

const BUDGET_PRESETS: DashboardPeriodPreset[] = [
  "current_month",
  "previous_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
  "ytd",
  "custom",
];

export function BudgetWidget() {
  const { selectedAccountId } = useAccountContext();
  const { formatAmount, isPrivacy } = usePrivacy();

  const [preset, setPreset] = useState<DashboardPeriodPreset>("current_month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);

  const range = useMemo(() => {
    if (preset === "custom" && customRange) return customRange;
    return presetToLocalRange(preset === "custom" ? "current_month" : preset);
  }, [preset, customRange]);

  

  const handlePreset = useCallback((p: DashboardPeriodPreset) => {
    setPreset(p);
    if (p !== "custom") setCustomRange(null);
  }, []);

  const handleCustom = useCallback((from: string, to: string) => {
    setPreset("custom");
    setCustomRange({ from, to });
  }, []);

  const { data: budgetRows } = useBudgetSummary(range.from, range.to, selectedAccountId);

  // Aggregate: multiply monthly_limit by monthCount, recalculate percent/status
  const aggregated = useMemo(() => {
    return budgetRows
      .filter((b) => b.monthly_limit > 0)
      .map((b) => {
        const aggLimit = b.monthly_limit * monthCount;
        const percent = aggLimit > 0 ? b.spent / aggLimit : null;
        const { status: rawStatus } = getBudgetStatus(b.spent, aggLimit);
        const status = rawStatus === "none" ? "ok" : rawStatus;
        return { ...b, monthly_limit: aggLimit, percent, status };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { over: 4, warn2: 3, warn1: 2, ok: 1 };
        const diff = (order[b.status] ?? 0) - (order[a.status] ?? 0);
        if (diff !== 0) return diff;
        return (b.percent ?? 0) - (a.percent ?? 0);
      });
  }, [budgetRows, monthCount]);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">Budget per categoria</p>
        <DashboardPeriodPicker
          preset={preset}
          customRange={customRange}
          onPresetChange={handlePreset}
          onCustomChange={handleCustom}
          allowedPresets={BUDGET_PRESETS}
        />
      </div>

      {aggregated.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nessun budget configurato per questo periodo
        </p>
      ) : (
        <div className="space-y-3">
          {aggregated.map((b) => {
            const rawPct = (b.percent ?? 0) * 100;
            const barPct = Math.min(rawPct, 100);
            return (
              <div key={b.category_id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{b.category_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground ft-number">
                      {formatAmount(b.spent)} / {formatAmount(b.monthly_limit)}
                    </span>
                    <span className="ft-number font-semibold w-12 text-right">
                      {isPrivacy ? "••" : `${rawPct.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={isPrivacy ? 0 : barPct}
                    className={`h-2 flex-1 ${
                      b.status === "over"
                        ? "[&>div]:bg-destructive"
                        : b.status === "warn2"
                        ? "[&>div]:bg-amber-500"
                        : b.status === "warn1"
                        ? "[&>div]:bg-yellow-500"
                        : ""
                    }`}
                  />
                  <Badge
                    variant={b.status === "over" ? "destructive" : "secondary"}
                    className={`text-[10px] w-14 justify-center ${
                      b.status === "warn2" ? "bg-amber-500/20 text-amber-600 border-amber-500/30" :
                      b.status === "warn1" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" : ""
                    }`}
                  >
                    {b.status === "over" ? "OVER" : b.status === "warn2" ? "WARN" : b.status === "warn1" ? "WARN" : "OK"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
