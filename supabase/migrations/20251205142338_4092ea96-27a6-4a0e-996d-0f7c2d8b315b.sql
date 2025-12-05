
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.plano_tipo AS ENUM ('free', 'premium');
CREATE TYPE public.assinatura_status AS ENUM ('active', 'cancelled', 'expired');
CREATE TYPE public.partida_status AS ENUM ('scheduled', 'live', 'finished', 'postponed', 'cancelled');

-- ============================================
-- USER ROLES TABLE (must be created first for has_role function)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTION (created before other tables that use it)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles (using the function now that it exists)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA TIMES (Teams)
-- ============================================
CREATE TABLE public.times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  escudo_url TEXT,
  pais TEXT,
  api_id INTEGER UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Times are viewable by everyone" ON public.times FOR SELECT USING (true);
CREATE POLICY "Admins can insert times" ON public.times FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update times" ON public.times FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete times" ON public.times FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA LIGAS (Leagues)
-- ============================================
CREATE TABLE public.ligas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_api TEXT,
  pais TEXT,
  logo_url TEXT,
  ativa BOOLEAN DEFAULT true,
  api_id INTEGER UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ligas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ligas are viewable by everyone" ON public.ligas FOR SELECT USING (true);
CREATE POLICY "Admins can insert ligas" ON public.ligas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ligas" ON public.ligas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ligas" ON public.ligas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA PARTIDAS (Matches)
-- ============================================
CREATE TABLE public.partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id UUID REFERENCES public.ligas(id) ON DELETE CASCADE,
  time_casa_id UUID REFERENCES public.times(id),
  time_fora_id UUID REFERENCES public.times(id),
  data DATE NOT NULL,
  hora TIME,
  gols_casa INTEGER,
  gols_fora INTEGER,
  status partida_status DEFAULT 'scheduled',
  rodada INTEGER,
  api_id INTEGER UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partidas are viewable by everyone" ON public.partidas FOR SELECT USING (true);
CREATE POLICY "Admins can insert partidas" ON public.partidas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update partidas" ON public.partidas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete partidas" ON public.partidas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA ESTATISTICAS (Statistics)
-- ============================================
CREATE TABLE public.estatisticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE NOT NULL,
  time_id UUID REFERENCES public.times(id),
  posse DECIMAL(5,2),
  finalizacoes INTEGER DEFAULT 0,
  finalizacoes_no_alvo INTEGER DEFAULT 0,
  escanteios INTEGER DEFAULT 0,
  faltas INTEGER DEFAULT 0,
  impedimentos INTEGER DEFAULT 0,
  cartoes_amarelos INTEGER DEFAULT 0,
  cartoes_vermelhos INTEGER DEFAULT 0,
  xg DECIMAL(4,2),
  passes INTEGER DEFAULT 0,
  passes_certos INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.estatisticas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estatisticas are viewable by everyone" ON public.estatisticas FOR SELECT USING (true);
CREATE POLICY "Admins can insert estatisticas" ON public.estatisticas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update estatisticas" ON public.estatisticas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete estatisticas" ON public.estatisticas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA PALPITES (Predictions)
-- ============================================
CREATE TABLE public.palpites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE NOT NULL UNIQUE,
  prob_casa DECIMAL(5,2),
  prob_empate DECIMAL(5,2),
  prob_fora DECIMAL(5,2),
  placar_casa_estimado INTEGER,
  placar_fora_estimado INTEGER,
  forca_time_casa DECIMAL(5,2),
  forca_time_fora DECIMAL(5,2),
  confianca DECIMAL(5,2),
  analise TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.palpites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Palpites are viewable by everyone" ON public.palpites FOR SELECT USING (true);
CREATE POLICY "Admins can insert palpites" ON public.palpites FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update palpites" ON public.palpites FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete palpites" ON public.palpites FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA PROFILES (User Profiles)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  plano plano_tipo DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABELA ASSINATURAS (Subscriptions)
-- ============================================
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo_plano plano_tipo DEFAULT 'free',
  status assinatura_status DEFAULT 'active',
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.assinaturas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.assinaturas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage subscriptions" ON public.assinaturas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA NOTICIAS (News)
-- ============================================
CREATE TABLE public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  resumo TEXT,
  imagem_url TEXT,
  autor_id UUID REFERENCES auth.users(id),
  publicada BOOLEAN DEFAULT false,
  data_publicacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published news are viewable by everyone" ON public.noticias FOR SELECT USING (publicada = true);
CREATE POLICY "Admins can view all news" ON public.noticias FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert news" ON public.noticias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update news" ON public.noticias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete news" ON public.noticias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TABELA CONFIGURACOES (System Settings)
-- ============================================
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configs are viewable by everyone" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "Admins can manage configs" ON public.configuracoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FUNCTION: Create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.assinaturas (user_id, tipo_plano, status) VALUES (NEW.id, 'free', 'active');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_times_updated_at BEFORE UPDATE ON public.times FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ligas_updated_at BEFORE UPDATE ON public.ligas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partidas_updated_at BEFORE UPDATE ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estatisticas_updated_at BEFORE UPDATE ON public.estatisticas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_palpites_updated_at BEFORE UPDATE ON public.palpites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assinaturas_updated_at BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_noticias_updated_at BEFORE UPDATE ON public.noticias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_partidas_liga ON public.partidas(liga_id);
CREATE INDEX idx_partidas_data ON public.partidas(data);
CREATE INDEX idx_partidas_status ON public.partidas(status);
CREATE INDEX idx_estatisticas_partida ON public.estatisticas(partida_id);
CREATE INDEX idx_palpites_partida ON public.palpites(partida_id);
CREATE INDEX idx_noticias_publicada ON public.noticias(publicada, data_publicacao);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_assinaturas_user ON public.assinaturas(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============================================
-- DEFAULT CONFIGURATIONS
-- ============================================
INSERT INTO public.configuracoes (chave, valor, descricao) VALUES
  ('video_vitrine_url', '', 'URL do vídeo da vitrine na home'),
  ('adsense_code', '', 'Código do Google AdSense'),
  ('ga4_code', '', 'Código do Google Analytics 4'),
  ('meta_pixel', '', 'Código do Meta Pixel'),
  ('checkout_premium_url', '', 'URL do checkout para plano premium'),
  ('site_titulo', 'FutStats Pro', 'Título do site'),
  ('site_descricao', 'Portal de estatísticas e palpites de futebol', 'Descrição do site');
