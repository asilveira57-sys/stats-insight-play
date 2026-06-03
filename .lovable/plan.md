# Pesquisa Inteligente Statball

Módulo completo de busca unificada (times, jogadores, campeonatos, estatísticas) + pergunta em linguagem natural respondida por IA usando exclusivamente dados do banco.

## 1. Banco de dados (1 migration)

Cria 5 tabelas no schema `public` com GRANTs + RLS:

- **search_queries** — log de toda busca (auth e anônima). RLS: insert público, select só admin.
- **search_trends** — agregado por termo/entidade com contadores diário/semanal/mensal/total. RLS: select público (dados agregados, sem PII), write só service_role.
- **user_search_history** — histórico individual. RLS: usuário vê/edita só o próprio.
- **ai_answers_log** — todas as respostas da IA, com `has_enough_data`, `confidence_score`, `data_sources_used`. RLS: insert público, select admin.
- **popular_entities** — ranking pré-agregado por período (`day`/`week`/`month`/`all`). RLS: select público.

Índices: `normalized_query`, `(entity_type, entity_id)`, `(user_id, created_at desc)`, `(period, search_count desc)`.

RPCs:
- `register_search(query, type, entities, user)` — insere em `search_queries` + atualiza `search_trends` (upsert + increment).
- `get_search_trends(period, entity_type, limit)` — retorna top termos/entidades.
- `record_ai_answer(...)` — insere em `ai_answers_log`.
- `search_global(q, limit)` — busca fuzzy (ILIKE/unaccent) em `times`, `jogadores` (se existir), `ligas`. Retorna união tipada.

Sem `LIMIT 1000` em lugar nenhum — paginação via `range` quando necessário (memory: Zero Limits).

## 2. Edge function `intelligent-search`

Endpoint único, `verify_jwt = false`, recebe `{ query, user_id?, mode? }`.

Fluxo:
1. Normaliza texto (lowercase, unaccent).
2. **Classifica intenção** via heurística rápida + fallback Lovable AI Gateway (`google/gemini-3-flash-preview`):
   - `entity` (nome de time/jogador/competição)
   - `stat` (palavras tipo "artilheiros", "média", "ranking", "mais gols")
   - `question` (perguntas em linguagem natural)
3. Resolve entidades no banco (RPC `search_global`).
4. Monta **contexto factual** (top jogos, stats agregadas, artilheiros, etc).
5. Se `question`: chama Gemini com system prompt rígido — "responda APENAS com base nos dados fornecidos; se insuficiente, diga 'Ainda não há dados suficientes no Statball para responder com precisão.'". Resposta JSON estruturada: `{ answer, explanation, data_used, tables, related_links, has_enough_data, confidence }`.
6. Registra em `search_queries`, atualiza `search_trends`, salva em `ai_answers_log` e `user_search_history` (se logado).
7. Retorna `{ type, entities, results, ai_answer?, related }`.

CORS + zod validation + tratamento 402/429.

## 3. Frontend

### Componentes (`src/components/search/`)
- `SmartSearchBar.tsx` — input grande estilo Google, autocomplete debounced (300ms), atalho `/`.
- `RecentSearchesList.tsx` — últimas buscas globais.
- `TrendingCards.tsx` — grid: termos populares, times, jogadores, campeonatos.
- `AIAnswerCard.tsx` — render da resposta IA com markdown, fontes de dados, links internos, badge "Dados insuficientes" quando aplicável.
- `EntityResultCard.tsx` — card para time/jogador/competição com últimos jogos, stats, link.
- `SearchResultsTable.tsx` — tabela de resultados estatísticos.
- `UserSearchHistory.tsx` — histórico do usuário logado.
- `GlobalSearchRanking.tsx` — top buscas globais.

### Hook `useIntelligentSearch.ts`
Wrap `supabase.functions.invoke('intelligent-search')` + React Query.

### Páginas novas
- **`/pesquisa`** (`src/pages/Pesquisa.tsx`) — busca completa com filtros (entidade, temporada, tipo de stat), histórico, tendências, resultados.
- **`/trends`** (`src/pages/Trends.tsx`) — rankings de termos/times/jogadores/campeonatos com seletor de período (dia/semana/mês) e gráfico de crescimento.

### Home (`src/pages/Index.tsx`)
Adiciona seção hero com `SmartSearchBar` em destaque + `TrendingCards` e `RecentSearchesList` logo abaixo. Mantém o restante da home.

### Rotas (`src/App.tsx`)
Adiciona `/pesquisa` e `/trends`.

### Navbar
Adiciona link "Pesquisa" e ícone de lupa no topo (abre `/pesquisa`).

## 4. SEO + futura monetização
- `<head>` dinâmico nas páginas `/pesquisa` e `/trends` (title, description, canonical).
- Estrutura `popular_entities` permite gerar páginas SEO futuras tipo `/pesquisa/flamengo` (já compatível — só renderiza resultado pré-cacheado).
- Hook reservado `isPremium` no componente IA para futuro gating (sem bloqueio agora).

## 5. Regras respeitadas
- Sem `.limit(1000)` (Zero Limits).
- UTC-3 nas datas exibidas.
- Sem brasões de time — usa `TeamBadge`.
- Lovable AI Gateway (não Google direto).
- AdSense fora desta página (página de conversão/IA).
- Idioma PT-BR.

## Detalhes técnicos

- Edge function: `supabase/functions/intelligent-search/index.ts` + entrada em `supabase/config.toml`? Não — já é default Lovable-managed, sem config extra.
- Migration única com todas as tabelas + RPCs + GRANTs + RLS na ordem correta (CREATE → GRANT → ENABLE RLS → POLICY).
- Tipos do Supabase serão regenerados após a migration.
- Render markdown na resposta IA com `react-markdown` (já no projeto? checar; se não, `bun add react-markdown`).
- Sem mudanças destrutivas em código existente; apenas adições + edição mínima de `Index.tsx`, `App.tsx`, `Navbar.tsx`.

## Entregáveis nesta tarefa
1. Migration (aprovar).
2. Edge function `intelligent-search`.
3. Componentes em `src/components/search/`.
4. Hook `useIntelligentSearch`.
5. Páginas `Pesquisa.tsx` e `Trends.tsx` + rotas.
6. Integração na Home + Navbar.

## Fora de escopo (futuro)
- Páginas SEO geradas automaticamente (estrutura pronta, geração depois).
- Gating premium efetivo (estrutura pronta).
- Indexação full-text dedicada (`pg_trgm`/`tsvector`) — começa com ILIKE/unaccent, evolui se necessário.
