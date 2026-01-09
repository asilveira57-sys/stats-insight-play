-- Add slug column to ligas table for SEO-friendly URLs
ALTER TABLE public.ligas ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add pillar content columns for caching generated content
ALTER TABLE public.ligas ADD COLUMN IF NOT EXISTS pillar_content JSONB DEFAULT NULL;
ALTER TABLE public.ligas ADD COLUMN IF NOT EXISTS pillar_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create function to generate league slug
CREATE OR REPLACE FUNCTION public.generate_league_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug: lowercase, remove accents, replace spaces with hyphens, remove special chars
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        unaccent(NEW.nome),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
  
  -- Truncate to reasonable length
  base_slug := left(base_slug, 80);
  
  -- Remove trailing hyphens
  base_slug := regexp_replace(base_slug, '-+$', '');
  
  final_slug := base_slug;
  
  -- Check for duplicates and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.ligas WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-generate slug on insert/update
DROP TRIGGER IF EXISTS set_league_slug ON public.ligas;
CREATE TRIGGER set_league_slug
  BEFORE INSERT OR UPDATE OF nome ON public.ligas
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION public.generate_league_slug();

-- Generate slugs for existing leagues
UPDATE public.ligas SET slug = NULL WHERE slug IS NULL OR slug = '';

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_ligas_slug ON public.ligas(slug);