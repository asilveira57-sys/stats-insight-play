-- Adicionar flag de sincronização na tabela partidas
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS detalhes_sincronizados boolean DEFAULT false;

-- Tabela de gols da partida
CREATE TABLE public.gols_partida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  time_id UUID REFERENCES public.times(id),
  minuto INTEGER NOT NULL,
  acrescimo INTEGER,
  tipo TEXT DEFAULT 'REGULAR', -- REGULAR, PENALTY, OWN_GOAL
  jogador_nome TEXT NOT NULL,
  jogador_api_id INTEGER,
  assistente_nome TEXT,
  assistente_api_id INTEGER,
  placar_casa INTEGER,
  placar_fora INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de escalações
CREATE TABLE public.escalacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  time_id UUID REFERENCES public.times(id),
  jogador_nome TEXT NOT NULL,
  jogador_api_id INTEGER,
  posicao TEXT,
  numero_camisa INTEGER,
  titular BOOLEAN DEFAULT true,
  formacao TEXT, -- 4-3-3, 3-4-1-2, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de cartões
CREATE TABLE public.cartoes_partida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  time_id UUID REFERENCES public.times(id),
  minuto INTEGER NOT NULL,
  jogador_nome TEXT NOT NULL,
  jogador_api_id INTEGER,
  tipo TEXT NOT NULL, -- YELLOW_CARD, RED_CARD, YELLOW_RED_CARD
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de técnicos
CREATE TABLE public.tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_id INTEGER UNIQUE,
  nome TEXT NOT NULL,
  nacionalidade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de relação técnico x partida
CREATE TABLE public.tecnico_partida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  time_id UUID REFERENCES public.times(id),
  tecnico_id UUID REFERENCES public.tecnicos(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(partida_id, time_id)
);

-- Índices para performance
CREATE INDEX idx_gols_partida_partida_id ON public.gols_partida(partida_id);
CREATE INDEX idx_gols_partida_time_id ON public.gols_partida(time_id);
CREATE INDEX idx_escalacoes_partida_id ON public.escalacoes(partida_id);
CREATE INDEX idx_escalacoes_time_id ON public.escalacoes(time_id);
CREATE INDEX idx_cartoes_partida_partida_id ON public.cartoes_partida(partida_id);
CREATE INDEX idx_tecnico_partida_partida_id ON public.tecnico_partida(partida_id);
CREATE INDEX idx_partidas_detalhes_sync ON public.partidas(detalhes_sincronizados) WHERE detalhes_sincronizados = false;

-- Habilitar RLS
ALTER TABLE public.gols_partida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes_partida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnico_partida ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública
CREATE POLICY "Gols are viewable by everyone" ON public.gols_partida FOR SELECT USING (true);
CREATE POLICY "Escalacoes are viewable by everyone" ON public.escalacoes FOR SELECT USING (true);
CREATE POLICY "Cartoes are viewable by everyone" ON public.cartoes_partida FOR SELECT USING (true);
CREATE POLICY "Tecnicos are viewable by everyone" ON public.tecnicos FOR SELECT USING (true);
CREATE POLICY "Tecnico partida are viewable by everyone" ON public.tecnico_partida FOR SELECT USING (true);

-- Políticas de admin para inserção/atualização/exclusão
CREATE POLICY "Admins can manage gols" ON public.gols_partida FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage escalacoes" ON public.escalacoes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage cartoes" ON public.cartoes_partida FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tecnicos" ON public.tecnicos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tecnico_partida" ON public.tecnico_partida FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_gols_partida_updated_at BEFORE UPDATE ON public.gols_partida FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escalacoes_updated_at BEFORE UPDATE ON public.escalacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cartoes_partida_updated_at BEFORE UPDATE ON public.cartoes_partida FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tecnicos_updated_at BEFORE UPDATE ON public.tecnicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();