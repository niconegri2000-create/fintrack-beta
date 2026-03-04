
-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (workspace_id = get_user_workspace_id())
  WITH CHECK (workspace_id = get_user_workspace_id());

-- Transaction tags junction table
CREATE TABLE public.transaction_tags (
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own transaction_tags"
  ON public.transaction_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.workspace_id = get_user_workspace_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.workspace_id = get_user_workspace_id())
  );

-- Recurring tags junction table
CREATE TABLE public.recurring_tags (
  recurring_id uuid NOT NULL REFERENCES public.recurring_rules(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recurring_id, tag_id)
);

ALTER TABLE public.recurring_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own recurring_tags"
  ON public.recurring_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.recurring_rules r WHERE r.id = recurring_id AND r.workspace_id = get_user_workspace_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.recurring_rules r WHERE r.id = recurring_id AND r.workspace_id = get_user_workspace_id())
  );
