
-- 1) csv_imports table
CREATE TABLE public.csv_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  file_name text,
  file_hash text,
  mapping jsonb DEFAULT '{}'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, account_id, file_hash)
);

ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own csv_imports"
  ON public.csv_imports FOR ALL TO authenticated
  USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());

-- 2) csv_import_rows table
CREATE TABLE public.csv_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.csv_imports(id) ON DELETE CASCADE,
  raw jsonb DEFAULT '{}'::jsonb,
  normalized jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'created',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.csv_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own csv_import_rows"
  ON public.csv_import_rows FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.csv_imports ci
    WHERE ci.id = csv_import_rows.import_id
    AND ci.workspace_id = get_user_workspace_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.csv_imports ci
    WHERE ci.id = csv_import_rows.import_id
    AND ci.workspace_id = get_user_workspace_id()
  ));

-- 3) Add columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES public.csv_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedup_key text;

-- 4) Unique index for dedup
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_dedup
  ON public.transactions(workspace_id, account_id, dedup_key)
  WHERE dedup_key IS NOT NULL;
