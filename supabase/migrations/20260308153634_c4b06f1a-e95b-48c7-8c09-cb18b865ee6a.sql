CREATE OR REPLACE FUNCTION public.count_duplicate_matches()
RETURNS TABLE(dup_groups bigint, dup_records bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*)::bigint as dup_groups,
    COALESCE(SUM(cnt - 1), 0)::bigint as dup_records
  FROM (
    SELECT time_casa_id, time_fora_id, data, COUNT(*) as cnt
    FROM partidas
    GROUP BY time_casa_id, time_fora_id, data
    HAVING COUNT(*) > 1
  ) sub;
$$;