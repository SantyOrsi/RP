-- =========================================================
-- AGREGAR TABLAS DE FOROS (ejecutar en Supabase SQL Editor)
-- =========================================================

-- 5) FOROS Y CATEGORÍAS
create table if not exists public.forum_categories (
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
  ('Eventos', 'Coordinación de eventos RPM')
on conflict do nothing;

-- Tabla de foros (duran 7 días)
create table if not exists public.forums (
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
create table if not exists public.forum_posts (
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

-- ✅ ¡Listo! Ya puedes usar el foro.
