
CREATE TABLE public.dismissed_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_id uuid NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  team_b_id uuid NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  dismissed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_a_id, team_b_id)
);

ALTER TABLE public.dismissed_duplicates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dismissed_duplicates"
ON public.dismissed_duplicates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
