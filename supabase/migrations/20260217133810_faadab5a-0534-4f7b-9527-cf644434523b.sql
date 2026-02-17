
-- Create team_merge_logs table
CREATE TABLE public.team_merge_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_target_id uuid NOT NULL,
  team_source_id uuid NOT NULL,
  source_canonical_name text NOT NULL,
  source_canonical_slug text,
  merged_by uuid,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_merge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merge logs" ON public.team_merge_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merge logs viewable by admins" ON public.team_merge_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';
