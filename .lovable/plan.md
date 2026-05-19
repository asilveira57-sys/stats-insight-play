# Plano: Automação do Painel Admin

## Diagnóstico (o que está realmente acontecendo)

### 1. Imagem repetida (bola na grama) nas análises
- `generate-match-analysis` **já está correto**: insere `imagem_url: null` (não chama mais Gemini/Nano Banana).
- **Mas**: após o insert, não dispara `generate-article-card-svg`. Então o artigo nasce sem capa, e o card de listagem cai num fallback Unsplash genérico (a imagem "bola na grama" que aparece nos prints).
- Existem **3.405 notícias antigas** ainda com URL não-SVG (gerações Gemini antes da migração). São essas que aparecem repetidas no `/analises`.

### 2. "Gerar Palpites Faltantes" e "Gerar Análises Pendentes" não rodam até zerar
- O sistema correto (`background_jobs` + `process-queue`) existe e funciona em loop, MAS:
  - O botão **"Gerar Palpites Faltantes"** chama `generate-predictions` direto (1 shot, síncrono) — não usa a fila.
  - O botão **"Gerar Todas as Análises Pendentes"** usa a fila corretamente, **porém** `automation_analyses_enabled = false` em `configuracoes`, então o `process-queue` mata o job no primeiro tick com "🛑 Automação desligada".
  - Todos os killswitches estão `false`: `analyses`, `retro_articles`, `validations`, `weekly`, `image_fix`.
- Não há cron visível chamando `process-queue` periodicamente — o loop depende de o orquestrador ser invocado.

### 3. "Palpites Retroativos" (92.368 pendentes) precisa cliques repetidos
- O botão chama `generate-retroactive-predictions` direto com `limit:500` (1 shot, `window.location.reload()`).
- `retro_predictions` **não tem killswitch** no `process-queue`, ou seja, se for enfileirado em `background_jobs` ele roda livre — basta enfileirar e ter o cron.

---

## Plano de execução

### Etapa 1 — Corrigir imagens (zero custo, sem Gemini)

**1.1** Em `generate-match-analysis/index.ts`, após cada `insert` bem-sucedido em `noticias`, disparar (fire-and-forget) `supabase.functions.invoke('generate-article-card-svg', { body: { article_ids: [novoId], mode: 'execute' } })`. Isso resolve **novas** análises individuais.

**1.2** Enfileirar um job único `image_fix` em `background_jobs` para limpar os 3.405 artigos antigos via `fix-article-thumbnails` (já delega 100% ao SVG). O loop continua até zerar.

**1.3** Garantir `automation_image_fix_enabled = true` (ver Etapa 3).

### Etapa 2 — Botões viram "enfileirar job" (não execução síncrona)

Reescrever 3 handlers em `src/pages/Admin.tsx` para apenas fazer `UPDATE background_jobs SET status='running'` (mesmo padrão que `generateAllAnalyses` já usa):

| Botão | Job atual | Job correto |
|---|---|---|
| Gerar Palpites Faltantes | invoke direto `generate-predictions` | enfileirar `predictions` |
| Gerar Todas as Análises Pendentes | já enfileira `analyses` (ok) | manter |
| Gerar Palpites Históricos | invoke direto `generate-retroactive-predictions` | enfileirar `retro_predictions` |

Cada botão mostra toast "Job iniciado em background, acompanhe no Control Center" e para de fazer `window.location.reload()`.

### Etapa 3 — Tornar o loop verdadeiramente automático

**3.1** Ligar killswitches (UPDATE em `configuracoes`):
- `automation_analyses_enabled = true`
- `automation_retro_articles_enabled = true`
- `automation_image_fix_enabled = true`
- (deixar `validations` e `weekly` como o usuário quiser)

**3.2** Criar/ativar cron `pg_cron` chamando `process-queue` a cada **1 minuto**:
- O `process-queue` já roda round-robin em todos os jobs `running`, com backoff e até 10 erros consecutivos antes de parar.
- Com o cron ativo, qualquer job enfileirado roda até zerar sem novos cliques.

**3.3** Retry automático após falha não-fatal:
- Adicionar segundo cron a cada **15 min** que faz `UPDATE background_jobs SET status='running', progress = progress - 'consecutive_errors' WHERE status='failed' AND (progress->>'circuit_breaker')::bool IS NOT TRUE AND (progress->>'stopped_by_killswitch')::bool IS NOT TRUE`.
- Isso garante que erros transitórios (timeout, 5xx) reiniciam sozinhos. Falhas de crédito (402) e killswitch manual continuam parados (proteção de custo).

### Etapa 4 — Feedback no Admin

- Em `Admin.tsx`, exibir o `progress.last_log` de cada job na seção correspondente, com auto-refresh a cada 5s (já existe pattern no `AdminControlCenter`).
- Mostrar "🟢 Rodando em background — restam X" em vez de spinner travado.

---

## Detalhes técnicos

- **Arquivos editados**: `supabase/functions/generate-match-analysis/index.ts`, `src/pages/Admin.tsx`.
- **Migração SQL**: `UPDATE configuracoes` para killswitches + 2 `cron.schedule` (process-queue 1min e auto-retry 15min) usando `net.http_post` com a service URL e anon key.
- **Sem novo custo de IA**: imagens 100% SVG, palpites usam RPC `gerar_palpite_sistema` (matemático, sem IA).
- **Riscos**: ligar killswitches reativa também jobs antigos parados — vamos limpar (`UPDATE background_jobs SET status='stopped'` nos antigos `failed`) antes de ativar os crons.

## Resultado esperado
- 1 clique em cada botão → processo roda em background até zerar (palpites futuros, palpites retroativos 92k, análises 282 pendentes, 3.405 imagens antigas).
- Erros transitórios reiniciam sozinhos a cada 15 min.
- Erros de crédito (402) param e avisam — proteção contra estouro de gasto.
