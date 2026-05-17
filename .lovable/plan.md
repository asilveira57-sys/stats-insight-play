# Destravar Dashboard e Admin

## Diagnóstico

Os 503 que você vê (`PGRST002 — Could not query the database for the schema cache`) acontecem quando o Postgres do Lovable Cloud fica sobrecarregado e reinicia o cache interno. A causa é uma combinação de:

1. Várias páginas (Dashboard, Admin, Hub) disparam **HEAD com `count=exact`** em tabelas grandes (`partidas`, `times`, `sync_logs`) sem índice adequado → cada count vira full scan.
2. `sync_logs` (~40k linhas) sem índice em `completed_at` / `started_at`.
3. `partidas` sem índices para `status`, `data`, `gols_casa IS NULL`, `api_id IS NULL`.
4. O Dashboard roda tudo em paralelo no `mount`, então 10+ queries pesadas batem ao mesmo tempo.
5. Não há filtro regional — sempre lê o mundo inteiro.

## Escopo

Apenas **Dashboard (`/dashboard`) + Admin (`/admin`)**. RSS, geração de análises e conteúdo ficam de fora.

## Plano

### 1. Migration — índices que faltam

```text
partidas:
  - (status)
  - (data)
  - (liga_id, data)
  - (status) WHERE gols_casa IS NULL                  -- "finalizadas sem placar"
  - (api_id) WHERE api_id IS NULL                     -- "sem api_id"
  - (data) WHERE status = 'live'                      -- ao vivo

sync_logs:
  - (completed_at DESC NULLS LAST) WHERE completed_at IS NOT NULL
  - (status, started_at DESC)

times:
  - (slug) WHERE slug IS NULL

ligas:
  - (ativa)
  - (pais)
```

Mais função SQL `public.estimated_count(table_name text)` que lê `pg_class.reltuples` — para totais "aproximados" no Dashboard sem full scan.

### 2. Dashboard — quebrar em ondas

**Onda 1 (mount, rápido, só com índice):**
- ligas ativas, jogos de hoje, ao vivo, última sync.

**Onda 2 (lazy, só quando entra no viewport via IntersectionObserver):**
- totais de partidas/times/artilheiros → usar `estimated_count()` em vez de `count=exact`.

**Onda 3 (sob demanda, botão "Verificar integridade"):**
- `useIntegrityAlerts` muda para `enabled: false` por padrão.

### 3. Filtro regional (servidor, não cliente)

Novo seletor no `DashboardFilters` com 3 estados:

- **🇧🇷 Brasil** (default) → `liga.pais IN ('Brazil','Brasil')`.
- **🌎 Nacional** → detecta por `Intl.DateTimeFormat().resolvedOptions().timeZone` + `navigator.language` (Itália → Serie A, Espanha → La Liga…). Zero APIs externas.
- **🌐 Global** → sem filtro, com aviso "modo mais lento".

Preferência salva em `user_preferences.dashboard_focus`. Hoje o filtro é só client-side (já vi no `DashboardHome.tsx`); vai virar parâmetro real nas queries.

### 4. Admin — destravar a landing

- `Admin.tsx`: queries iniciais com `.limit(50)` + filtro de ligas prioritárias por padrão, com toggle "ver tudo".
- Blocos pesados (estatísticas de finalizadas, validação, retroativo) viram `<Collapsible>` que só busca quando expande.
- Guarda de timeout: se um bloco passar de 8s, mostra erro com botão "Tentar novamente" em vez de travar a página.
- `useAdminAccess` ganha retry com backoff (3 tentativas) — hoje uma falha de timeout já bloqueia o acesso ao painel.

### 5. Hub Dashboard

`src/pages/hub/Dashboard.tsx` faz um loop paginado em `sync_logs` 24h sem filtro de índice — vai usar a mesma query indexada de `sync_logs(status, started_at)`.

## Arquivos afetados

- Migration nova (índices + função `estimated_count`).
- `src/hooks/useDashboardData.ts`
- `src/pages/DashboardHome.tsx`
- `src/components/dashboard/DashboardFilters.tsx`
- `src/pages/Admin.tsx`
- `src/hooks/useAdminAccess.ts`
- `src/hooks/useUserPreferences.ts`
- `src/pages/hub/Dashboard.tsx`

## Fora do escopo

RSS, geração de análises, conteúdo, design.

## Próximo passo

Aprove com **Implement plan** e eu já mando a migration dos índices primeiro (é o que mais alivia o banco) e na sequência refatoro o Dashboard e o Admin.
