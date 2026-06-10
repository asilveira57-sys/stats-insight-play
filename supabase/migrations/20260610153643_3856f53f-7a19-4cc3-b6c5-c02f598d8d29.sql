ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS world_cup_2026_match_id UUID REFERENCES public.world_cup_2026_matches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS noticias_wc2026_match_idx
  ON public.noticias(world_cup_2026_match_id) WHERE world_cup_2026_match_id IS NOT NULL;