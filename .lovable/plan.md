
## Problema observado

Pergunta: "quantos jogos do fluminense em 2025"
- A IA respondeu sobre **Fluminense de Feira-BA** (2 jogos) em vez do **Fluminense-RJ** (38 jogos em 2025).
- Causas reais:
  1. `search_global` dá score 80 para todos os times que começam com "fluminense" — sem desempate por popularidade/canonicidade, então o primeiro da lista vira o "topTeam".
  2. A edge function pega `results[0]` como entidade principal, sem critério.
  3. Não extrai filtros da pergunta (ano `2025`, competição, "casa/fora").
  4. O contexto enviado à IA são stats agregadas totais — não filtra por ano, então a IA inventa/responde sobre o dataset errado.

## Solução

### 1. Ranking inteligente em `search_global` (migration)

Reescrever a função adicionando desempate determinístico:

- **Boost de canonicidade**: `+30` se `slug` é exatamente igual ao termo normalizado (ex.: `fluminense` → `fluminense-rj` perde; mas `flamengo` → `flamengo` ganha). Adicionar boost `+20` quando o nome do time, sem sufixos de estado (`-RJ`, `-SP`, `-BA`, ` U20`, ` U17`, ` U23`, ` W`), bate exato com o termo.
- **Boost de popularidade**: `+ LEAST(20, log10(1 + count_partidas) * 5)` — usar contagem de `partidas` (pré-calculada via materialized view ou subquery cacheada em coluna `times.match_count`). Como alternativa simples sem MV: `LEFT JOIN (SELECT time_id, count) team_match_counts`.
- **Boost de time principal**: se `times.is_main = true` (já existe em alguns projetos), +15. Se não existir a coluna, pular.
- **Penalidade de sub-categoria**: `-15` se nome contém ` U17`, ` U20`, ` U23`, ` W`, ` Sub`.
- Ordenar por `score DESC, popularity DESC, name ASC`.

Mesma lógica para `ligas` (boost se for liga BR principal) e `players`.

### 2. Edge function `intelligent-search` — extração de filtros e seleção de entidade

Adicionar antes da chamada à IA:

- **Extrair ano**: regex `\b(19|20)\d{2}\b` na query. Suportar "este ano", "ano passado", "temporada atual".
- **Extrair competição**: matching contra `ligas.nome` normalizado nos tokens (já temos resultados `league` em `search_global`).
- **Extrair escopo**: "em casa", "fora", "como mandante/visitante".
- **Selecionar topTeam**: já vem ordenado corretamente após o fix do `search_global`. Manter `results[0]` do tipo `team`, mas adicionar log do score para debug.

### 3. Contexto factual real (com filtros aplicados)

Substituir o bloco atual que só chama `get_team_stats_bulk` por uma consulta SQL direta a `partidas` com os filtros extraídos:

```ts
const { count: total } = await supabase
  .from("partidas")
  .select("*", { count: "exact", head: true })
  .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
  .gte("data", `${year}-01-01`)
  .lte("data", `${year}-12-31`)
  .eq("status", "finished");
```

Depois agregar W/D/L/GF/GA pelo lado (casa/fora) num único `select` paginado (respeitando Zero Limits — usar `range` em lotes de 1000 até esgotar; somar em JS). Resultado vira contexto:

```
Time: Fluminense-RJ (id: ...)
Ano consultado: 2025
Jogos finalizados em 2025: 38
Vitórias: 18 | Empates: 11 | Derrotas: 9
Gols marcados: 52 | Gols sofridos: 41
Últimas 5 partidas em 2025: ...
```

Se o usuário pediu time específico mas só veio sub-time (U17/W), pular para o próximo `team` do resultado.

### 4. Prompt da IA reforçado

Adicionar à system prompt:
- "Os dados do CONTEXTO já vêm filtrados pelo ano/competição mencionados na pergunta. Use os números exatos."
- "Se a pergunta mencionar um ano e o CONTEXTO mostrar `Ano consultado:`, sua resposta deve usar esses números."
- "Sempre confirme qual entidade foi consultada (ex.: 'O Fluminense-RJ teve...')".

### 5. Hardening do registro

- Salvar em `ai_answers_log.data_sources_used` o objeto `{ team_id, team_name, year, total_matches }` para auditoria.
- Logar warning quando `entities.length > 3` com mesmo prefixo (ambiguidade alta) — futuro: pedir desambiguação ao usuário.

## Arquivos afetados

1. **Nova migration** (`supabase/migrations/..._search_global_ranking.sql`): reescrever `search_global` com boosts e desempates; opcionalmente adicionar coluna `times.match_count` + trigger de atualização (ou subselect inline se preferir simplicidade).
2. **`supabase/functions/intelligent-search/index.ts`**:
   - Adicionar `extractYear`, `extractCompetition`, `extractScope`.
   - Substituir bloco de contexto factual por agregação real filtrada.
   - Filtrar sub-times (U17/U20/W) ao escolher topTeam.
   - Atualizar system prompt.
3. Sem mudanças de frontend.

## Fora de escopo

- UI de desambiguação ("Você quis dizer Fluminense-RJ ou Fluminense-PI?") — fica para próximo passo.
- Indexação `pg_trgm`/`tsvector` para fuzzy match com erros de digitação.
- Cache de respostas frequentes.
