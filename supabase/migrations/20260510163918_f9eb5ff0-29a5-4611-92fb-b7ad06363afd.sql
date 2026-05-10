ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS header_color text DEFAULT '#062A4D',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#B98A32',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT 'Thank you',
  ADD COLUMN IF NOT EXISTS footer_subtext text DEFAULT 'FOR CHOOSING US',
  ADD COLUMN IF NOT EXISTS stars_text text DEFAULT '★★★★★';