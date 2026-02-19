
-- Table for validation run audit trail
CREATE TABLE public.team_merge_validation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kept_team_id UUID NOT NULL,
  removed_team_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  decision TEXT, -- SAME_TEAM / DIFFERENT_TEAM / INCONCLUSIVE
  confidence_score NUMERIC,
  risk_level TEXT,
  reasons_json JSONB DEFAULT '[]'::jsonb,
  evidence_json JSONB DEFAULT '[]'::jsonb,
  sample_games_json JSONB DEFAULT '[]'::jsonb,
  ai_model_used TEXT,
  search_provider_used TEXT DEFAULT 'firecrawl',
  slug_suggestion JSONB,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_merge_validation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage validation runs" ON public.team_merge_validation_runs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add validation_run_id and decision_source to team_merge_decisions
ALTER TABLE public.team_merge_decisions
  ADD COLUMN IF NOT EXISTS validation_run_id UUID REFERENCES public.team_merge_validation_runs(id),
  ADD COLUMN IF NOT EXISTS decision_source TEXT DEFAULT 'manual';

-- Index for fast lookups
CREATE INDEX idx_validation_runs_teams ON public.team_merge_validation_runs(kept_team_id, removed_team_id);
