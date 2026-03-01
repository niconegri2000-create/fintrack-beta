
-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Bootstrap function
CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws_id uuid;
BEGIN
  SELECT workspace_id INTO v_ws_id
  FROM public.user_workspaces
  WHERE user_id = p_user_id;

  IF v_ws_id IS NOT NULL THEN
    RETURN v_ws_id;
  END IF;

  INSERT INTO public.workspaces (name, currency, opening_balance, min_balance_threshold, forecast_horizon_months)
  VALUES ('Personale', 'EUR', 0, 0, 6)
  RETURNING id INTO v_ws_id;

  INSERT INTO public.user_workspaces (user_id, workspace_id, role)
  VALUES (p_user_id, v_ws_id, 'owner');

  INSERT INTO public.accounts (workspace_id, name, opening_balance, is_default, is_active, sort_order)
  VALUES (v_ws_id, 'Personale', 0, true, true, 0);

  RETURN v_ws_id;
END;
$$;
