-- =========================================================
-- MIGRACION: Eliminar el contenido al borrar una cuenta
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================
-- Las publicaciones del Garage pertenecen al usuario mediante created_by.
-- Esta FK hace que Supabase elimine sus autos al borrar auth.users.

DO $$
DECLARE
  restriccion record;
BEGIN
  IF to_regclass('public.garage_posts') IS NULL THEN
    RAISE EXCEPTION 'No existe la tabla public.garage_posts';
  END IF;

  -- Quitar cualquier FK previa de created_by hacia auth.users para evitar
  -- que una restriccion anterior con NO ACTION impida el borrado.
  FOR restriccion IN
    SELECT c.conname
    FROM pg_constraint AS c
    JOIN pg_class AS t ON t.oid = c.conrelid
    JOIN pg_namespace AS n ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND t.relname = 'garage_posts'
      AND c.confrelid = 'auth.users'::regclass
      AND EXISTS (
        SELECT 1
        FROM unnest(c.conkey) AS key(attnum)
        JOIN pg_attribute AS a
          ON a.attrelid = c.conrelid
         AND a.attnum = key.attnum
        WHERE a.attname = 'created_by'
          AND NOT a.attisdropped
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.garage_posts DROP CONSTRAINT %I',
      restriccion.conname
    );
  END LOOP;

  ALTER TABLE public.garage_posts
    ADD CONSTRAINT garage_posts_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
END $$;

-- profiles, ratings y contenido de foros ya tienen ON DELETE CASCADE
-- en el esquema actual. Las fotos del auto se eliminan junto con su fila.
-- =========================================================
