-- Add unique constraint on api_id for times table
ALTER TABLE public.times 
ADD CONSTRAINT times_api_id_unique UNIQUE (api_id);

-- Add unique constraint on api_id for partidas table
ALTER TABLE public.partidas 
ADD CONSTRAINT partidas_api_id_unique UNIQUE (api_id);

-- Add unique constraint on api_id for ligas table
ALTER TABLE public.ligas 
ADD CONSTRAINT ligas_api_id_unique UNIQUE (api_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_times_api_id ON public.times(api_id);
CREATE INDEX IF NOT EXISTS idx_partidas_api_id ON public.partidas(api_id);
CREATE INDEX IF NOT EXISTS idx_ligas_api_id ON public.ligas(api_id);
CREATE INDEX IF NOT EXISTS idx_partidas_data ON public.partidas(data);
CREATE INDEX IF NOT EXISTS idx_partidas_status ON public.partidas(status);