-- =========================================================
-- MIGRACIÓN: Marca en las publicaciones del GARAGE (para filtrar)
-- Ejecutar en: Supabase → SQL Editor → New query
-- =========================================================

alter table public.garage_posts
  add column if not exists brand text;

-- ✅ Listo! Ahora cada publicación guarda la marca del auto,
-- así garage.html puede filtrar por ella.
-- =========================================================
