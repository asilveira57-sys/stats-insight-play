ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'svg';
CREATE INDEX IF NOT EXISTS idx_noticias_image_source ON public.noticias(image_source);