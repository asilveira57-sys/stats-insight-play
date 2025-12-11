-- Add api_source column to ligas table to support multiple API sources
ALTER TABLE public.ligas ADD COLUMN IF NOT EXISTS api_source TEXT DEFAULT 'football-data';

-- Update existing leagues to use football-data
UPDATE public.ligas SET api_source = 'football-data' WHERE api_source IS NULL;

-- Create unique constraint on codigo_api for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_ligas_codigo_api ON public.ligas (codigo_api) WHERE codigo_api IS NOT NULL;