-- Add partida_id column to noticias table to link news to matches
ALTER TABLE public.noticias ADD COLUMN partida_id uuid REFERENCES public.partidas(id);

-- Create index for faster lookups and duplicate prevention
CREATE INDEX idx_noticias_partida_id ON public.noticias(partida_id);

-- Create storage bucket for news thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('news-thumbnails', 'news-thumbnails', true);

-- Create policy for public read access to thumbnails
CREATE POLICY "Thumbnails are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'news-thumbnails');

-- Create policy for service role to upload thumbnails
CREATE POLICY "Service role can upload thumbnails" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'news-thumbnails');