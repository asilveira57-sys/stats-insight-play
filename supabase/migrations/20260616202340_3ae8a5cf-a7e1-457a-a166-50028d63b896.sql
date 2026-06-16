
CREATE TABLE public.search_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  normalized_question TEXT NOT NULL,
  intent TEXT,
  answer_summary TEXT NOT NULL,
  answer_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_posts TO anon;
GRANT SELECT ON public.search_posts TO authenticated;
GRANT ALL ON public.search_posts TO service_role;

ALTER TABLE public.search_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_posts public read" ON public.search_posts
  FOR SELECT USING (true);

CREATE INDEX idx_search_posts_created_at ON public.search_posts(created_at DESC);
CREATE INDEX idx_search_posts_normalized ON public.search_posts(normalized_question);

CREATE TRIGGER update_search_posts_updated_at
  BEFORE UPDATE ON public.search_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_search_post_views(p_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.search_posts SET views = views + 1 WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION public.increment_search_post_views(TEXT) TO anon, authenticated;
