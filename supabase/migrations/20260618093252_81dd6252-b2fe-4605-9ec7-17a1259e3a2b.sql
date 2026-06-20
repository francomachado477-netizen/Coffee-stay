
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Menu items
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active menu" ON public.menu_items FOR SELECT TO anon, authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Admins read all menu" ON public.menu_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert menu" ON public.menu_items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update menu" ON public.menu_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete menu" ON public.menu_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER menu_items_touch BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.menu_items (name, description, price, sort_order) VALUES
('Espresso','Honey-process Colombia. Caramel, dried apricot, a clean bittersweet finish.',3.50,1),
('Cortado','Two ristretto shots cut with a thumb of steamed milk. Small, dense, balanced.',4.25,2),
('Filter of the day','A rotating single origin, brewed slow. Ask the bar what''s pouring.',4.75,3),
('Iced long black','Double espresso poured over hand-cut ice. Sharp, cold, summer-ready.',4.50,4),
('Cardamom latte','Whole pod, fresh ground, folded into silk milk. House favorite since ''21.',5.25,5),
('Brown butter cookie','Baked next door, every morning, until they''re gone.',3.00,6);

-- Reservations
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  date date NOT NULL,
  "time" time NOT NULL,
  guests int NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.reservations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can book" ON public.reservations FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND deleted_at IS NULL);

CREATE POLICY "Admins read reservations" ON public.reservations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update reservations" ON public.reservations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete reservations" ON public.reservations FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reservations_touch BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
