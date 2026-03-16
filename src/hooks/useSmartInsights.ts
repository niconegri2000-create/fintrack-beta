import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBudgetSummary, type BudgetSummaryRow } from "@/hooks/useCategoryBudgets";
import { useAccountContext } from "@/contexts/AccountContext";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

export type InsightLevel = "critical" | "warning" | "positive";

export interface Insight {
  id: string;
  level: InsightLevel;
  icon: string;
  title: string;
  detail: string;
  priority: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function buildInsight(input: Omit<Insight, "icon"> & { icon?: string }): Insight {
  return {
    icon: input.icon ?? "•",
    ...input,
  };
}

export function useSmartInsights(startDate: string, endDate: string): { insights: Insight[]; isLoading: boolean } {
  const workspaceId = useWorkspaceId();
  const { selectedAccountId } = useAccountContext();

  const { data: dash, isLoading: dashLoading } = useDashboardData(startDate, endDate, selectedAccountId);
  const { data: budgetRows, isLoading: budgetLoading } = useBudgetSummary(startDate, endDate, selectedAccountId);

  const transactionsQuery = useQuery({
    queryKey: ["smart_insights_transactions", workspaceId, selectedAccountId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("id, date, amount, type, description, category:categories(name)")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("amount", { ascending: false });

      if (selectedAccountId) query = query.eq("account_id", selectedAccountId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        date: string;
        amount: number;
        type: string;
        description: string | null;
        category: { name: string } | null;
      }>;
    },
  });

  const isLoading = dashLoading || budgetLoading || transactionsQuery.isLoading;

  const insights = useMemo(() => {
    if (!dash || isLoading) return [];

    const { income, expense, balance, byCategory, savingsRate } = dash;
    const candidates: Insight[] = [];
    const transactions = transactionsQuery.data ?? [];
    const negativeNet = income > 0 && expense > income;
    const overBudgetRows = budgetRows.filter((row: BudgetSummaryRow) => row.status === "over");
    const warningBudgetRows = budgetRows.filter((row: BudgetSummaryRow) => row.status === "warn1" || row.status === "warn2");
    const topCategory = byCategory[0];
    const topTransaction = transactions[0];

    if (negativeNet) {
      candidates.push(buildInsight({
        id: "negative-net",
        level: "critical",
        priority: 100,
        title: "Hai speso più di quanto hai incassato nel periodo selezionato.",
        detail: `Il saldo netto del periodo è negativo di ${formatCurrency(Math.abs(balance))}.`,
      }));
    }

    if (income > 0 && savingsRate < 10) {
      candidates.push(buildInsight({
        id: "low-savings",
        level: negativeNet ? "critical" : "warning",
        priority: negativeNet ? 95 : 80,
        title: "Il margine di risparmio è molto basso.",
        detail: `Stai trattenendo ${savingsRate.toFixed(1)}% delle entrate, sotto la soglia del 10%.`,
      }));
    }

    if (topCategory && expense > 0) {
      const categoryWeight = (topCategory.amount / expense) * 100;
      if (categoryWeight >= 35) {
        candidates.push(buildInsight({
          id: `dominant-category-${topCategory.name}`,
          level: categoryWeight >= 50 ? "critical" : "warning",
          priority: categoryWeight >= 50 ? 90 : 70,
          title: `La categoria ${topCategory.name} pesa più di tutte nel periodo.`,
          detail: `Rappresenta il ${categoryWeight.toFixed(0)}% delle uscite, pari a ${formatCurrency(topCategory.amount)}.`,
        }));
      }
    }

    if (topTransaction && expense > 0) {
      const txWeight = (Number(topTransaction.amount) / expense) * 100;
      const txAmount = Number(topTransaction.amount);
      if (txWeight >= 25 || txAmount >= 500) {
        const txLabel = topTransaction.description?.trim() || topTransaction.category?.name || "Spesa rilevante";
        candidates.push(buildInsight({
          id: `anomalous-transaction-${topTransaction.id}`,
          level: txWeight >= 35 ? "critical" : "warning",
          priority: txWeight >= 35 ? 85 : 65,
          title: `La spesa “${txLabel}” ha inciso molto sul periodo.`,
          detail: `${formatCurrency(txAmount)} pari al ${txWeight.toFixed(0)}% delle uscite totali.`,
        }));
      }
    }

    for (const row of overBudgetRows.slice(0, 2)) {
      const pct = ((row.percent ?? 0) * 100).toFixed(0);
      candidates.push(buildInsight({
        id: `budget-over-${row.category_id}`,
        level: "critical",
        priority: 88,
        title: `La categoria ${row.category_name} ha superato il budget.`,
        detail: `${formatCurrency(row.spent)} spesi su ${formatCurrency(row.monthly_limit)} (${pct}%).`,
      }));
    }

    if (overBudgetRows.length === 0) {
      for (const row of warningBudgetRows.slice(0, 1)) {
        const pct = ((row.percent ?? 0) * 100).toFixed(0);
        candidates.push(buildInsight({
          id: `budget-warning-${row.category_id}`,
          level: "warning",
          priority: 60,
          title: `La categoria ${row.category_name} è vicina al limite budget.`,
          detail: `Hai già utilizzato il ${pct}% del budget nel periodo selezionato.`,
        }));
      }
    }

    if (!negativeNet && income > 0 && savingsRate >= 10 && (overBudgetRows.length + warningBudgetRows.length) === 0) {
      candidates.push(buildInsight({
        id: "healthy-period",
        level: "positive",
        priority: 40,
        title: "Periodo ordinato e sotto controllo.",
        detail: `Netto positivo di ${formatCurrency(balance)} e budget senza criticità rilevanti.`,
      }));
    }

    const unique = new Map<string, Insight>();
    for (const insight of candidates) {
      if (!unique.has(insight.id)) unique.set(insight.id, insight);
    }

    return Array.from(unique.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [dash, budgetRows, transactionsQuery.data, isLoading]);

  return { insights, isLoading };
}
