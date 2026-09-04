-- =========================================================
-- MIGRACIÓN: Quitar emails de contacto del GARAGE
-- Ejecutar solo si se aplicó MIGRACION_GARAGE_EMAIL.sql
-- =========================================================

alter table public.garage_posts
  drop column if exists contact_email;

-- =========================================================
