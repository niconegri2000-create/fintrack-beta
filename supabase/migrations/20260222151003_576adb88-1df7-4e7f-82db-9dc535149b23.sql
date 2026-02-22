
ALTER TABLE public.recurring_rules
ADD COLUMN IF NOT EXISTS interval_months integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_rules_interval_months_check'
  ) THEN
    ALTER TABLE public.recurring_rules
    ADD CONSTRAINT recurring_rules_interval_months_check
    CHECK (interval_months >= 1);
  END IF;
END $$;
