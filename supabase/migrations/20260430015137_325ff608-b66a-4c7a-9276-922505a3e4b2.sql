-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE public.vehicle_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank', 'easypaisa', 'jazzcash', 'other');
CREATE TYPE public.driver_status AS ENUM ('available', 'on_trip', 'off_duty', 'inactive');
CREATE TYPE public.inspection_type AS ENUM ('pre_rental', 'post_rental');
CREATE TYPE public.fuel_type AS ENUM ('petrol', 'diesel', 'hybrid', 'electric', 'cng');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER ROLES (separate table — security best practice)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer function — prevents RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_branch_fk
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  registration_no TEXT NOT NULL UNIQUE,
  color TEXT,
  vehicle_type TEXT,
  fuel_type public.fuel_type DEFAULT 'petrol',
  seats INT DEFAULT 4,
  transmission TEXT DEFAULT 'manual',
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_rate NUMERIC(10,2),
  monthly_rate NUMERIC(10,2),
  with_driver_extra NUMERIC(10,2) DEFAULT 0,
  status public.vehicle_status NOT NULL DEFAULT 'available',
  current_odometer NUMERIC(10,2) DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_branch ON public.vehicles(branch_id);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  cnic TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  license_no TEXT,
  license_expiry DATE,
  date_of_birth DATE,
  cnic_front_url TEXT,
  cnic_back_url TEXT,
  license_url TEXT,
  photo_url TEXT,
  loyalty_points INT NOT NULL DEFAULT 0,
  total_bookings INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- duplicate detection helpers
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_cnic ON public.clients(cnic) WHERE cnic IS NOT NULL;
CREATE UNIQUE INDEX idx_clients_phone_cnic ON public.clients(phone, COALESCE(cnic, ''));

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cnic TEXT,
  license_no TEXT,
  license_expiry DATE,
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.driver_status NOT NULL DEFAULT 'available',
  photo_url TEXT,
  license_url TEXT,
  address TEXT,
  notes TEXT,
  total_trips INT NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BOOKINGS (rental agreements)
-- ============================================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_no TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  template_id UUID,
  branch_id UUID REFERENCES public.branches(id),

  pickup_at TIMESTAMPTZ NOT NULL,
  dropoff_at TIMESTAMPTZ NOT NULL,
  pickup_location TEXT,
  dropoff_location TEXT,

  odometer_in NUMERIC(10,2),
  odometer_out NUMERIC(10,2),
  fuel_level_in TEXT,
  fuel_level_out TEXT,

  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  with_driver BOOLEAN NOT NULL DEFAULT false,
  driver_rate NUMERIC(10,2) DEFAULT 0,
  extra_charges NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  security_deposit NUMERIC(12,2) DEFAULT 0,

  status public.booking_status NOT NULL DEFAULT 'pending',
  damage_checklist JSONB DEFAULT '[]'::jsonb,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  signature_url TEXT,
  pdf_url TEXT,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_vehicle ON public.bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(pickup_at, dropoff_at);

-- Auto-generate booking_no
CREATE SEQUENCE IF NOT EXISTS booking_no_seq START 1000;
CREATE OR REPLACE FUNCTION public.gen_booking_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_no IS NULL OR NEW.booking_no = '' THEN
    NEW.booking_no := 'BM-' || to_char(now(), 'YYMM') || '-' || nextval('booking_no_seq');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_gen_booking_no BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.gen_booking_no();

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference_no TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON public.payments(booking_id);

-- ============================================================
-- MAINTENANCE
-- ============================================================
CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  odometer_at_service NUMERIC(10,2),
  scheduled_date DATE,
  completed_date DATE,
  next_service_date DATE,
  performed_by TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maint_vehicle ON public.maintenance_records(vehicle_id);

-- ============================================================
-- INSPECTIONS (pre/post rental)
-- ============================================================
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type public.inspection_type NOT NULL,
  odometer NUMERIC(10,2),
  fuel_level TEXT,
  exterior_condition TEXT,
  interior_condition TEXT,
  damage_notes TEXT,
  damage_areas JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  inspector_id UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_booking ON public.inspections(booking_id);

-- ============================================================
-- REMINDERS / CALENDAR
-- ============================================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  notify_before_minutes INT DEFAULT 1440, -- 1 day default
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_due ON public.reminders(due_at) WHERE is_done = false;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  related_id UUID,
  related_type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user_read ON public.notifications(user_id, read);

-- ============================================================
-- FORM TEMPLATES
-- ============================================================
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROMOTIONS
-- ============================================================
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  discount_pct NUMERIC(5,2),
  discount_amount NUMERIC(10,2),
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table_record ON public.audit_logs(table_name, record_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );

  -- First registered user becomes admin, rest default to staff
  SELECT COUNT(*) = 0 INTO is_first_user FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first_user THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vehicles_upd BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_clients_upd BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drivers_upd BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_bookings_upd BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_templates_upd BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- branches
CREATE POLICY "Authenticated read branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage branches" ON public.branches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- vehicles
CREATE POLICY "Authenticated read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- clients
CREATE POLICY "Authenticated read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- drivers
CREATE POLICY "Authenticated read drivers" ON public.drivers FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers manage drivers" ON public.drivers FOR ALL TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- bookings
CREATE POLICY "Staff read bookings" ON public.bookings FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- payments
CREATE POLICY "Staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers update payments" ON public.payments FOR UPDATE TO authenticated USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers delete payments" ON public.payments FOR DELETE TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- maintenance
CREATE POLICY "Staff read maintenance" ON public.maintenance_records FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers manage maintenance" ON public.maintenance_records FOR ALL TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- inspections
CREATE POLICY "Staff read inspections" ON public.inspections FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff update inspections" ON public.inspections FOR UPDATE TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers delete inspections" ON public.inspections FOR DELETE TO authenticated USING (public.is_manager_or_above(auth.uid()));

-- reminders
CREATE POLICY "Staff read reminders" ON public.reminders FOR SELECT TO authenticated USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff manage reminders" ON public.reminders FOR ALL TO authenticated USING (public.is_staff_or_above(auth.uid()));

-- notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_above(auth.uid()));

-- form_templates
CREATE POLICY "Authenticated read templates" ON public.form_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates" ON public.form_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- promotions
CREATE POLICY "Authenticated read promotions" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs
CREATE POLICY "Admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('vehicle-photos', 'vehicle-photos', true),
  ('client-docs', 'client-docs', false),
  ('driver-docs', 'driver-docs', false),
  ('inspection-photos', 'inspection-photos', true),
  ('signatures', 'signatures', true),
  ('contracts', 'contracts', false),
  ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- public bucket read for the public ones
CREATE POLICY "Public read vehicle photos" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Public read inspection photos" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-photos');
CREATE POLICY "Public read signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- authenticated read for private buckets
CREATE POLICY "Auth read client docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-docs');
CREATE POLICY "Auth read driver docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'driver-docs');
CREATE POLICY "Auth read contracts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contracts');

-- authenticated upload to all relevant buckets
CREATE POLICY "Auth upload to buckets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id IN ('vehicle-photos', 'client-docs', 'driver-docs', 'inspection-photos', 'signatures', 'contracts', 'avatars')
);
CREATE POLICY "Auth update own uploads" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id IN ('vehicle-photos', 'client-docs', 'driver-docs', 'inspection-photos', 'signatures', 'contracts', 'avatars')
);
CREATE POLICY "Auth delete own uploads" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id IN ('vehicle-photos', 'client-docs', 'driver-docs', 'inspection-photos', 'signatures', 'contracts', 'avatars')
);
