
CREATE TABLE public.csv_import_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.csv_import_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own csv_import_templates"
  ON public.csv_import_templates FOR ALL TO authenticated
  USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());
