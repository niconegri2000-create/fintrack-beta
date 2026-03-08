/**
 * Legacy hook — recurring rules no longer materialise transactions.
 * Always returns { ready: true } so downstream queries are never blocked.
 */
export function useAutoGenerateRecurring() {
  return { ready: true };
}
