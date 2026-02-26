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

// Priority tiers: 1=risk(critical), 2=behavior(warning), 3=positive
const PRIORITY: Record<InsightLevel, number> = { critical: 3, warning: 2, positive: 1 };

// ── Dedup helpers (localStorage, 7-day window) ──
const DEDUP_KEY = "fintrack_insight_seen";
const DEDUP_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadSeen(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DEDUP_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    // Prune expired
    const pruned: Record<string, number> = {};
    for (const [k, ts] of Object.entries(map)) {
      if (now - ts < DEDUP_TTL) pruned[k] = ts;
    }
    return pruned;
  } catch {
    return {};
  }
}

function markSeen(ids: string[]) {
  const map = loadSeen();
  const now = Date.now();
  for (const id of ids) map[id] = now;
  try {
    localStorage.setItem(DEDUP_KEY, JSON.stringify(map));
  } catch { /* noop */ }
}

function filterDedup(insights: Insight[]): Insight[] {
  const seen = loadSeen();
  const now = Date.now();
  return insights.filter((ins) => {
    const ts = seen[ins.id];
    if (!ts) return true;
    return now - ts >= DEDUP_TTL;
  });
}

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

    const tier1: Insight[] = []; // RISK (critical)
    const tier2: Insight[] = []; // BEHAVIOR (warning)
    const tier3: Insight[] = []; // POSITIVE

    const { income, expense, balance, byCategory, savingsRate } = dash;

    // ═══ TIER 1 — RISK ═══

    // Budget overspend
    for (const b of budgetRows.filter((r: BudgetSummaryRow) => r.status === "over")) {
      const pct = ((b.percent ?? 0) * 100 - 100).toFixed(0);
      tier1.push({
        id: `over-${b.category_id}`,
        level: "critical",
        icon: "!",
        title: `Budget "${b.category_name}" superato del ${pct}%`,
        detail: `Speso ${b.spent.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} su un limite di ${b.monthly_limit.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}.`,
      });
    }

    // Balance below threshold
    const saldo = openingBalance + balance;
    const threshold = minBalanceThreshold ?? 0;
    if (threshold > 0 && saldo < threshold) {
      const diff = threshold - saldo;
      tier1.push({
        id: "below-threshold",
        level: "critical",
        icon: "↓",
        title: "Saldo sotto soglia minima",
        detail: `Servono +${diff.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} per rientrare.`,
      });
    }

    // High recurring burden (>60%)
    const recExpense = (recurring ?? [])
      .filter((r) => r.type === "expense" && r.is_active)
      .reduce((s, r) => s + r.amount, 0);
    if (income > 0 && recExpense / income > 0.6) {
      tier1.push({
        id: "high-recurring",
        level: "critical",
        icon: "↓",
        title: `Ricorrenze al ${((recExpense / income) * 100).toFixed(0)}% delle entrate`,
        detail: "Oltre il 60% del reddito è impegnato in spese fisse.",
      });
    }

    // No income
    if (income === 0 && expense > 0) {
      tier1.push({
        id: "no-income",
        level: "critical",
        icon: "!",
        title: "Nessuna entrata nel periodo",
        detail: "Registra le entrate per un quadro completo.",
      });
    }

    // ═══ TIER 2 — BEHAVIOR ═══

    // Near budget (>80%)
    for (const b of budgetRows.filter((r: BudgetSummaryRow) => r.status !== "over" && (r.percent ?? 0) > 0.8)) {
      const pct = ((b.percent ?? 0) * 100).toFixed(0);
      tier2.push({
        id: `warn-${b.category_id}`,
        level: "warning",
        icon: "↑",
        title: `Sei all'${pct}% del budget "${b.category_name}"`,
        detail: `Resta poco margine prima di superare il limite mensile.`,
      });
    }

    // Spike in a single category (>3x average or >300)
    if (byCategory.length > 0 && income > 0) {
      const avgCat = expense / byCategory.length;
      for (const cat of byCategory) {
        if (cat.amount > Math.max(avgCat * 3, 300)) {
          tier2.push({
            id: `spike-${cat.name}`,
            level: "warning",
            icon: "↑",
            title: `Spesa anomala in "${cat.name}"`,
            detail: `${cat.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} — significativamente sopra la media.`,
          });
          break; // only 1
        }
      }
    }

    // Dominant new category (single category >50% of total expense)
    if (byCategory.length > 1 && expense > 0) {
      const top = byCategory[0];
      if (top && top.amount / expense > 0.5) {
        tier2.push({
          id: `dominant-${top.name}`,
          level: "warning",
          icon: "↑",
          title: `"${top.name}" assorbe il ${((top.amount / expense) * 100).toFixed(0)}% delle uscite`,
          detail: "Una singola categoria domina la spesa. Valuta se è intenzionale.",
        });
      }
    }

    // ═══ TIER 3 — POSITIVE ═══

    if (savingsRate > 15) {
      tier3.push({
        id: "good-savings",
        level: "positive",
        icon: "💡",
        title: `Ottimo: risparmio del ${savingsRate.toFixed(0)}%`,
        detail: "Stai risparmiando una buona quota delle entrate.",
      });
    }

    if (income > 0 && expense < income * 0.6) {
      tier3.push({
        id: "low-expense-ratio",
        level: "positive",
        icon: "💡",
        title: "Uscite contenute",
        detail: `Le spese sono sotto il 60% delle entrate. Ottima gestione!`,
      });
    }

    // ── Assemble: prioritise tiers, dedup, max 3 ──
    const all = [...tier1, ...tier2, ...tier3];
    all.sort((a, b) => PRIORITY[b.level] - PRIORITY[a.level]);
    const deduped = filterDedup(all);
    const final = deduped.slice(0, 3);

    // Mark shown insights as seen
    if (final.length > 0) {
      markSeen(final.map((i) => i.id));
    }

    return final;
  }, [dash, budgetRows, recurring, isLoading, openingBalance, minBalanceThreshold]);

  return { insights, isLoading };
}
