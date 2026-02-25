/**
 * Manages which accounts are "active" (visible) in the UI.
 * Persisted in localStorage so no DB migration is needed.
 * In the future this can be swapped for a Supabase-backed implementation.
 */

const STORAGE_KEY = "fintrack_active_accounts_v1";

interface ActiveAccountsData {
  version: 1;
  activeAccountIds: string[];
}

function load(): ActiveAccountsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && Array.isArray(parsed.activeAccountIds)) {
        return parsed as ActiveAccountsData;
      }
    }
  } catch { /* noop */ }
  return { version: 1, activeAccountIds: [] };
}

function save(data: ActiveAccountsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* noop */ }
}

/** Returns the ordered list of active account IDs. Empty means "all". */
export function getActiveAccountIds(): string[] {
  return load().activeAccountIds;
}

/** Overwrite the full active list. */
export function setActiveAccountIds(ids: string[]) {
  save({ version: 1, activeAccountIds: ids });
}

/**
 * Given all DB accounts and the desired active count, resolve the active list.
 *
 * Rules:
 * - If stored list is empty (first use), take first `count` accounts from DB.
 * - If count increases: append DB accounts not yet in the list.
 * - If count decreases: trim from the end.
 * - Remove IDs that no longer exist in DB (sanitize).
 * - Returns the resolved active IDs (already saved).
 */
export function resolveActiveAccounts(
  allDbAccountIds: string[],
  desiredCount: number,
): string[] {
  const stored = load().activeAccountIds;

  // Sanitize: keep only IDs that still exist in DB, preserve order
  const dbSet = new Set(allDbAccountIds);
  let active = stored.filter((id) => dbSet.has(id));

  // If empty (first use), seed from DB order
  if (active.length === 0) {
    active = allDbAccountIds.slice(0, desiredCount);
  }

  // If we need more, append from DB accounts not yet active
  if (active.length < desiredCount) {
    const activeSet = new Set(active);
    for (const id of allDbAccountIds) {
      if (active.length >= desiredCount) break;
      if (!activeSet.has(id)) {
        active.push(id);
        activeSet.add(id);
      }
    }
  }

  // If we need fewer, trim from end
  if (active.length > desiredCount) {
    active = active.slice(0, desiredCount);
  }

  save({ version: 1, activeAccountIds: active });
  return active;
}
