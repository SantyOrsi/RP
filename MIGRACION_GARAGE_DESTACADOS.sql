-- ============================================================
-- MIGRACIÓN: Publicaciones destacadas del Garage
-- Ejecutar en el SQL Editor de Supabase.
-- Requiere que ya exista la tabla garage_posts y la tabla
-- profiles con la columna is_admin (ya la usa admin.js).
-- ============================================================

-- 1) Columna nueva: is_featured (arranca en false para todas)
ALTER TABLE public.garage_posts
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Índice para que ordenar por destacadas sea rápido
CREATE INDEX IF NOT EXISTS idx_garage_posts_featured
  ON public.garage_posts (is_featured, created_at DESC);

-- 2) Protección: nadie puede cambiar is_featured salvo un admin,
--    ni siquiera el dueño de la publicación editando su propio auto.
--    (Las políticas RLS de UPDATE no alcanzan para esto: solo controlan
--    qué filas se pueden tocar, no qué columnas. Por eso usamos un trigger.)
CREATE OR REPLACE FUNCTION public.proteger_is_featured()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  es_admin boolean;
BEGIN
  IF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
    SELECT is_admin INTO es_admin FROM public.profiles WHERE id = auth.uid();
    IF NOT COALESCE(es_admin, false) THEN
      -- Si no es admin, ignoramos silenciosamente el cambio a is_featured
      -- (el resto de los campos que haya tocado en el mismo update sí se guardan)
      NEW.is_featured := OLD.is_featured;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_is_featured ON public.garage_posts;
CREATE TRIGGER trg_proteger_is_featured
  BEFORE UPDATE ON public.garage_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_is_featured();

-- ============================================================
-- Con esto ya alcanza para que admin.js pueda hacer:
--   supabaseClient.from('garage_posts').update({ is_featured: true }).eq('id', postId)
-- logueado como rpm.rosario.km@gmail.com (el único con profiles.is_admin = true),
-- y que si cualquier otro usuario intenta lo mismo, el cambio se ignore.
-- ============================================================
