CREATE TABLE public.match_odds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  bookmaker TEXT NOT NULL DEFAULT 'average',
  home_win NUMERIC,
  draw NUMERIC,
  away_win NUMERIC,
  over_2_5 NUMERIC,
  under_2_5 NUMERIC,
  btts_yes NUMERIC,
  btts_no NUMERIC,
  implied_prob_home NUMERIC,
  implied_prob_draw NUMERIC,
  implied_prob_away NUMERIC,
  is_pregame BOOLEAN NOT NULL DEFAULT true,
  external_fixture_id BIGINT,
  source TEXT NOT NULL DEFAULT 'api-football',
  raw JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (partida_id, bookmaker)
);

CREATE INDEX idx_match_odds_partida ON public.match_odds(partida_id);

GRANT SELECT ON public.match_odds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_odds TO authenticated;
GRANT ALL ON public.match_odds TO service_role;

ALTER TABLE public.match_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Odds are publicly readable"
ON public.match_odds FOR SELECT
USING (true);

CREATE POLICY "Admins can manage odds"
ON public.match_odds FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_match_odds_updated_at
BEFORE UPDATE ON public.match_odds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();