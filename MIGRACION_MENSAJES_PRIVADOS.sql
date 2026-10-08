-- =========================================================
-- RPM Rosario - mensajes privados entre usuarios
-- Ejecutar en Supabase SQL Editor una sola vez.
-- =========================================================

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users on delete cascade,
  recipient_id uuid not null references auth.users on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint private_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists private_messages_conversation_idx
  on public.private_messages (sender_id, recipient_id, created_at);
create index if not exists private_messages_recipient_idx
  on public.private_messages (recipient_id, created_at);

alter table public.private_messages enable row level security;

drop policy if exists "Participantes leen sus mensajes privados" on public.private_messages;
drop policy if exists "Usuarios envian mensajes privados" on public.private_messages;

create policy "Participantes leen sus mensajes privados"
  on public.private_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Usuarios envian mensajes privados"
  on public.private_messages for insert
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

-- Necesario para recibir nuevos mensajes en tiempo real desde el navegador.
alter table public.private_messages replica identity full;
alter publication supabase_realtime add table public.private_messages;
