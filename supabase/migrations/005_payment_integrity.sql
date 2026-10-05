-- Prevent reassignment of payment identity fields after creation.

CREATE OR REPLACE FUNCTION public.prevent_payment_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.month IS DISTINCT FROM OLD.month
      OR NEW.year IS DISTINCT FROM OLD.year
    THEN
      RAISE EXCEPTION 'Payment employee and period cannot be changed after creation'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_payment_identity_change ON public.payments;
CREATE TRIGGER trg_prevent_payment_identity_change
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_identity_change();

-- Audit logs are visible only to Super Admins (UI already hides them from Admins).
DROP POLICY IF EXISTS "audit_select_admin" ON public.audit_logs;
