-- Ensure unaccent extension is in public schema
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION unaccent WITH SCHEMA public;

-- Function to normalize names (remove accents, trim, lowercase, collapse spaces)
CREATE OR REPLACE FUNCTION public.normalize_name(input_text text)
RETURNS text AS $$
BEGIN
  RETURN lower(trim(regexp_replace(public.unaccent(coalesce(input_text, '')), '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to slugify text (normalize + replace spaces with hyphens + remove non-alphanumeric)
CREATE OR REPLACE FUNCTION public.slugify(input_text text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  normalized := public.normalize_name(input_text);
  normalized := replace(normalized, ' ', '-');
  normalized := regexp_replace(normalized, '[^a-z0-9-]', '', 'g');
  normalized := regexp_replace(normalized, '-+', '-', 'g');
  normalized := trim(both '-' from normalized);
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing unique constraints on slug if exists
ALTER TABLE public.times DROP CONSTRAINT IF EXISTS times_slug_key;
ALTER TABLE public.ligas DROP CONSTRAINT IF EXISTS ligas_slug_key;

-- Function to generate unique slug with suffix handling
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_slug text, table_name text, exclude_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  final_slug text;
  counter integer := 0;
  slug_exists boolean;
BEGIN
  final_slug := base_slug;
  
  LOOP
    IF table_name = 'times' THEN
      IF exclude_id IS NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.times WHERE slug = final_slug) INTO slug_exists;
      ELSE
        SELECT EXISTS(SELECT 1 FROM public.times WHERE slug = final_slug AND id != exclude_id) INTO slug_exists;
      END IF;
    ELSIF table_name = 'ligas' THEN
      IF exclude_id IS NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.ligas WHERE slug = final_slug) INTO slug_exists;
      ELSE
        SELECT EXISTS(SELECT 1 FROM public.ligas WHERE slug = final_slug AND id != exclude_id) INTO slug_exists;
      END IF;
    ELSE
      slug_exists := false;
    END IF;
    
    EXIT WHEN NOT slug_exists;
    
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate slug for times
CREATE OR REPLACE FUNCTION public.set_time_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_slug(public.slugify(NEW.nome), 'times', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate slug for ligas
CREATE OR REPLACE FUNCTION public.set_liga_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_slug(public.slugify(NEW.nome), 'ligas', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing slug triggers
DROP TRIGGER IF EXISTS trigger_set_time_slug ON public.times;
DROP TRIGGER IF EXISTS trigger_set_liga_slug ON public.ligas;
DROP TRIGGER IF EXISTS set_time_slug ON public.times;
DROP TRIGGER IF EXISTS set_liga_slug ON public.ligas;

-- Create new triggers
CREATE TRIGGER trigger_set_time_slug
  BEFORE INSERT OR UPDATE ON public.times
  FOR EACH ROW
  EXECUTE FUNCTION public.set_time_slug();

CREATE TRIGGER trigger_set_liga_slug
  BEFORE INSERT OR UPDATE ON public.ligas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_liga_slug();

-- Fix duplicate slugs in times first
DO $$
DECLARE
  dup RECORD;
  r RECORD;
  counter integer;
BEGIN
  FOR dup IN 
    SELECT slug FROM public.times WHERE slug IS NOT NULL AND slug != '' GROUP BY slug HAVING COUNT(*) > 1
  LOOP
    counter := 0;
    FOR r IN SELECT id FROM public.times WHERE slug = dup.slug ORDER BY created_at ASC LOOP
      IF counter > 0 THEN
        UPDATE public.times SET slug = dup.slug || '-' || counter WHERE id = r.id;
      END IF;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Fix duplicate slugs in ligas
DO $$
DECLARE
  dup RECORD;
  r RECORD;
  counter integer;
BEGIN
  FOR dup IN 
    SELECT slug FROM public.ligas WHERE slug IS NOT NULL AND slug != '' GROUP BY slug HAVING COUNT(*) > 1
  LOOP
    counter := 0;
    FOR r IN SELECT id FROM public.ligas WHERE slug = dup.slug ORDER BY created_at ASC LOOP
      IF counter > 0 THEN
        UPDATE public.ligas SET slug = dup.slug || '-' || counter WHERE id = r.id;
      END IF;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Update existing times with missing slugs
DO $$
DECLARE
  r RECORD;
  new_slug text;
BEGIN
  FOR r IN SELECT id, nome FROM public.times WHERE slug IS NULL OR slug = '' ORDER BY created_at ASC LOOP
    new_slug := public.generate_unique_slug(public.slugify(r.nome), 'times', r.id);
    UPDATE public.times SET slug = new_slug WHERE id = r.id;
  END LOOP;
END $$;

-- Update existing ligas with missing slugs
DO $$
DECLARE
  r RECORD;
  new_slug text;
BEGIN
  FOR r IN SELECT id, nome FROM public.ligas WHERE slug IS NULL OR slug = '' ORDER BY created_at ASC LOOP
    new_slug := public.generate_unique_slug(public.slugify(r.nome), 'ligas', r.id);
    UPDATE public.ligas SET slug = new_slug WHERE id = r.id;
  END LOOP;
END $$;

-- Clean up duplicate external_id_map entries
DELETE FROM public.external_id_map a
USING public.external_id_map b
WHERE a.id > b.id
  AND a.source_id IS NOT DISTINCT FROM b.source_id
  AND a.entity_type = b.entity_type
  AND a.external_id = b.external_id;

-- Create unique index on external_id_map for deduplication
DROP INDEX IF EXISTS idx_external_id_map_unique_mapping;
CREATE UNIQUE INDEX idx_external_id_map_unique_mapping 
ON public.external_id_map (source_id, entity_type, external_id);

-- Create index for faster lookups by entity_type and internal_id
DROP INDEX IF EXISTS idx_external_id_map_internal_lookup;
CREATE INDEX idx_external_id_map_internal_lookup 
ON public.external_id_map (entity_type, internal_id);

-- Create index for slug lookups
DROP INDEX IF EXISTS idx_times_slug;
CREATE INDEX idx_times_slug ON public.times (slug);

DROP INDEX IF EXISTS idx_ligas_slug;
CREATE INDEX idx_ligas_slug ON public.ligas (slug);