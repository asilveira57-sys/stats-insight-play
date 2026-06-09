
CREATE UNIQUE INDEX IF NOT EXISTS wc2026_ai_analyses_match_type_unique
  ON public.world_cup_2026_ai_analyses(match_id, analysis_type) WHERE match_id IS NOT NULL;
