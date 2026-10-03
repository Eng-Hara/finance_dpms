-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Super admin can read all profiles
CREATE POLICY "profiles_select_super_admin"
  ON public.profiles FOR SELECT
  USING (public.current_user_role() = 'SUPER_ADMIN');

-- Users can update their own profile (limited)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Super admin can manage all profiles
CREATE POLICY "profiles_all_super_admin"
  ON public.profiles FOR ALL
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- ============================================================
-- EMPLOYEES POLICIES
-- ============================================================
-- Super admin: full access
CREATE POLICY "employees_all_super_admin"
  ON public.employees FOR ALL
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- Admin: read + insert + update (no delete)
CREATE POLICY "employees_select_admin"
  ON public.employees FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

CREATE POLICY "employees_insert_admin"
  ON public.employees FOR INSERT
  WITH CHECK (public.current_user_role() = 'ADMIN');

CREATE POLICY "employees_update_admin"
  ON public.employees FOR UPDATE
  USING (public.current_user_role() = 'ADMIN')
  WITH CHECK (public.current_user_role() = 'ADMIN');

-- Employee: read only their own record
CREATE POLICY "employees_select_self"
  ON public.employees FOR SELECT
  USING (
    public.current_user_role() = 'EMPLOYEE'
    AND id = public.current_employee_id()
  );

-- ============================================================
-- PAYMENTS POLICIES
-- ============================================================
-- Super admin: full access
CREATE POLICY "payments_all_super_admin"
  ON public.payments FOR ALL
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- Admin: read + insert + update
CREATE POLICY "payments_select_admin"
  ON public.payments FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

CREATE POLICY "payments_insert_admin"
  ON public.payments FOR INSERT
  WITH CHECK (public.current_user_role() = 'ADMIN');

CREATE POLICY "payments_update_admin"
  ON public.payments FOR UPDATE
  USING (public.current_user_role() = 'ADMIN')
  WITH CHECK (public.current_user_role() = 'ADMIN');

-- Employee: read only their own payments
CREATE POLICY "payments_select_self"
  ON public.payments FOR SELECT
  USING (
    public.current_user_role() = 'EMPLOYEE'
    AND employee_id = public.current_employee_id()
  );

-- ============================================================
-- CONTRIBUTION SETTINGS POLICIES
-- ============================================================
-- Super admin: full access
CREATE POLICY "settings_all_super_admin"
  ON public.contribution_settings FOR ALL
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- Admin + Employee: read only
CREATE POLICY "settings_select_all_auth"
  ON public.contribution_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================
-- Super admin: read + insert
CREATE POLICY "audit_select_super_admin"
  ON public.audit_logs FOR SELECT
  USING (public.current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "audit_insert_super_admin"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- Admin: read + insert (cannot delete)
CREATE POLICY "audit_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

CREATE POLICY "audit_insert_admin"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.current_user_role() = 'ADMIN');

-- No DELETE policy for anyone → immutable logs