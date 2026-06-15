## Causa-raiz (medida em produção)

1. **Gargalo principal — `get_team_stats_bulk` leva ~27s** para os ~878 times dos próximos 7 dias. O `EXPLAIN ANALYZE` mostra 138 mil buffers lidos e `Execution Time: 26.893 ms`. A função agrega TODAS as partidas `finished` do histórico de cada time (banco de 1,32 GB, 13 mil times com jogos), sem janela de tempo. Por isso os cards ficam em skeleton e a troca de liga "trava".
2. **Contador "Todos / A Fazer" não bate com a soma dos chips** porque os chips contam jogos brutos no banco (585 nos próximos 7d), enquanto `predictions.length` (usado em "Todos" e "A Fazer") só conta jogos cujos DOIS times retornaram stats — `buildPrediction` retorna `null` quando `total_matches < 1`. Centenas de times de ligas amadoras/jovens ficam sem stats → o total cai para ~78.
3. **Ruído extra**: `useDashboardData` chama uma RPC inexistente `estimated_count` (3× 404 por carregamento). Não trava, mas polui rede e logs.

## O que será feito

### 1. Materializar estatísticas de times (corrige 95% da lentidão)
Criar tabela cache `team_stats_cache` (uma linha por time, com `total_matches/wins/draws/losses/goals_scored/goals_conceded/home_*` + `away_*`) populada por função `refresh_team_stats_cache()` agendada via `pg_cron` (1× por hora) e também disparada após `wc2026-sync-live`. Índice `PRIMARY KEY (team_id)`.

Reescrever `get_team_stats_bulk(p_team_ids uuid[])` para um simples `SELECT ... FROM team_stats_cache WHERE team_id = ANY(...)` — passa de 27 s para < 50 ms.

### 2. Garantir consistência do contador
Em `usePredictions` (`src/hooks/usePalpitesDB.ts`), devolver TODAS as predições agendadas mesmo sem stats suficientes, marcando `confidence='low'` e usando médias da liga como fallback (em vez de retornar `null` em `buildPrediction`). Assim:
- "Todos" passa a refletir os ~585 jogos reais.
- "A Fazer" = "Todos" − "Com Palpite", igual à soma dos chips.
- Como a tabela cache cobre 100% dos times com qualquer histórico, o fallback é raro.

Alternativa, caso fallback não seja desejado: derivar "Todos" diretamente de `leagueMatchCounts` (já é a contagem real do banco) em vez de `predictions.length`, mantendo o filtro visual atual.

### 3. Limpeza
Remover o `rpc('estimated_count', ...)` em `src/hooks/useDashboardData.ts` e substituir por `select('id', { count: 'exact', head: true })` — elimina 3 erros 404 por load.

### 4. Verificação
- Rodar `EXPLAIN ANALYZE` na nova `get_team_stats_bulk` e confirmar < 100 ms.
- Abrir `/palpites`, conferir que cards aparecem em < 2 s e que `Todos = soma(chips) = Com Palpite + A Fazer`.
- Trocar liga e medir tempo até cards renderizarem.

## Detalhes técnicos

```sql
-- 1) Cache materializado
CREATE TABLE public.team_stats_cache (
  team_id uuid PRIMARY KEY REFERENCES public.times(id) ON DELETE CASCADE,
  total_matches int NOT NULL DEFAULT 0,
  wins int, draws int, losses int,
  goals_scored int, goals_conceded int,
  home_wins int, home_matches int,
  away_wins int, away_matches int,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_stats_cache TO authenticated, anon;
GRANT ALL ON public.team_stats_cache TO service_role;
ALTER TABLE public.team_stats_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_stats_cache_read" ON public.team_stats_cache FOR SELECT USING (true);

-- 2) Função de refresh (popular tudo de uma vez)
CREATE OR REPLACE FUNCTION public.refresh_team_stats_cache() ...
-- INSERT ... ON CONFLICT (team_id) DO UPDATE ...

-- 3) Agendar
SELECT cron.schedule('refresh-team-stats', '7 * * * *',
  $$ SELECT public.refresh_team_stats_cache(); $$);

-- 4) Reescrever bulk
CREATE OR REPLACE FUNCTION public.get_team_stats_bulk(p_team_ids uuid[])
RETURNS TABLE(...) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT team_id, COALESCE(total_matches,0), COALESCE(wins,0), ...
  FROM unnest(p_team_ids) u(team_id)
  LEFT JOIN public.team_stats_cache c USING (team_id);
$$;
```

Frontend:
- `src/hooks/usePalpitesDB.ts`: relaxar `buildPrediction` para aceitar `total_matches=0` usando média de liga (1.3 gols).
- `src/hooks/useDashboardData.ts`: trocar `rpc('estimated_count', ...)` por `head:true count:'exact'`.

## Resultado esperado

- Carregamento de cards: 7,8 s → ~1 s.
- Troca de liga: 5–8 s → < 500 ms.
- Soma dos chips bate com "Todos" e "A Fazer".
- Zero 404 no console.
