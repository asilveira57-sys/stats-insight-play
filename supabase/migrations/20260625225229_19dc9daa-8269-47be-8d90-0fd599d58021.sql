
CREATE TABLE IF NOT EXISTS public.wc2026_match_odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.world_cup_2026_matches(id) ON DELETE CASCADE,
  external_fixture_id integer,
  bookmaker text NOT NULL DEFAULT 'average',
  home_win numeric(6,2),
  draw numeric(6,2),
  away_win numeric(6,2),
  over_2_5 numeric(6,2),
  under_2_5 numeric(6,2),
  btts_yes numeric(6,2),
  btts_no numeric(6,2),
  exact_scores jsonb DEFAULT '{}'::jsonb,
  implied_prob_home numeric(5,2),
  implied_prob_draw numeric(5,2),
  implied_prob_away numeric(5,2),
  source text NOT NULL DEFAULT 'api-football',
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, bookmaker)
);

GRANT SELECT ON public.wc2026_match_odds TO anon, authenticated;
GRANT ALL ON public.wc2026_match_odds TO service_role;

ALTER TABLE public.wc2026_match_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read odds"
  ON public.wc2026_match_odds FOR SELECT
  USING (true);

CREATE POLICY "Service role manages odds"
  ON public.wc2026_match_odds FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_wc2026_match_odds_match ON public.wc2026_match_odds(match_id);
CREATE INDEX IF NOT EXISTS idx_wc2026_match_odds_fixture ON public.wc2026_match_odds(external_fixture_id);
