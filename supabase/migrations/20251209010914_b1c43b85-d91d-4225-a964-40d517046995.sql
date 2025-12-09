-- Add slug column to noticias table
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create unaccent extension if not exists
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_noticia_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug: lowercase, remove accents, replace spaces with hyphens, remove special chars
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        unaccent(NEW.titulo),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
  
  -- Truncate to reasonable length
  base_slug := left(base_slug, 100);
  
  -- Remove trailing hyphens
  base_slug := regexp_replace(base_slug, '-+$', '');
  
  final_slug := base_slug;
  
  -- Check for duplicates and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.noticias WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS set_noticia_slug ON public.noticias;
CREATE TRIGGER set_noticia_slug
BEFORE INSERT ON public.noticias
FOR EACH ROW
WHEN (NEW.slug IS NULL)
EXECUTE FUNCTION public.generate_noticia_slug();

-- Update existing noticias with slugs
UPDATE public.noticias 
SET slug = lower(
  regexp_replace(
    regexp_replace(
      unaccent(titulo),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || EXTRACT(EPOCH FROM created_at)::INTEGER
WHERE slug IS NULL;