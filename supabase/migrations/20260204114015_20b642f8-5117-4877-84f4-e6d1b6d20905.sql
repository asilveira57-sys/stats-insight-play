-- ============================================================
-- PARTE 1: Adicionar campos na tabela ligas para categorização
-- ============================================================

-- Adicionar campos para classificação de campeonatos
ALTER TABLE public.ligas
ADD COLUMN IF NOT EXISTS tipo_principal text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS continente text,
ADD COLUMN IF NOT EXISTS organizador text,
ADD COLUMN IF NOT EXISTS ordem_exibicao integer DEFAULT 100;

-- Criar índices para filtragem eficiente
CREATE INDEX IF NOT EXISTS idx_ligas_tipo_principal ON public.ligas(tipo_principal);
CREATE INDEX IF NOT EXISTS idx_ligas_estado ON public.ligas(estado);
CREATE INDEX IF NOT EXISTS idx_ligas_pais ON public.ligas(pais);

-- ============================================================
-- PARTE 2: Adicionar campos na tabela times para short_code
-- ============================================================

-- Adicionar short_code se não existir (cores já está no jsonb 'cores')
ALTER TABLE public.times
ADD COLUMN IF NOT EXISTS short_code text,
ADD COLUMN IF NOT EXISTS estado text;

CREATE INDEX IF NOT EXISTS idx_times_short_code ON public.times(short_code);

-- ============================================================
-- PARTE 3: Criar tabela de artilharia agregada
-- ============================================================

CREATE TABLE IF NOT EXISTS public.artilharia_agregada (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competicao_id uuid REFERENCES public.ligas(id) ON DELETE CASCADE,
  temporada text,
  time_id uuid REFERENCES public.times(id) ON DELETE CASCADE,
  jogador_nome text NOT NULL,
  jogador_slug text NOT NULL,
  gols integer NOT NULL DEFAULT 0,
  partidas_com_gol integer DEFAULT 0,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_artilharia_competicao ON public.artilharia_agregada(competicao_id);
CREATE INDEX IF NOT EXISTS idx_artilharia_temporada ON public.artilharia_agregada(temporada);
CREATE INDEX IF NOT EXISTS idx_artilharia_jogador_slug ON public.artilharia_agregada(jogador_slug);
CREATE INDEX IF NOT EXISTS idx_artilharia_gols ON public.artilharia_agregada(gols DESC);

-- Unique constraint para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_artilharia_unique 
ON public.artilharia_agregada(COALESCE(competicao_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(temporada, 'ALL'), jogador_slug, COALESCE(time_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Enable RLS
ALTER TABLE public.artilharia_agregada ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Artilharia é pública para leitura"
ON public.artilharia_agregada
FOR SELECT
USING (true);

-- ============================================================
-- PARTE 4: Criar tabela de configuração regional
-- ============================================================

CREATE TABLE IF NOT EXISTS public.regional_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor text,
  descricao text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regional_config ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Regional config é pública para leitura"
ON public.regional_config
FOR SELECT
USING (true);

-- Inserir configuração padrão para Brasil
INSERT INTO public.regional_config (chave, valor, descricao)
VALUES ('region_country_default', 'Brazil', 'País padrão para ordenação de categorias')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- PARTE 5: Função para gerar slug de jogador
-- ============================================================

CREATE OR REPLACE FUNCTION public.slugify_player_name(name text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(name, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'),
        '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-|-$)', '', 'g')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;