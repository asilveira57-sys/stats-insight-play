CREATE INDEX IF NOT EXISTS idx_partidas_home_away_data_desc ON public.partidas (time_casa_id, time_fora_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_partidas_away_home_data_desc ON public.partidas (time_fora_id, time_casa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_partidas_home_data_desc ON public.partidas (time_casa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_partidas_away_data_desc ON public.partidas (time_fora_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_partidas_liga_data_desc ON public.partidas (liga_id, data DESC);