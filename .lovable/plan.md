## Objetivo

Importar **tudo** da API-Football (todos os países, todas as ligas, todas as temporadas, com fixtures + eventos + escalações + estatísticas), pular o que já está integrado e remover qualquer limite que esconda jobs na fila.

## Mudanças

### 1. Inventário global (todos os países, não só 11)

`supabase/functions/apifootball-inventory/index.ts`
- Substituir o loop por país + lista fixa de ligas mundiais por **uma única chamada** `GET /leagues` (sem filtro), que retorna todas as ~1.100 ligas globais em 1 requisição.
- Manter `PRIORITY_LEAGUE_IDS` apenas para marcar `is_priority = true` (Brasil, Conmebol, Big-5 etc.), sem filtrar.
- Continuar atualizando `api_football_quota_log` ao final.

Resultado: a tabela `api_football_inventory` passa a conter o catálogo completo da API.

### 2. Botão "Enfileirar TUDO disponível"

`src/pages/AdminApiFootball.tsx`
- Adicionar botão **"Enfileirar tudo (todas ligas × todas temporadas × 4 profundidades)"** ao lado de "Prioridade Statball".
- Ele monta `selections` com **todas as ligas** do inventário, **todas as temporadas** de cada uma e **todas as 4 profundidades** (`fixtures`, `events`, `lineups`, `stats`) e chama `apifootball-enqueue`.
- Mostrar um aviso com o total estimado de jobs (liga-temporada-profundidade) antes de confirmar.

### 3. Pular o que já foi importado

`supabase/functions/apifootball-enqueue/index.ts`
- Continua usando `upsert ... onConflict: 'league_id,season,depth', ignoreDuplicates: true` — isso já evita recriar jobs existentes.
- **Adicionar**: antes do upsert, fazer `SELECT league_id, season, depth FROM api_football_import_jobs WHERE status IN ('done','running','queued')` paginando em lotes de 1000 (sem `.limit(1000)` fixo) e filtrar `rows` para remover combinações já presentes — assim nem enviamos para o banco o que já está feito ou em andamento.
- Aumentar `chunk` de 500 para 1000 no upsert.

### 4. Fila sem limite na UI

`src/pages/AdminApiFootball.tsx`
- Remover `.limit(200)` em `loadJobs()`.
- Implementar paginação completa: loop com `.range(from, from + 1000 - 1)` até esgotar (mesmo padrão usado em `historical-batch-pipeline`).
- Atualizar contadores `stats` (queued/running/done/failed) a partir do total real, não dos 200 primeiros.
- Como a fila pode ter dezenas de milhares de linhas, renderizar a tabela com **paginação client-side** (50/página) usando `PaginationBar` já existente, para não travar o DOM (mem://technical/performance/render-optimization).

### 5. Worker continua rodando sozinho

Não mudar `apifootball-worker` nem os crons existentes — já processam a fila respeitando a quota de 75k/dia da API-Football Ultra.

## Detalhes técnicos

- Nenhuma migração de schema necessária.
- O `ON CONFLICT (league_id, season, depth)` da tabela `api_football_import_jobs` garante idempotência mesmo se o usuário clicar "Enfileirar tudo" várias vezes.
- A chamada `GET /leagues` sem filtro custa **1 requisição** da quota diária.
- O custo real da importação completa é controlado pelo worker (não pelo enqueue), então enfileirar 100k+ jobs é seguro — eles serão drenados ao longo dos dias respeitando 75k req/dia.

## Resumo das ações esperadas após implementação

1. Usuário clica **"Atualizar inventário"** → recebe todas as ligas do mundo.
2. Usuário clica **"Enfileirar tudo"** → todos os jobs faltantes (excluindo done/running/queued) entram em `queued`.
3. Aba **Fila** mostra a contagem real (não trava em 200) com paginação.
4. Cron existente continua chamando `apifootball-worker` periodicamente até zerar.