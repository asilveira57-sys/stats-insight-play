
-- Table: team_merge_analysis_cache
-- Caches pre-merge reports for performance
CREATE TABLE public.team_merge_analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_a_id UUID NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  team_b_id UUID NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_json JSONB NOT NULL,
  data_version_hash TEXT NOT NULL,
  created_by_user_id UUID,
  CONSTRAINT team_merge_analysis_cache_pair_unique UNIQUE (team_a_id, team_b_id)
);

CREATE INDEX idx_team_merge_cache_teams ON public.team_merge_analysis_cache (team_a_id, team_b_id);
CREATE INDEX idx_team_merge_cache_normalized ON public.team_merge_analysis_cache (LEAST(team_a_id, team_b_id), GREATEST(team_a_id, team_b_id));

ALTER TABLE public.team_merge_analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merge analysis cache"
ON public.team_merge_analysis_cache
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: team_merge_decisions
-- Audit trail for merge decisions
CREATE TABLE public.team_merge_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kept_team_id UUID NOT NULL REFERENCES public.times(id),
  removed_team_id UUID NOT NULL,
  similarity_score NUMERIC,
  risk_level TEXT CHECK (risk_level IN ('baixo', 'medio', 'alto')),
  decision_reason TEXT NOT NULL,
  decision_reason_detail TEXT,
  report_snapshot_json JSONB,
  decided_by_user_id UUID,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_merge_decisions_teams ON public.team_merge_decisions (kept_team_id, removed_team_id);

ALTER TABLE public.team_merge_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merge decisions"
ON public.team_merge_decisions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add config flag for requiring report before merge
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('exigir_visualizacao_relatorio_pre_fusao', 'false', 'Se ativo, exige visualização do relatório pré-fusão antes de confirmar a fusão de times')
ON CONFLICT (chave) DO NOTHING;
