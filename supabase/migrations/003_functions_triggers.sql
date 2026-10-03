-- ============================================================
-- MONTHLY SUMMARY FUNCTION
-- Returns aggregated statistics for a given month/year
-- Accessible to all authenticated users (for transparency)
-- ============================================================
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
) AS $$
BEGIN
  RETURN QUERY
  WITH emp AS (
    SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_cnt,
           COUNT(*) AS total_cnt,
           COALESCE(SUM(monthly_amount) FILTER (WHERE status = 'ACTIVE'), 0) AS expected
    FROM public.employees
  ),
  pay AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'PAID') AS paid_cnt,
      COUNT(*) FILTER (WHERE status = 'UNPAID') AS unpaid_cnt,
      COUNT(*) FILTER (WHERE status = 'PARTIAL') AS partial_cnt,
      COALESCE(SUM(amount), 0) AS collected
    FROM public.payments
    WHERE month = p_month AND year = p_year
  )
  SELECT
    emp.total_cnt,
    emp.active_cnt,
    COALESCE(pay.paid_cnt, 0),
    COALESCE(pay.unpaid_cnt, 0),
    COALESCE(pay.partial_cnt, 0),
    emp.expected,
    COALESCE(pay.collected, 0),
    GREATEST(emp.expected - COALESCE(pay.collected, 0), 0)
  FROM emp, pay;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_monthly_summary(INT, INT) TO authenticated;

-- ============================================================
-- AUDIT TRIGGER for payments
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, description)
    VALUES (auth.uid(), v_user_name, 'PAYMENT_ADDED', 'payment', NEW.id,
            'Payment of $' || NEW.amount || ' recorded for ' || NEW.month || '/' || NEW.year);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, description)
    VALUES (auth.uid(), v_user_name, 'PAYMENT_UPDATED', 'payment', NEW.id,
            'Payment updated to $' || NEW.amount || ' (' || NEW.status || ')');
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, description)
    VALUES (auth.uid(), v_user_name, 'PAYMENT_DELETED', 'payment', OLD.id,
            'Payment deleted for ' || OLD.month || '/' || OLD.year);
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_changes();

-- ============================================================
-- AUDIT TRIGGER for employees
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_employee_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, description)
    VALUES (auth.uid(), v_user_name, 'EMPLOYEE_CREATED', 'employee', NEW.id,
            'Employee ' || NEW.full_name || ' (' || NEW.employee_code || ') created');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, description)
    VALUES (auth.uid(), v_user_name, 'EMPLOYEE_UPDATED', 'employee', NEW.id,
            'Employee ' || NEW.full_name || ' updated');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_employees
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_employee_changes();