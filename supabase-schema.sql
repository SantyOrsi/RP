-- =========================================================
-- RPM Rosario — esquema de base de datos para Supabase
-- Correr esto una sola vez en: Supabase → SQL Editor → New query
-- =========================================================

-- ---------------------------------------------------------
-- 0) LIMPIEZA (por si el script ya se corrió antes o quedó
--    algo a medio crear). Como confirmamos que profiles está
--    vacía, esto no borra datos reales, solo la estructura.
-- ---------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.events cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------
-- 1) PERFILES (particular / concesionaria)
-- ---------------------------------------------------------
-- Guarda los datos extra que Supabase Auth no maneja por
-- default: el tipo de cuenta, la razón social (si aplica) y
-- si es admin (puede cargar eventos).

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  account_type text not null check (account_type in ('particular', 'concesionaria')),
  razon_social text,          -- solo para 'concesionaria'
  nombre text,                 -- solo para 'particular'
  apellido text,                -- solo para 'particular'
  documento_tipo text check (documento_tipo in ('dni', 'cuit')), -- solo para 'particular'
  documento text,               -- solo para 'particular' (dígitos sin puntos ni guiones)
  email text,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Cada usuario ve su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Cada usuario edita su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: cuando alguien se registra en Auth, se crea
-- automáticamente su fila en profiles con los datos que
-- mandamos en el signUp (account_type, razon_social, o
-- nombre/apellido/documento si es particular).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, account_type, razon_social, nombre, apellido, documento_tipo, documento, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'account_type', 'particular'),
    new.raw_user_meta_data->>'razon_social',
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'documento_tipo',
    new.raw_user_meta_data->>'documento',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------
-- 2) EVENTOS
-- ---------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  image_url text,
  description text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

-- Cualquiera (incluso sin login) puede LEER los eventos: la web pública los muestra.
create policy "Eventos visibles para todos"
  on public.events for select
  using (true);

-- Solo usuarios marcados como admin (is_admin = true en profiles) pueden crear/editar/borrar.
create policy "Solo admins crean eventos"
  on public.events for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Solo admins editan eventos"
  on public.events for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Solo admins borran eventos"
  on public.events for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Evento de ejemplo para que la web no arranque vacía (opcional, podés borrarlo).
insert into public.events (title, event_date, event_time, location, image_url, description)
values (
  'RPM Meet #01',
  '2026-09-14',
  '15:00',
  'Rosario, Santa Fe',
  'https://images.unsplash.com/photo-1541348263662-e068662d82af?auto=format&fit=crop&w=900&q=70',
  'El primer encuentro oficial de la comunidad. Traé tu auto y sumate.'
);


-- =========================================================
-- ÚLTIMO PASO (hacerlo a mano, no por SQL):
-- Después de crear tu propia cuenta desde /auth.html, buscá tu
-- usuario en Authentication → Users, copiá su UID, y corré:
--
--   update public.profiles set is_admin = true where id = 'PEGAR-UID-ACA';
--
-- Así vos (el dueño) vas a poder cargar eventos desde /admin.html.
-- =========================================================
