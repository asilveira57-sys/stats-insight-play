
-- =============================================
-- MÓDULO DE PERFIL DE USUÁRIO COMPLETO
-- =============================================

-- 1. Atualizar tabela profiles com status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending'));

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 2. Criar tabela de perfil público (apelido, avatar)
CREATE TABLE IF NOT EXISTS public.user_public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE,
  nickname_normalized TEXT,
  avatar_url TEXT,
  avatar_status TEXT DEFAULT 'default' CHECK (avatar_status IN ('default', 'custom', 'pending_review')),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca de nickname
CREATE INDEX IF NOT EXISTS idx_public_profiles_nickname ON public.user_public_profiles(nickname_normalized);

-- Tabela de palavras proibidas para nicknames
CREATE TABLE IF NOT EXISTS public.nickname_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  word_normalized TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Função para normalizar nickname
CREATE OR REPLACE FUNCTION public.normalize_nickname(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(public.unaccent(coalesce(input_text, '')), '[^a-z0-9_]', '', 'g')));
END;
$$;

-- Função para validar nickname
CREATE OR REPLACE FUNCTION public.validate_nickname(p_nickname TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_normalized TEXT;
  v_blocked_word TEXT;
BEGIN
  -- Normalizar nickname
  v_normalized := public.normalize_nickname(p_nickname);
  
  -- Validar comprimento mínimo
  IF length(v_normalized) < 3 THEN
    RETURN QUERY SELECT false, 'Nickname deve ter pelo menos 3 caracteres';
    RETURN;
  END IF;
  
  -- Validar comprimento máximo
  IF length(v_normalized) > 20 THEN
    RETURN QUERY SELECT false, 'Nickname deve ter no máximo 20 caracteres';
    RETURN;
  END IF;
  
  -- Verificar duplicidade
  IF EXISTS (
    SELECT 1 FROM public.user_public_profiles 
    WHERE nickname_normalized = v_normalized 
    AND (p_user_id IS NULL OR user_id != p_user_id)
  ) THEN
    RETURN QUERY SELECT false, 'Este nickname já está em uso';
    RETURN;
  END IF;
  
  -- Verificar palavras proibidas
  SELECT word INTO v_blocked_word
  FROM public.nickname_blocklist
  WHERE v_normalized LIKE '%' || word_normalized || '%'
  LIMIT 1;
  
  IF v_blocked_word IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Nickname contém palavra não permitida';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- Trigger para normalizar nickname antes de inserir/atualizar
CREATE OR REPLACE FUNCTION public.set_nickname_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nickname IS NOT NULL THEN
    NEW.nickname_normalized := public.normalize_nickname(NEW.nickname);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_nickname_normalized ON public.user_public_profiles;
CREATE TRIGGER tr_set_nickname_normalized
BEFORE INSERT OR UPDATE ON public.user_public_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_nickname_normalized();

-- 3. Criar tabela de dados fiscais (PF)
CREATE TABLE IF NOT EXISTS public.user_fiscal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT,
  cpf_validated BOOLEAN DEFAULT false,
  nome_fiscal TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_fiscal_cpf ON public.user_fiscal_data(cpf);

-- 4. Atualizar tabela de assinaturas com campos adicionais
ALTER TABLE public.assinaturas
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'payment' CHECK (origem IN ('payment', 'coupon', 'beta', 'admin', 'promotion'));

ALTER TABLE public.assinaturas
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.assinaturas
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.assinaturas
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 5. Criar tabela de estatísticas de gamificação
CREATE TABLE IF NOT EXISTS public.user_gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_palpites INTEGER DEFAULT 0,
  total_acertos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  acertos_placar_exato INTEGER DEFAULT 0,
  pontuacao_total INTEGER DEFAULT 0,
  sequencia_atual INTEGER DEFAULT 0,
  maior_sequencia INTEGER DEFAULT 0,
  last_palpite_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gamification_pontuacao ON public.user_gamification_stats(pontuacao_total DESC);

-- 6. Criar tabela de logs de atividade
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_anonymized TEXT,
  user_agent_hash TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.user_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_category ON public.user_activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.user_activity_logs(created_at DESC);

-- Função para registrar atividade
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_action_category TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_anonymized TEXT DEFAULT NULL,
  p_user_agent_hash TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id, action_type, action_category, details, 
    ip_anonymized, user_agent_hash, session_id
  ) VALUES (
    p_user_id, p_action_type, p_action_category, p_details,
    p_ip_anonymized, p_user_agent_hash, p_session_id
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- user_public_profiles
ALTER TABLE public.user_public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.user_public_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own public profile"
ON public.user_public_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public profile"
ON public.user_public_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all public profiles"
ON public.user_public_profiles FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- nickname_blocklist
ALTER TABLE public.nickname_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blocklist viewable by admins"
ON public.nickname_blocklist FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage blocklist"
ON public.nickname_blocklist FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- user_fiscal_data
ALTER TABLE public.user_fiscal_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fiscal data"
ON public.user_fiscal_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fiscal data"
ON public.user_fiscal_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fiscal data"
ON public.user_fiscal_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fiscal data"
ON public.user_fiscal_data FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all fiscal data"
ON public.user_fiscal_data FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- user_gamification_stats
ALTER TABLE public.user_gamification_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gamification stats"
ON public.user_gamification_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public gamification stats"
ON public.user_gamification_stats FOR SELECT
USING (true);

CREATE POLICY "Admins can manage gamification stats"
ON public.user_gamification_stats FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
ON public.user_activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all activity logs"
ON public.user_activity_logs FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGER para criar registros automáticos
-- =============================================

CREATE OR REPLACE FUNCTION public.create_user_profile_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil público
  INSERT INTO public.user_public_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar dados fiscais vazios
  INSERT INTO public.user_fiscal_data (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar estatísticas de gamificação
  INSERT INTO public.user_gamification_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger na tabela profiles (que já é criada pelo handle_new_user)
DROP TRIGGER IF EXISTS tr_create_user_profile_records ON public.profiles;
CREATE TRIGGER tr_create_user_profile_records
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile_records();

-- Inserir algumas palavras proibidas básicas
INSERT INTO public.nickname_blocklist (word, word_normalized, reason) VALUES
  ('admin', 'admin', 'Reservado'),
  ('moderador', 'moderador', 'Reservado'),
  ('suporte', 'suporte', 'Reservado'),
  ('statball', 'statball', 'Marca registrada'),
  ('sistema', 'sistema', 'Reservado')
ON CONFLICT (word) DO NOTHING;
