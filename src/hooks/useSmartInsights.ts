import { useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBudgetSummary, type BudgetSummaryRow } from "@/hooks/useCategoryBudgets";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

export type InsightLevel = "critical" | "warning" | "positive";

export interface Insight {
  id: string;
  level: InsightLevel;
  icon: string;
  title: string;
  detail: string;
}

const PRIORITY: Record<InsightLevel, number> = { critical: 3, warning: 2, positive: 1 };

export function useSmartInsights(): { insights: Insight[]; isLoading: boolean } {
  const { dateRange } = useDateRange();
  const { selectedAccountId, openingBalance, minBalanceThreshold } = useAccountContext();
  const { data: dash, isLoading: dashLoading } = useDashboardData(dateRange.from, dateRange.to, selectedAccountId);

  const budgetStart = format(startOfMonth(new Date(dateRange.from)), "yyyy-MM-dd");
  const budgetEnd = format(endOfMonth(new Date(dateRange.from)), "yyyy-MM-dd");
  const { data: budgetRows, isLoading: budgetLoading } = useBudgetSummary(budgetStart, budgetEnd, selectedAccountId);

  const { data: recurring, isLoading: recLoading } = useRecurringRules(selectedAccountId);

  const isLoading = dashLoading || budgetLoading || recLoading;

  const insights = useMemo(() => {
    if (!dash || isLoading) return [];

    const all: Insight[] = [];
    const { income, expense, balance, byCategory, savingsRate } = dash;

    // 1. Budget overspend
    for (const b of budgetRows.filter((r: BudgetSummaryRow) => r.status === "over")) {
      const pct = ((b.percent ?? 0) * 100 - 100).toFixed(0);
      all.push({
        id: `over-${b.category_id}`,
        level: "critical",
        icon: "!",
        title: `Budget "${b.category_name}" superato del ${pct}%`,
        detail: `Speso ${b.spent.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} su un limite di ${b.monthly_limit.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}.`,
      });
    }

    // 2. Near budget (>80%)
    for (const b of budgetRows.filter((r: BudgetSummaryRow) => r.status !== "over" && (r.percent ?? 0) > 0.8)) {
      const pct = ((b.percent ?? 0) * 100).toFixed(0);
      all.push({
        id: `warn-${b.category_id}`,
        level: "warning",
        icon: "↑",
        title: `Sei all'${pct}% del budget "${b.category_name}"`,
        detail: `Resta poco margine prima di superare il limite mensile.`,
      });
    }

    // 3. Balance below threshold
    const saldo = openingBalance + balance;
    const threshold = minBalanceThreshold ?? 0;
    if (threshold > 0 && saldo < threshold) {
      const diff = threshold - saldo;
      all.push({
        id: "below-threshold",
        level: "critical",
        icon: "↓",
        title: "Saldo sotto soglia minima",
        detail: `Servono +${diff.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} per rientrare.`,
      });
    }

    // 4. No income
    if (income === 0 && expense > 0) {
      all.push({
        id: "no-income",
        level: "critical",
        icon: "!",
        title: "Nessuna entrata nel periodo",
        detail: "Registra le entrate per un quadro completo.",
      });
    }

    // 5. High single expense (>3x average or >300)
    if (byCategory.length > 0 && income > 0) {
      const avgCat = expense / byCategory.length;
      for (const cat of byCategory) {
        if (cat.amount > Math.max(avgCat * 3, 300)) {
          all.push({
            id: `spike-${cat.name}`,
            level: "warning",
            icon: "↑",
            title: `Spesa alta in "${cat.name}"`,
            detail: `${cat.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} — significativamente sopra la media.`,
          });
          break; // only 1
        }
      }
    }

    // 6. High recurring burden
    const recExpense = (recurring ?? [])
      .filter((r) => r.type === "expense" && r.is_active)
      .reduce((s, r) => s + r.amount, 0);
    if (income > 0 && recExpense / income > 0.6) {
      all.push({
        id: "high-recurring",
        level: "warning",
        icon: "↓",
        title: `Ricorrenze alte: ${((recExpense / income) * 100).toFixed(0)}% delle entrate`,
        detail: "Valuta di ridurre le spese fisse per aumentare la flessibilità.",
      });
    }

    // 7. Good savings
    if (savingsRate > 15) {
      all.push({
        id: "good-savings",
        level: "positive",
        icon: "💡",
        title: `Ottimo: risparmio del ${savingsRate.toFixed(0)}%`,
        detail: "Stai risparmiando una buona quota delle entrate.",
      });
    }

    // Sort by priority, take top 3
    all.sort((a, b) => PRIORITY[b.level] - PRIORITY[a.level]);
    return all.slice(0, 3);
  }, [dash, budgetRows, recurring, isLoading, openingBalance, minBalanceThreshold]);

  return { insights, isLoading };
}
