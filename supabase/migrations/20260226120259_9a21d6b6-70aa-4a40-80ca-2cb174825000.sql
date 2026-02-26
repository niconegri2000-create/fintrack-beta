
-- Add sort_order and is_active columns to accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill sort_order for existing accounts based on creation order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY is_default DESC, created_at ASC) - 1 AS rn
  FROM public.accounts
)
UPDATE public.accounts a SET sort_order = r.rn FROM ranked r WHERE a.id = r.id;

-- Index for efficient filtering and ordering
CREATE INDEX IF NOT EXISTS idx_accounts_active_sort ON public.accounts (workspace_id, is_active, sort_order);
