
-- Create budget_settings table for per-workspace budget preferences
CREATE TABLE public.budget_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'monthly',
  reset_mode text NOT NULL DEFAULT 'auto',
  alerts_enabled boolean NOT NULL DEFAULT true,
  alert_threshold integer NOT NULL DEFAULT 100,
  reset_anchor_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger instead of CHECK constraints (migration-safe)
CREATE OR REPLACE FUNCTION public.validate_budget_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.period NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'period must be monthly or yearly';
  END IF;
  IF NEW.reset_mode NOT IN ('auto', 'manual') THEN
    RAISE EXCEPTION 'reset_mode must be auto or manual';
  END IF;
  IF NEW.alert_threshold NOT IN (80, 90, 100) THEN
    RAISE EXCEPTION 'alert_threshold must be 80, 90, or 100';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_budget_settings_trigger
BEFORE INSERT OR UPDATE ON public.budget_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_budget_settings();

-- Auto-update updated_at
CREATE TRIGGER update_budget_settings_updated_at
BEFORE UPDATE ON public.budget_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

-- Temporary open policy (same pattern as other tables, tighten with auth later)
CREATE POLICY "Allow all access to budget_settings"
ON public.budget_settings
FOR ALL
USING (true)
WITH CHECK (true);
