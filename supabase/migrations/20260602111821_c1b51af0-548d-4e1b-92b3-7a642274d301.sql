-- Resetar jobs travados em 'running' há mais de 1 hora (worker provavelmente morreu sem finalizar)
UPDATE public.api_football_import_jobs
SET status = 'queued', started_at = NULL, error = NULL
WHERE status = 'running' AND updated_at < now() - interval '1 hour';

-- Reenfileirar jobs que falharam para nova tentativa
UPDATE public.api_football_import_jobs
SET status = 'queued', started_at = NULL, finished_at = NULL, error = NULL
WHERE status = 'failed';