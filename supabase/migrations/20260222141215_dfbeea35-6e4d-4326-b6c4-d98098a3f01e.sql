
-- 1) workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

-- 2) categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority text CHECK (priority IN ('mandatory','reducible','eliminable')) DEFAULT 'mandatory',
  is_fixed_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 3) recurring_rules
CREATE TABLE public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  type text CHECK (type IN ('income','expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.categories(id),
  is_fixed boolean DEFAULT true,
  frequency text CHECK (frequency IN ('monthly')) DEFAULT 'monthly',
  day_of_month integer CHECK (day_of_month BETWEEN 1 AND 31),
  start_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  last_generated_for_month text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recurring_rules" ON public.recurring_rules FOR ALL USING (true) WITH CHECK (true);

-- 4) transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text,
  amount numeric NOT NULL CHECK (amount > 0),
  type text CHECK (type IN ('income','expense')),
  category_id uuid REFERENCES public.categories(id),
  is_fixed boolean DEFAULT false,
  source text CHECK (source IN ('manual','recurring_generated','import')) DEFAULT 'manual',
  recurring_rule_id uuid REFERENCES public.recurring_rules(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 5) goals
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  target_date date NOT NULL,
  starting_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);
