ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspaces_opening_balance_check'
  ) THEN
    ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_opening_balance_check
    CHECK (opening_balance >= 0);
  END IF;
END $$;