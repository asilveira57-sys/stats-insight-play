
-- 1) Normalize stage
UPDATE public.world_cup_2026_matches SET stage='round_of_32' WHERE stage='r32';

-- 2) Drop broken placeholders (no teams) in KO stages — we'll recreate them clean
DELETE FROM public.world_cup_2026_matches
WHERE stage IN ('round_of_32','round_of_16','quarter_final','semi_final','final','third_place')
  AND home_team_id IS NULL AND away_team_id IS NULL;

-- 3) Number R32 oficiais by match_date (R32-1..R32-N)
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY match_date NULLS LAST, id) AS rn
  FROM public.world_cup_2026_matches
  WHERE stage='round_of_32'
)
UPDATE public.world_cup_2026_matches m
SET bracket_position = 'R32-' || numbered.rn
FROM numbered
WHERE m.id = numbered.id;

-- 4) Create missing empty placeholders for all KO slots
INSERT INTO public.world_cup_2026_matches (stage, bracket_position, status)
SELECT 'round_of_32', 'R32-'||g, 'scheduled' FROM generate_series(1,16) g
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_cup_2026_matches WHERE stage='round_of_32' AND bracket_position='R32-'||g
);
INSERT INTO public.world_cup_2026_matches (stage, bracket_position, status)
SELECT 'round_of_16', 'R16-'||g, 'scheduled' FROM generate_series(1,8) g
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_cup_2026_matches WHERE stage='round_of_16' AND bracket_position='R16-'||g
);
INSERT INTO public.world_cup_2026_matches (stage, bracket_position, status)
SELECT 'quarter_final', 'QF-'||g, 'scheduled' FROM generate_series(1,4) g
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_cup_2026_matches WHERE stage='quarter_final' AND bracket_position='QF-'||g
);
INSERT INTO public.world_cup_2026_matches (stage, bracket_position, status)
SELECT 'semi_final', 'SF-'||g, 'scheduled' FROM generate_series(1,2) g
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_cup_2026_matches WHERE stage='semi_final' AND bracket_position='SF-'||g
);
INSERT INTO public.world_cup_2026_matches (stage, bracket_position, status)
SELECT 'final', 'F-1', 'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_cup_2026_matches WHERE stage='final' AND bracket_position='F-1'
);
INSERT INTO public.world_cup_2026_matches (stage, bracket_position, status)
SELECT 'third_place', 'TP-1', 'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_cup_2026_matches WHERE stage='third_place' AND bracket_position='TP-1'
);

-- 5) Wire next_match_id / next_match_slot for every KO row
-- R32-i -> R16-ceil(i/2), slot 'home' if i odd, 'away' if i even
UPDATE public.world_cup_2026_matches src
SET next_match_id = dst.id,
    next_match_slot = CASE WHEN ((substring(src.bracket_position from 'R32-(\d+)'))::int) % 2 = 1 THEN 'home' ELSE 'away' END
FROM public.world_cup_2026_matches dst
WHERE src.stage='round_of_32'
  AND dst.stage='round_of_16'
  AND dst.bracket_position = 'R16-' || ceil(((substring(src.bracket_position from 'R32-(\d+)'))::numeric)/2)::int;

UPDATE public.world_cup_2026_matches src
SET next_match_id = dst.id,
    next_match_slot = CASE WHEN ((substring(src.bracket_position from 'R16-(\d+)'))::int) % 2 = 1 THEN 'home' ELSE 'away' END
FROM public.world_cup_2026_matches dst
WHERE src.stage='round_of_16'
  AND dst.stage='quarter_final'
  AND dst.bracket_position = 'QF-' || ceil(((substring(src.bracket_position from 'R16-(\d+)'))::numeric)/2)::int;

UPDATE public.world_cup_2026_matches src
SET next_match_id = dst.id,
    next_match_slot = CASE WHEN ((substring(src.bracket_position from 'QF-(\d+)'))::int) % 2 = 1 THEN 'home' ELSE 'away' END
FROM public.world_cup_2026_matches dst
WHERE src.stage='quarter_final'
  AND dst.stage='semi_final'
  AND dst.bracket_position = 'SF-' || ceil(((substring(src.bracket_position from 'QF-(\d+)'))::numeric)/2)::int;

UPDATE public.world_cup_2026_matches src
SET next_match_id = dst.id,
    next_match_slot = CASE WHEN ((substring(src.bracket_position from 'SF-(\d+)'))::int) = 1 THEN 'home' ELSE 'away' END
FROM public.world_cup_2026_matches dst
WHERE src.stage='semi_final'
  AND dst.stage='final'
  AND dst.bracket_position = 'F-1';

-- 6) Trigger: when a KO match finishes, write its winner (or SF loser → 3rd place) into the next slot
CREATE OR REPLACE FUNCTION public.wc2026_advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner uuid;
  v_loser  uuid;
  v_tp_id  uuid;
  v_tp_slot text;
BEGIN
  IF NEW.status <> 'finished' THEN RETURN NEW; END IF;
  IF NEW.home_team_id IS NULL OR NEW.away_team_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN RETURN NEW; END IF;
  IF NEW.stage NOT IN ('round_of_32','round_of_16','quarter_final','semi_final') THEN RETURN NEW; END IF;

  v_winner := COALESCE(
    NEW.winner_team_id,
    CASE
      WHEN NEW.home_score > NEW.away_score THEN NEW.home_team_id
      WHEN NEW.away_score > NEW.home_score THEN NEW.away_team_id
      ELSE NULL
    END
  );
  IF v_winner IS NULL THEN RETURN NEW; END IF;

  v_loser := CASE WHEN v_winner = NEW.home_team_id THEN NEW.away_team_id ELSE NEW.home_team_id END;

  -- Propagate winner to next phase slot
  IF NEW.next_match_id IS NOT NULL AND NEW.next_match_slot IN ('home','away') THEN
    IF NEW.next_match_slot = 'home' THEN
      UPDATE public.world_cup_2026_matches
        SET home_team_id = v_winner, updated_at = now()
        WHERE id = NEW.next_match_id AND home_team_id IS DISTINCT FROM v_winner;
    ELSE
      UPDATE public.world_cup_2026_matches
        SET away_team_id = v_winner, updated_at = now()
        WHERE id = NEW.next_match_id AND away_team_id IS DISTINCT FROM v_winner;
    END IF;
  END IF;

  -- SF loser → third place
  IF NEW.stage = 'semi_final' THEN
    SELECT id INTO v_tp_id FROM public.world_cup_2026_matches
      WHERE stage='third_place' AND bracket_position='TP-1' LIMIT 1;
    IF v_tp_id IS NOT NULL THEN
      v_tp_slot := CASE WHEN substring(NEW.bracket_position from 'SF-(\d+)')::int = 1 THEN 'home' ELSE 'away' END;
      IF v_tp_slot = 'home' THEN
        UPDATE public.world_cup_2026_matches SET home_team_id = v_loser, updated_at = now()
          WHERE id = v_tp_id AND home_team_id IS DISTINCT FROM v_loser;
      ELSE
        UPDATE public.world_cup_2026_matches SET away_team_id = v_loser, updated_at = now()
          WHERE id = v_tp_id AND away_team_id IS DISTINCT FROM v_loser;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wc2026_advance_winner ON public.world_cup_2026_matches;
CREATE TRIGGER trg_wc2026_advance_winner
AFTER INSERT OR UPDATE OF status, home_score, away_score, winner_team_id
ON public.world_cup_2026_matches
FOR EACH ROW EXECUTE FUNCTION public.wc2026_advance_winner();
