
-- Harden account_id to NOT NULL on both tables
ALTER TABLE public.transactions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.recurring_rules ALTER COLUMN account_id SET NOT NULL;
