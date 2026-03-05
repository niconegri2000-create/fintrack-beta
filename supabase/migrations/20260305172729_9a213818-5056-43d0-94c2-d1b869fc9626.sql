
-- Count transactions for bulk delete preview
CREATE OR REPLACE FUNCTION public.count_transactions_bulk(
  p_kind text,
  p_account_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_delete_all boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid := get_user_workspace_id();
  v_count integer;
BEGIN
  IF p_kind NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'p_kind must be income or expense';
  END IF;

  SELECT count(*)::int INTO v_count
  FROM public.transactions
  WHERE workspace_id = v_ws
    AND type = p_kind
    AND (p_account_id IS NULL OR account_id = p_account_id)
    AND (p_delete_all OR (date >= p_from AND date <= p_to));

  RETURN v_count;
END;
$$;

-- Delete transactions bulk
CREATE OR REPLACE FUNCTION public.delete_transactions_bulk(
  p_kind text,
  p_account_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_delete_all boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid := get_user_workspace_id();
  v_count integer;
BEGIN
  IF p_kind NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'p_kind must be income or expense';
  END IF;

  DELETE FROM public.transactions
  WHERE workspace_id = v_ws
    AND type = p_kind
    AND (p_account_id IS NULL OR account_id = p_account_id)
    AND (p_delete_all OR (date >= p_from AND date <= p_to));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Count recurring rules for bulk delete preview
CREATE OR REPLACE FUNCTION public.count_recurring_bulk(
  p_kind text,
  p_account_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_delete_all boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid := get_user_workspace_id();
  v_count integer;
BEGIN
  IF p_kind NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'p_kind must be income or expense';
  END IF;

  SELECT count(*)::int INTO v_count
  FROM public.recurring_rules
  WHERE workspace_id = v_ws
    AND type = p_kind
    AND (p_account_id IS NULL OR account_id = p_account_id)
    AND (p_delete_all OR (start_date >= p_from AND start_date <= p_to));

  RETURN v_count;
END;
$$;

-- Delete recurring rules bulk
CREATE OR REPLACE FUNCTION public.delete_recurring_bulk(
  p_kind text,
  p_account_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_delete_all boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid := get_user_workspace_id();
  v_count integer;
BEGIN
  IF p_kind NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'p_kind must be income or expense';
  END IF;

  -- Delete associated tags first
  DELETE FROM public.recurring_tags
  WHERE recurring_id IN (
    SELECT id FROM public.recurring_rules
    WHERE workspace_id = v_ws
      AND type = p_kind
      AND (p_account_id IS NULL OR account_id = p_account_id)
      AND (p_delete_all OR (start_date >= p_from AND start_date <= p_to))
  );

  DELETE FROM public.recurring_rules
  WHERE workspace_id = v_ws
    AND type = p_kind
    AND (p_account_id IS NULL OR account_id = p_account_id)
    AND (p_delete_all OR (start_date >= p_from AND start_date <= p_to));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Count transfers for bulk delete preview
CREATE OR REPLACE FUNCTION public.count_transfers_bulk(
  p_account_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_delete_all boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid := get_user_workspace_id();
  v_count integer;
BEGIN
  SELECT count(*)::int INTO v_count
  FROM public.transfers
  WHERE workspace_id = v_ws
    AND (p_account_id IS NULL OR from_account_id = p_account_id OR to_account_id = p_account_id)
    AND (p_delete_all OR (date >= p_from AND date <= p_to));

  RETURN v_count;
END;
$$;

-- Delete transfers bulk (also removes linked transactions)
CREATE OR REPLACE FUNCTION public.delete_transfers_bulk(
  p_account_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_delete_all boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid := get_user_workspace_id();
  v_count integer;
  v_transfer_ids uuid[];
BEGIN
  -- Collect transfer IDs to delete
  SELECT array_agg(id) INTO v_transfer_ids
  FROM public.transfers
  WHERE workspace_id = v_ws
    AND (p_account_id IS NULL OR from_account_id = p_account_id OR to_account_id = p_account_id)
    AND (p_delete_all OR (date >= p_from AND date <= p_to));

  IF v_transfer_ids IS NULL OR array_length(v_transfer_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Delete linked transaction tags
  DELETE FROM public.transaction_tags
  WHERE transaction_id IN (
    SELECT id FROM public.transactions WHERE transfer_id = ANY(v_transfer_ids)
  );

  -- Delete linked transactions
  DELETE FROM public.transactions WHERE transfer_id = ANY(v_transfer_ids);

  -- Delete transfers
  DELETE FROM public.transfers WHERE id = ANY(v_transfer_ids);

  v_count := array_length(v_transfer_ids, 1);
  RETURN v_count;
END;
$$;
