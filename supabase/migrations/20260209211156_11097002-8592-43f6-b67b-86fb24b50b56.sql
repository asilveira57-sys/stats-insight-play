
ALTER TABLE public.csv_imports ADD COLUMN IF NOT EXISTS progress_detail JSONB DEFAULT '{}';

-- Mark stuck batches as failed
UPDATE public.csv_imports SET status = 'failed', error_report = '["Batch travado - migrado para backend"]'::jsonb WHERE status = 'processing';
