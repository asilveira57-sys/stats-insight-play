-- 1) Adicionar coluna tipo
ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS tipo TEXT;

-- 2) Backfill por padrão de slug (best-effort)
UPDATE public.noticias
SET tipo = CASE
  WHEN slug LIKE 'validacao-semana-%' OR slug LIKE 'validacao-%' THEN 'validacao'
  WHEN slug LIKE 'pre-jogo-%'   OR slug LIKE 'pre-%' THEN 'pre-jogo'
  WHEN slug LIKE 'pos-jogo-%'   OR slug LIKE 'pos-%' THEN 'pos-jogo'
  WHEN slug LIKE 'analise-%'    OR slug LIKE '%-analise-%' THEN 'analise'
  WHEN partida_id IS NOT NULL   THEN 'analise'
  ELSE 'noticia'
END
WHERE tipo IS NULL;

-- 3) Default para futuras inserções
ALTER TABLE public.noticias
  ALTER COLUMN tipo SET DEFAULT 'noticia';

-- 4) Índice composto para feeds (tipo + publicada + data)
CREATE INDEX IF NOT EXISTS idx_noticias_tipo_pub_data
  ON public.noticias (tipo, publicada, data_publicacao DESC);