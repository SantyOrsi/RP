-- =========================================================
-- MIGRACIÓN: Múltiples fotos por publicación del GARAGE
-- Ejecutar en: Supabase → SQL Editor → New query
-- =========================================================

alter table public.garage_posts
  add column if not exists images text[];

-- La columna vieja "image_data" (una sola foto) se deja como está,
-- para no romper las publicaciones que ya existen: el front primero
-- busca en "images" y si no hay, usa "image_data" como respaldo.
-- =========================================================
