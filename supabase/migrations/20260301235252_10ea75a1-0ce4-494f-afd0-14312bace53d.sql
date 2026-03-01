
-- 1) Mapping user → workspace
CREATE TABLE IF NOT EXISTS public.user_workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workspace mapping"
  ON public.user_workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspace mapping"
  ON public.user_workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);
