-- =========================================================
-- MIGRACION: Admin automatico para el correo RPM
-- Ejecutar una sola vez en Supabase -> SQL Editor
-- =========================================================

-- Marca como admin al usuario actual, si ya existe.
UPDATE public.profiles
SET is_admin = true
WHERE lower(email) = lower('Rpm.rosario.km@gmail.com');

-- Desde ahora, al crear o recrear ese correo, su perfil se marca
-- como administrador automáticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, account_type, razon_social, nombre, apellido,
    documento_tipo, documento, email, is_admin
  )
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'account_type', 'particular'),
    new.raw_user_meta_data->>'razon_social',
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'documento_tipo',
    new.raw_user_meta_data->>'documento',
    new.email,
    lower(new.email) = lower('Rpm.rosario.km@gmail.com')
  );
  RETURN new;
END;
$$;

-- El trigger existente ya llama a handle_new_user; no hace falta recrearlo.
-- =========================================================
