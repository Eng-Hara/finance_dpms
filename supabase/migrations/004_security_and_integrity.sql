-- Harden account provisioning, employee links, audit attribution, and summaries.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'EMPLOYEE'
  );
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('ACTIVE', 'DISABLED'));

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'ACTIVE';
$$;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_super_admin" ON public.profiles;

CREATE POLICY "profiles_update_super_admin"
  ON public.profiles FOR UPDATE
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

CREATE OR REPLACE FUNCTION public.prevent_self_access_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() = OLD.id
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.status IS DISTINCT FROM OLD.status
    )
  THEN
    RAISE EXCEPTION 'Users cannot change their own role, employee link, or account status'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.role = 'SUPER_ADMIN'
    AND OLD.status = 'ACTIVE'
    AND (NEW.role <> 'SUPER_ADMIN' OR NEW.status <> 'ACTIVE')
  THEN
    PERFORM pg_advisory_xact_lock(7241501, 1);
    IF (
      SELECT COUNT(*)
      FROM public.profiles
      WHERE role = 'SUPER_ADMIN'
        AND status = 'ACTIVE'
        AND id <> OLD.id
    ) = 0 THEN
      RAISE EXCEPTION 'At least one active Super Admin account must remain'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_access_changes ON public.profiles;
CREATE TRIGGER trg_prevent_self_access_changes
  BEFORE UPDATE OF role, employee_id, status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_access_changes();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_id_unique
  ON public.profiles (employee_id)
  WHERE employee_id IS NOT NULL;

DROP POLICY IF EXISTS "audit_insert_super_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert_admin" ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  IF auth.uid() IS NULL
    OR public.current_user_role() NOT IN ('SUPER_ADMIN', 'ADMIN')
  THEN
    RAISE EXCEPTION 'Insufficient permission to write audit events'
      USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN (
    'REPORT_GENERATED', 'SETTING_UPDATED', 'USER_ROLE_UPDATED',
    'USER_INVITED', 'USER_DISABLED', 'USER_ENABLED'
  ) THEN
    RAISE EXCEPTION 'Unsupported audit action'
      USING ERRCODE = '22023';
  END IF;

  IF p_action <> 'REPORT_GENERATED'
    AND public.current_user_role() <> 'SUPER_ADMIN'
  THEN
    RAISE EXCEPTION 'Only Super Admins can write this audit event'
      USING ERRCODE = '42501';
  END IF;

  SELECT full_name
    INTO v_user_name
    FROM public.profiles
    WHERE id = auth.uid();

  INSERT INTO public.audit_logs (
    user_id, user_name, action, entity_type, entity_id, description
  )
  VALUES (
    auth.uid(), v_user_name, p_action, p_entity_type, p_entity_id, p_description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_action(TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_action(TEXT, TEXT, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_monthly_summary(p_month INT, p_year INT)
RETURNS TABLE (
  total_employees BIGINT,
  active_employees BIGINT,
  paid_count BIGINT,
  unpaid_count BIGINT,
  partial_count BIGINT,
  expected_amount NUMERIC,
  collected_amount NUMERIC,
  remaining_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  IF p_month NOT BETWEEN 1 AND 12 OR p_year NOT BETWEEN 2000 AND 2100 THEN
    RAISE EXCEPTION 'Invalid month or year'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH employee_totals AS (
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_count,
      COALESCE(SUM(monthly_amount) FILTER (WHERE status = 'ACTIVE'), 0) AS expected
    FROM public.employees
  ),
  active_payment_status AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'PAID') AS paid_count,
      COUNT(*) FILTER (WHERE p.id IS NULL OR p.status = 'UNPAID') AS unpaid_count,
      COUNT(*) FILTER (WHERE p.status = 'PARTIAL') AS partial_count
    FROM public.employees e
    LEFT JOIN public.payments p
      ON p.employee_id = e.id
      AND p.month = p_month
      AND p.year = p_year
    WHERE e.status = 'ACTIVE'
  ),
  collected_total AS (
    SELECT COALESCE(SUM(amount), 0) AS amount
    FROM public.payments
    WHERE month = p_month
      AND year = p_year
      AND status IN ('PAID', 'PARTIAL')
  )
  SELECT
    employee_totals.total_count,
    employee_totals.active_count,
    active_payment_status.paid_count,
    active_payment_status.unpaid_count,
    active_payment_status.partial_count,
    employee_totals.expected,
    collected_total.amount,
    GREATEST(employee_totals.expected - collected_total.amount, 0)
  FROM employee_totals, active_payment_status, collected_total;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_summary(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_summary(INT, INT) TO authenticated;
