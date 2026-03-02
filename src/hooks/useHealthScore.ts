import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
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
  // Trend
  trend: TrendResult;
}

export type TrendDirection = "improving" | "declining" | "stable" | "unavailable";

export interface TrendResult {
  direction: TrendDirection;
  delta: number; // score_current - avg_previous
  previousScores: { month: string; score: number }[];
  dominantCause: string | null;
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

// ── Pure score calculation (reusable for historical months) ──
export interface ScoreInput {
  income: number;
  expense: number;
  balance: number;
  recExpense: number;
  openingBalance: number;
  minBalanceThreshold: number;
  avgExpensePrev?: number; // for stability
}

export function computeHealthScore(input: ScoreInput): { score: number; savingsRate: number; bufferMonths: number; fixedBurden: number; stabilityDelta: number } {
  const { income, expense, balance, recExpense, openingBalance, minBalanceThreshold, avgExpensePrev } = input;

  if (income === 0) return { score: 0, savingsRate: 0, bufferMonths: 0, fixedBurden: 0, stabilityDelta: 0 };

  // A) Savings rate (40%)
  const savingsRate = balance / income;
  let savingsScore: number;
  if (savingsRate >= 0.20) savingsScore = 1;
  else if (savingsRate >= 0.10) savingsScore = 0.7;
  else if (savingsRate >= 0) savingsScore = 0.4;
  else savingsScore = clamp(0.2 + savingsRate, 0, 0.2);

  // B) Stability (25%)
  let stabilityScore = 0.5;
  let stabilityDelta = 0;
  if (avgExpensePrev != null && avgExpensePrev > 0) {
    stabilityDelta = (expense - avgExpensePrev) / avgExpensePrev;
    if (stabilityDelta <= 0) stabilityScore = 1;
    else if (stabilityDelta <= 0.10) stabilityScore = 0.7;
    else if (stabilityDelta <= 0.20) stabilityScore = 0.4;
    else stabilityScore = clamp(0.2 - (stabilityDelta - 0.20), 0, 0.2);
  }

  // C) Recurring burden (20%)
  const fixedBurden = clamp(recExpense / income, 0, 1);
  let burdenScore: number;
  if (fixedBurden <= 0.30) burdenScore = 1;
  else if (fixedBurden <= 0.50) burdenScore = 0.6;
  else if (fixedBurden <= 0.60) burdenScore = 0.3;
  else burdenScore = 0.1;

  // D) Buffer (15%)
  const saldo = openingBalance + balance;
  const threshold = minBalanceThreshold ?? 0;
  const monthlyExpense = expense > 0 ? expense : 1;
  const bufferMonths = clamp((saldo - threshold) / monthlyExpense, 0, 12);
  let bufferScore: number;
  if (bufferMonths >= 3) bufferScore = 1;
  else if (bufferMonths >= 2) bufferScore = 0.7;
  else if (bufferMonths >= 1) bufferScore = 0.4;
  else bufferScore = 0.1;

  const composite = 100 * (0.40 * savingsScore + 0.25 * stabilityScore + 0.20 * burdenScore + 0.15 * bufferScore);
  const score = Math.round(clamp(composite, 0, 100));

  return { score, savingsRate: savingsRate * 100, bufferMonths, fixedBurden, stabilityDelta };
}

// ── Fetch monthly totals (income + expense) for previous months ──
function useHistoricalMonthlyTotals(accountId: string | null, months: number = 3, workspaceId: string) {
  const today = new Date();
  const from = format(startOfMonth(subMonths(today, months)), "yyyy-MM-dd");
  const to = format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["historical_monthly_totals", from, to, accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("date, amount, type")
        .eq("workspace_id", workspaceId)
        .gte("date", from)
        .lte("date", to);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;

      const monthMap = new Map<string, { income: number; expense: number }>();
      for (const r of data ?? []) {
        const m = r.date.slice(0, 7);
        const entry = monthMap.get(m) ?? { income: 0, expense: 0 };
        if (r.type === "income") entry.income += Number(r.amount);
        else entry.expense += Number(r.amount);
        monthMap.set(m, entry);
      }
      return Array.from(monthMap.entries())
        .map(([month, v]) => ({ month, ...v, balance: v.income - v.expense }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
  });
}

// ── Fetch category spending for current period (for cause analysis) ──
function useCategoryComparison(accountId: string | null, workspaceId: string) {
  const today = new Date();
  const curFrom = format(startOfMonth(today), "yyyy-MM-dd");
  const curTo = format(endOfMonth(today), "yyyy-MM-dd");
  const prevFrom = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
  const prevTo = format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["category_comparison", curFrom, prevFrom, accountId, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("date, amount, type, category:categories(name)")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("date", prevFrom)
        .lte("date", curTo);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;

      const curMonth = curFrom.slice(0, 7);
      const prevMonth = prevFrom.slice(0, 7);
      const curMap = new Map<string, number>();
      const prevMap = new Map<string, number>();

      for (const r of (data ?? []) as any[]) {
        const m = r.date.slice(0, 7);
        const cat = r.category?.name ?? "Altro";
        const amt = Number(r.amount);
        if (m === curMonth) curMap.set(cat, (curMap.get(cat) ?? 0) + amt);
        else if (m === prevMonth) prevMap.set(cat, (prevMap.get(cat) ?? 0) + amt);
      }

      // Find biggest absolute increase
      const allCats = new Set([...curMap.keys(), ...prevMap.keys()]);
      let maxDelta = 0;
      let maxCat = "";
      let maxPct = 0;
      for (const cat of allCats) {
        const cur = curMap.get(cat) ?? 0;
        const prev = prevMap.get(cat) ?? 0;
        const delta = cur - prev;
        if (Math.abs(delta) > Math.abs(maxDelta)) {
          maxDelta = delta;
          maxCat = cat;
          maxPct = prev > 0 ? (delta / prev) * 100 : 0;
        }
      }

      return { maxCat, maxDelta, maxPct };
    },
  });
}

export function useHealthScore(): HealthScoreResult {
  const workspaceId = useWorkspaceId();
  const { dateRange } = useDateRange();
  const { selectedAccountId, openingBalance, minBalanceThreshold } = useAccountContext();
  const { data, isLoading: dashLoading } = useDashboardData(dateRange.from, dateRange.to, selectedAccountId);
  const { data: recurring, isLoading: recLoading } = useRecurringRules(selectedAccountId);
  const { data: histMonths, isLoading: histLoading } = useHistoricalMonthlyTotals(selectedAccountId, 3, workspaceId);
  const { data: catComparison } = useCategoryComparison(selectedAccountId, workspaceId);

  return useMemo(() => {
    const isLoading = dashLoading || recLoading || histLoading;
    const emptyTrend: TrendResult = { direction: "unavailable", delta: 0, previousScores: [], dominantCause: null };
    const empty: HealthScoreResult = {
      score: 0, status: "insufficiente", label: "Dati insufficienti",
      pills: [], savingsRate: 0, bufferMonths: 0, fixedBurden: 0, stabilityDelta: 0,
      isLoading, insufficientData: true, trend: emptyTrend,
    };

    if (isLoading) return { ...empty, isLoading: true };
    if (!data) return empty;

    const { income, expense, balance } = data;

    if (income === 0 && expense === 0) {
      return { ...empty, isLoading: false, pills: ["Nessun dato nel periodo"] };
    }
    if (income === 0 && expense > 0) {
      return { ...empty, isLoading: false, pills: ["Nessuna entrata registrata"], label: "Dati insufficienti" };
    }

    const recExpense = (recurring ?? [])
      .filter((r) => r.type === "expense" && r.is_active)
      .reduce((s, r) => s + r.amount, 0);

    const hist = histMonths ?? [];
    const avgExpensePrev = hist.length >= 2
      ? hist.reduce((s, m) => s + m.expense, 0) / hist.length
      : undefined;

    const current = computeHealthScore({
      income, expense, balance, recExpense,
      openingBalance, minBalanceThreshold, avgExpensePrev,
    });

    const { status, label } = getStatus(current.score);

    // ── Trend: compute score for each historical month ──
    const previousScores: { month: string; score: number }[] = [];
    for (const m of hist) {
      if (m.income === 0) continue;
      const s = computeHealthScore({
        income: m.income, expense: m.expense, balance: m.balance,
        recExpense, openingBalance, minBalanceThreshold,
      });
      previousScores.push({ month: m.month, score: s.score });
    }

    let trend: TrendResult;
    if (previousScores.length === 0) {
      trend = { direction: "unavailable", delta: 0, previousScores: [], dominantCause: null };
    } else {
      const avgPrev = previousScores.reduce((s, p) => s + p.score, 0) / previousScores.length;
      const delta = Math.round(current.score - avgPrev);

      let direction: TrendDirection;
      if (delta >= 5) direction = "improving";
      else if (delta <= -5) direction = "declining";
      else direction = "stable";

      // Dominant cause
      let dominantCause: string | null = null;
      if (catComparison && direction !== "stable") {
        const { maxCat, maxDelta: catDelta, maxPct } = catComparison;
        if (maxCat && Math.abs(catDelta) > 0) {
          const sign = catDelta > 0 ? "+" : "";
          dominantCause = maxPct !== 0
            ? `${catDelta > 0 ? "Aumento" : "Riduzione"} spese "${maxCat}" (${sign}${maxPct.toFixed(0)}%)`
            : `Variazione in "${maxCat}"`;
        }
      }
      if (!dominantCause && direction === "improving" && current.savingsRate > 15) {
        dominantCause = "Miglioramento del tasso di risparmio";
      }
      if (!dominantCause && direction === "declining" && current.fixedBurden > 0.5) {
        dominantCause = "Pressione elevata delle spese fisse";
      }

      trend = { direction, delta, previousScores, dominantCause };
    }

    // Pills
    const pills: string[] = [];
    pills.push(`Risparmio ${current.savingsRate.toFixed(0)}%`);
    if (hist.length >= 2) {
      const deltaLabel = current.stabilityDelta > 0 ? `+${(current.stabilityDelta * 100).toFixed(0)}%` : `${(current.stabilityDelta * 100).toFixed(0)}%`;
      pills.push(`Spese ${deltaLabel} vs media`);
    }
    pills.push(`Cuscinetto ${current.bufferMonths.toFixed(1)} mesi`);
    if (current.fixedBurden > 0.5) pills.push("Spese fisse alte");
    else if (current.fixedBurden > 0.3) pills.push("Spese fisse moderate");

    return {
      score: current.score, status, label, pills,
      savingsRate: current.savingsRate,
      bufferMonths: current.bufferMonths, fixedBurden: current.fixedBurden,
      stabilityDelta: current.stabilityDelta,
      isLoading: false, insufficientData: false, trend,
    };
  }, [data, dashLoading, recLoading, histLoading, recurring, histMonths, catComparison, openingBalance, minBalanceThreshold]);
}
