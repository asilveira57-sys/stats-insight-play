
-- =============================================
-- CARTOLA FC INTEGRATION TABLES
-- =============================================

-- 1. cartola_clubes
CREATE TABLE public.cartola_clubes (
  cartola_clube_id integer PRIMARY KEY,
  nome text NOT NULL,
  abreviacao text,
  slug text,
  escudo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cartola_clubes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cartola clubes viewable by everyone" ON public.cartola_clubes FOR SELECT USING (true);
CREATE POLICY "Admins can manage cartola_clubes" ON public.cartola_clubes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. cartola_atletas
CREATE TABLE public.cartola_atletas (
  cartola_atleta_id integer PRIMARY KEY,
  apelido text NOT NULL,
  nome text,
  posicao_id integer,
  clube_id integer REFERENCES public.cartola_clubes(cartola_clube_id),
  status_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cartola_atletas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cartola atletas viewable by everyone" ON public.cartola_atletas FOR SELECT USING (true);
CREATE POLICY "Admins can manage cartola_atletas" ON public.cartola_atletas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. cartola_temporadas
CREATE TABLE public.cartola_temporadas (
  season integer PRIMARY KEY,
  fonte_historico text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cartola_temporadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cartola temporadas viewable by everyone" ON public.cartola_temporadas FOR SELECT USING (true);
CREATE POLICY "Admins can manage cartola_temporadas" ON public.cartola_temporadas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. cartola_partidas
CREATE TABLE public.cartola_partidas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cartola_partida_id integer,
  season integer NOT NULL REFERENCES public.cartola_temporadas(season),
  rodada integer NOT NULL,
  casa_clube_id integer REFERENCES public.cartola_clubes(cartola_clube_id),
  visitante_clube_id integer REFERENCES public.cartola_clubes(cartola_clube_id),
  placar_casa integer,
  placar_visitante integer,
  status_partida text,
  data_partida date,
  partida_statball_id uuid REFERENCES public.partidas(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season, rodada, casa_clube_id, visitante_clube_id)
);

ALTER TABLE public.cartola_partidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cartola partidas viewable by everyone" ON public.cartola_partidas FOR SELECT USING (true);
CREATE POLICY "Admins can manage cartola_partidas" ON public.cartola_partidas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for quick lookups
CREATE INDEX idx_cartola_partidas_season_rodada ON public.cartola_partidas(season, rodada);

-- 5. cartola_scouts_rodada (granular per athlete per round)
CREATE TABLE public.cartola_scouts_rodada (
  season integer NOT NULL,
  rodada integer NOT NULL,
  cartola_atleta_id integer NOT NULL REFERENCES public.cartola_atletas(cartola_atleta_id),
  clube_id integer REFERENCES public.cartola_clubes(cartola_clube_id),
  participou boolean DEFAULT false,
  pontos numeric,
  preco numeric,
  variacao_preco numeric,
  campos_scout jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season, rodada, cartola_atleta_id)
);

ALTER TABLE public.cartola_scouts_rodada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cartola scouts viewable by everyone" ON public.cartola_scouts_rodada FOR SELECT USING (true);
CREATE POLICY "Admins can manage cartola_scouts" ON public.cartola_scouts_rodada FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for athlete lookups
CREATE INDEX idx_cartola_scouts_atleta ON public.cartola_scouts_rodada(cartola_atleta_id);

-- Trigger for updated_at on all cartola tables
CREATE TRIGGER update_cartola_clubes_updated_at BEFORE UPDATE ON public.cartola_clubes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cartola_atletas_updated_at BEFORE UPDATE ON public.cartola_atletas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cartola_temporadas_updated_at BEFORE UPDATE ON public.cartola_temporadas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cartola_partidas_updated_at BEFORE UPDATE ON public.cartola_partidas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
