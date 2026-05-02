CREATE TABLE IF NOT EXISTS public.company_settings (
  id boolean PRIMARY KEY DEFAULT true,
  company_name text NOT NULL DEFAULT 'Bukhari Motors & Rent A Car',
  tagline text DEFAULT 'Luxury | Comfort | Trust',
  phone text DEFAULT '+92 321 5300920',
  email text DEFAULT '',
  address text DEFAULT 'G-6 Markaz, Melody Market Islamabad',
  website text DEFAULT '',
  logo_url text DEFAULT '',
  facebook_url text DEFAULT '',
  instagram_url text DEFAULT '',
  tiktok_url text DEFAULT '',
  youtube_url text DEFAULT '',
  whatsapp_number text DEFAULT '+92 321 5300920',
  form_banner text DEFAULT 'ALL KINDS OF VEHICLES ARE AVAILABLE WITH DRIVERS FOR LOCAL AND OUTSTATION',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_singleton CHECK (id = true)
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read company settings" ON public.company_settings;
CREATE POLICY "Staff read company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (public.is_staff_or_above(auth.uid()));

DROP POLICY IF EXISTS "Managers update company settings" ON public.company_settings;
CREATE POLICY "Managers update company settings"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (public.is_manager_or_above(auth.uid()))
WITH CHECK (public.is_manager_or_above(auth.uid()));

DROP POLICY IF EXISTS "Managers create company settings" ON public.company_settings;
CREATE POLICY "Managers create company settings"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_manager_or_above(auth.uid()));

DROP TRIGGER IF EXISTS touch_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER touch_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.company_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients (full_name);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);