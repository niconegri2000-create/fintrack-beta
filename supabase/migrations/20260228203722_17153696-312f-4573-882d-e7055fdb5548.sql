
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  email_allowed TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Users can read codes matching their email
CREATE POLICY "Users can read own access codes"
  ON public.access_codes
  FOR SELECT
  USING (lower(email_allowed) = lower((select auth.jwt() ->> 'email')));

-- Users can update (redeem) codes matching their email
CREATE POLICY "Users can redeem own access codes"
  ON public.access_codes
  FOR UPDATE
  USING (lower(email_allowed) = lower((select auth.jwt() ->> 'email')))
  WITH CHECK (lower(email_allowed) = lower((select auth.jwt() ->> 'email')));
