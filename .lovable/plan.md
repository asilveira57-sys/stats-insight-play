
## Correções Copa 2026 + Página de Palpites

### 1. Escalação oficial sem nome/número (página do jogo, ex.: Alemanha)

**Causa:** `wc2026-sync-live` insere linhas em `world_cup_2026_lineups` mas grava `player_id = NULL` (52 linhas no jogo Alemanha × Curaçao confirmam isso). O componente exibe `l.player?.name`, então só aparecem posição (F/G/M/D) e "—".

**Correção em `supabase/functions/wc2026-sync-live/index.ts`:**
- Antes de inserir lineups, upsert dos jogadores em `world_cup_2026_players` usando `external_player_id` (id vindo da API-Football) com `name`, `shirt_number`, `position`, `team_id`.
- Buscar os ids internos por `external_player_id` e popular `lineups.player_id`.
- Mesmo tratamento para `world_cup_2026_match_events` (que também grava `player_id` nulo — descrição já tem o nome via fallback, mas o id padroniza).
- Reprocessar manualmente o(s) jogo(s) já finalizados (atualmente só Alemanha × Curaçao) chamando a função.

### 2. Página `/palpites` — filtros e lentidão

**2a. Filtro "Todas / Brasil / Internacional" parece quebrado**
- O `useLeaguesForPredictions` retorna ligas com `pais` às vezes ausente; quando `pais` é null, `isBrazilianLeague` devolve `false`, então a liga some do filtro "Brasil" e fica em "Internacional" mesmo sendo BR.
- Correção: usar fallback via `codigo_api` (BSA, BSB, CSA, CDB, etc. → BR) e/ou `slug` quando `pais` estiver vazio; e enriquecer `select` da query para garantir `pais` populado.

**2b. "Listar exclusivamente campeonatos com jogos para palpite"**
- `useLeaguesForPredictions` já filtra ligas com partidas `scheduled` nos próximos 7 dias, mas o `LeagueMatchCounts` usa join (`ligas:liga_id(codigo_api)`) que pode retornar `null` quando a liga não tem `codigo_api`, gerando ligas listadas sem contador.
- Correção:
  - Filtrar ligas com pelo menos 1 jogo agendado **com `time_casa_id` e `time_fora_id` não-nulos** (requisito para gerar palpite).
  - Ordenar por: ligas com palpite do usuário > prioridade (BSA/PL/CL…) > nº de jogos.
  - Esconder ligas com 0 jogos no contador final.

**2c. "Não carrega os cards"**
- Quando `selectedRegion="all"` + `selectedLeague="all"`, `usePredictions` busca 297 partidas e dispara `get_team_stats_bulk` para ~500 times → lento e estoura.
- Correção:
  - Reduzir `maxMatches` default para 60 quando `leagueId === undefined`.
  - Mostrar Skeleton por liga enquanto carrega (já tem `keepPreviousData`).
  - Bloquear duplicação: deduplicar `teamIds` antes do RPC (já feito) e usar `staleTime` mais agressivo.

**2d. Copa 2026 não aparece em `/palpites`**
- Partidas da Copa estão em `world_cup_2026_matches`, não em `partidas`, então jamais entram na listagem.
- Correção: criar um "merge" no `usePredictions` e `useLeaguesForPredictions`:
  - Carregar em paralelo as próximas partidas WC2026 (próximos 7 dias) e adicionar uma "liga virtual" `WC` (Copa do Mundo 2026, com logo e bandeira BR-friendly).
  - Mapear cada match WC2026 para o formato `Prediction` reutilizando placar IA já existente em `world_cup_2026_ai_analyses` (campo `predicted_score`) ou usando placeholders quando não houver.
  - Ao selecionar a liga `WC`, redirecionar para `/copa-2026/palpites-ia` (já existe), evitando lógica duplicada.

### 3. Arquivos afetados

```
supabase/functions/wc2026-sync-live/index.ts   (upsert players + link player_id)
src/hooks/usePalpitesDB.ts                     (fallback pais, filtros, merge WC2026, limite)
src/pages/Palpites.tsx                         (skeleton por liga, redirect WC)
```

Nenhuma alteração em schema/migrations — apenas correções de código e reprocessamento de dados.

### Fora de escopo
- Não tocar nos demais módulos (Grupos, Seleções listing, Posts) — já corrigidos nas rodadas anteriores.
- Sem mudanças na lógica de IA / probabilidades.
