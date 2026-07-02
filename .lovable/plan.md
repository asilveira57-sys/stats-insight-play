
# Motor de Pesquisa Inteligente — Refatoração Definitiva

## Princípios inegociáveis

1. **Zero conhecimento próprio da IA** — toda resposta vem do banco. Gemini só interpreta a pergunta (intent + entidades). Nunca responde fatos.
2. **Zero IF por campeonato** — nada de `if (competition === "Brasileirão")`. Toda resolução passa por `competition_aliases`.
3. **Escalável** — nova competição importada = funciona automaticamente assim que ganhar aliases.
4. **Auditável** — cada busca grava um log técnico completo (query, intent, entidades, SQL, erros).

## Arquitetura em camadas

```text
Pergunta
  ↓ [1] normalizeQuery()           remove acentos, lowercase, pontuação, espaços
  ↓ [2] classifyIntent()           Gemini → { intent, raw_entities, year }
  ↓ [3] resolveEntities()          DB lookup por aliases
       - resolveCompetition()
       - resolveTeam()
       - resolvePlayer()
       - resolveSeason()
       - resolveCountry()
  ↓ [4] runQuery(intent, resolved) switch por intent → funções SQL universais
       - tenta múltiplas fontes em cascata (nunca para na primeira falha)
  ↓ [5] formatAnswer()             gera summary + StructuredAnswer só a partir das rows
  ↓ [6] logDiagnostics()           grava tudo em search_diagnostics
```

## Mudanças no banco

### Migration 1 — Aliases universais
- Popular `competition_aliases` para **todas** as competições em `ligas`:
  - alias exato do nome
  - alias normalizado (sem acentos)
  - variações por padrão: remover "campeonato", "copa", "liga", adicionar sinônimos por país (`inglês`/`inglesa`/`premier league`, `espanhol`/`la liga`, `italiano`/`serie a`, `brasileiro`/`brasileirão`/`serie a brasileira`).
  - Gerado por função SQL `seed_competition_aliases()` — idempotente, roda no INSERT via trigger para novas competições.
- Trigger `trg_competition_aliases_autoseed` em `ligas` (AFTER INSERT) que chama a mesma função para o novo registro.

### Migration 2 — Diagnóstico
- Tabela `search_diagnostics`:
  - `query_raw`, `query_normalized`, `intent`, `entities jsonb`, `resolved jsonb`, `confidence`, `sql_source`, `filters_used jsonb`, `result_count`, `error_reason`, `duration_ms`, `user_id`, `created_at`
- GRANT + RLS: insert por qualquer usuário autenticado ou anon (para log público de buscas); select apenas admin.

### Migration 3 — Funções SQL universais
- `search_champion_universal(competition_id uuid, year int)` — tenta em cascata: `seasons.winner_team_id` → `team_titles` → `standings position=1`. Retorna primeira fonte com dado + `source_table`.
- `search_top_scorer_universal(competition_id, year, limit)` — `artilharia_agregada` → `estatisticas` agregado por gols → `gols_partida` agregado.
- `search_standings_universal(competition_id, year)` — direto de `standings`.
- `search_matches_by_team(team_id, from_date, to_date, status)` — universal para "jogos do X".
- `search_h2h(team_a, team_b, limit)` — confronto direto.

## Mudanças no código

### `supabase/functions/intelligent-search/index.ts` — reescrita modular
Remover completamente:
- Qualquer `if (competition.name.includes("Brasileirão"))` ou similar
- `externalAnswer` / fallback com conhecimento da IA
- Prompts que peçam resposta factual

Estrutura nova:
```
index.ts (orquestrador ~150 linhas)
  ↳ chama classifyIntent → resolveEntities → runQuery → formatAnswer → logDiagnostics
```

**classifyIntent** — único call Gemini com JSON output schema:
```json
{
  "intent": "champion|match_result|standings|fixtures|top_scorer|player_stats|team_stats|h2h|last_match|next_match",
  "raw_entities": {
    "competition": "string|null",
    "teams": ["string"],
    "players": ["string"],
    "country": "string|null"
  },
  "year": "number|null",
  "confidence": 0.0-1.0
}
```
Prompt deixa explícito: "Você é APENAS um classificador. NÃO responda fatos. NÃO invente times/campeonatos. Se não souber, deixe null."

**resolveCompetition(raw)** — lookup em cascata:
1. Match exato em `competition_aliases.normalized_alias`
2. Match ILIKE parcial em `competition_aliases`
3. Trigram em `ligas.nome`
4. Se >1 acima de threshold → retorna `disambiguation: []`
5. Se 0 → retorna `not_found_reason: "competition_not_registered"`

Mesmo padrão para times (`team_aliases`), jogadores (`players`), seasons (extractSeason regex 1900-2100).

**runQuery** — switch por intent, cada branch chama uma SQL function universal. Nunca hardcoded competition name.

### Frontend

- `src/pages/Pesquisa.tsx` — exibir `diagnostic_reason` amigável no card "not found" (competição não cadastrada / temporada sem dados / etc), e badge de `source_table` no rodapé da resposta para transparência.
- `src/hooks/useIntelligentSearch.ts` — estender tipos: `diagnostic`, `source_table`, `sql_execution_time`.
- `src/components/search/DisambiguationChips.tsx` — já suporta lista genérica; só passar competições candidatas.

Sem novos componentes.

## Testes automatizados

Adicionar `supabase/functions/intelligent-search/index.test.ts` cobrindo os 16 casos da spec. Roda via `deno test` — cada teste faz POST na função e valida `intent` + `source_table` + presença de resposta (ou disambiguation).

## Fora de escopo
- Tradução EN/ES (só PT-BR).
- xG e stats avançados (banco não tem).
- Cache de resposta (fase futura).

## Ordem de execução
1. Migration 1 (aliases + trigger + seed)
2. Migration 2 (search_diagnostics)
3. Migration 3 (funções SQL universais)
4. Reescrita da edge function
5. Ajustes de UI (Pesquisa.tsx + hook)
6. Testes deno + rodada dos 16 casos via `supabase--curl_edge_functions`

Posso executar?
