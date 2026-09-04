-- =========================================================
-- MIGRACIÓN: Ubicación y teléfono del perfil
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================

alter table public.profiles
  add column if not exists provincia text,
  add column if not exists ciudad text,
  add column if not exists prefijo text,
  add column if not exists telefono_movil text,
  add column if not exists telefono text;

update public.profiles as perfiles
set provincia = usuarios.raw_user_meta_data->>'provincia',
    ciudad = usuarios.raw_user_meta_data->>'ciudad',
    prefijo = usuarios.raw_user_meta_data->>'prefijo',
    telefono_movil = usuarios.raw_user_meta_data->>'telefono_movil',
    telefono = coalesce(usuarios.raw_user_meta_data->>'telefono', perfiles.telefono)
from auth.users as usuarios
where perfiles.id = usuarios.id;

update public.garage_posts as publicaciones
set whatsapp = perfiles.telefono
from public.profiles as perfiles
where publicaciones.created_by = perfiles.id
  and perfiles.telefono is not null
  and perfiles.telefono <> '';

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, account_type, razon_social, nombre, apellido, documento_tipo,
    documento, email, provincia, ciudad, prefijo, telefono_movil, telefono
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'account_type', 'particular'),
    new.raw_user_meta_data->>'razon_social',
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'documento_tipo',
    new.raw_user_meta_data->>'documento',
    new.email,
    new.raw_user_meta_data->>'provincia',
    new.raw_user_meta_data->>'ciudad',
    new.raw_user_meta_data->>'prefijo',
    new.raw_user_meta_data->>'telefono_movil',
    new.raw_user_meta_data->>'telefono'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

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
  nombre,
  apellido,
  documento_tipo,
  documento,
  email,
  provincia,
  ciudad,
  prefijo,
  telefono_movil,
  telefono,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- =========================================================
