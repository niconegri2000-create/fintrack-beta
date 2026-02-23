
-- Unique constraint to guarantee DB-level idempotency for recurring-generated transactions.
-- Prevents duplicates even with concurrent browser tabs or future multi-device usage.
-- NOTE: This only constrains rows WHERE recurring_rule_id IS NOT NULL,
-- so manual transactions are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_recurring_occurrence
  ON public.transactions (workspace_id, recurring_rule_id, date)
  WHERE recurring_rule_id IS NOT NULL;
