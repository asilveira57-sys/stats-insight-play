## Objetivo

Transformar a Pesquisa Inteligente em uma experiência estilo Perplexity: nunca devolver "vazio" quando há dado, mostrar resposta curta + lista clicável (partidas, gols, jogadores), e salvar cada pergunta válida como **post indexável** com slug, meta title e meta description para SEO.

## 1. Resposta nunca vazia (resolvers de team_stats)

No edge function `intelligent-search` (intent `team_stats` / contagem de jogos):

- Quando o usuário pergunta "quantos jogos o X jogou em Y", além do número, retornar a **lista completa de partidas** já agregada:
  - `summary`: "O Flamengo disputou 93 partidas em 2025."
  - `breakdown`: vitórias / empates / derrotas / gols pró / gols contra.
  - `matches[]`: id, data, mandante, visitante, placar, liga, link para `/jogo/:id` (ou rota equivalente já existente).
  - `competitions[]`: agregado por liga com contagem (clicável → `?liga_id=...`).
- Cobrir os outros intents que hoje podem voltar vazio: `top_scorer` (já tem tabela), `match_lookup`, `player_stats`. Para cada um, sempre devolver `summary` + `items[]` clicáveis.
- Garantir fallback: se `partidas` tiver 0 linhas, tentar `historical_*` / `kaggle_staging_matches` antes de declarar vazio.

## 2. UI estilo Perplexity (Pesquisa.tsx)

Novo componente `AnswerCard` substituindo o atual `AIAnswerCard` quando houver `structured_answer`:

```
┌─────────────────────────────────────────────┐
│ "O Flamengo disputou 93 partidas em 2025"   │  ← summary destacado
│ 56V · 22E · 15D · 178 GP · 72 GC             │  ← breakdown chips
├─────────────────────────────────────────────┤
│ Por competição (clicável)                   │
│  • Brasileirão Série A — 38                 │
│  • Libertadores — 13                        │
│  • Copa do Brasil — 9 …                     │
├─────────────────────────────────────────────┤
│ Últimas partidas (expandir lista completa)  │
│  15/12  Flamengo 2x1 Palmeiras  → /jogo/123 │
│  …                                          │
└─────────────────────────────────────────────┘
```

Componentes novos em `src/components/search/`:
- `AnswerCard.tsx` — summary + breakdown chips + fontes.
- `MatchesList.tsx` — lista paginada (10 por vez, "ver mais") de partidas clicáveis.
- `CompetitionBreakdown.tsx` — agregação por liga, cada linha clicável.

## 3. Pesquisa vira post SEO (`/pesquisa/:slug`)

Cada pergunta com resposta válida gera (ou reutiliza) um registro persistido:

- Tabela nova `search_posts`:
  - `id`, `slug` (único), `question`, `normalized_question`, `answer_summary`, `answer_payload jsonb` (matches/breakdown/etc.), `meta_title`, `meta_description`, `entities jsonb` (time/liga/ano), `views`, `created_at`, `updated_at`.
  - Grants conforme regra (`SELECT` para `anon`, escrita só `service_role`); RLS leitura pública.
- No final do edge function, se `structured_answer` existe:
  - Gerar slug determinístico (`quantos-jogos-flamengo-2025`).
  - Upsert em `search_posts` com `meta_title` (`<=60` chars) e `meta_description` (`<=160` chars) baseados no summary.
  - Retornar `post_slug` no payload.
- Rota nova `/pesquisa/:slug` (`SearchPost.tsx`):
  - Carrega `search_posts` pelo slug; renderiza `AnswerCard` + lista + "atualizado em".
  - `<Helmet>` com title/description/canonical/og e JSON-LD `QAPage` + `BreadcrumbList`.
  - Botão "refazer pergunta" → reexecuta busca e atualiza payload (revalidação leve, ex.: > 24h).
- `Pesquisa.tsx`: após resposta, mostrar link "🔗 Página desta pergunta" → `/pesquisa/{slug}`. Em listagens "Trending", linkar para o slug em vez de só re-disparar a query.
- Atualizar `scripts/generate-sitemap.ts` para incluir todos os slugs de `search_posts` (sem filtros extras além de "tem answer").

## 4. Garantias de qualidade

- Nunca salvar post se a resposta veio vazia ou marcada como `low_confidence`.
- Marcar `source` em cada bloco (`interna`, `eventos`, `historico`) — já existe parcialmente, expor na UI.
- Cache HTTP do edge function (5 min) para evitar reprocessar a mesma pergunta repetidamente.

## Arquivos afetados

- `supabase/functions/intelligent-search/index.ts` — novos resolvers `resolveTeamMatches`, slug + upsert `search_posts`.
- Migração: criar `search_posts` com GRANTs + RLS pública para SELECT.
- `src/pages/Pesquisa.tsx` — usar `AnswerCard` + mostrar link do post.
- `src/pages/SearchPost.tsx` (novo) + rota em `src/App.tsx`.
- `src/components/search/AnswerCard.tsx`, `MatchesList.tsx`, `CompetitionBreakdown.tsx` (novos).
- `src/hooks/useIntelligentSearch.ts` — tipos do novo payload (`structured_answer`, `post_slug`).
- `scripts/generate-sitemap.ts` — incluir slugs de `search_posts`.

## Fora de escopo

- Editor manual dos posts gerados (pode vir depois via Admin).
- Tradução / multi-idioma das respostas.
- Geração de imagem OG por post (usa OG padrão do site por enquanto).
