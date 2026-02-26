
-- Add account_id to goals table
ALTER TABLE public.goals ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Backfill existing goals: assign to default account of the workspace, or first active account
UPDATE public.goals g
SET account_id = COALESCE(
  (SELECT a.id FROM public.accounts a WHERE a.workspace_id = g.workspace_id AND a.is_default = true LIMIT 1),
  (SELECT a.id FROM public.accounts a WHERE a.workspace_id = g.workspace_id AND a.is_active = true ORDER BY a.sort_order ASC LIMIT 1)
);

-- Make account_id NOT NULL after backfill
ALTER TABLE public.goals ALTER COLUMN account_id SET NOT NULL;
