-- =========================================================
-- MIGRACIÓN: Ficha técnica de las publicaciones del GARAGE
-- (año, usado/0km, kilómetros, transmisión, combustible, precio)
-- Ejecutar en: Supabase → SQL Editor → New query
-- =========================================================

alter table public.garage_posts
  add column if not exists anio smallint,
  add column if not exists es_usado boolean,
  add column if not exists kilometraje integer,
  add column if not exists transmision text check (transmision in ('manual', 'automatica')),
  add column if not exists combustible text check (combustible in ('nafta', 'diesel', 'gnc', 'electrico')),
  add column if not exists precio numeric;

-- ✅ Listo! Cada publicación ahora puede guardar año, si es usado o 0km,
-- kilometraje, transmisión, combustible y precio.
-- =========================================================
