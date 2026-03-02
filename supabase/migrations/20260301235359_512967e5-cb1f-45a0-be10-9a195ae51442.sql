
-- Seed existing users from subscriptions
INSERT INTO public.user_workspaces (user_id, workspace_id, role)
SELECT DISTINCT s.user_id, '7e43daca-d0d8-4646-a5be-c2f21a84d902'::uuid, 'owner'
FROM public.subscriptions s
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_workspaces uw WHERE uw.user_id = s.user_id
);

-- Replace all permissive RLS policies with workspace-scoped ones
DROP POLICY IF EXISTS "Allow all access to workspaces" ON public.workspaces;
CREATE POLICY "Users can access own workspace" ON public.workspaces FOR ALL
  USING (id = public.get_user_workspace_id()) WITH CHECK (id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to accounts" ON public.accounts;
CREATE POLICY "Users can access own accounts" ON public.accounts FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to transactions" ON public.transactions;
CREATE POLICY "Users can access own transactions" ON public.transactions FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;
CREATE POLICY "Users can access own categories" ON public.categories FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to recurring_rules" ON public.recurring_rules;
CREATE POLICY "Users can access own recurring_rules" ON public.recurring_rules FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to goals" ON public.goals;
CREATE POLICY "Users can access own goals" ON public.goals FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to goal_contributions" ON public.goal_contributions;
CREATE POLICY "Users can access own goal_contributions" ON public.goal_contributions FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to budget_settings" ON public.budget_settings;
CREATE POLICY "Users can access own budget_settings" ON public.budget_settings FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to category_budgets" ON public.category_budgets;
CREATE POLICY "Users can access own category_budgets" ON public.category_budgets FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS "Allow all access to monthly_snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can access own monthly_snapshots" ON public.monthly_snapshots FOR ALL
  USING (workspace_id = public.get_user_workspace_id()) WITH CHECK (workspace_id = public.get_user_workspace_id());

-- invites: allow read/update for authenticated
DROP POLICY IF EXISTS "Users can read invites matching their email" ON public.invites;
CREATE POLICY "Users can read invites matching their email" ON public.invites FOR SELECT
  USING (lower(email) = lower((SELECT (auth.jwt() ->> 'email'::text))));

DROP POLICY IF EXISTS "Authenticated users can update invites" ON public.invites;
CREATE POLICY "Authenticated users can update invites" ON public.invites FOR UPDATE
  USING (lower(email) = lower((SELECT (auth.jwt() ->> 'email'::text))))
  WITH CHECK (lower(email) = lower((SELECT (auth.jwt() ->> 'email'::text))));
