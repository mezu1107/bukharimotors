
-- 1. Create private schema for security-definer helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2. Recreate helper functions in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_staff_or_above(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.is_manager_or_above(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager'))
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone');
  SELECT COUNT(*) = 0 INTO is_first_user FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first_user THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END);
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff_or_above(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_manager_or_above(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_staff_or_above(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_manager_or_above(uuid) FROM PUBLIC, anon;

-- 3. Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 4. Recreate ALL RLS policies referencing public.has_role/is_staff/is_manager → use private.*
-- audit_logs
DROP POLICY IF EXISTS "Admins read audit" ON public.audit_logs;
DROP POLICY IF EXISTS "System insert audit" ON public.audit_logs;
CREATE POLICY "Admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()) AND user_id = auth.uid());

-- bookings
DROP POLICY IF EXISTS "Staff read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers delete bookings" ON public.bookings;
CREATE POLICY "Staff read bookings" ON public.bookings FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff update bookings" ON public.bookings FOR UPDATE TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers delete bookings" ON public.bookings FOR DELETE TO authenticated USING (private.is_manager_or_above(auth.uid()));

-- branches
DROP POLICY IF EXISTS "Admins manage branches" ON public.branches;
CREATE POLICY "Admins manage branches" ON public.branches FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- clients
DROP POLICY IF EXISTS "Authenticated read clients" ON public.clients;
DROP POLICY IF EXISTS "Staff create clients" ON public.clients;
DROP POLICY IF EXISTS "Staff update clients" ON public.clients;
DROP POLICY IF EXISTS "Managers delete clients" ON public.clients;
CREATE POLICY "Staff read clients" ON public.clients FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff update clients" ON public.clients FOR UPDATE TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers delete clients" ON public.clients FOR DELETE TO authenticated USING (private.is_manager_or_above(auth.uid()));

-- company_settings
DROP POLICY IF EXISTS "Staff read company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers create company settings" ON public.company_settings;
CREATE POLICY "Staff read company settings" ON public.company_settings FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers update company settings" ON public.company_settings FOR UPDATE TO authenticated USING (private.is_manager_or_above(auth.uid())) WITH CHECK (private.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers create company settings" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (private.is_manager_or_above(auth.uid()));

-- drivers
DROP POLICY IF EXISTS "Authenticated read drivers" ON public.drivers;
DROP POLICY IF EXISTS "Managers manage drivers" ON public.drivers;
CREATE POLICY "Staff read drivers" ON public.drivers FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers manage drivers" ON public.drivers FOR ALL TO authenticated USING (private.is_manager_or_above(auth.uid())) WITH CHECK (private.is_manager_or_above(auth.uid()));

-- form_templates
DROP POLICY IF EXISTS "Admins manage templates" ON public.form_templates;
CREATE POLICY "Admins manage templates" ON public.form_templates FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- inspections
DROP POLICY IF EXISTS "Staff read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Staff create inspections" ON public.inspections;
DROP POLICY IF EXISTS "Staff update inspections" ON public.inspections;
DROP POLICY IF EXISTS "Managers delete inspections" ON public.inspections;
CREATE POLICY "Staff read inspections" ON public.inspections FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff update inspections" ON public.inspections FOR UPDATE TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers delete inspections" ON public.inspections FOR DELETE TO authenticated USING (private.is_manager_or_above(auth.uid()));

-- maintenance_records
DROP POLICY IF EXISTS "Staff read maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Managers manage maintenance" ON public.maintenance_records;
CREATE POLICY "Staff read maintenance" ON public.maintenance_records FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers manage maintenance" ON public.maintenance_records FOR ALL TO authenticated USING (private.is_manager_or_above(auth.uid())) WITH CHECK (private.is_manager_or_above(auth.uid()));

-- notifications
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
CREATE POLICY "Staff insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()));

-- payments
DROP POLICY IF EXISTS "Staff read payments" ON public.payments;
DROP POLICY IF EXISTS "Staff create payments" ON public.payments;
DROP POLICY IF EXISTS "Managers update payments" ON public.payments;
DROP POLICY IF EXISTS "Managers delete payments" ON public.payments;
CREATE POLICY "Staff read payments" ON public.payments FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Managers update payments" ON public.payments FOR UPDATE TO authenticated USING (private.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers delete payments" ON public.payments FOR DELETE TO authenticated USING (private.is_manager_or_above(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR private.is_manager_or_above(auth.uid()));
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- promotions
DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- reminders
DROP POLICY IF EXISTS "Staff read reminders" ON public.reminders;
DROP POLICY IF EXISTS "Staff manage reminders" ON public.reminders;
CREATE POLICY "Staff read reminders" ON public.reminders FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff manage reminders" ON public.reminders FOR ALL TO authenticated USING (private.is_staff_or_above(auth.uid())) WITH CHECK (private.is_staff_or_above(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- vehicles
DROP POLICY IF EXISTS "Managers manage vehicles" ON public.vehicles;
CREATE POLICY "Managers manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (private.is_manager_or_above(auth.uid())) WITH CHECK (private.is_manager_or_above(auth.uid()));

-- 5. Drop the old public security-definer helpers (no longer referenced)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff_or_above(uuid);
DROP FUNCTION IF EXISTS public.is_manager_or_above(uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. Restrict listing on public storage buckets
-- Files remain readable via public CDN URLs; dropping SELECT policies prevents .list()
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read signatures" ON storage.objects;
DROP POLICY IF EXISTS "Public read vehicle photos" ON storage.objects;

-- 7. AI features support: store AI usage history
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  input jsonb,
  output jsonb,
  cost_tokens integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read ai runs" ON public.ai_runs FOR SELECT TO authenticated USING (private.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff insert ai runs" ON public.ai_runs FOR INSERT TO authenticated WITH CHECK (private.is_staff_or_above(auth.uid()) AND user_id = auth.uid());
