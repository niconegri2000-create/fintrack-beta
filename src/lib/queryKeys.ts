import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

/**
 * Centralized query invalidation helpers.
 * Ensures all related queries are invalidated after mutations.
 */

const FINANCIAL_KEYS = [
  ["transactions"],
  ["dashboard"],
  ["forecast"],
  ["accounts"],
  ["accounts-all"],
  ["report"],
  ["category_spending"],
  ["historical_monthly_totals"],
  ["transaction_tags"],
  ["transaction_tags_batch"],
] as const;

const RECURRING_KEYS = [
  ["recurring_rules"],
] as const;

const TRANSFER_KEYS = [
  ["transfers"],
] as const;

const GOAL_KEYS = [
  ["goals"],
  ["goal_contributions"],
] as const;

const CATEGORY_KEYS = [
  ["categories"],
  ["categories_names"],
  ["category_budgets"],
  ["category_spending"],
  ["dashboard"],
  ["report"],
] as const;

const CATEGORY_BUDGET_KEYS = [
  ["category_budgets"],
  ["category_spending"],
  ["dashboard"],
] as const;

function logInvalidation(label: string, keys: readonly (readonly string[])[]) {
  if (import.meta.env.DEV) {
    logger.info(`[UI_SYNC] ${label} → invalidating: ${keys.map(k => k[0]).join(", ")}`);
  }
}

export function invalidateFinancialQueries(qc: ReturnType<typeof useQueryClient>, label: string) {
  logInvalidation(label, FINANCIAL_KEYS);
  for (const key of FINANCIAL_KEYS) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterTransaction(qc: ReturnType<typeof useQueryClient>, label: string) {
  logInvalidation(label, [...FINANCIAL_KEYS]);
  for (const key of FINANCIAL_KEYS) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterRecurring(qc: ReturnType<typeof useQueryClient>, label: string) {
  const keys = [...FINANCIAL_KEYS, ...RECURRING_KEYS];
  logInvalidation(label, keys);
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterTransfer(qc: ReturnType<typeof useQueryClient>, label: string) {
  const keys = [...FINANCIAL_KEYS, ...TRANSFER_KEYS];
  logInvalidation(label, keys);
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterAccount(qc: ReturnType<typeof useQueryClient>, label: string) {
  const keys = [...FINANCIAL_KEYS, ...RECURRING_KEYS, ...TRANSFER_KEYS];
  logInvalidation(label, keys);
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterGoal(qc: ReturnType<typeof useQueryClient>, label: string) {
  logInvalidation(label, GOAL_KEYS);
  for (const key of GOAL_KEYS) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterCategory(qc: ReturnType<typeof useQueryClient>, label: string) {
  logInvalidation(label, CATEGORY_KEYS);
  for (const key of CATEGORY_KEYS) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}

export function invalidateAfterCategoryBudget(qc: ReturnType<typeof useQueryClient>, label: string) {
  logInvalidation(label, CATEGORY_BUDGET_KEYS);
  for (const key of CATEGORY_BUDGET_KEYS) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}
