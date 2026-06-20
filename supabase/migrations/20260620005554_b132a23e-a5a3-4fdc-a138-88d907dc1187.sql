
-- 1. menu_items: image_url + out_of_stock
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS out_of_stock boolean NOT NULL DEFAULT false;

-- 2. reservations: whatsapp + relax email NOT NULL
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '';
ALTER TABLE public.reservations
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN email SET DEFAULT '';

-- 3. site_settings (singleton-ish key/value)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads site_settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins write site_settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update site_settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete site_settings"
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('instagram_url', ''),
  ('whatsapp_url', ''),
  ('google_maps_url', '')
ON CONFLICT (key) DO NOTHING;

-- 4. analytics_events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  target_id text,
  target_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON public.analytics_events (event_type);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone records events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('page_view','click_instagram','click_whatsapp','click_menu_item','reservation_created','review_submitted')
  );

CREATE POLICY "Admins read events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON public.reviews (created_at DESC);

GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone submits review"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (rating BETWEEN 1 AND 5);

CREATE POLICY "Admins read reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
