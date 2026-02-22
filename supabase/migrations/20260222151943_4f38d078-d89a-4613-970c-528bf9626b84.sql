
-- Create category_budgets table
CREATE TABLE public.category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, category_id),
  CHECK(monthly_limit >= 0)
);

-- Enable RLS
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

-- RLS policy (consistent with rest of project)
CREATE POLICY "Allow all access to category_budgets"
  ON public.category_budgets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_category_budgets_updated_at
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
