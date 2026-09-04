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
drop view if exists public.public_profiles;
drop table if exists public.ratings cascade;
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
  avatar_data text,             -- foto de perfil en base64 (webP)
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Cada usuario ve su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Cada usuario edita su propio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Impide que una sesión web pueda autootorgarse privilegios de admin.
create or replace function public.protect_profile_privileges()
returns trigger as $$
begin
  if auth.uid() is not null and new.is_admin is distinct from old.is_admin then
    raise exception 'No se puede modificar is_admin desde la aplicación';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileges();

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
$$ language plpgsql security definer set search_path = public;

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


-- ---------------------------------------------------------
-- 3) VISTA PÚBLICA DE PERFILES
-- ---------------------------------------------------------
-- La tabla profiles solo deja ver tu propia fila (tiene DNI, mail, etc).
-- Para que cualquiera pueda ver el perfil de otro usuario (nombre y tipo
-- de cuenta nada más, sin datos sensibles), armamos esta vista aparte
-- que solo expone lo que es seguro mostrar en público.
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


-- ---------------------------------------------------------
-- 4) CALIFICACIONES (estrellas)
-- ---------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  rated_user_id uuid not null references auth.users on delete cascade,
  rater_user_id uuid not null references auth.users on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint no_auto_calificarse check (rated_user_id <> rater_user_id),
  unique (rated_user_id, rater_user_id) -- una calificación por persona (se puede editar, no duplicar)
);

alter table public.ratings enable row level security;

-- Cualquiera puede leer las calificaciones (para mostrar el promedio).
create policy "Calificaciones visibles para todos"
  on public.ratings for select
  using (true);

-- Solo usuarios logueados pueden calificar, y no a sí mismos.
create policy "Un usuario logueado puede calificar a otro"
  on public.ratings for insert
  with check (auth.uid() = rater_user_id and rated_user_id <> auth.uid());

-- Cada uno puede editar o borrar solo SU PROPIA calificación (no las ajenas).
create policy "Un usuario edita su propia calificación"
  on public.ratings for update
  using (auth.uid() = rater_user_id);

create policy "Un usuario borra su propia calificación"
  on public.ratings for delete
  using (auth.uid() = rater_user_id);


-- ---------------------------------------------------------
-- 5) FOROS Y CATEGORÍAS
-- ---------------------------------------------------------
create table public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

alter table public.forum_categories enable row level security;

create policy "Categorías visibles para todos"
  on public.forum_categories for select
  using (true);

-- Insertar categorías por defecto
insert into public.forum_categories (name, description) values
  ('General', 'Temas generales de la comunidad'),
  ('Venta/Compra', 'Compra y venta de autos'),
  ('Mecánica', 'Preguntas y discusiones sobre mecánica'),
  ('Tuning', 'Modificaciones y personalizaciones'),
  ('Eventos', 'Coordinación de eventos RPM');

-- Tabla de foros (duran 7 días)
create table public.forums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid not null references public.forum_categories on delete cascade,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

alter table public.forums enable row level security;

create policy "Foros visibles para todos"
  on public.forums for select
  using (true);

create policy "Usuarios logueados crean foros"
  on public.forums for insert
  with check (auth.uid() = created_by);

create policy "Autor edita su propio foro"
  on public.forums for update
  using (auth.uid() = created_by);

create policy "Autor borra su propio foro"
  on public.forums for delete
  using (auth.uid() = created_by);

-- Tabla de posts en foros
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.forums on delete cascade,
  content text not null,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz default now()
);

alter table public.forum_posts enable row level security;

create policy "Posts visibles para todos"
  on public.forum_posts for select
  using (true);

create policy "Usuarios logueados publican posts"
  on public.forum_posts for insert
  with check (auth.uid() = created_by);

create policy "Autor edita su propio post"
  on public.forum_posts for update
  using (auth.uid() = created_by);

create policy "Autor borra su propio post"
  on public.forum_posts for delete
  using (auth.uid() = created_by);


-- =========================================================
-- ÚLTIMO PASO (hacerlo a mano, no por SQL):
-- Después de crear tu propia cuenta desde /auth.html, buscá tu
-- usuario en Authentication → Users, copiá su UID, y corré:
--
--   update public.profiles set is_admin = true where id = 'PEGAR-UID-ACA';
--
-- Así vos (el dueño) vas a poder cargar eventos desde /admin.html.
-- =========================================================
