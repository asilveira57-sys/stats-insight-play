

## Problem

The "Artigos de Validação Pós-Jogo" generation has two issues:

1. **Query hits the default 1000-row limit**: The function fetches finished matches with `.limit(batchLimit * 5)` = 5 rows when called from `process-queue` with `limit: 1`. It then filters client-side against existing articles. With 14,824 pending items, the function fetches only 5 matches, most of which may already have articles, resulting in 0 created and the job marking itself as "done".

2. **The background infrastructure exists but the function doesn't work correctly with it**: The `validations` row exists in `background_jobs`, the `process-queue` worker handles it, and the UI has start/stop buttons. But the edge function's query logic fails to find pending matches efficiently.

## Plan

### 1. Fix `generate-validation-article` edge function query logic

Replace the current approach (fetch matches, filter client-side) with a progressive scanning approach similar to what was done for `retro_articles`:

- **Paginate the existing articles query**: Fetch ALL existing `partida_id`s from `noticias` where slug contains `validacao-palpites`, using pagination to bypass the 1000-row limit. Build a Set of already-covered match IDs.
- **Progressive batch scanning**: Instead of fetching a small number of matches and hoping they don't have articles, scan `comparativo_resultados` in batches (e.g., 200 at a time), joining with `partidas`, and skip those already in the Set. Stop once we find `limit` actionable matches.
- **Handle duplicate slug errors gracefully**: Catch `duplicate key` errors on insert and skip instead of crashing (same pattern as retro_articles fix).

### 2. Verify `process-queue` integration

The `process-queue` worker already handles `validations` correctly -- it calls `generate-validation-article` with `{ limit: 1 }`, parses the response (`results.created`, `results.stats.pending`), and marks the job done when `pending === 0` or no progress is made. No changes needed here.

### 3. No UI changes needed

The `AdminControlCenter.tsx` already has the full card with:
- Start/Stop buttons using `startJob('validations')` / `stopJob('validations')`
- Real-time progress via the `background_jobs` realtime subscription
- Progress bar, stats (Com comparativo / Com artigo / Pendentes), and clickable article links

### Files to edit
- `supabase/functions/generate-validation-article/index.ts` -- Fix the query logic with paginated scanning

