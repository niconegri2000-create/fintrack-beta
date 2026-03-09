ALTER TABLE public.categories DROP CONSTRAINT categories_priority_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_priority_check CHECK (priority = ANY (ARRAY['none'::text, 'mandatory'::text, 'reducible'::text, 'eliminable'::text]));
ALTER TABLE public.categories ALTER COLUMN priority SET DEFAULT 'none'::text;