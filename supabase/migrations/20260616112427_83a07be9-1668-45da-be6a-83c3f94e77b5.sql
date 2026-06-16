CREATE TABLE public.team_curriculum_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liga_id UUID NULL REFERENCES public.ligas(id) ON DELETE SET NULL,
  liga_nome TEXT NULL,
  team_ids UUID[] NOT NULL DEFAULT '{}',
  only_empty BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'queued',
  total INT NOT NULL DEFAULT 0,
  processed INT NOT NULL DEFAULT 0,
  succeeded INT NOT NULL DEFAULT 0,
  skipped_existing INT NOT NULL DEFAULT 0,
  skipped_low_conf INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  current_team_id UUID NULL,
  current_team_nome TEXT NULL,
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NULL,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_curriculum_jobs TO authenticated;
GRANT ALL ON public.team_curriculum_jobs TO service_role;

ALTER TABLE public.team_curriculum_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage curriculum jobs"
  ON public.team_curriculum_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_team_curriculum_jobs_updated_at
  BEFORE UPDATE ON public.team_curriculum_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_team_curriculum_jobs_status ON public.team_curriculum_jobs(status, created_at DESC);