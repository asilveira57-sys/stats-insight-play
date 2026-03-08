
-- Staging table for parsed matches from historical documents
CREATE TABLE public.historical_staging_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.historical_import_jobs(id),
  source_url_id uuid REFERENCES public.historical_source_urls(id),
  document_id uuid REFERENCES public.historical_raw_documents(id),
  
  -- Raw parsed data
  home_team_raw text NOT NULL,
  away_team_raw text NOT NULL,
  score_home integer,
  score_away integer,
  match_date date,
  match_date_raw text,
  round_raw text,
  competition_raw text,
  season_raw text,
  venue_raw text,
  extra_data jsonb DEFAULT '{}'::jsonb,
  
  -- Resolution fields (filled by resolve phase)
  home_team_id uuid REFERENCES public.times(id),
  away_team_id uuid REFERENCES public.times(id),
  liga_id uuid REFERENCES public.ligas(id),
  home_team_confidence text DEFAULT 'pending',
  away_team_confidence text DEFAULT 'pending',
  liga_confidence text DEFAULT 'pending',
  
  -- Pipeline status
  status text NOT NULL DEFAULT 'parsed',
  -- parsed -> resolved -> conflict -> promoted -> skipped
  resolution_notes text,
  promoted_match_id uuid REFERENCES public.partidas(id),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for pipeline queries
CREATE INDEX idx_staging_matches_status ON public.historical_staging_matches(status);
CREATE INDEX idx_staging_matches_job ON public.historical_staging_matches(job_id);
CREATE INDEX idx_staging_matches_source_url ON public.historical_staging_matches(source_url_id);

-- Add pipeline_status to source URLs to track overall progress
ALTER TABLE public.historical_source_urls 
  ADD COLUMN IF NOT EXISTS pipeline_status text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS last_parsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS staging_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staging_resolved integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staging_promoted integer DEFAULT 0;

-- RLS
ALTER TABLE public.historical_staging_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage staging matches"
  ON public.historical_staging_matches FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staging matches viewable by admins"
  ON public.historical_staging_matches FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
