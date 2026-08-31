-- =========================================================
-- MIGRACIÓN: WhatsApp en las publicaciones del GARAGE
-- Ejecutar en: Supabase → SQL Editor → New query
-- =========================================================

alter table public.garage_posts
  add column if not exists whatsapp text;

-- ✅ Listo! Ahora cada publicación puede guardar el WhatsApp del
-- vendedor para que cualquiera pueda contactarlo con un click.
-- =========================================================
