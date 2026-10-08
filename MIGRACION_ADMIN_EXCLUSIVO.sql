-- =========================================================
-- MIGRACION: Acceso exclusivo al panel de administracion
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================

-- Dejar como unico administrador al correo autorizado.
UPDATE public.profiles AS p
SET is_admin = lower(u.email) = lower('Rpm.rosario.km@gmail.com')
FROM auth.users AS u
WHERE u.id = p.id;

-- Eventos: ademas de is_admin, exige el correo autorizado.
DROP POLICY IF EXISTS "Solo admins crean eventos" ON public.events;
CREATE POLICY "Solo admins crean eventos"
  ON public.events FOR INSERT
  WITH CHECK (
    lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Solo admins editan eventos" ON public.events;
CREATE POLICY "Solo admins editan eventos"
  ON public.events FOR UPDATE
  USING (
    lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Solo admins borran eventos" ON public.events;
CREATE POLICY "Solo admins borran eventos"
  ON public.events FOR DELETE
  USING (
    lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Talleres: aplicar la misma restriccion si la tabla ya existe.
DO $$
BEGIN
  IF to_regclass('public.workshops') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Solo admins crean talleres" ON public.workshops;
    CREATE POLICY "Solo admins crean talleres"
      ON public.workshops FOR INSERT
      WITH CHECK (
        lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );

    DROP POLICY IF EXISTS "Solo admins editan talleres" ON public.workshops;
    CREATE POLICY "Solo admins editan talleres"
      ON public.workshops FOR UPDATE
      USING (
        lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );

    DROP POLICY IF EXISTS "Solo admins borran talleres" ON public.workshops;
    CREATE POLICY "Solo admins borran talleres"
      ON public.workshops FOR DELETE
      USING (
        lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- =========================================================
