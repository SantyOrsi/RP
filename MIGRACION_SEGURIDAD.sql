-- RPM Rosario - refuerzo de seguridad
-- Ejecutar en Supabase SQL Editor sobre una base ya existente.

-- El usuario puede editar su perfil, pero no cambiar la identidad de la fila.
drop policy if exists "Cada usuario edita su propio perfil" on public.profiles;
create policy "Cada usuario edita su propio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Una sesion web nunca puede autootorgarse privilegios de administrador.
create or replace function public.protect_profile_privileges()
returns trigger as $$
begin
  if auth.uid() is not null and new.is_admin is distinct from old.is_admin then
    raise exception 'No se puede modificar is_admin desde la aplicacion';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileges();
