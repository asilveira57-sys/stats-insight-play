
-- ETAPA 1.1: Criar tabela de auditoria slug_audit_logs
CREATE TABLE IF NOT EXISTS public.slug_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('team', 'match')),
  entity_id uuid NOT NULL,
  field text NOT NULL DEFAULT 'slug',
  old_value text,
  new_value text,
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para slug_audit_logs
CREATE INDEX idx_slug_audit_entity ON public.slug_audit_logs (entity_type, entity_id);
CREATE INDEX idx_slug_audit_changed_at ON public.slug_audit_logs (changed_at DESC);

-- RLS para slug_audit_logs
ALTER TABLE public.slug_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage slug audit logs"
ON public.slug_audit_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Slug audit logs viewable by admins"
ON public.slug_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ETAPA 1.2: Ajustar tabela times (adicionar colunas se não existirem)
ALTER TABLE public.times 
ADD COLUMN IF NOT EXISTS slug_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.times 
ADD COLUMN IF NOT EXISTS name_normalized text;

-- Índice não-único para slug (permite duplicatas temporariamente)
CREATE INDEX IF NOT EXISTS idx_times_slug ON public.times (slug);

-- Índice para name_normalized
CREATE INDEX IF NOT EXISTS idx_times_name_normalized ON public.times (name_normalized);

-- ETAPA 1.3: Ajustar tabela partidas
ALTER TABLE public.partidas 
ADD COLUMN IF NOT EXISTS slug_locked boolean NOT NULL DEFAULT false;

-- Índice não-único para slug em partidas
CREATE INDEX IF NOT EXISTS idx_partidas_slug ON public.partidas (slug);

-- Função para normalizar nomes (remover acentos, lowercase, etc.)
CREATE OR REPLACE FUNCTION public.normalize_name_for_slug(input_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  IF input_name IS NULL OR input_name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Normalizar: remover acentos, lowercase, substituir espaços por hífens
  result := lower(unaccent(trim(input_name)));
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '[^a-z0-9-]', '', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := regexp_replace(result, '^-|-$', '', 'g');
  
  RETURN result;
END;
$$;

-- Trigger para atualizar name_normalized automaticamente em times
CREATE OR REPLACE FUNCTION public.update_times_name_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name_normalized := public.normalize_name_for_slug(NEW.nome);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_times_name_normalized ON public.times;
CREATE TRIGGER tr_times_name_normalized
BEFORE INSERT OR UPDATE OF nome ON public.times
FOR EACH ROW
EXECUTE FUNCTION public.update_times_name_normalized();

-- Atualizar name_normalized para registros existentes
UPDATE public.times 
SET name_normalized = public.normalize_name_for_slug(nome)
WHERE name_normalized IS NULL OR name_normalized = '';
