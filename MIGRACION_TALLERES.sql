-- Ejecutar en Supabase para habilitar los talleres recomendados del Garage.
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  location text,
  phone text,
  whatsapp text,
  description text,
  image_url text,
  is_recommended boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.workshops enable row level security;

create policy "Talleres recomendados visibles para todos"
  on public.workshops for select
  using (is_recommended = true or exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Solo admins crean talleres"
  on public.workshops for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Solo admins editan talleres"
  on public.workshops for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Solo admins borran talleres"
  on public.workshops for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));