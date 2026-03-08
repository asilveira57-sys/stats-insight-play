
-- ============================================
-- KAGGLE INTEGRATION MODULE - FULL SCHEMA
-- ============================================

-- Storage bucket for raw assets
INSERT INTO storage.buckets (id, name, public) VALUES ('kaggle-assets', 'kaggle-assets', false) ON CONFLICT DO NOTHING;

-- ============================================
-- 1. CORE PROVIDER TABLES
-- ============================================

-- kaggle_datasets
CREATE TABLE public.kaggle_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug TEXT NOT NULL DEFAULT 'kaggle',
  dataset_slug TEXT NOT NULL,
  dataset_title TEXT NOT NULL,
  dataset_owner TEXT,
  dataset_url TEXT,
  dataset_description TEXT,
  dataset_category TEXT,
  country_scope TEXT,
  competition_scope TEXT,
  data_scope TEXT,
  source_status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 50,
  last_synced_at TIMESTAMPTZ,
  last_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_slug, dataset_slug)
);

CREATE INDEX idx_kaggle_datasets_slug ON public.kaggle_datasets(dataset_slug);
CREATE INDEX idx_kaggle_datasets_active ON public.kaggle_datasets(is_active) WHERE is_active = true;

-- kaggle_dataset_files
CREATE TABLE public.kaggle_dataset_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.kaggle_datasets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'csv',
  content_format TEXT,
  inferred_entity_type TEXT DEFAULT 'unknown',
  file_size_bytes BIGINT,
  file_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_processed_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, file_name)
);

CREATE INDEX idx_kaggle_files_dataset ON public.kaggle_dataset_files(dataset_id);

-- kaggle_parser_versions
CREATE TABLE public.kaggle_parser_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parser_name TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_import_jobs
CREATE TABLE public.kaggle_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.kaggle_datasets(id) ON DELETE CASCADE,
  dataset_file_id UUID REFERENCES public.kaggle_dataset_files(id) ON DELETE SET NULL,
  batch_id UUID,
  job_type TEXT NOT NULL DEFAULT 'full_import',
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 50,
  requested_by UUID,
  parser_version_id UUID REFERENCES public.kaggle_parser_versions(id),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  total_rows_read INTEGER DEFAULT 0,
  total_rows_staged INTEGER DEFAULT 0,
  total_matches_detected INTEGER DEFAULT 0,
  total_conflicts INTEGER DEFAULT 0,
  total_promoted INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  total_ignored INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  error_summary TEXT,
  lock_token UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_jobs_status ON public.kaggle_import_jobs(status);
CREATE INDEX idx_kaggle_jobs_dataset ON public.kaggle_import_jobs(dataset_id);
CREATE INDEX idx_kaggle_jobs_batch ON public.kaggle_import_jobs(batch_id) WHERE batch_id IS NOT NULL;

-- kaggle_import_job_items
CREATE TABLE public.kaggle_import_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_reference TEXT,
  item_status TEXT NOT NULL DEFAULT 'pending',
  sequence_order INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_job_items_job ON public.kaggle_import_job_items(job_id);

-- kaggle_raw_assets
CREATE TABLE public.kaggle_raw_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.kaggle_import_jobs(id) ON DELETE SET NULL,
  dataset_file_id UUID REFERENCES public.kaggle_dataset_files(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL DEFAULT 'csv',
  storage_path TEXT,
  raw_text TEXT,
  raw_json JSONB,
  content_hash TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_raw_assets_hash ON public.kaggle_raw_assets(content_hash);

-- kaggle_file_profiles
CREATE TABLE public.kaggle_file_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.kaggle_import_jobs(id) ON DELETE SET NULL,
  dataset_file_id UUID REFERENCES public.kaggle_dataset_files(id) ON DELETE SET NULL,
  detected_columns JSONB,
  detected_row_count INTEGER,
  inferred_schema JSONB,
  delimiter TEXT DEFAULT ',',
  encoding TEXT DEFAULT 'utf-8',
  sample_rows JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_column_mappings
CREATE TABLE public.kaggle_column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_file_id UUID NOT NULL REFERENCES public.kaggle_dataset_files(id) ON DELETE CASCADE,
  source_column_name TEXT NOT NULL,
  normalized_column_name TEXT,
  target_entity TEXT,
  target_field TEXT,
  mapping_confidence NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_col_mappings_file ON public.kaggle_column_mappings(dataset_file_id);

-- kaggle_import_logs
CREATE TABLE public.kaggle_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.kaggle_import_jobs(id) ON DELETE SET NULL,
  dataset_file_id UUID REFERENCES public.kaggle_dataset_files(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'info',
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_logs_job ON public.kaggle_import_logs(job_id);
CREATE INDEX idx_kaggle_logs_level ON public.kaggle_import_logs(level);

-- kaggle_rate_limit_controls
CREATE TABLE public.kaggle_rate_limit_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug TEXT NOT NULL DEFAULT 'kaggle',
  host_name TEXT NOT NULL DEFAULT 'kaggle.com',
  requests_per_minute INTEGER NOT NULL DEFAULT 10,
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 2,
  cooldown_seconds INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_retry_queue
CREATE TABLE public.kaggle_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  reason TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL,
  retry_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_retry_next ON public.kaggle_retry_queue(next_retry_at) WHERE retry_status = 'pending';

-- ============================================
-- 2. STAGING TABLES
-- ============================================

-- kaggle_staging_tables
CREATE TABLE public.kaggle_staging_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  inferred_entity_type TEXT,
  row_count INTEGER DEFAULT 0,
  schema_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_staging_rows
CREATE TABLE public.kaggle_staging_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_table_id UUID NOT NULL REFERENCES public.kaggle_staging_tables(id) ON DELETE CASCADE,
  row_number INTEGER,
  raw_row_json JSONB NOT NULL,
  normalized_row_json JSONB,
  row_hash TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_staging_rows_table ON public.kaggle_staging_rows(staging_table_id);
CREATE INDEX idx_kaggle_staging_rows_hash ON public.kaggle_staging_rows(row_hash);

-- kaggle_staging_competitions
CREATE TABLE public.kaggle_staging_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  raw_name TEXT NOT NULL,
  normalized_name TEXT,
  country TEXT,
  confederation TEXT,
  matched_competition_id UUID REFERENCES public.ligas(id),
  confidence_score NUMERIC DEFAULT 0,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_staging_seasons
CREATE TABLE public.kaggle_staging_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  raw_label TEXT NOT NULL,
  normalized_label TEXT,
  inferred_year_start INTEGER,
  inferred_year_end INTEGER,
  matched_season_id TEXT,
  confidence_score NUMERIC DEFAULT 0,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_staging_teams
CREATE TABLE public.kaggle_staging_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  raw_name TEXT NOT NULL,
  normalized_name TEXT,
  country TEXT,
  inferred_slug TEXT,
  matched_team_id UUID REFERENCES public.times(id),
  confidence_score NUMERIC DEFAULT 0,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_staging_teams_job ON public.kaggle_staging_teams(job_id);
CREATE INDEX idx_kaggle_staging_teams_slug ON public.kaggle_staging_teams(inferred_slug);

-- kaggle_staging_matches
CREATE TABLE public.kaggle_staging_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  raw_competition_name TEXT,
  raw_season_label TEXT,
  raw_round_label TEXT,
  raw_date_text TEXT,
  parsed_date DATE,
  raw_home_team TEXT,
  raw_away_team TEXT,
  parsed_home_score INTEGER,
  parsed_away_score INTEGER,
  raw_score_text TEXT,
  venue_text TEXT,
  referee_text TEXT,
  notes_text TEXT,
  odds_json JSONB,
  matched_competition_id UUID REFERENCES public.ligas(id),
  matched_season_id TEXT,
  matched_home_team_id UUID REFERENCES public.times(id),
  matched_away_team_id UUID REFERENCES public.times(id),
  matched_match_id UUID REFERENCES public.partidas(id),
  dedupe_status TEXT DEFAULT 'new_record',
  confidence_score NUMERIC DEFAULT 0,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  source_row_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_staging_matches_job ON public.kaggle_staging_matches(job_id);
CREATE INDEX idx_kaggle_staging_matches_date ON public.kaggle_staging_matches(parsed_date);
CREATE INDEX idx_kaggle_staging_matches_dedupe ON public.kaggle_staging_matches(dedupe_status);

-- kaggle_staging_match_events
CREATE TABLE public.kaggle_staging_match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_match_id UUID NOT NULL REFERENCES public.kaggle_staging_matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  minute INTEGER,
  player_name TEXT,
  raw_team_name TEXT,
  matched_team_id UUID REFERENCES public.times(id),
  notes TEXT,
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_staging_players
CREATE TABLE public.kaggle_staging_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  raw_name TEXT NOT NULL,
  normalized_name TEXT,
  nationality TEXT,
  birth_date DATE,
  position TEXT,
  current_team_raw TEXT,
  matched_player_id UUID REFERENCES public.players(id),
  confidence_score NUMERIC DEFAULT 0,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_staging_conflicts
CREATE TABLE public.kaggle_staging_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  raw_value TEXT,
  suggested_value TEXT,
  confidence_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. RESOLUTION & LINKS
-- ============================================

-- season_aliases (new)
CREATE TABLE IF NOT EXISTS public.season_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_label TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  canonical_year INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(raw_label, source)
);

-- kaggle_resolution_queue
CREATE TABLE public.kaggle_resolution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.kaggle_import_jobs(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  staging_entity_id UUID NOT NULL,
  issue_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kaggle_resolution_status ON public.kaggle_resolution_queue(status) WHERE status = 'pending';

-- kaggle_match_links
CREATE TABLE public.kaggle_match_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_match_id UUID NOT NULL REFERENCES public.kaggle_staging_matches(id) ON DELETE CASCADE,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  dataset_file_id UUID REFERENCES public.kaggle_dataset_files(id),
  provider_name TEXT NOT NULL DEFAULT 'kaggle',
  external_key TEXT,
  confidence_score NUMERIC DEFAULT 0,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_team_links
CREATE TABLE public.kaggle_team_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_team_id UUID NOT NULL REFERENCES public.kaggle_staging_teams(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT 'kaggle',
  external_key TEXT,
  confidence_score NUMERIC DEFAULT 0,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_competition_links
CREATE TABLE public.kaggle_competition_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_competition_id UUID NOT NULL REFERENCES public.kaggle_staging_competitions(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT 'kaggle',
  external_key TEXT,
  confidence_score NUMERIC DEFAULT 0,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_season_links
CREATE TABLE public.kaggle_season_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_season_id UUID NOT NULL REFERENCES public.kaggle_staging_seasons(id) ON DELETE CASCADE,
  season_id TEXT,
  provider_name TEXT NOT NULL DEFAULT 'kaggle',
  external_key TEXT,
  confidence_score NUMERIC DEFAULT 0,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_player_links
CREATE TABLE public.kaggle_player_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_player_id UUID NOT NULL REFERENCES public.kaggle_staging_players(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT 'kaggle',
  external_key TEXT,
  confidence_score NUMERIC DEFAULT 0,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_import_snapshots
CREATE TABLE public.kaggle_import_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  summary_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. OPERATIONAL CONTROL
-- ============================================

-- kaggle_job_batches
CREATE TABLE public.kaggle_job_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  batch_type TEXT NOT NULL DEFAULT 'import',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID,
  total_jobs INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_job_metrics
CREATE TABLE public.kaggle_job_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kaggle_import_jobs(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_manual_reviews
CREATE TABLE public.kaggle_manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.kaggle_import_jobs(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_reference TEXT,
  review_action TEXT,
  reviewed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_reprocess_requests
CREATE TABLE public.kaggle_reprocess_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  requested_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kaggle_provider_configs
CREATE TABLE public.kaggle_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug TEXT NOT NULL DEFAULT 'kaggle',
  config_key TEXT NOT NULL,
  config_value TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_slug, config_key)
);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.kaggle_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_dataset_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_import_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_raw_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_file_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_rate_limit_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_staging_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_resolution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_match_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_team_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_competition_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_season_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_player_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_import_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_job_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_job_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_manual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_reprocess_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaggle_parser_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_aliases ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role
CREATE POLICY "admin_kaggle_datasets" ON public.kaggle_datasets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_dataset_files" ON public.kaggle_dataset_files FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_import_jobs" ON public.kaggle_import_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_import_job_items" ON public.kaggle_import_job_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_raw_assets" ON public.kaggle_raw_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_file_profiles" ON public.kaggle_file_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_column_mappings" ON public.kaggle_column_mappings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_import_logs" ON public.kaggle_import_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_rate_limit_controls" ON public.kaggle_rate_limit_controls FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_retry_queue" ON public.kaggle_retry_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_tables" ON public.kaggle_staging_tables FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_rows" ON public.kaggle_staging_rows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_competitions" ON public.kaggle_staging_competitions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_seasons" ON public.kaggle_staging_seasons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_teams" ON public.kaggle_staging_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_matches" ON public.kaggle_staging_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_match_events" ON public.kaggle_staging_match_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_players" ON public.kaggle_staging_players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_staging_conflicts" ON public.kaggle_staging_conflicts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_resolution_queue" ON public.kaggle_resolution_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_match_links" ON public.kaggle_match_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_team_links" ON public.kaggle_team_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_competition_links" ON public.kaggle_competition_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_season_links" ON public.kaggle_season_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_player_links" ON public.kaggle_player_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_import_snapshots" ON public.kaggle_import_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_job_batches" ON public.kaggle_job_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_job_metrics" ON public.kaggle_job_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_manual_reviews" ON public.kaggle_manual_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_reprocess_requests" ON public.kaggle_reprocess_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_provider_configs" ON public.kaggle_provider_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_parser_versions" ON public.kaggle_parser_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_season_aliases" ON public.season_aliases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Service role policies for edge functions
CREATE POLICY "service_kaggle_datasets" ON public.kaggle_datasets FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_dataset_files" ON public.kaggle_dataset_files FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_import_jobs" ON public.kaggle_import_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_import_job_items" ON public.kaggle_import_job_items FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_raw_assets" ON public.kaggle_raw_assets FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_file_profiles" ON public.kaggle_file_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_column_mappings" ON public.kaggle_column_mappings FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_import_logs" ON public.kaggle_import_logs FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_rate_limit_controls" ON public.kaggle_rate_limit_controls FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_retry_queue" ON public.kaggle_retry_queue FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_tables" ON public.kaggle_staging_tables FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_rows" ON public.kaggle_staging_rows FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_competitions" ON public.kaggle_staging_competitions FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_seasons" ON public.kaggle_staging_seasons FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_teams" ON public.kaggle_staging_teams FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_matches" ON public.kaggle_staging_matches FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_match_events" ON public.kaggle_staging_match_events FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_players" ON public.kaggle_staging_players FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_staging_conflicts" ON public.kaggle_staging_conflicts FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_resolution_queue" ON public.kaggle_resolution_queue FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_match_links" ON public.kaggle_match_links FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_team_links" ON public.kaggle_team_links FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_competition_links" ON public.kaggle_competition_links FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_season_links" ON public.kaggle_season_links FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_player_links" ON public.kaggle_player_links FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_import_snapshots" ON public.kaggle_import_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_job_batches" ON public.kaggle_job_batches FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_job_metrics" ON public.kaggle_job_metrics FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_manual_reviews" ON public.kaggle_manual_reviews FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_reprocess_requests" ON public.kaggle_reprocess_requests FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_provider_configs" ON public.kaggle_provider_configs FOR ALL TO service_role USING (true);
CREATE POLICY "service_kaggle_parser_versions" ON public.kaggle_parser_versions FOR ALL TO service_role USING (true);
CREATE POLICY "service_season_aliases" ON public.season_aliases FOR ALL TO service_role USING (true);

-- Storage RLS for kaggle-assets
CREATE POLICY "admin_kaggle_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kaggle-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kaggle-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_kaggle_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'kaggle-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "service_kaggle_storage" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'kaggle-assets');

-- Insert default rate limit config
INSERT INTO public.kaggle_rate_limit_controls (provider_slug, host_name, requests_per_minute, max_concurrent_jobs, cooldown_seconds)
VALUES ('kaggle', 'kaggle.com', 10, 2, 30);

-- Insert default parser version
INSERT INTO public.kaggle_parser_versions (parser_name, parser_version, is_active, notes)
VALUES ('kaggle-csv-v1', '1.0.0', true, 'Default CSV parser for Kaggle datasets');
