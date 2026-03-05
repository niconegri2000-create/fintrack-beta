
-- 1. Harden ensure_user_bootstrap: only allow bootstrapping own user
CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ws_id uuid;
BEGIN
  -- Enforce caller can only bootstrap their own user
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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
$function$;

-- 2. Create RPC to redeem access code (moves subscription insert to server-side)
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_code_id uuid;
  v_email_allowed text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Get user email from JWT
  v_user_email := lower(current_setting('request.jwt.claims', true)::json->>'email');

  -- Find and validate the code
  SELECT id, email_allowed INTO v_code_id, v_email_allowed
  FROM public.access_codes
  WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
    AND lower(email_allowed) = v_user_email;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- Mark code as used
  UPDATE public.access_codes
  SET is_used = true, used_by = v_user_id
  WHERE id = v_code_id;

  -- Create subscription record
  INSERT INTO public.subscriptions (user_id, plan, is_active, price, source, started_at)
  VALUES (v_user_id, 'premium', true, 0, 'invite_code', now())
  ON CONFLICT DO NOTHING;
END;
$function$;

-- 3. Harden subscriptions RLS: remove client INSERT and UPDATE
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Keep read-only for client
-- "Users can read own subscription" already exists
