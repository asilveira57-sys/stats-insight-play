

# Plano: Auditoria e Remoção de Limites de Registros (Política Zero Limites)

## Problema
O sistema possui diversas consultas ao banco de dados que esbarram no limite padrão de 1000 registros do Supabase. Isso causa dados incompletos em dashboards, rankings, estatisticas e comparativos -- como mostrado na imagem onde "1000 partidas" aparece como teto.

## Auditoria Completa

Abaixo estao todos os arquivos com consultas que podem exceder 1000 registros e precisam migrar para `fetchAllRecords` ou `countAllRecords` (de `@/lib/supabaseHelpers`).

### GRUPO 1: Consultas Criticas (alto volume, impacto direto nos dados exibidos)

| # | Arquivo | Consulta | Tabela | Risco |
|---|---------|----------|--------|-------|
| 1 | `src/hooks/useUserPalpites.ts` - `useUserPalpites()` | `.select(...)` em `palpites_usuarios` com joins | palpites_usuarios | Alto - usuarios ativos podem ter >1000 palpites |
| 2 | `src/hooks/useUserPalpites.ts` - `useUserAccuracyStats()` | `.select(...)` em `palpites_usuarios` com joins | palpites_usuarios | Alto - mesma razao |
| 3 | `src/hooks/useTeamsDB.ts` - `useTeams()` | `.select('*')` em `times` | times | Alto - pode ter >1000 times |
| 4 | `src/hooks/useTeamsDB.ts` - `useTeamStats()` | `.select(...)` em `partidas` (home + away) | partidas | Alto - times com historico longo |
| 5 | `src/hooks/useTeamsDB.ts` - `useTeamsByLeague()` | `.select('time_casa_id, time_fora_id')` em `partidas` | partidas | Alto |
| 6 | `src/hooks/useTeamsDB.ts` - `useHeadToHead()` | `.select('*')` em `partidas` filtrado por 2 times | partidas | Medio |
| 7 | `src/hooks/useMatchesDB.ts` - `useMatchesFromDB()` | `.select(...)` em `partidas` com joins | partidas | Alto - consulta principal de partidas |
| 8 | `src/hooks/usePalpitesDB.ts` - `usePredictions()` | `.select(...)` em `partidas` (scheduled) | partidas | Medio |
| 9 | `src/hooks/usePalpitesDB.ts` - `useLeaguesForPredictions()` | `.select('liga_id')` em `partidas` | partidas | Medio |
| 10 | `src/hooks/usePalpitesDB.ts` - `useLeagueMatchCounts()` | `.select(...)` em `partidas` | partidas | Medio |
| 11 | `src/hooks/useNationalTeamsHeadToHead.ts` - `useNationalTeamsList()` | `.select('time_casa_id, time_fora_id')` em `partidas` | partidas | Alto |
| 12 | `src/hooks/useNationalTeamsHeadToHead.ts` - `useNationalTeamsHeadToHead()` | `.select(...)` em `partidas` | partidas | Medio |
| 13 | `src/hooks/usePalpitesDB.ts` - `getTeamStats()` | `.select('gols_casa, gols_fora')` em `partidas` (2x) | partidas | Alto - usado para cada predicao |
| 14 | `src/hooks/useDashboardData.ts` - `useAIPredictionStats()` | `.select(...)` em `comparativo_resultados` | comparativo_resultados | CRITICO - causa o bug da imagem (1000 limite) |
| 15 | `src/hooks/useDashboardData.ts` - `useGeneralPredictionStats()` | `.select('*')` em `comparativo_resultados` | comparativo_resultados | Alto |
| 16 | `src/hooks/useTopScorers.ts` - fallback `matchesQuery` | `.select(...)` em `partidas` com joins | partidas | Alto - nao usa fetchAllRecords |

### GRUPO 2: Consultas Administrativas (impacto em dashboards admin)

| # | Arquivo | Consulta | Tabela | Risco |
|---|---------|----------|--------|-------|
| 17 | `src/hooks/useSlugAdmin.ts` - `useTeamsWithSlugInfo()` | `.select(...)` em `times` + `times` (slugCounts) | times | Alto |
| 18 | `src/hooks/useSlugAdmin.ts` - `useMatchesWithSlugInfo()` | `.limit(500)` em `partidas` + slugCounts em `partidas` | partidas | CRITICO - limite explicito |
| 19 | `src/hooks/useAdminStats.ts` - `useSyncLogs()` | `.limit(100)` em `sync_logs` | sync_logs | Medio - limite explicito |
| 20 | `src/pages/EditorialDashboard.tsx` | `.limit(500)` em `noticias` | noticias | Medio - limite explicito |
| 21 | `src/pages/AdminWebhooks.tsx` | `.limit(200)` em `webhook_events` | webhook_events | Medio - limite explicito |
| 22 | `src/pages/hub/Matches.tsx` | `.select(...)` em `partidas` sem paginacao | partidas | Alto |
| 23 | `src/pages/hub/SyncDetails.tsx` | Varias queries em `partidas`, `gols_partida`, `escalacoes` | multiplas | Alto |
| 24 | `src/hooks/useTeamPillar.ts` | `.select(...)` em `partidas` (home/away, 4 queries) | partidas | Alto |

### GRUPO 3: Consultas Seguras (ja usam fetchAllRecords ou countAllRecords)

Estes arquivos ja estao corretos:
- `src/pages/PerformancePrevisoes.tsx` -- usa `fetchAllRecords`
- `src/pages/Evolucao.tsx` -- usa `fetchAllRecords`
- `src/hooks/useNationalTeamsRanking.ts` -- usa `fetchAllRecords`
- `src/hooks/useArtilharia.ts` -- usa `fetchAllRecords`
- `src/hooks/useTopScorers.ts` (query de gols) -- usa `fetchAllRecords`
- `src/pages/hub/Competitions.tsx` -- usa `fetchAllRecords`
- `src/pages/EditorialDashboard.tsx` (comparison stats, pillars) -- usa `fetchAllRecords`
- `src/hooks/useDashboardData.ts` (KPIs) -- usa `countAllRecords`
- `src/hooks/useUserPalpites.ts` - `useSystemAccuracyStats()` -- ja usa paginacao manual

### GRUPO 4: Consultas que NAO precisam de alteracao

Queries com `.single()`, `.maybeSingle()`, `.limit(N)` intencional para top-N, ou queries filtradas por ID unico:
- `useUserPlan.ts` - `.single()` por user
- `useNoticia()` / `useNoticiaBySlug()` - `.single()`
- `useUserXP()` - `.single()` por user
- `useNoticias()` / `useLatestNoticias()` - limite intencional (listagem paginada)
- `useGamification.ts` - queries pequenas (badges, rules, user-specific)
- `src/pages/PerfilPublico.tsx` - todas `.single()` por user
- `src/pages/hub/Teams.tsx` - ja usa paginacao com `.range()`
- `useTeamSearch()` - `.limit(10)` intencional para autocomplete
- `usePriorityStats()` - `.limit(10)` intencional para top-10
- `useAdminStats.ts` - `useUserStats()`, `useContentStats()` -- usam `count: 'exact', head: true`
- `useMatchDetails.ts` - filtrado por `partida_id` (poucos registros)

---

## Plano de Implementacao

### Fase 1: Corrigir o bug visivel (imagem do usuario)

**Arquivo:** `src/hooks/useDashboardData.ts`
- `useAIPredictionStats()` -- migrar para `fetchAllRecords` em `comparativo_resultados`
- `useGeneralPredictionStats()` -- migrar para `fetchAllRecords` em `comparativo_resultados`

### Fase 2: Hooks de Palpites e Estatisticas

**Arquivo:** `src/hooks/useUserPalpites.ts`
- `useUserPalpites()` -- migrar para `fetchAllRecords`
- `useUserAccuracyStats()` -- migrar para `fetchAllRecords`

**Arquivo:** `src/hooks/usePalpitesDB.ts`
- `getTeamStats()` -- migrar 2 queries de partidas para `fetchAllRecords`
- `usePredictions()` -- migrar para `fetchAllRecords`
- `useLeaguesForPredictions()` -- migrar para `fetchAllRecords`
- `useLeagueMatchCounts()` -- migrar para `fetchAllRecords`

### Fase 3: Hooks de Times e Partidas

**Arquivo:** `src/hooks/useTeamsDB.ts`
- `useTeams()` -- migrar para `fetchAllRecords`
- `useTeamStats()` -- migrar 2 queries home/away para `fetchAllRecords`
- `useTeamsByLeague()` -- migrar 2 queries para `fetchAllRecords`
- `useHeadToHead()` -- migrar para `fetchAllRecords`

**Arquivo:** `src/hooks/useMatchesDB.ts`
- `useMatchesFromDB()` -- migrar para `fetchAllRecords`

**Arquivo:** `src/hooks/useTeamPillar.ts`
- 4 queries de partidas -- migrar para `fetchAllRecords`

### Fase 4: Hooks de Selecoes

**Arquivo:** `src/hooks/useNationalTeamsHeadToHead.ts`
- `useNationalTeamsList()` -- migrar query de partidas para `fetchAllRecords`
- `useNationalTeamsHeadToHead()` -- migrar para `fetchAllRecords`

### Fase 5: Hooks de Top Scorers (fallback)

**Arquivo:** `src/hooks/useTopScorers.ts`
- Query fallback de `matchesQuery` em `partidas` -- migrar para `fetchAllRecords`

### Fase 6: Admin e Hub

**Arquivo:** `src/hooks/useSlugAdmin.ts`
- `useTeamsWithSlugInfo()` -- migrar queries de `times` para `fetchAllRecords`
- `useMatchesWithSlugInfo()` -- remover `.limit(500)`, migrar para `fetchAllRecords`
- slug counts queries -- migrar para `fetchAllRecords`

**Arquivo:** `src/hooks/useAdminStats.ts`
- `useSyncLogs()` -- remover `.limit(100)`, migrar para `fetchAllRecords`

**Arquivo:** `src/pages/EditorialDashboard.tsx`
- Query de noticias -- remover `.limit(500)`, migrar para `fetchAllRecords`

**Arquivo:** `src/pages/AdminWebhooks.tsx`
- Remover `.limit(200)`, migrar para `fetchAllRecords`

**Arquivo:** `src/pages/hub/Matches.tsx`
- Query de partidas -- migrar para `fetchAllRecords`

**Arquivo:** `src/pages/hub/SyncDetails.tsx`
- Multiplas queries -- migrar para `fetchAllRecords`

### Fase 7: Queries em componentes auxiliares

**Arquivo:** `src/hooks/useUserPalpitesByMatches.ts`
- Query em `palpites_usuarios` -- verificar se matchIds pode ultrapassar 1000 e migrar se necessario

---

## Detalhes Tecnicos

Cada migracao segue o mesmo padrao. Exemplo para `useAIPredictionStats`:

```text
ANTES:
const { data, error } = await supabase
  .from('comparativo_resultados')
  .select('sistema_acertou_resultado, sistema_acertou_placar');

DEPOIS:
const data = await fetchAllRecords<{...}>(
  'comparativo_resultados',
  'sistema_acertou_resultado, sistema_acertou_placar'
);
```

Para queries com filtros, usa-se o parametro `filters`:

```text
const data = await fetchAllRecords<{...}>(
  'partidas',
  'gols_casa, gols_fora',
  (q) => q.eq('time_casa_id', teamId).eq('status', 'finished')
);
```

## Total de Alteracoes

- **24 consultas** em **14 arquivos** precisam ser migradas
- **0 alteracoes de schema** necessarias
- **0 novas dependencias**
- Todas usam o helper existente `fetchAllRecords` / `countAllRecords`

