-- LGPD Configuration table (admin-managed)
CREATE TABLE public.lgpd_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Banner settings
  banner_enabled BOOLEAN DEFAULT true,
  banner_title TEXT DEFAULT 'Sua privacidade é importante',
  banner_text TEXT DEFAULT 'Utilizamos cookies para melhorar a experiência, analisar tráfego e personalizar conteúdo. Você pode aceitar todos, recusar cookies não essenciais ou personalizar suas preferências.',
  -- Category descriptions
  category_essential_description TEXT DEFAULT 'Cookies necessários para o funcionamento básico do site, autenticação e segurança. Sempre ativos.',
  category_analytics_description TEXT DEFAULT 'Cookies que nos ajudam a entender como você usa o site, permitindo melhorias contínuas na experiência.',
  category_marketing_description TEXT DEFAULT 'Cookies utilizados para exibir anúncios relevantes e medir a eficácia de campanhas.',
  -- Policy version (for audit)
  policy_version TEXT DEFAULT '1.0',
  policy_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.lgpd_config ENABLE ROW LEVEL SECURITY;

-- Public can read config (needed for banner)
CREATE POLICY "Anyone can read lgpd_config"
ON public.lgpd_config
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can update lgpd_config"
ON public.lgpd_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert lgpd_config"
ON public.lgpd_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Consent records table (audit log)
CREATE TABLE public.lgpd_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Anonymous identifier (hash of fingerprint, not personal data)
  visitor_hash TEXT NOT NULL,
  -- Consent details
  essential_accepted BOOLEAN DEFAULT true,
  analytics_accepted BOOLEAN DEFAULT false,
  marketing_accepted BOOLEAN DEFAULT false,
  -- Metadata
  policy_version TEXT NOT NULL,
  ip_anonymized TEXT,
  user_agent_hash TEXT,
  action TEXT NOT NULL, -- 'accept_all', 'reject_non_essential', 'custom', 'update'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lgpd_consent_records ENABLE ROW LEVEL SECURITY;

-- Only admins can read consent records
CREATE POLICY "Admins can read consent records"
ON public.lgpd_consent_records
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert their own consent (anonymous)
CREATE POLICY "Anyone can insert consent records"
ON public.lgpd_consent_records
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- LGPD config change log
CREATE TABLE public.lgpd_config_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lgpd_config_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write logs
CREATE POLICY "Admins can read lgpd_config_logs"
ON public.lgpd_config_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert lgpd_config_logs"
ON public.lgpd_config_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.lgpd_config (id) VALUES (gen_random_uuid());