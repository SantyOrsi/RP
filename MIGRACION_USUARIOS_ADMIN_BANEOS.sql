-- =========================================================
-- MIGRACION: Estadisticas y baneos de usuarios para admin
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_until timestamptz;

-- Solo el administrador RPM puede listar usuarios y modificar sus baneos.
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.profiles;
CREATE POLICY "Admin ve todos los perfiles"
  ON public.profiles FOR SELECT
  USING (
    lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
  );

DROP POLICY IF EXISTS "Admin gestiona baneos" ON public.profiles;
CREATE POLICY "Admin gestiona baneos"
  ON public.profiles FOR UPDATE
  USING (
    lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
  )
  WITH CHECK (
    lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com')
  );

-- Bloquear publicaciones y participacion mientras el usuario este baneado.
-- Un valor NULL significa que no esta baneado; infinity significa permanente.
DROP POLICY IF EXISTS "Usuarios logueados crean foros" ON public.forums;
CREATE POLICY "Usuarios logueados crean foros"
  ON public.forums FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned_until > now()
    )
  );

DROP POLICY IF EXISTS "Usuarios logueados publican posts" ON public.forum_posts;
CREATE POLICY "Usuarios logueados publican posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned_until > now()
    )
  );

-- El garage puede no existir en instalaciones antiguas; aplicar la politica
-- solo cuando la tabla ya esta creada.
DO $$
BEGIN
  IF to_regclass('public.garage_posts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Usuarios logueados publican autos" ON public.garage_posts;
    CREATE POLICY "Usuarios logueados publican autos"
      ON public.garage_posts FOR INSERT
      WITH CHECK (
        auth.uid() = created_by
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND banned_until > now()
        )
      );
  END IF;
END $$;

-- Refuerzo para impedir cualquier alta, edicion o borrado desde una sesion
-- que ya estaba abierta cuando se aplico el baneo.
CREATE OR REPLACE FUNCTION public.rechazar_accion_usuario_baneado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND banned_until > now()
  ) THEN
    RAISE EXCEPTION 'Tu cuenta esta temporalmente bloqueada';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.forums') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS bloquear_usuario_baneado ON public.forums;
    CREATE TRIGGER bloquear_usuario_baneado
      BEFORE INSERT OR UPDATE OR DELETE ON public.forums
      FOR EACH ROW EXECUTE FUNCTION public.rechazar_accion_usuario_baneado();
  END IF;

  IF to_regclass('public.forum_posts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS bloquear_usuario_baneado ON public.forum_posts;
    CREATE TRIGGER bloquear_usuario_baneado
      BEFORE INSERT OR UPDATE OR DELETE ON public.forum_posts
      FOR EACH ROW EXECUTE FUNCTION public.rechazar_accion_usuario_baneado();
  END IF;

  IF to_regclass('public.garage_posts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS bloquear_usuario_baneado ON public.garage_posts;
    CREATE TRIGGER bloquear_usuario_baneado
      BEFORE INSERT OR UPDATE OR DELETE ON public.garage_posts
      FOR EACH ROW EXECUTE FUNCTION public.rechazar_accion_usuario_baneado();
  END IF;
END $$;

-- =========================================================
