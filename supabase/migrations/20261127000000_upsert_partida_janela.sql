-- Igual a upsert_partida_temporada, mas procura o confronto dentro de uma janela de datas
-- (temporada europeia que cruza o ano, ou poucos dias em copas onde o par pode se repetir).
-- Usada pela função sync-europa-fd. Já aplicada em produção em 26/11/2026.
CREATE OR REPLACE FUNCTION public.upsert_partida_janela(p_liga_id uuid, p_casa text, p_fora text, p_data date, p_hora time without time zone, p_status text, p_gols_casa integer, p_gols_fora integer, p_rodada integer, p_ini date, p_fim date)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare h uuid; a uuid; m uuid;
begin
  h := public.find_team_by_name(p_casa);
  a := public.find_team_by_name(p_fora);
  if h is null or a is null then
    return 'time_nao_encontrado:' || coalesce(case when h is null then p_casa end, '') || '|' || coalesce(case when a is null then p_fora end, '');
  end if;
  select id into m from public.partidas
   where liga_id = p_liga_id and time_casa_id = h and time_fora_id = a and data between p_ini and p_fim
   order by abs(data - p_data) limit 1;
  if m is null then
    insert into public.partidas (liga_id, time_casa_id, time_fora_id, data, hora, status, gols_casa, gols_fora, rodada, api_source)
    values (p_liga_id, h, a, p_data, p_hora, p_status::partida_status, p_gols_casa, p_gols_fora, p_rodada, 'football-data')
    returning id into m;
    return 'criada';
  end if;
  update public.partidas set
    data = p_data, hora = coalesce(p_hora, hora), status = p_status::partida_status,
    gols_casa = coalesce(p_gols_casa, gols_casa), gols_fora = coalesce(p_gols_fora, gols_fora),
    rodada = coalesce(p_rodada, rodada), updated_at = now()
  where id = m and (data, hora, status::text, gols_casa, gols_fora) is distinct from (p_data, coalesce(p_hora, hora), p_status, coalesce(p_gols_casa, gols_casa), coalesce(p_gols_fora, gols_fora));
  return case when found then 'atualizada' else 'sem_mudanca' end;
end $function$;
REVOKE ALL ON FUNCTION public.upsert_partida_janela(uuid,text,text,date,time,text,integer,integer,integer,date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_partida_janela(uuid,text,text,date,time,text,integer,integer,integer,date,date) TO service_role;
