-- =====================================================
-- HUB DE DADOS DO FUTEBOL - ESTRUTURA DE BANCO UNIFICADO
-- =====================================================

-- Enum para tipos de fonte
CREATE TYPE source_type AS ENUM ('api', 'github', 'manual');

-- Enum para status de entidade
CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'pending', 'error');

-- Enum para status de sincronização
CREATE TYPE sync_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Enum para tipo de competição
CREATE TYPE competition_type AS ENUM ('league', 'cup', 'tournament', 'friendly');

-- Enum para nível de confiança de match
CREATE TYPE match_confidence AS ENUM ('low', 'medium', 'high', 'exact');

-- =====================================================
-- TABELA: data_sources (Fontes de Dados)
-- =====================================================
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type source_type NOT NULL DEFAULT 'api',
  status entity_status NOT NULL DEFAULT 'active',
  base_url TEXT,
  api_key_secret_name TEXT,
  rate_limit_per_minute INTEGER DEFAULT 10,
  rate_limit_per_day INTEGER DEFAULT 1000,
  requests_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 100,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: sync_logs (Logs de Sincronização)
-- =====================================================
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  status sync_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  requests_made INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: external_id_map (Mapeamento de IDs Externos)
-- =====================================================
CREATE TABLE public.external_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  internal_id UUID NOT NULL,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  confidence match_confidence DEFAULT 'high',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, source_id, external_id)
);

-- =====================================================
-- TABELA: team_aliases (Aliases de Times)
-- =====================================================
CREATE TABLE public.team_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.times(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias)
);

-- =====================================================
-- TABELA: competition_aliases (Aliases de Competições)
-- =====================================================
CREATE TABLE public.competition_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.ligas(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias)
);

-- =====================================================
-- TABELA: seasons (Temporadas)
-- =====================================================
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.ligas(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  status entity_status DEFAULT 'active',
  current_matchday INTEGER,
  total_matchdays INTEGER,
  winner_team_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, year)
);

-- =====================================================
-- TABELA: standings (Classificação)
-- =====================================================
CREATE TABLE public.standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.times(id) ON DELETE CASCADE,
  matchday INTEGER,
  position INTEGER NOT NULL,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, team_id, matchday)
);

-- =====================================================
-- TABELA: players (Jogadores)
-- =====================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  nationality TEXT,
  date_of_birth DATE,
  position TEXT,
  shirt_number INTEGER,
  current_team_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
  photo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: match_events (Eventos de Partida)
-- =====================================================
CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  player_name TEXT,
  event_type TEXT NOT NULL,
  minute INTEGER NOT NULL,
  extra_time INTEGER,
  detail TEXT,
  assist_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  assist_player_name TEXT,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: highlights (Melhores Momentos/Vídeos)
-- =====================================================
CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  title TEXT,
  description TEXT,
  video_url TEXT NOT NULL,
  embed_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  published_at TIMESTAMPTZ,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: data_conflicts (Conflitos de Dados)
-- =====================================================
CREATE TABLE public.data_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  internal_id UUID,
  source_a_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_b_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  value_a TEXT,
  value_b TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_value TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: sync_schedules (Agendamentos de Sync)
-- =====================================================
CREATE TABLE public.sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  cron_expression TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: api_request_cache (Cache de Requisições)
-- =====================================================
CREATE TABLE public.api_request_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  params_hash TEXT NOT NULL,
  response JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, endpoint, params_hash)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_sync_logs_source ON public.sync_logs(source_id);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
CREATE INDEX idx_external_id_map_internal ON public.external_id_map(entity_type, internal_id);
CREATE INDEX idx_external_id_map_external ON public.external_id_map(entity_type, external_id);
CREATE INDEX idx_team_aliases_normalized ON public.team_aliases(normalized_alias);
CREATE INDEX idx_competition_aliases_normalized ON public.competition_aliases(normalized_alias);
CREATE INDEX idx_seasons_league ON public.seasons(league_id);
CREATE INDEX idx_standings_season ON public.standings(season_id);
CREATE INDEX idx_standings_team ON public.standings(team_id);
CREATE INDEX idx_players_team ON public.players(current_team_id);
CREATE INDEX idx_match_events_match ON public.match_events(match_id);
CREATE INDEX idx_highlights_match ON public.highlights(match_id);
CREATE INDEX idx_data_conflicts_resolved ON public.data_conflicts(resolved);
CREATE INDEX idx_api_cache_expires ON public.api_request_cache(expires_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- data_sources
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Data sources are viewable by everyone" ON public.data_sources FOR SELECT USING (true);
CREATE POLICY "Admins can manage data sources" ON public.data_sources FOR ALL USING (has_role(auth.uid(), 'admin'));

-- sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sync logs are viewable by everyone" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Admins can manage sync logs" ON public.sync_logs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- external_id_map
ALTER TABLE public.external_id_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "External ID map viewable by everyone" ON public.external_id_map FOR SELECT USING (true);
CREATE POLICY "Admins can manage external ID map" ON public.external_id_map FOR ALL USING (has_role(auth.uid(), 'admin'));

-- team_aliases
ALTER TABLE public.team_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team aliases viewable by everyone" ON public.team_aliases FOR SELECT USING (true);
CREATE POLICY "Admins can manage team aliases" ON public.team_aliases FOR ALL USING (has_role(auth.uid(), 'admin'));

-- competition_aliases
ALTER TABLE public.competition_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competition aliases viewable by everyone" ON public.competition_aliases FOR SELECT USING (true);
CREATE POLICY "Admins can manage competition aliases" ON public.competition_aliases FOR ALL USING (has_role(auth.uid(), 'admin'));

-- seasons
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seasons are viewable by everyone" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins can manage seasons" ON public.seasons FOR ALL USING (has_role(auth.uid(), 'admin'));

-- standings
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Standings are viewable by everyone" ON public.standings FOR SELECT USING (true);
CREATE POLICY "Admins can manage standings" ON public.standings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players are viewable by everyone" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admins can manage players" ON public.players FOR ALL USING (has_role(auth.uid(), 'admin'));

-- match_events
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match events viewable by everyone" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage match events" ON public.match_events FOR ALL USING (has_role(auth.uid(), 'admin'));

-- highlights
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Highlights are viewable by everyone" ON public.highlights FOR SELECT USING (true);
CREATE POLICY "Admins can manage highlights" ON public.highlights FOR ALL USING (has_role(auth.uid(), 'admin'));

-- data_conflicts
ALTER TABLE public.data_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Data conflicts viewable by admins" ON public.data_conflicts FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage data conflicts" ON public.data_conflicts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- sync_schedules
ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sync schedules viewable by admins" ON public.sync_schedules FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sync schedules" ON public.sync_schedules FOR ALL USING (has_role(auth.uid(), 'admin'));

-- api_request_cache
ALTER TABLE public.api_request_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "API cache viewable by admins" ON public.api_request_cache FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage API cache" ON public.api_request_cache FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_external_id_map_updated_at BEFORE UPDATE ON public.external_id_map FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sync_schedules_updated_at BEFORE UPDATE ON public.sync_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();