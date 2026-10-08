-- =========================================================
-- MIGRACION: Catalogo inicial de vehiculos de Argentina
-- Ejecutar en Supabase -> SQL Editor -> New query
-- =========================================================

CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type_id uuid NOT NULL REFERENCES public.vehicle_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_type_id, name),
  UNIQUE (vehicle_type_id, slug)
);

CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.vehicle_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, name)
);

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catalogo de vehiculos visible" ON public.vehicle_types;
CREATE POLICY "Catalogo de vehiculos visible" ON public.vehicle_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "Marcas de vehiculos visibles" ON public.vehicle_brands;
CREATE POLICY "Marcas de vehiculos visibles" ON public.vehicle_brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modelos de vehiculos visibles" ON public.vehicle_models;
CREATE POLICY "Modelos de vehiculos visibles" ON public.vehicle_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin gestiona tipos de vehiculo" ON public.vehicle_types;
CREATE POLICY "Admin gestiona tipos de vehiculo" ON public.vehicle_types
  FOR ALL USING (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'))
  WITH CHECK (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'));

DROP POLICY IF EXISTS "Admin gestiona marcas de vehiculo" ON public.vehicle_brands;
CREATE POLICY "Admin gestiona marcas de vehiculo" ON public.vehicle_brands
  FOR ALL USING (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'))
  WITH CHECK (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'));

DROP POLICY IF EXISTS "Admin gestiona modelos de vehiculo" ON public.vehicle_models;
CREATE POLICY "Admin gestiona modelos de vehiculo" ON public.vehicle_models
  FOR ALL USING (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'))
  WITH CHECK (lower((auth.jwt() ->> 'email')) = lower('Rpm.rosario.km@gmail.com'));

INSERT INTO public.vehicle_types (name, slug) VALUES
  ('Auto', 'auto'), ('Moto', 'moto'), ('Camioneta', 'camioneta')
ON CONFLICT (slug) DO NOTHING;

-- Catalogo inicial de marcas y modelos de uso habitual en Argentina.
WITH marcas(tipo, nombre, slug) AS (VALUES
  ('auto', 'Chevrolet', 'chevrolet'), ('auto', 'Fiat', 'fiat'), ('auto', 'Ford', 'ford'),
  ('auto', 'Honda', 'honda'), ('auto', 'Peugeot', 'peugeot'), ('auto', 'Renault', 'renault'),
  ('auto', 'Toyota', 'toyota'), ('auto', 'Volkswagen', 'volkswagen'), ('auto', 'BMW', 'bmw'),
  ('auto', 'Mercedes-Benz', 'mercedes-benz'), ('auto', 'Audi', 'audi'), ('auto', 'Citroen', 'citroen'),
  ('moto', 'Honda', 'honda'), ('moto', 'Yamaha', 'yamaha'), ('moto', 'Suzuki', 'suzuki'),
  ('moto', 'Bajaj', 'bajaj'), ('moto', 'Kawasaki', 'kawasaki'), ('moto', 'Motomel', 'motomel'),
  ('moto', 'Gilera', 'gilera'), ('moto', 'Zanella', 'zanella'),
  ('camioneta', 'Ford', 'ford'), ('camioneta', 'Toyota', 'toyota'), ('camioneta', 'Volkswagen', 'volkswagen'),
  ('camioneta', 'Chevrolet', 'chevrolet'), ('camioneta', 'Nissan', 'nissan'), ('camioneta', 'Renault', 'renault')
)
INSERT INTO public.vehicle_brands (vehicle_type_id, name, slug)
SELECT t.id, m.nombre, m.slug
FROM marcas m JOIN public.vehicle_types t ON t.slug = m.tipo
ON CONFLICT (vehicle_type_id, name) DO NOTHING;

WITH modelos(tipo, marca, modelo) AS (VALUES
  ('auto','Chevrolet','Onix'), ('auto','Chevrolet','Cruze'), ('auto','Chevrolet','Tracker'),
  ('auto','Fiat','Cronos'), ('auto','Fiat','Argo'), ('auto','Fiat','Pulse'), ('auto','Fiat','Toro'),
  ('auto','Ford','Ka'), ('auto','Ford','Fiesta'), ('auto','Ford','Focus'), ('auto','Ford','Territory'),
  ('auto','Honda','Fit'), ('auto','Honda','Civic'), ('auto','Honda','City'),
  ('auto','Peugeot','208'), ('auto','Peugeot','308'), ('auto','Peugeot','2008'),
  ('auto','Renault','Clio'), ('auto','Renault','Sandero'), ('auto','Renault','Logan'), ('auto','Renault','Kwid'),
  ('auto','Toyota','Etios'), ('auto','Toyota','Corolla'), ('auto','Toyota','Yaris'),
  ('auto','Volkswagen','Gol'), ('auto','Volkswagen','Polo'), ('auto','Volkswagen','Golf'), ('auto','Volkswagen','Virtus'),
  ('auto','BMW','Serie 1'), ('auto','BMW','Serie 3'), ('auto','BMW','X1'),
  ('auto','Mercedes-Benz','Clase A'), ('auto','Mercedes-Benz','Clase C'),
  ('auto','Audi','A3'), ('auto','Audi','A4'), ('auto','Citroen','C3'), ('auto','Citroen','C4'),
  ('moto','Honda','Wave'), ('moto','Honda','CB190R'), ('moto','Honda','Tornado'),
  ('moto','Yamaha','FZ'), ('moto','Yamaha','MT-03'), ('moto','Yamaha','XTZ 250'),
  ('moto','Suzuki','GN 125'), ('moto','Bajaj','Rouser NS 200'), ('moto','Kawasaki','Ninja 400'),
  ('moto','Motomel','Skua'), ('moto','Gilera','SMX'), ('moto','Zanella','ZR 150'),
  ('camioneta','Ford','Ranger'), ('camioneta','Ford','Maverick'), ('camioneta','Toyota','Hilux'),
  ('camioneta','Toyota','SW4'), ('camioneta','Volkswagen','Amarok'), ('camioneta','Chevrolet','S10'),
  ('camioneta','Nissan','Frontier'), ('camioneta','Renault','Alaskan')
)
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.modelo
FROM modelos m
JOIN public.vehicle_types t ON t.slug = m.tipo
JOIN public.vehicle_brands b ON b.vehicle_type_id = t.id AND b.slug = lower(m.marca)
ON CONFLICT (brand_id, name) DO NOTHING;

ALTER TABLE public.garage_posts
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.vehicle_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.vehicle_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS vehicle_models_brand_id_idx ON public.vehicle_models(brand_id);
CREATE INDEX IF NOT EXISTS garage_posts_brand_id_idx ON public.garage_posts(brand_id);
CREATE INDEX IF NOT EXISTS garage_posts_model_id_idx ON public.garage_posts(model_id);

-- =========================================================
