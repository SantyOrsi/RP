-- =========================================================
-- MIGRACION: Calificaciones de usuarios
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rated_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ratings_no_self_rating CHECK (rated_user_id <> rater_user_id),
  CONSTRAINT ratings_unique_user_pair UNIQUE (rated_user_id, rater_user_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Calificaciones visibles para todos" ON public.ratings;
CREATE POLICY "Calificaciones visibles para todos"
  ON public.ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Un usuario logueado puede calificar a otro" ON public.ratings;
CREATE POLICY "Un usuario logueado puede calificar a otro"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_user_id
    AND rated_user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned_until > now()
    )
  );

DROP POLICY IF EXISTS "Un usuario edita su propia calificación" ON public.ratings;
CREATE POLICY "Un usuario edita su propia calificación"
  ON public.ratings FOR UPDATE
  USING (auth.uid() = rater_user_id)
  WITH CHECK (
    auth.uid() = rater_user_id
    AND rated_user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "Un usuario borra su propia calificación" ON public.ratings;
CREATE POLICY "Un usuario borra su propia calificación"
  ON public.ratings FOR DELETE
  USING (auth.uid() = rater_user_id);

CREATE INDEX IF NOT EXISTS ratings_rated_user_id_idx
  ON public.ratings(rated_user_id);

-- =========================================================
