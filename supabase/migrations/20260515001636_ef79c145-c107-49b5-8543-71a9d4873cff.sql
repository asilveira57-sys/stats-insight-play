ALTER TABLE public.partidas
  ADD COLUMN IF NOT EXISTS api_source TEXT,
  ADD COLUMN IF NOT EXISTS api_events JSONB,
  ADD COLUMN IF NOT EXISTS api_lineups JSONB,
  ADD COLUMN IF NOT EXISTS api_statistics JSONB;

CREATE INDEX IF NOT EXISTS idx_partidas_api_source ON public.partidas(api_source);
CREATE INDEX IF NOT EXISTS idx_partidas_api_id ON public.partidas(api_id) WHERE api_id IS NOT NULL;