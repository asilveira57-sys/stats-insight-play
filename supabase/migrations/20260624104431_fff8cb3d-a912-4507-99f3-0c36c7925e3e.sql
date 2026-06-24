CREATE TABLE IF NOT EXISTS public.wc2026_monte_carlo_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_version text NOT NULL DEFAULT 'live',
  team_id uuid NOT NULL REFERENCES public.world_cup_2026_teams(id) ON DELETE CASCADE,
  p_champion numeric NOT NULL DEFAULT 0,
  p_final numeric NOT NULL DEFAULT 0,
  p_semi numeric NOT NULL DEFAULT 0,
  p_qf numeric NOT NULL DEFAULT 0,
  p_r16 numeric NOT NULL DEFAULT 0,
  expected_goals_for numeric DEFAULT 0,
  expected_goals_against numeric DEFAULT 0,
  simulations integer NOT NULL DEFAULT 0,
  is_official_version boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projection_version, team_id)
);

GRANT SELECT ON public.wc2026_monte_carlo_results TO anon, authenticated;
GRANT ALL ON public.wc2026_monte_carlo_results TO service_role;

ALTER TABLE public.wc2026_monte_carlo_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monte_carlo_public_read" ON public.wc2026_monte_carlo_results
  FOR SELECT USING (true);

CREATE POLICY "monte_carlo_service_write" ON public.wc2026_monte_carlo_results
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_mc_results_version_champ
  ON public.wc2026_monte_carlo_results (projection_version, p_champion DESC);