import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export type HealthStatus = "ottimo" | "buono" | "attenzione" | "critico" | "insufficiente";

export interface HealthScoreResult {
  score: number;
  status: HealthStatus;
  label: string;
  pills: string[];
  savingsRate: number;
  bufferMonths: number;
  fixedBurden: number;
  stabilityDelta: number;
  isLoading: boolean;
  insufficientData: boolean;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getStatus(score: number): { status: HealthStatus; label: string } {
  if (score >= 80) return { status: "ottimo", label: "Ottimo" };
  if (score >= 60) return { status: "buono", label: "Buono" };
  if (score >= 40) return { status: "attenzione", label: "Attenzione" };
  return { status: "critico", label: "Critico" };
}

/** Fetch monthly expense totals for last N months (for stability calc) */
function useRecentMonthlyExpenses(accountId: string | null, months: number = 3, workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const today = new Date();
  const from = format(startOfMonth(subMonths(today, months)), "yyyy-MM-dd");
  const to = format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["recent_monthly_expenses", from, to, accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("date, amount")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("date", from)
        .lte("date", to);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;

      const monthMap = new Map<string, number>();
      for (const r of data ?? []) {
        const m = r.date.slice(0, 7);
        monthMap.set(m, (monthMap.get(m) ?? 0) + Number(r.amount));
      }
      return Array.from(monthMap.values());
    },
  });
}

export function useHealthScore(): HealthScoreResult {
  const { dateRange } = useDateRange();
  const { selectedAccountId, openingBalance, minBalanceThreshold } = useAccountContext();
  const { data, isLoading: dashLoading } = useDashboardData(dateRange.from, dateRange.to, selectedAccountId);
  const { data: recurring, isLoading: recLoading } = useRecurringRules(selectedAccountId);
  const { data: recentExpenses, isLoading: histLoading } = useRecentMonthlyExpenses(selectedAccountId);

  return useMemo(() => {
    const isLoading = dashLoading || recLoading || histLoading;
    const empty: HealthScoreResult = {
      score: 0, status: "insufficiente", label: "Dati insufficienti",
      pills: [], savingsRate: 0, bufferMonths: 0, fixedBurden: 0, stabilityDelta: 0,
      isLoading, insufficientData: true,
    };

    if (isLoading) return { ...empty, isLoading: true };
    if (!data) return empty;

    const { income, expense, balance } = data;

    // Insufficient data check: no income AND no expense
    if (income === 0 && expense === 0) {
      return { ...empty, isLoading: false, pills: ["Nessun dato nel periodo"] };
    }

    // If only expenses, no income — insufficient for a meaningful score
    if (income === 0 && expense > 0) {
      return {
        ...empty, isLoading: false, insufficientData: true,
        pills: ["Nessuna entrata registrata"],
        label: "Dati insufficienti",
      };
    }

    // ── A) Savings rate (weight 40%) ──
    const savingsRate = balance / income; // can be negative
    let savingsScore: number;
    if (savingsRate >= 0.20) savingsScore = 1;
    else if (savingsRate >= 0.10) savingsScore = 0.7;
    else if (savingsRate >= 0) savingsScore = 0.4;
    else savingsScore = clamp(0.2 + savingsRate, 0, 0.2); // negative penalised heavily

    // ── B) Expense stability (weight 25%) ──
    let stabilityScore = 0.5; // neutral default
    let stabilityDelta = 0;
    const hist = recentExpenses ?? [];
    if (hist.length >= 2) {
      const avg = hist.reduce((s, v) => s + v, 0) / hist.length;
      if (avg > 0) {
        stabilityDelta = (expense - avg) / avg; // positive = spending increased
        if (stabilityDelta <= 0) stabilityScore = 1; // spending decreased → great
        else if (stabilityDelta <= 0.10) stabilityScore = 0.7;
        else if (stabilityDelta <= 0.20) stabilityScore = 0.4;
        else stabilityScore = clamp(0.2 - (stabilityDelta - 0.20), 0, 0.2);
      }
    }

    // ── C) Recurring burden (weight 20%) ──
    const recExpense = (recurring ?? [])
      .filter((r) => r.type === "expense" && r.is_active)
      .reduce((s, r) => s + r.amount, 0);
    const fixedBurden = clamp(income > 0 ? recExpense / income : 1, 0, 1);
    let burdenScore: number;
    if (fixedBurden <= 0.30) burdenScore = 1;
    else if (fixedBurden <= 0.50) burdenScore = 0.6;
    else if (fixedBurden <= 0.60) burdenScore = 0.3;
    else burdenScore = 0.1;

    // ── D) Buffer / liquidity (weight 15%) ──
    const saldo = openingBalance + balance;
    const threshold = minBalanceThreshold ?? 0;
    const monthlyExpense = expense > 0 ? expense : 1;
    const bufferMonths = clamp((saldo - threshold) / monthlyExpense, 0, 12);
    let bufferScore: number;
    if (bufferMonths >= 3) bufferScore = 1;
    else if (bufferMonths >= 2) bufferScore = 0.7;
    else if (bufferMonths >= 1) bufferScore = 0.4;
    else bufferScore = 0.1;

    // ── Composite score ──
    const raw = 100 * (0.40 * savingsScore + 0.25 * stabilityScore + 0.20 * (1 - fixedBurden) * burdenScore / (1 - fixedBurden || 1) + 0.15 * bufferScore);
    // Simpler: weighted sum of normalised sub-scores
    const composite = 100 * (0.40 * savingsScore + 0.25 * stabilityScore + 0.20 * burdenScore + 0.15 * bufferScore);
    const score = Math.round(clamp(composite, 0, 100));
    const { status, label } = getStatus(score);

    // Pills
    const pills: string[] = [];
    pills.push(`Risparmio ${(savingsRate * 100).toFixed(0)}%`);
    if (hist.length >= 2) {
      const deltaLabel = stabilityDelta > 0 ? `+${(stabilityDelta * 100).toFixed(0)}%` : `${(stabilityDelta * 100).toFixed(0)}%`;
      pills.push(`Spese ${deltaLabel} vs media`);
    }
    pills.push(`Cuscinetto ${bufferMonths.toFixed(1)} mesi`);
    if (fixedBurden > 0.5) pills.push("Spese fisse alte");
    else if (fixedBurden > 0.3) pills.push("Spese fisse moderate");

    return {
      score, status, label, pills,
      savingsRate: savingsRate * 100,
      bufferMonths, fixedBurden, stabilityDelta,
      isLoading: false, insufficientData: false,
    };
  }, [data, dashLoading, recLoading, histLoading, recurring, recentExpenses, openingBalance, minBalanceThreshold]);
}
