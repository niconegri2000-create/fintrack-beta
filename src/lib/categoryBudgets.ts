/**
 * Per-account category budgets stored in localStorage.
 * Migration-friendly: replace internals with Supabase later without changing the API.
 */

const STORAGE_KEY = "fintrack_category_budgets_v1";

interface BudgetStore {
  version: 1;
  byAccount: Record<string, Record<string, number>>;
}

function load(): BudgetStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) return parsed;
    }
  } catch { /* noop */ }
  return { version: 1, byAccount: {} };
}

function save(store: BudgetStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Get budget limit for a specific account + category. Returns 0 if not set. */
export function getLimitForAccount(accountId: string, categoryId: string): number {
  const store = load();
  return store.byAccount[accountId]?.[categoryId] ?? 0;
}

/** Set budget limit for a specific account + category. */
export function setLimitForAccount(accountId: string, categoryId: string, limit: number): void {
  const store = load();
  if (!store.byAccount[accountId]) store.byAccount[accountId] = {};
  if (limit <= 0) {
    delete store.byAccount[accountId][categoryId];
    if (Object.keys(store.byAccount[accountId]).length === 0) {
      delete store.byAccount[accountId];
    }
  } else {
    store.byAccount[accountId][categoryId] = limit;
  }
  save(store);
}

/** Reset (zero out) a budget for a specific account + category. */
export function resetLimitForAccount(accountId: string, categoryId: string): void {
  setLimitForAccount(accountId, categoryId, 0);
}

/** Get all limits for a specific account as a Map<categoryId, limit>. */
export function getLimitsForAccount(accountId: string): Map<string, number> {
  const store = load();
  const map = new Map<string, number>();
  const entry = store.byAccount[accountId];
  if (entry) {
    for (const [catId, limit] of Object.entries(entry)) {
      if (limit > 0) map.set(catId, limit);
    }
  }
  return map;
}

/** Get aggregated Master limit for a category = sum of all accounts' limits. */
export function getMasterLimit(categoryId: string): number {
  const store = load();
  let total = 0;
  for (const accountBudgets of Object.values(store.byAccount)) {
    total += accountBudgets[categoryId] ?? 0;
  }
  return total;
}

/** Get aggregated Master limits for all categories. */
export function getMasterLimits(): Map<string, number> {
  const store = load();
  const map = new Map<string, number>();
  for (const accountBudgets of Object.values(store.byAccount)) {
    for (const [catId, limit] of Object.entries(accountBudgets)) {
      if (limit > 0) map.set(catId, (map.get(catId) ?? 0) + limit);
    }
  }
  return map;
}

/** Get all limits: if accountId is null (Master), returns aggregated sums; otherwise per-account. */
export function getLimits(accountId: string | null): Map<string, number> {
  if (accountId === null) return getMasterLimits();
  return getLimitsForAccount(accountId);
}

/** Remove entries for accounts that no longer exist. */
export function sanitize(existingAccountIds: string[]): void {
  const store = load();
  const validSet = new Set(existingAccountIds);
  let changed = false;
  for (const key of Object.keys(store.byAccount)) {
    if (!validSet.has(key)) {
      delete store.byAccount[key];
      changed = true;
    }
  }
  if (changed) save(store);
}
