
-- 1. Reservations ownership column for future per-user scoping
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS reservations_user_id_idx ON public.reservations(user_id);

-- Allow signed-in submitters to read back their own reservations (future-proof)
DROP POLICY IF EXISTS "Users read own reservations" ON public.reservations;
CREATE POLICY "Users read own reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 2. Explicit deny policies on user_roles to make privilege escalation impossible
-- (RLS already denies by default with no policy, but being explicit is clearer and audit-friendly.)
DROP POLICY IF EXISTS "No self insert into user_roles" ON public.user_roles;
CREATE POLICY "No self insert into user_roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "No self update of user_roles" ON public.user_roles;
CREATE POLICY "No self update of user_roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "No self delete of user_roles" ON public.user_roles;
CREATE POLICY "No self delete of user_roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
