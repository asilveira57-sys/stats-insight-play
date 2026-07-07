
## Diagnóstico

A base tem **duas árvores paralelas de mata-mata** para a mesma Copa 2026:

| Origem | Stages | Times reais? | `bracket_position`? | `next_match_id`? |
|---|---|---|---|---|
| Placeholders antigos (seed) | `round_of_32`, `round_of_16`, `quarter_final`, `semi_final`, `final`, `third_place` | não | sim (R32-1…) | sim |
| Sync real da API-Football | `r32`, `r16`, `qf`, `sf`, `final`, `third` | sim | não | não |

Consequências que o usuário está vendo:
1. **Chaveamento oficial não avança para as oitavas** — `wc2026-advance-bracket` propaga vencedor via `next_match_id`, mas as linhas reais (`r16`, `qf`) não têm esse link nem `bracket_position`, então o front cai no fallback por índice e mostra "A definir".
2. **Projeção IA aponta Brasil campeão mesmo eliminado** — `wc2026-project-bracket` lê **somente** as linhas placeholder (`round_of_32/round_of_16/…`), que estão vazias. Como ignora as linhas reais (`r16`), não sabe que o Brasil caiu e roda Monte Carlo puro da fase de grupos, onde o Brasil é favorito.
3. **Sync-fixtures grava com stages novos** (`r32/r16/qf/sf/third`) e faz upsert por `external_fixture_id`, então nunca reaproveita o placeholder — duplicidade se perpetua a cada sync.

## Objetivo

Uma única árvore canônica de mata-mata: linhas reais da API-Football, com `bracket_position` e `next_match_id` corretos, e projeção que respeite resultados já ocorridos.

## Passos

### 1. Canonicalizar os stages (migração SQL)
- Padronizar em `round_of_32`, `round_of_16`, `quarter_final`, `semi_final`, `final`, `third_place` (nomes que o front, o projetor e o `advance-bracket` já usam).
- Atualizar `wc2026-sync-fixtures` para gravar nesse padrão (mapear `r32 → round_of_32`, `r16 → round_of_16`, `qf → quarter_final`, `sf → semi_final`, `third → third_place`).
- Migração de dados: para cada linha real (`r32/r16/qf/sf/third`), renomear o stage; onde já existir um placeholder equivalente, mesclar (copiar `external_fixture_id`, times, placar, `winner_team_id` para a linha placeholder que já tem `bracket_position`+`next_match_id`) e apagar a duplicata.
- Estratégia de match ao mesclar: por `bracket_position` quando ambos tiverem, senão por par `(home_team_id, away_team_id)` dentro do mesmo stage; caso contrário por ordem cronológica de `match_date` dentro do stage.

### 2. Recalcular `bracket_position` e `next_match_id`
- Rodar `wc2026-link-bracket` (já existente) após a mesclagem para garantir que toda partida real tem posição no chaveamento e link para a próxima fase.
- Ajustá-lo se necessário para cobrir `round_of_16` inteiro (hoje 0/8 estão linkados).

### 3. Rodar `wc2026-advance-bracket`
- Após o passo 2, as vitórias das oitavas já finalizadas propagam automaticamente para as quartas, populando o oficial.
- O cron de 5 min continua rodando; a partir daqui vai funcionar sozinho.

### 4. Corrigir o projetor
- `wc2026-project-bracket` passa a ler somente stages canônicos (sem os `r32/r16/qf` legados).
- Antes de simular Monte Carlo, **congelar resultados já decididos**: se um confronto do mata-mata tem `status = 'finished'` e `winner_team_id`, esse time é forçado como vencedor no bracket; times já eliminados são removidos do universo de simulação nas fases seguintes.
- Consequência imediata: Brasil (eliminado no r16 real) deixa de aparecer como campeão projetado. A projeção passa a partir do estado real das oitavas em andamento.

### 5. Verificação
- Consulta SQL confirmando: 16 partidas em `round_of_32` finalizadas, 8 em `round_of_16` (6 finalizadas + 2 agendadas), 4 em `quarter_final` com times populados vindos dos vencedores das oitavas, projeção regerada sem Brasil no top.
- Abrir `/copa-2026/chaveamento` no modo "Apenas oficial" e conferir que as oitavas mostram os resultados reais e as quartas começam a ser preenchidas.

## Detalhes técnicos

**Arquivos alterados**
- `supabase/functions/wc2026-sync-fixtures/index.ts` — mapear stages para o padrão canônico.
- `supabase/functions/wc2026-project-bracket/index.ts` — ler stages canônicos e respeitar `winner_team_id` já definido; remover eliminados do Monte Carlo.
- `supabase/functions/wc2026-link-bracket/index.ts` — revisar para cobrir todas as 8 oitavas.
- Nova migração SQL: renomeia stages, mescla duplicatas, deleta órfãs.

**Depois da migração**, invocar em ordem:
1. `wc2026-sync-fixtures` (garante dados frescos no padrão novo)
2. `wc2026-link-bracket` (posições + next_match)
3. `wc2026-advance-bracket` (propaga vencedores)
4. `wc2026-project-bracket` (projeção coerente)

O que **não muda**: schema visual do front, cron jobs existentes, tabelas `wc2026_bracket_projections` / `wc2026_match_odds`, integração de odds.
