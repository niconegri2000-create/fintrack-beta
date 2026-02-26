
-- Create monthly_snapshots table
CREATE TABLE public.monthly_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  month date NOT NULL,
  income_total numeric NOT NULL DEFAULT 0,
  expense_total numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  savings_rate numeric NOT NULL DEFAULT 0,
  top_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  critical_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_monthly_snapshot UNIQUE (workspace_id, account_id, month)
);

-- Enable RLS
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy consistent with existing tables
CREATE POLICY "Allow all access to monthly_snapshots"
  ON public.monthly_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);
