-- =========================================================
-- RPM Rosario - modalidad y precio de eventos
-- Ejecutar en Supabase SQL Editor una sola vez.
-- =========================================================

alter table public.events
  add column if not exists is_paid boolean not null default false;

alter table public.events
  add column if not exists price numeric(12, 2);

alter table public.events
  drop constraint if exists events_price_non_negative;

alter table public.events
  add constraint events_price_non_negative
  check (price is null or price >= 0);

-- Un evento gratuito no necesita precio.
update public.events
set price = null
where is_paid = false;