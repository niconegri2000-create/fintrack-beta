
ALTER TABLE public.transactions 
  ADD COLUMN transfer_id uuid DEFAULT NULL,
  ADD COLUMN linked_account_id uuid DEFAULT NULL REFERENCES public.accounts(id),
  ADD COLUMN transfer_direction text DEFAULT NULL;
