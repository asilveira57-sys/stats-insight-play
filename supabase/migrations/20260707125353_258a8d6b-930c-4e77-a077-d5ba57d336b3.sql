
-- 1. Remove placeholder rows (seed antigo, sem external_fixture_id)
DELETE FROM public.world_cup_2026_matches
WHERE stage IN ('round_of_32','round_of_16','quarter_final','semi_final','final','third_place')
  AND external_fixture_id IS NULL;

-- 2. Canonicaliza stages nas linhas reais vindas da API-Football
UPDATE public.world_cup_2026_matches SET stage = 'round_of_32'  WHERE stage = 'r32';
UPDATE public.world_cup_2026_matches SET stage = 'round_of_16'  WHERE stage = 'r16';
UPDATE public.world_cup_2026_matches SET stage = 'quarter_final' WHERE stage = 'qf';
UPDATE public.world_cup_2026_matches SET stage = 'semi_final'   WHERE stage = 'sf';
UPDATE public.world_cup_2026_matches SET stage = 'third_place'  WHERE stage = 'third';

-- 3. Zera bracket_position/next_match para regeneração limpa via link-bracket
UPDATE public.world_cup_2026_matches
SET bracket_position = NULL, next_match_id = NULL, next_match_slot = NULL
WHERE stage <> 'group';
