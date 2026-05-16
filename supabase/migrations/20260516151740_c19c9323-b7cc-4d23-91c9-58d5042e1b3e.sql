-- Logs de acesso/geração dos feeds RSS
CREATE TABLE IF NOT EXISTS public.rss_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('generated','error','accessed','regenerated','skipped')),
  item_count INTEGER,
  status INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  origin TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rss_logs_feed_created ON public.rss_logs (feed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_logs_event_created ON public.rss_logs (event, created_at DESC);

ALTER TABLE public.rss_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view rss logs" ON public.rss_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Estatísticas agregadas por feed
CREATE TABLE IF NOT EXISTS public.rss_feed_stats (
  feed TEXT PRIMARY KEY,
  last_generated_at TIMESTAMPTZ,
  last_item_count INTEGER,
  last_status INTEGER,
  last_error TEXT,
  total_requests BIGINT NOT NULL DEFAULT 0,
  total_errors BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rss_feed_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view rss stats" ON public.rss_feed_stats FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: agrega rss_logs -> rss_feed_stats
CREATE OR REPLACE FUNCTION public.rss_update_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.rss_feed_stats (feed, last_generated_at, last_item_count, last_status, last_error, total_requests, total_errors, updated_at)
  VALUES (
    NEW.feed,
    CASE WHEN NEW.event IN ('generated','regenerated') THEN NEW.created_at ELSE NULL END,
    NEW.item_count,
    NEW.status,
    NEW.error_message,
    1,
    CASE WHEN NEW.event = 'error' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (feed) DO UPDATE SET
    last_generated_at = COALESCE(
      CASE WHEN NEW.event IN ('generated','regenerated') THEN NEW.created_at ELSE NULL END,
      rss_feed_stats.last_generated_at
    ),
    last_item_count   = COALESCE(NEW.item_count, rss_feed_stats.last_item_count),
    last_status       = COALESCE(NEW.status, rss_feed_stats.last_status),
    last_error        = CASE WHEN NEW.event = 'error' THEN NEW.error_message ELSE rss_feed_stats.last_error END,
    total_requests    = rss_feed_stats.total_requests + 1,
    total_errors      = rss_feed_stats.total_errors + CASE WHEN NEW.event = 'error' THEN 1 ELSE 0 END,
    updated_at        = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rss_update_stats ON public.rss_logs;
CREATE TRIGGER trg_rss_update_stats AFTER INSERT ON public.rss_logs
FOR EACH ROW EXECUTE FUNCTION public.rss_update_stats();