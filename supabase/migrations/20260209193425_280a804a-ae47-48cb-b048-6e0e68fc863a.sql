
-- Table to track CSV import batches
CREATE TABLE public.csv_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reverted')),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('matches', 'teams', 'scorers', 'season_scorers')),
  liga_id UUID REFERENCES public.ligas(id),
  temporada INTEGER,
  provider TEXT,
  mapping_template_id UUID,
  total_rows INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  error_report JSONB DEFAULT '[]'::jsonb,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_at TIMESTAMPTZ
);

-- Table to store reusable column mapping templates
CREATE TABLE public.csv_mapping_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('matches', 'teams', 'scorers', 'season_scorers')),
  delimiter TEXT NOT NULL DEFAULT ',',
  column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint on template name+provider+file_type
CREATE UNIQUE INDEX idx_csv_mapping_templates_unique ON public.csv_mapping_templates(provider, file_type, name);

-- Enable RLS
ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_mapping_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin only (via user_roles)
CREATE POLICY "Admins can manage csv_imports" ON public.csv_imports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage csv_mapping_templates" ON public.csv_mapping_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Add batch_id to partidas for tracking CSV imports (for revert)
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.csv_imports(id);

-- Add batch_id to times for tracking CSV imports
ALTER TABLE public.times ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.csv_imports(id);

-- Add batch_id to gols_partida for tracking CSV imports
ALTER TABLE public.gols_partida ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.csv_imports(id);

-- Trigger for updated_at
CREATE TRIGGER update_csv_imports_updated_at
  BEFORE UPDATE ON public.csv_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_csv_mapping_templates_updated_at
  BEFORE UPDATE ON public.csv_mapping_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
