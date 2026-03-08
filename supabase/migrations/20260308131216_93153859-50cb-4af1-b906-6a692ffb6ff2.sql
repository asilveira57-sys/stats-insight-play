
create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null unique,
  status text not null default 'idle',
  progress jsonb not null default '{}',
  started_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.background_jobs enable row level security;

create policy "Admins can manage background jobs"
  on public.background_jobs for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

insert into public.background_jobs (job_type) values
  ('predictions'),
  ('retro_predictions'),
  ('analyses'),
  ('validations'),
  ('image_fix');

alter publication supabase_realtime add table public.background_jobs;
