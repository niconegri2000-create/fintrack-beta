ALTER TABLE public.workspaces
ADD COLUMN min_balance_threshold numeric NOT NULL DEFAULT 0
CONSTRAINT min_balance_threshold_non_negative CHECK (min_balance_threshold >= 0);