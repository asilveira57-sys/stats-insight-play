
-- 1. Add dashboard columns to user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS focus_region text NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS favorite_league_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS favorite_team_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';

-- 2. Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL DEFAULT 'dashboard_home',
  action text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies for system_logs
CREATE POLICY "Users can insert their own logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all logs"
  ON public.system_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own logs"
  ON public.system_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all logs"
  ON public.system_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON public.system_logs(module);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
