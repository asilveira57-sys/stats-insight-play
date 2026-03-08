
-- =============================================
-- FASE 1: Historical Import Engine - Core Tables
-- =============================================

-- 1. historical_sources - Cadastro mestre de fontes
CREATE TABLE public.historical_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL DEFAULT 'rsssf',
  source_type text NOT NULL DEFAULT 'website',
  name text NOT NULL,
  country text,
  confederation text,
  scope text,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historical_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage historical_sources" ON public.historical_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Historical sources viewable by everyone" ON public.historical_sources FOR SELECT TO authenticated
  USING (true);

-- 2. historical_source_urls - URLs vinculadas à fonte
CREATE TABLE public.historical_source_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.historical_sources(id) ON DELETE CASCADE,
  url text NOT NULL,
  url_type text NOT NULL DEFAULT 'results',
  language text DEFAULT 'pt',
  season_label text,
  country text,
  is_active boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  last_status text,
  last_hash text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historical_source_urls_source ON public.historical_source_urls(source_id);
CREATE INDEX idx_historical_source_urls_active ON public.historical_source_urls(is_active) WHERE is_active = true;

ALTER TABLE public.historical_source_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage historical_source_urls" ON public.historical_source_urls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Historical source urls viewable by everyone" ON public.historical_source_urls FOR SELECT TO authenticated
  USING (true);

-- 3. historical_parser_versions - Controle de versão do parser
CREATE TABLE public.historical_parser_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL DEFAULT 'rsssf',
  parser_name text NOT NULL,
  parser_version text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historical_parser_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage historical_parser_versions" ON public.historical_parser_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parser versions viewable by everyone" ON public.historical_parser_versions FOR SELECT TO authenticated
  USING (true);

-- 4. historical_import_jobs - Fila de importação
CREATE TABLE public.historical_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.historical_sources(id),
  source_url_id uuid REFERENCES public.historical_source_urls(id),
  provider_name text NOT NULL DEFAULT 'rsssf',
  job_type text NOT NULL DEFAULT 'fetch',
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  parser_version_id uuid REFERENCES public.historical_parser_versions(id),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  total_blocks_detected integer DEFAULT 0,
  total_matches_detected integer DEFAULT 0,
  total_conflicts integer DEFAULT 0,
  total_promoted integer DEFAULT 0,
  total_ignored integer DEFAULT 0,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historical_import_jobs_status ON public.historical_import_jobs(status);
CREATE INDEX idx_historical_import_jobs_source_url ON public.historical_import_jobs(source_url_id);

ALTER TABLE public.historical_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage historical_import_jobs" ON public.historical_import_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. historical_raw_documents - Conteúdo bruto coletado
CREATE TABLE public.historical_raw_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.historical_import_jobs(id) ON DELETE CASCADE,
  source_url_id uuid REFERENCES public.historical_source_urls(id),
  source_url text NOT NULL,
  http_status integer,
  content_type text,
  raw_html text,
  cleaned_text text,
  normalized_text text,
  document_hash text,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historical_raw_documents_job ON public.historical_raw_documents(job_id);
CREATE INDEX idx_historical_raw_documents_hash ON public.historical_raw_documents(document_hash);

ALTER TABLE public.historical_raw_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage historical_raw_documents" ON public.historical_raw_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. historical_import_logs - Log detalhado do pipeline
CREATE TABLE public.historical_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.historical_import_jobs(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  stage text NOT NULL,
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historical_import_logs_job ON public.historical_import_logs(job_id);
CREATE INDEX idx_historical_import_logs_level ON public.historical_import_logs(level);

ALTER TABLE public.historical_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage historical_import_logs" ON public.historical_import_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
