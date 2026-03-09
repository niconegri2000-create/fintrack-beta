CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_code_id uuid;
  v_email_allowed text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Read email and verification status DIRECTLY from auth.users (not from JWT claims)
  SELECT email, email_confirmed_at
  INTO v_user_email, v_email_confirmed_at
  FROM auth.users
  WHERE id = v_user_id;

  v_user_email := lower(v_user_email);

  IF v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'email_not_verified';
  END IF;

  SELECT id, email_allowed INTO v_code_id, v_email_allowed
  FROM public.access_codes
  WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
    AND lower(email_allowed) = v_user_email;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  UPDATE public.access_codes
  SET is_used = true, used_by = v_user_id, last_used_at = now()
  WHERE id = v_code_id;

  INSERT INTO public.subscriptions (user_id, plan, is_active, price, source, started_at)
  VALUES (v_user_id, 'premium', true, 0, 'invite_code', now())
  ON CONFLICT DO NOTHING;
END;
$function$