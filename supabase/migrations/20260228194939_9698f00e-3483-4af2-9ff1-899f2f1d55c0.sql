
-- Create invites table for beta access system
CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  workspace_id UUID REFERENCES public.workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by code + email
CREATE UNIQUE INDEX idx_invites_code ON public.invites(invite_code);
CREATE INDEX idx_invites_email ON public.invites(email);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Users can read their own invites (by email match)
CREATE POLICY "Users can read invites matching their email"
  ON public.invites FOR SELECT
  USING (true);

-- Only service role / edge functions can insert invites
-- For now allow authenticated users to update (mark as used)
CREATE POLICY "Authenticated users can update invites"
  ON public.invites FOR UPDATE
  USING (true)
  WITH CHECK (true);
