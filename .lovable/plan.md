## Módulo Copa 2026 - Plano de Implementação

Cobertura completa da Copa do Mundo 2026 com páginas públicas, sincronização via API-Football, análises por IA (Lovable AI Gateway / Gemini) e geração automática de posts.

### Fase 1 — Banco de Dados (migration única)

Criar 10 tabelas em `public` com GRANTs corretos, RLS e policies de leitura pública / escrita service_role:

- `world_cup_2026_teams` (seleções, grupo, técnico, histórico resumido, status)
- `world_cup_2026_team_history` (participações anteriores)
- `world_cup_2026_players` (elenco convocado, titular provável)
- `world_cup_2026_matches` (fixtures, fase, grupo, placar)
- `world_cup_2026_lineups` (escalação provável e oficial — flag `is_official`)
- `world_cup_2026_match_events` (gols, cartões, substituições)
- `world_cup_2026_standings` (tabela dos 12 grupos)
- `world_cup_2026_ai_analyses` (pre_match, prediction, post_match, elimination, qualification, group_preview, team_profile, final_recap)
- `world_cup_2026_posts` (central de posts automáticos)
- `world_cup_2026_sync_logs` (logs obrigatórios de sync, IA, posts, erros)

Índices em `slug`, `match_date`, `group_letter`, `stage`, `status`, `team_id`, `match_id`.

RLS:
- SELECT público (`anon` + `authenticated`) em todas as tabelas exceto `sync_logs` (apenas admin).
- INSERT/UPDATE/DELETE apenas `service_role` (sync via edge functions) e role `admin`.

**Sem `.limit()` em queries** (memória Zero Limits).

### Fase 2 — Edge Functions de Sincronização

Todas com logging obrigatório em `world_cup_2026_sync_logs` (start, finish, records_processed, error_message, payload_snapshot):

1. `wc2026-sync-fixtures` — calendário e resultados (API-Football league=1, season=2026)
2. `wc2026-sync-teams` — seleções + grupos
3. `wc2026-sync-squads` — jogadores convocados
4. `wc2026-sync-lineups` — escalações oficiais (executar próximo à partida)
5. `wc2026-sync-events-live` — eventos e placar ao vivo
6. `wc2026-update-standings` — recalcula tabela após cada partida finalizada; marca seleções como `eliminated` / `qualified`
7. `wc2026-ai-generate` — gera análises (pre_match, post_match, prediction) via Lovable AI Gateway (`google/gemini-2.5-flash`). Verifica dados disponíveis; se insuficiente, marca `confidence_score=0` e sinaliza cobertura parcial. Nunca inventa escalação oficial.
8. `wc2026-generate-post` — cria post automático a partir de análise IA (match preview, recap, qualification, elimination)

Agendamento via `pg_cron` (sync de fixtures a cada 6h; standings após partidas; lineups 2h antes do jogo; live a cada 1min durante janelas de jogo). Schedule criado via `supabase--insert` (não migration).

### Fase 3 — Rotas e Páginas

Adicionar em `src/App.tsx`:
- `/copa-2026` → `Copa2026Home`
- `/copa-2026/selecoes` → `Copa2026Selecoes`
- `/copa-2026/selecoes/:slug` → `Copa2026SelecaoDetalhe`
- `/copa-2026/jogos` → `Copa2026Jogos`
- `/copa-2026/jogos/:id` → `Copa2026JogoDetalhe`
- `/copa-2026/posts` → `Copa2026Posts`

Cada página com `Layout`, SEO (title, meta, JSON-LD SportsEvent), responsiva, semantic tokens.

### Fase 4 — Componentes Visuais

Em `src/components/copa2026/`:
- `HeroCopa2026` (hero visual, contador regressivo até abertura)
- `CountdownTimer`
- `MatchOfTheDayCard`
- `NextMatchHighlight`
- `GroupsTable` (12 grupos elegantes)
- `KnockoutBracket` (chaveamento mata-mata SVG)
- `TeamCard` (bandeira, grupo, status badge)
- `TeamStatusBadge` (ativa / classificada / eliminada / live)
- `ScorersTable`, `AssistsTable`, `CardsTable`
- `MatchEventsTimeline`
- `LineupField` (escalação visual 4-3-3 etc.)
- `AIAnalysisBlock` (pré-jogo, palpite, pós-jogo — sempre marcado como "previsão editorial esportiva, não relacionado a apostas")
- `AIAvailabilityNotice` (cobertura parcial quando faltam dados)
- `PostCard`, `PostsList`

Bandeiras: usar emoji flag ou CDN público de bandeiras nacionais (não cai na restrição de logos de clubes — bandeiras de seleções são domínio público).

### Fase 5 — Hooks de Dados

Em `src/hooks/`:
- `useCopa2026Overview` — agrega home (próximo jogo, jogos do dia, grupos, top scorers, posts recentes)
- `useCopa2026Teams` (filtros: grupo, confederação, status)
- `useCopa2026Team(slug)` — detalhe + history + players + matches
- `useCopa2026Matches` (filtros: data, grupo, fase, seleção, status)
- `useCopa2026Match(id)` — detalhe + lineups + events + AI analyses
- `useCopa2026Standings`, `useCopa2026Posts`, `useCopa2026TopScorers`

Todas sem `.limit()`.

### Fase 6 — Navbar

Adicionar link "Copa 2026" no `Navbar` desktop e mobile com badge `LIVE` quando houver jogo em andamento.

### Fase 7 — Admin

- `/admin/copa-2026` — dashboard com botões manuais para invocar cada edge function de sync e visualizar `world_cup_2026_sync_logs` (apenas admin via `has_role`).

### Regras de IA (sistema prompt)
- Texto jornalístico, claro, informativo.
- Palpite = previsão editorial esportiva (proibido linguagem de apostas).
- Usar apenas dados reais do banco; se insuficiente → marcar `has_enough_data=false`, mostrar aviso na UI.
- Nunca inventar escalação oficial antes da confirmação API (`is_official=true` exige fonte = 'api-football').

### Fora do escopo (nesta fase)
- Apostas / odds
- Push notifications
- Comentários de usuários nos posts
- App mobile nativo
- Tradução multi-idioma (PT-BR only)

### Detalhes Técnicos

**Stack:** React + Vite + Tailwind + TanStack Query + Supabase + Lovable AI Gateway (Gemini).
**Provider primário:** API-Football (`API_FOOTBALL_KEY` já existe — World Cup league_id=1, season=2026). Fallback histórico: OpenFootball / dados manuais.
**Quotas:** API-Football Ultra (75k/dia) — respeitar `api_football_quota_log`.
**Timezone:** dados UTC no banco; exibição UTC-3.
**Performance:** paginação client-side para listas longas; React Query stale 60s; live polling 30s só em páginas de jogo ao vivo.

### Ordem de execução
1. Migration (10 tabelas + RLS + GRANTs + índices)
2. Edge functions de sync + AI + posts
3. Cron schedules
4. Hooks + páginas + componentes
5. Navbar + Admin
6. Seed mínimo (32 seleções classificadas, grupos A–L) via `supabase--insert` para a UI ter conteúdo antes do primeiro sync

Aprova para começar pela migration?
