/**
 * Legacy module — recurring rules no longer materialise transactions.
 * Kept as a no-op stub so any stale imports don't break the build.
 */
export async function materializeRecurringRules(
  _workspaceId: string,
  _rules: unknown[]
): Promise<number> {
  return 0;
}
