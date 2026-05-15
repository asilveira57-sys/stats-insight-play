INSERT INTO storage.buckets (id, name, public) 
VALUES ('card-backgrounds', 'card-backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read card-backgrounds" ON storage.objects;
CREATE POLICY "Public read card-backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-backgrounds');

DROP POLICY IF EXISTS "Service role write card-backgrounds" ON storage.objects;
CREATE POLICY "Service role write card-backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'card-backgrounds');