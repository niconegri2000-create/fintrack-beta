
ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer_out'::text, 'transfer_in'::text]));
