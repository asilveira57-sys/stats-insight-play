-- Add priority score columns to ligas table
ALTER TABLE public.ligas
ADD COLUMN IF NOT EXISTS priority_score NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS score_factors JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMP WITH TIME ZONE;

-- Add priority score columns to times table
ALTER TABLE public.times
ADD COLUMN IF NOT EXISTS priority_score NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS score_factors JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for priority ordering
CREATE INDEX IF NOT EXISTS idx_ligas_priority_score ON public.ligas(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_times_priority_score ON public.times(priority_score DESC);

-- Initialize base scores for existing leagues based on known relevance
UPDATE public.ligas SET 
  priority_score = CASE 
    WHEN codigo_api IN ('BSA', 'BSB') THEN 95  -- Brasileirão Séries A e B
    WHEN codigo_api IN ('CLI', 'CSA') THEN 85  -- Libertadores e Copa Sul-Americana
    WHEN codigo_api IN ('PL', 'PD', 'BL1', 'SA', 'FL1') THEN 90  -- Top 5 Europeias
    WHEN codigo_api IN ('CL', 'EL') THEN 92  -- Champions e Europa League
    WHEN codigo_api IN ('WC', 'EC') THEN 98  -- Copa do Mundo e Euro
    ELSE 50  -- Base score
  END,
  score_factors = jsonb_build_object(
    'structural_relevance', CASE 
      WHEN codigo_api IN ('BSA', 'PL', 'PD', 'BL1', 'SA', 'FL1') THEN 100
      WHEN codigo_api IN ('BSB', 'CL', 'EL', 'WC', 'EC', 'CLI', 'CSA') THEN 85
      ELSE 50
    END,
    'seo_potential', CASE 
      WHEN codigo_api IN ('BSA', 'PL', 'CL', 'WC') THEN 100
      WHEN codigo_api IN ('PD', 'BL1', 'SA', 'FL1', 'BSB', 'CLI') THEN 80
      ELSE 50
    END,
    'match_volume', 50,
    'engagement', 50
  ),
  score_updated_at = now()
WHERE priority_score IS NULL OR priority_score = 50;

-- Comment for documentation
COMMENT ON COLUMN public.ligas.priority_score IS 'Dynamic priority score (0-100) for content prioritization';
COMMENT ON COLUMN public.ligas.score_factors IS 'Breakdown of scoring factors: structural_relevance, seo_potential, match_volume, engagement';
COMMENT ON COLUMN public.times.priority_score IS 'Dynamic priority score (0-100) for content prioritization';
COMMENT ON COLUMN public.times.score_factors IS 'Breakdown of scoring factors: popularity, frequency, performance, engagement';