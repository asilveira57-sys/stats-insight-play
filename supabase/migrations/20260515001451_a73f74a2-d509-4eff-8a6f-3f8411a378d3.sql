-- Inventário de ligas disponíveis na API-Football
CREATE TABLE IF NOT EXISTS public.api_football_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id INTEGER NOT NULL UNIQUE,
  league_name TEXT NOT NULL,
  league_type TEXT,
  country TEXT,
  country_code TEXT,
  logo_url TEXT,
  flag_url TEXT,
  seasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  last_refresh TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afi_country ON public.api_football_inventory(country);
CREATE INDEX IF NOT EXISTS idx_afi_priority ON public.api_football_inventory(is_priority) WHERE is_priority = true;

ALTER TABLE public.api_football_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api_football_inventory"
  ON public.api_football_inventory FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fila de jobs de importação
CREATE TABLE IF NOT EXISTS public.api_football_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id INTEGER NOT NULL,
  league_name TEXT,
  season INTEGER NOT NULL,
  depth TEXT NOT NULL CHECK (depth IN ('fixtures','events','lineups','stats')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed','skipped','paused')),
  fixtures_total INTEGER DEFAULT 0,
  fixtures_processed INTEGER DEFAULT 0,
  requests_used INTEGER DEFAULT 0,
  requests_estimated INTEGER DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, season, depth)
);

CREATE INDEX IF NOT EXISTS idx_afij_status ON public.api_football_import_jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_afij_league ON public.api_football_import_jobs(league_id, season);

ALTER TABLE public.api_football_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api_football_import_jobs"
  ON public.api_football_import_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Log diário de quota
CREATE TABLE IF NOT EXISTS public.api_football_quota_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day DATE NOT NULL UNIQUE,
  requests_used INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 75000,
  last_check TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_football_quota_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read api_football_quota_log"
  ON public.api_football_quota_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers de updated_at
CREATE TRIGGER trg_afi_updated BEFORE UPDATE ON public.api_football_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_afij_updated BEFORE UPDATE ON public.api_football_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para a fila de jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_football_import_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_football_quota_log;