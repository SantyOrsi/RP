-- =========================================================
-- MIGRACIÓN: Agregar soporte para fotos de perfil en webP
-- Ejecutar en: Supabase → SQL Editor → New query
-- =========================================================

-- 1) Agregar columna avatar_data a la tabla profiles para guardar la imagen en base64
alter table public.profiles add column if not exists avatar_data text;

-- 2) Actualizar la vista public_profiles para incluir avatar_data
drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = false)
as
select
  id,
  account_type,
  case
    when account_type = 'concesionaria' then razon_social
    else trim(coalesce(nombre, '') || ' ' || coalesce(apellido, ''))
  end as display_name,
  avatar_data,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ✅ Listo! Ahora los usuarios pueden cargar y convertir fotos a webP desde su perfil.
-- Las imágenes se guardan directamente en la base de datos en formato base64.
