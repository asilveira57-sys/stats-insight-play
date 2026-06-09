
-- 1) Add palpite link to wc2026
ALTER TABLE public.palpites_usuarios
  ADD COLUMN IF NOT EXISTS wc2026_match_id UUID REFERENCES public.world_cup_2026_matches(id) ON DELETE CASCADE;

ALTER TABLE public.palpites_usuarios
  ALTER COLUMN partida_id DROP NOT NULL;

DROP INDEX IF EXISTS palpites_usuarios_user_match_unique;
CREATE UNIQUE INDEX IF NOT EXISTS palpites_usuarios_user_partida_idx
  ON public.palpites_usuarios(user_id, partida_id) WHERE partida_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS palpites_usuarios_user_wc2026_idx
  ON public.palpites_usuarios(user_id, wc2026_match_id) WHERE wc2026_match_id IS NOT NULL;

ALTER TABLE public.palpites_usuarios
  DROP CONSTRAINT IF EXISTS palpites_usuarios_one_match_type;
ALTER TABLE public.palpites_usuarios
  ADD CONSTRAINT palpites_usuarios_one_match_type
  CHECK ((partida_id IS NOT NULL AND wc2026_match_id IS NULL) OR (partida_id IS NULL AND wc2026_match_id IS NOT NULL));

-- 2) Trigger: auto-fill group_letter on matches from teams
CREATE OR REPLACE FUNCTION public.wc2026_fill_group_letter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hg TEXT;
  ag TEXT;
BEGIN
  IF NEW.stage = 'group' AND NEW.group_letter IS NULL THEN
    SELECT group_letter INTO hg FROM public.world_cup_2026_teams WHERE id = NEW.home_team_id;
    SELECT group_letter INTO ag FROM public.world_cup_2026_teams WHERE id = NEW.away_team_id;
    IF hg IS NOT NULL AND hg = ag THEN
      NEW.group_letter := hg;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wc2026_fill_group_letter ON public.world_cup_2026_matches;
CREATE TRIGGER trg_wc2026_fill_group_letter
BEFORE INSERT OR UPDATE OF home_team_id, away_team_id, stage ON public.world_cup_2026_matches
FOR EACH ROW EXECUTE FUNCTION public.wc2026_fill_group_letter();

-- 3) Match-round column to position within group (1, 2, 3)
ALTER TABLE public.world_cup_2026_matches
  ADD COLUMN IF NOT EXISTS match_round INTEGER;
