# Plano: parar geração de conteúdo e manter só pré-jogo brasileiro

## Objetivo
Cortar custo de IA imediatamente: **parar tudo** que gera artigos/imagens retroativamente ou em massa. Manter apenas um fluxo: para cada partida **brasileira futura** (não iniciada), o sistema gera palpite + análise pré-jogo + artigo pré-jogo. Pós-jogo, retroativo e regeneração de imagens ficam **desligados** até você reativar manualmente.

## O que será desligado

### 1. Cron jobs (pg_cron) — desativar via `UPDATE cron.job SET active=false`
- `generate-analysis-job` (roda 08h e 20h) — gera análises em lote
- Mantém `process-queue-every-minute` e `process-background-jobs` **ativos**, mas com kill-switch nos workers de artigo/imagem (ver item 2)

### 2. Background jobs — marcar `stopped_by_killswitch` no `progress`
Parar os workers que rodam dentro da fila:
- `retro_articles` (já stopped — confirmar)
- `retro_predictions` (running → stopped)
- `analyses` em modo retroativo (running → stopped)
- `image_fix`, `weekly_validations`, `validations`

### 3. Edge functions — bloquear na entrada (retornar 200 + `{disabled:true}`)
Adicionar flag global `CONTENT_GENERATION_ENABLED=false` lida de `app_settings` (tabela já existente) ou de uma constante. Funções afetadas:
- `generate-retroactive-articles`
- `generate-retroactive-predictions`
- `reprocess-articles`
- `regenerate-article-images`
- `generate-article-card-svg` (quando chamada em lote)
- `generate-svg-thumbnails`
- `fix-article-thumbnails`
- `generate-validation-article`
- `generate-weekly-validation`
- `generate-league-pillar`, `generate-team-pillar`, `generate-team-seo` (SEO em massa)
- `generate-match-analysis` quando o input **não** for partida brasileira futura

### 4. UI Admin
Esconder/desabilitar botões de:
- Reprocessamento de artigos
- Regeneração de imagens (Nano Banana / SVG em lote)
- Artigos retroativos
- Pilares SEO em massa

Exibir banner "Geração de conteúdo pausada — modo economia ativo".

## O que continua funcionando (whitelist)

Fluxo único permitido — disparado pelo `process-queue` a cada minuto:

```text
Partida BR futura detectada (status='scheduled' AND liga BR AND data > now())
        │
        ▼
generate-predictions  ──► palpite salvo (probabilidades, placar, força)
        │
        ▼
generate-match-analysis ──► análise técnica pré-jogo
        │
        ▼
gerar artigo pré-jogo (1 chamada IA) + thumbnail SVG (sem IA de imagem)
        │
        ▼
salvar em `noticias` com tipo='pre_jogo'
```

Regras do whitelist:
- **Somente ligas brasileiras** (filtro por `liga.pais='Brasil'` ou lista de IDs BR já usada no projeto)
- **Somente partidas futuras** (`data > now()` e `status IN ('scheduled','timed')`)
- **Uma vez por partida** (skip se já existe `noticias.partida_id` com `tipo='pre_jogo'`)
- **Sem geração de imagem por IA** — usa só o SVG card gerador (zero custo)
- **Sem reprocessamento** — artigo gerado uma vez e fica

## Como reativar depois
Você diz "pode voltar a gerar X" e eu:
1. Inverto a flag `CONTENT_GENERATION_ENABLED` ou
2. Reativo o cron job específico (`UPDATE cron.job SET active=true WHERE jobname=...`) ou
3. Reabilito o worker específico no background_jobs

## Implementação técnica

### Migration 1 — kill-switch global
```sql
INSERT INTO app_settings(key, value) VALUES
  ('content_generation_enabled', 'false'),
  ('content_generation_whitelist', '{"pre_game_br_only": true}')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
```

### Migration 2 — pausar crons e jobs
```sql
UPDATE cron.job SET active=false WHERE jobname IN ('generate-analysis-job');
UPDATE background_jobs
  SET status='stopped',
      progress = progress || '{"stopped_by_killswitch": true, "stopped_reason": "cost_control_2026_05"}'::jsonb
  WHERE job_type IN ('retro_articles','retro_predictions','analyses','image_fix','validations','weekly_validations')
    AND status IN ('running','failed');
```

### Edge function guard (adicionar no topo de cada função listada)
```ts
const { data: setting } = await supabase
  .from('app_settings').select('value')
  .eq('key','content_generation_enabled').single();
if (setting?.value !== 'true' && !isWhitelistedPreGameBR(body)) {
  return new Response(JSON.stringify({ disabled: true, reason: 'cost_control' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type':'application/json' }});
}
```

### Nova função: `generate-pregame-br-articles`
Orquestrador chamado pelo `process-queue`:
1. Busca partidas BR scheduled nas próximas 7 dias sem artigo
2. Garante palpite (chama `generate-predictions` se faltar)
3. Garante análise (chama `generate-match-analysis`)
4. Gera artigo pré-jogo (1 prompt único, ~400 palavras)
5. Gera thumbnail via `generate-article-card-svg` (SVG, sem IA)
6. Marca em `noticias` com `tipo='pre_jogo'`

### UI — `src/components/admin/...`
Banner global em `AdminLayout` quando `content_generation_enabled=false`. Botões de regeneração ficam desabilitados com tooltip "Pausado por economia — peça ao Lovable para reativar".

## Estimativa de impacto no custo
- **Hoje**: análises 2x/dia em lote + retroativos + regeneração imagens + reprocess = centenas de chamadas Gemini/dia
- **Depois**: ~10-30 partidas BR/semana → ~3-5 chamadas Gemini/dia
- **Imagens IA**: 0 (só SVG)

## Aprovação
Confirme para eu seguir. Quando aprovar, executo migração + flag + edits nas edge functions + UI banner em uma única passada.