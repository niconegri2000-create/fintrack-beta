
-- Step 1: Create accounts table
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  min_balance_threshold numeric DEFAULT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);

-- Unique constraint: one default per workspace
CREATE UNIQUE INDEX uq_accounts_default_per_workspace ON public.accounts (workspace_id) WHERE is_default = true;

-- Add nullable account_id to transactions
ALTER TABLE public.transactions ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT;

-- Add nullable account_id to recurring_rules
ALTER TABLE public.recurring_rules ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT;

-- Backfill: create default account for each workspace, copying opening_balance and min_balance_threshold
INSERT INTO public.accounts (workspace_id, name, opening_balance, min_balance_threshold, is_default)
SELECT id, 'Personale', opening_balance, min_balance_threshold, true
FROM public.workspaces;

-- Backfill: link all existing transactions to their workspace's default account
UPDATE public.transactions t
SET account_id = a.id
FROM public.accounts a
WHERE a.workspace_id = t.workspace_id AND a.is_default = true;

-- Backfill: link all existing recurring_rules to their workspace's default account
UPDATE public.recurring_rules r
SET account_id = a.id
FROM public.accounts a
WHERE a.workspace_id = r.workspace_id AND a.is_default = true;
