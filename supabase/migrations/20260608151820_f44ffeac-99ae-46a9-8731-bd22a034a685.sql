ALTER TABLE public.world_cup_2026_matches
  ADD COLUMN IF NOT EXISTS bracket_position TEXT,
  ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES public.world_cup_2026_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_match_slot TEXT CHECK (next_match_slot IN ('home','away'));

CREATE INDEX IF NOT EXISTS idx_wc2026_matches_bracket ON public.world_cup_2026_matches(bracket_position);