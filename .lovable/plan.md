# Plano: acelerar Notícias, Validação e Palpites

## Diagnóstico (causa real da lentidão)

Investiguei o código e o banco. O problema **não é sua internet** nem o peso das imagens (já são SVGs leves e com `loading="lazy"`). São três gargalos de dados:

1. **Notícias** (`useNoticias`): hoje busca **todas as 4.611 notícias publicadas** com `select("*")` — incluindo o campo `texto` (corpo completo do artigo) — e **ignora o parâmetro `limit`**. Em cada abertura da tela, o navegador baixa vários MB de JSON e renderiza milhares de cards de uma vez.
2. **Palpites** (`usePalpitesDB`): para cada partida exibida, chama `getTeamStats` que faz `fetchAllRecords` de **todo o histórico de jogos** dos dois times. Com muitas partidas na tela, são dezenas de queries pesadas em paralelo (N+1).
3. **Validação Semanal**: já seleciona colunas certas, mas também carrega o lote inteiro sem paginação nem filtro.

Sem paginação e sem filtros, qualquer melhoria de imagem teria efeito marginal — o gargalo está no volume de dados e na quantidade de cards renderizados.

## O que vou implementar

### 1. Paginação real (servidor)

Trocar os `select` que trazem tudo por `range(from, to)` com `count: 'exact'`, retornando `{ items, total }`.

- **Notícias**: 30 por página (3 colunas × 10 linhas no desktop, vira 2 colunas no tablet e 1 no mobile).
- **Validação Semanal**: 20 por página.
- **Palpites**: 24 por página (paginação por partida; estatísticas calculadas só para a página atual).

Componente de paginação reutilizável (`Pagination` do shadcn já existe) com Anterior / Próxima e indicador "Página X de Y".

### 2. Busca avançada com filtros (server-side)

Barra de filtros unificada nas três telas, com os campos relevantes para cada uma:

| Filtro | Notícias | Validação | Palpites |
|---|---|---|---|
| Busca por texto (título / time) | ✅ | ✅ | ✅ |
| Data exata da partida | ✅ | ✅ | ✅ |
| Intervalo de datas (de / até) | ✅ | ✅ | ✅ |
| Campeonato (dropdown) | ✅ | ✅ | ✅ |
| Temporada (dropdown dependente do campeonato) | ✅ | ✅ | ✅ |
| Nome do time (autocomplete) | ✅ | ✅ | ✅ |
| Status (a confirmar / confirmado / errado) | – | ✅ | – |

Todos os filtros aplicados via SQL (`.eq`, `.gte`, `.lte`, `.ilike`, `.in`) — nada de filtrar em memória. Debounce de 300ms na busca por texto. Filtros persistem na URL (querystring) para o usuário poder compartilhar/voltar.

### 3. Payload menor

- `useNoticias` passa a selecionar só: `id, titulo, resumo, slug, imagem_url, data_publicacao, partida_id` (sem o `texto` gigante). O corpo continua sendo carregado em `useNoticia`/`useNoticiaBySlug` na página de detalhe.
- `usePalpitesDB`: substituir o N+1 atual por **um único agregado** que traz todas as estatísticas necessárias dos times da página de uma só vez (via RPC ou query agrupada com `IN (...)`).

### 4. Imagens

- Já estão otimizadas (SVG ~15–40 KB, `loading="lazy"`).
- Adiciono `decoding="async"` e `width`/`height` explícitos para evitar layout shift.
- Sem necessidade de processar/redimensionar — o ganho real vem dos itens 1–3.

## Detalhes técnicos

- Hooks novos: `useNoticiasPaginated({ page, pageSize, filters })`, `usePalpitesPaginated(...)`, `useValidacoesPaginated(...)`. React Query com `keepPreviousData` para transições suaves entre páginas.
- Componente compartilhado `AdvancedFilters` em `src/components/filters/` (recebe um schema indicando quais filtros mostrar).
- Índices a verificar/criar via migration se faltarem: `noticias(publicada, data_publicacao desc)`, `partidas(data, liga_id, status)`, `partidas(time_casa_id)`, `partidas(time_fora_id)`. Confirmo por `pg_indexes` antes de criar.
- RPC `get_team_stats_bulk(team_ids uuid[])` para resolver o N+1 dos palpites em uma chamada só.
- URL state via `useSearchParams` para os filtros.

## Arquivos afetados (resumo)

- `src/hooks/useNoticias.ts` — paginação + select enxuto
- `src/hooks/usePalpitesDB.ts` — bulk stats, eliminar N+1
- novo `src/hooks/useValidacoesPaginated.ts`
- novo `src/components/filters/AdvancedFilters.tsx` + `src/components/ui/PaginationBar.tsx`
- `src/pages/Noticias.tsx`, `src/pages/Palpites.tsx`, `src/pages/ValidacaoSemanal.tsx`
- migration: índices + RPC `get_team_stats_bulk` (se necessário)

## Resultado esperado

- Notícias: tempo de carga inicial cai de "vários segundos com travamento" para **<500ms** (payload ~30 itens em vez de 4.611).
- Palpites: deixa de fazer dezenas de queries por abertura — uma só chamada agregada.
- Navegação por filtros e páginas instantânea graças ao `keepPreviousData` + cache do React Query.
