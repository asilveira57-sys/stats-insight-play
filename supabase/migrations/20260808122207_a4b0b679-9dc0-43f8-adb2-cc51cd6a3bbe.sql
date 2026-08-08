CREATE TABLE public.content_automation_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id uuid NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  pre_game_enabled boolean NOT NULL DEFAULT true,
  post_game_enabled boolean NOT NULL DEFAULT true,
  days_ahead integer NOT NULL DEFAULT 3,
  max_per_run integer NOT NULL DEFAULT 3,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liga_id)
);

GRANT SELECT ON public.content_automation_leagues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_automation_leagues TO authenticated;
GRANT ALL ON public.content_automation_leagues TO service_role;

ALTER TABLE public.content_automation_leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_automation_leagues_public_read"
ON public.content_automation_leagues FOR SELECT
USING (true);

CREATE POLICY "content_automation_leagues_admin_write"
ON public.content_automation_leagues FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER content_automation_leagues_updated_at
BEFORE UPDATE ON public.content_automation_leagues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.content_automation_leagues (liga_id, enabled, pre_game_enabled, post_game_enabled, days_ahead, max_per_run, notes)
SELECT id, true, true, true, 3, 3, 'Campeonato principal nacional - foco atual'
FROM public.ligas WHERE slug = 'campeonato-brasileiro-serie-a'
ON CONFLICT (liga_id) DO NOTHING;