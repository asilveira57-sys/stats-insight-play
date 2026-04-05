ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS content_updated boolean DEFAULT false;
ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;