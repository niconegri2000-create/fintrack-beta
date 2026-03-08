
-- 1. Add last_used_at column to access_codes
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

-- 2. Create is_admin_user function for policy use
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT lower(current_setting('request.jwt.claims', true)::json->>'email') = 'niconegri.2000@gmail.com';
$$;

-- 3. Drop existing restrictive policies on access_codes
DROP POLICY IF EXISTS "Users can read own access codes" ON public.access_codes;
DROP POLICY IF EXISTS "Users can redeem own access codes" ON public.access_codes;

-- 4. Create new permissive policies (users + admin)
CREATE POLICY "Users or admin can read access codes"
ON public.access_codes
FOR SELECT
TO authenticated
USING (
  lower(email_allowed) = lower(current_setting('request.jwt.claims', true)::json->>'email')
  OR public.is_admin_user()
);

CREATE POLICY "Users or admin can update access codes"
ON public.access_codes
FOR UPDATE
TO authenticated
USING (
  lower(email_allowed) = lower(current_setting('request.jwt.claims', true)::json->>'email')
  OR public.is_admin_user()
)
WITH CHECK (
  lower(email_allowed) = lower(current_setting('request.jwt.claims', true)::json->>'email')
  OR public.is_admin_user()
);

CREATE POLICY "Admin can insert access codes"
ON public.access_codes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin can delete access codes"
ON public.access_codes
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- 5. Update redeem_access_code to set last_used_at
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_code_id uuid;
  v_email_allowed text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_user_email := lower(current_setting('request.jwt.claims', true)::json->>'email');

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
$$;

-- 6. Ensure admin has permanent subscription
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'niconegri.2000@gmail.com' LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, is_active, price, source, started_at)
    VALUES (v_admin_id, 'premium', true, 0, 'admin', now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
