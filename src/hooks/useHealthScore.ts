import { useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";

export type HealthStatus = "ottimo" | "buono" | "attenzione" | "critico";

export interface HealthScoreResult {
  score: number;
  status: HealthStatus;
  label: string;
  pills: string[];
  savingsRate: number;
  bufferMonths: number;
  fixedBurden: number;
  isLoading: boolean;
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

export function useHealthScore(): HealthScoreResult {
  const { dateRange } = useDateRange();
  const { selectedAccountId, openingBalance, minBalanceThreshold } = useAccountContext();
  const { data, isLoading: dashLoading } = useDashboardData(dateRange.from, dateRange.to, selectedAccountId);
  const { data: recurring, isLoading: recLoading } = useRecurringRules(selectedAccountId);

  return useMemo(() => {
    const isLoading = dashLoading || recLoading;
    if (!data || isLoading) {
      return { score: 0, status: "critico" as HealthStatus, label: "—", pills: [], savingsRate: 0, bufferMonths: 0, fixedBurden: 0, isLoading };
    }

    const { income, expense, balance } = data;

    // Edge case: no income but expenses
    if (income === 0 && expense > 0) {
      return { score: 15, status: "critico", label: "Critico", pills: ["Nessuna entrata", "Solo uscite"], savingsRate: 0, bufferMonths: 0, fixedBurden: 1, isLoading: false };
    }
    // No data at all
    if (income === 0 && expense === 0) {
      return { score: 0, status: "critico", label: "—", pills: ["Nessun dato nel periodo"], savingsRate: 0, bufferMonths: 0, fixedBurden: 0, isLoading: false };
    }

    // 1. Savings rate (0–1)
    const savingsRate = clamp(balance / income, 0, 1);

    // 2. Buffer months
    const saldo = openingBalance + balance;
    const threshold = minBalanceThreshold ?? 0;
    const monthlyExpense = expense > 0 ? expense : 1;
    const bufferMonths = clamp((saldo - threshold) / monthlyExpense, 0, 6);
    const bufferNorm = bufferMonths / 6; // 0–1

    // 3. Fixed burden
    const fixedExpenseRecurring = (recurring ?? [])
      .filter((r) => r.type === "expense" && r.is_active)
      .reduce((s, r) => s + r.amount, 0);
    const fixedBurden = clamp(income > 0 ? fixedExpenseRecurring / income : 1, 0, 1);

    // Score
    const raw = 100 * (0.45 * savingsRate + 0.35 * bufferNorm + 0.20 * (1 - fixedBurden));
    const score = Math.round(clamp(raw, 0, 100));
    const { status, label } = getStatus(score);

    // Pills
    const pills: string[] = [];
    pills.push(`Risparmio ${(savingsRate * 100).toFixed(0)}%`);
    pills.push(`Cuscinetto ${bufferMonths.toFixed(1)} mesi`);
    if (fixedBurden > 0.5) pills.push("Spese fisse alte");
    else if (fixedBurden > 0.3) pills.push("Spese fisse moderate");

    return { score, status, label, pills, savingsRate, bufferMonths, fixedBurden, isLoading: false };
  }, [data, dashLoading, recLoading, recurring, openingBalance, minBalanceThreshold]);
}
