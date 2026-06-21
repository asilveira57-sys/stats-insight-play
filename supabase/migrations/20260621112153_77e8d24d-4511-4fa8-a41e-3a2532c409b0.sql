
-- Bracket projections table
CREATE TABLE public.wc2026_bracket_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_version text NOT NULL DEFAULT 'live',
  phase text NOT NULL,
  slot_code text NOT NULL,
  match_id uuid REFERENCES public.world_cup_2026_matches(id) ON DELETE SET NULL,
  group_letter text,
  home_team_id uuid REFERENCES public.world_cup_2026_teams(id),
  away_team_id uuid REFERENCES public.world_cup_2026_teams(id),
  home_score integer,
  away_score integer,
  home_pens integer,
  away_pens integer,
  went_to_penalties boolean NOT NULL DEFAULT false,
  winner_team_id uuid REFERENCES public.world_cup_2026_teams(id),
  confidence text NOT NULL DEFAULT 'medium',
  prob_home numeric,
  prob_draw numeric,
  prob_away numeric,
  basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_official_version boolean NOT NULL DEFAULT false,
  frozen_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(projection_version, slot_code)
);

GRANT SELECT ON public.wc2026_bracket_projections TO anon;
GRANT SELECT ON public.wc2026_bracket_projections TO authenticated;
GRANT ALL ON public.wc2026_bracket_projections TO service_role;

ALTER TABLE public.wc2026_bracket_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read bracket projections"
  ON public.wc2026_bracket_projections FOR SELECT
  USING (true);

CREATE POLICY "Service role manages bracket projections"
  ON public.wc2026_bracket_projections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_wc2026_bracket_proj_version ON public.wc2026_bracket_projections(projection_version, phase);
CREATE INDEX idx_wc2026_bracket_proj_slot ON public.wc2026_bracket_projections(slot_code);

-- Immutability trigger for frozen/official versions
CREATE OR REPLACE FUNCTION public.wc2026_bracket_proj_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bracket projection % is frozen and cannot be modified', OLD.slot_code;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_wc2026_bracket_proj_immutable
  BEFORE UPDATE OR DELETE ON public.wc2026_bracket_projections
  FOR EACH ROW EXECUTE FUNCTION public.wc2026_bracket_proj_immutable();
