-- Cache table for AI-generated SEO content per team/league/season
CREATE TABLE IF NOT EXISTS public.team_seo_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  league_id UUID REFERENCES public.ligas(id) ON DELETE SET NULL,
  season INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, league_id, season)
);

CREATE INDEX IF NOT EXISTS idx_team_seo_content_lookup ON public.team_seo_content(team_id, league_id, season);

ALTER TABLE public.team_seo_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read team_seo_content"
  ON public.team_seo_content FOR SELECT
  USING (true);

CREATE POLICY "Admins manage team_seo_content"
  ON public.team_seo_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_team_seo_content_updated_at
  BEFORE UPDATE ON public.team_seo_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();