-- =========================================================
-- MIGRACION: Inscripciones a eventos
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================

CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_attendees_unique_registration UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven su inscripcion" ON public.event_attendees;
CREATE POLICY "Usuarios ven su inscripcion"
  ON public.event_attendees FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin ve inscripciones" ON public.event_attendees;
CREATE POLICY "Admin ve inscripciones"
  ON public.event_attendees FOR SELECT
  USING (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'));

DROP POLICY IF EXISTS "Usuarios se inscriben a eventos" ON public.event_attendees;
CREATE POLICY "Usuarios se inscriben a eventos"
  ON public.event_attendees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned_until > now()
    )
  );

DROP POLICY IF EXISTS "Usuarios cancelan su inscripcion" ON public.event_attendees;
CREATE POLICY "Usuarios cancelan su inscripcion"
  ON public.event_attendees FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS event_attendees_event_id_idx
  ON public.event_attendees(event_id);

-- =========================================================
