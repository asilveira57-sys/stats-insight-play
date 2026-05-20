create or replace function public.gerar_palpites_sistema_lote(
  p_status text default 'finished',
  p_limit integer default 500,
  p_process_results boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_generated integer := 0;
  v_failed integer := 0;
  v_remaining integer := 0;
  v_errors text[] := array[]::text[];
  v_started_at timestamptz := clock_timestamp();
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 2000));
begin
  for v_match in
    select pa.id
    from public.partidas pa
    where pa.status::text = p_status
      and (
        (p_status = 'finished' and pa.gols_casa is not null and pa.gols_fora is not null)
        or (p_status = 'scheduled' and pa.data >= current_date)
      )
      and not exists (
        select 1 from public.palpites pp where pp.partida_id = pa.id
      )
    order by pa.data asc, pa.id asc
    for update of pa skip locked
    limit v_limit
  loop
    begin
      perform public.gerar_palpite_sistema(v_match.id);
      v_generated := v_generated + 1;

      if p_process_results then
        begin
          perform public.processar_resultado_partida(v_match.id);
        exception when others then
          v_errors := array_append(v_errors, 'Resultado ' || v_match.id::text || ': ' || sqlerrm);
        end;
      end if;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := array_append(v_errors, 'Palpite ' || v_match.id::text || ': ' || sqlerrm);
    end;
  end loop;

  select count(*) into v_remaining
  from public.partidas pa
  where pa.status::text = p_status
    and (
      (p_status = 'finished' and pa.gols_casa is not null and pa.gols_fora is not null)
      or (p_status = 'scheduled' and pa.data >= current_date)
    )
    and not exists (
      select 1 from public.palpites pp where pp.partida_id = pa.id
    );

  return jsonb_build_object(
    'success', true,
    'status', p_status,
    'generated', v_generated,
    'failed', v_failed,
    'remaining', v_remaining,
    'processed', v_generated + v_failed,
    'duration_ms', extract(milliseconds from (clock_timestamp() - v_started_at))::integer,
    'errors', case when array_length(v_errors, 1) is null then null else to_jsonb(v_errors[1:10]) end,
    'timestamp', now()
  );
end;
$$;