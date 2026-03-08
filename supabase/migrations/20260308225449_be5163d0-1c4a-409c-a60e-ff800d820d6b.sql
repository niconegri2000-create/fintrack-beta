
-- Step 1: Remove duplicate recurring-generated transactions, keeping only the earliest created one per (workspace_id, recurring_rule_id, date)
DELETE FROM public.transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY workspace_id, recurring_rule_id, date
        ORDER BY created_at ASC
      ) AS rn
    FROM public.transactions
    WHERE source = 'recurring_generated'
      AND recurring_rule_id IS NOT NULL
  ) dupes
  WHERE rn > 1
);

-- Step 2: Add unique index to prevent future duplicates for recurring-generated transactions
CREATE UNIQUE INDEX IF NOT EXISTS uq_recurring_generated_occurrence
ON public.transactions (workspace_id, recurring_rule_id, date)
WHERE source = 'recurring_generated' AND recurring_rule_id IS NOT NULL;
