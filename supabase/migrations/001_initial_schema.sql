-- ============================================================
-- EMPLOYEE MONTHLY CONTRIBUTION MANAGEMENT SYSTEM
-- Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' 
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE')),
  employee_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  location TEXT,
  department TEXT,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 5.00
    CHECK (monthly_amount >= 0 AND monthly_amount <= 100),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_name ON public.employees (full_name);
CREATE INDEX idx_employees_phone ON public.employees (phone);
CREATE INDEX idx_employees_code ON public.employees (employee_code);
CREATE INDEX idx_employees_status ON public.employees (status);

-- Link profiles.employee_id to employees
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_employee
  FOREIGN KEY (employee_id) REFERENCES public.employees(id)
  ON DELETE SET NULL;

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0
    CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (status IN ('PAID', 'UNPAID', 'PARTIAL')),
  payment_date DATE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_employee_month_year UNIQUE (employee_id, month, year)
);

CREATE INDEX idx_payments_employee ON public.payments (employee_id);
CREATE INDEX idx_payments_period ON public.payments (year, month);
CREATE INDEX idx_payments_status ON public.payments (status);

-- ============================================================
-- CONTRIBUTION SETTINGS
-- ============================================================
CREATE TABLE public.contribution_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 2 AND amount <= 5),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settings_effective ON public.contribution_settings (effective_from DESC);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs (user_id);
CREATE INDEX idx_audit_created ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_action ON public.audit_logs (action);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON NEW AUTH USER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'EMPLOYEE')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER: get current user role
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: get current user's employee_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID AS $$
  SELECT employee_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;