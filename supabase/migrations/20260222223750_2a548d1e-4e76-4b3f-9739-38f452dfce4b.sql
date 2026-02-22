
-- Add status and note columns to goals table
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS note text;

-- Create goal_contributions table
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policy (open for now, same pattern as other tables)
CREATE POLICY "Allow all access to goal_contributions"
  ON public.goal_contributions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add workspace_id NOT NULL constraint to goals if missing
ALTER TABLE public.goals ALTER COLUMN workspace_id SET NOT NULL;
