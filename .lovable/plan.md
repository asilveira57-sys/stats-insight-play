

# Plano: Backfill Massivo de Artigos Semanais via Background Job

## Situação Atual
- Existem **26 artigos semanais** gerados (todos de 2026, semanas 2-10, ~7 ligas)
- Dados históricos cobrem **2012-2026** com ~14.000+ partidas com comparativo
- Brasileirão Série A sozinho tem dados desde 2012 (5.694 partidas) = ~700 semanas
- A função `generate-weekly-validation` só processa 1 semana fixa (default: semana anterior)
- **Não existe** job type `weekly_validations` no `process-queue`

## Inteligência Automática (o que você pediu)
A lógica já funciona naturalmente: quando você importar dados históricos novos (2010, 2011, etc.), eles vão gerar registros em `comparativo_resultados`. A função de backfill varrerá todas as combinações semana/ano/liga que tenham partidas com comparativo mas **sem** artigo semanal correspondente. Ou seja, qualquer dado novo importado automaticamente vira "pendente" sem precisar de tabela de fila separada.

## Alterações Técnicas

### 1. Modificar `generate-weekly-validation/index.ts`
- Adicionar modo `scan_mode: true` que, em vez de processar uma semana fixa, faz:
  - Busca todas as combinações distintas (year, week_number, liga_id) de partidas finished com comparativo
  - Compara com slugs existentes `validacao-semana-*` em `noticias`
  - Pega a próxima combinação pendente
  - Gera 1 artigo por chamada (respeitando timeout de 120s)
  - Retorna `{ pending, generated, total }` para o process-queue controlar
- Adicionar `skip_images: true` para modo batch (15s vs 75s por artigo)

### 2. Adicionar `weekly_validations` ao `process-queue/index.ts`
- Novo entry no `functionMap`: `weekly_validations: { fn: 'generate-weekly-validation', body: { scan_mode: true, skip_images: true } }`
- Novo `case 'weekly_validations'` no switch que rastreia `generated`, `pending`, `total`
- Marca `isDone` quando `pending === 0`

### 3. Adicionar botão no `AdminControlCenter.tsx`
- Novo card "Artigos Semanais" na aba de conteúdo/background jobs
- Mostra pendentes vs total
- Botão "Iniciar Backfill" que cria/ativa o job `weekly_validations`

### 4. Registrar função no `config.toml`
- Garantir `verify_jwt = false` para `generate-weekly-validation`

## Estimativa de Volume
- Brasileirão 2012-2026: ~700 semanas × 1 liga = 700 artigos
- Copa do Brasil 2012-2023: ~600 semanas
- Copa Libertadores 2013-2022: ~500 semanas
- Estaduais + Europeus: ~2000+ semanas
- **Total estimado: ~4.000-5.000 artigos semanais pendentes**
- A ~3 artigos/minuto via cron = ~28 horas de processamento contínuo

## Arquivos a Editar
1. `supabase/functions/generate-weekly-validation/index.ts` — scan_mode + skip_images
2. `supabase/functions/process-queue/index.ts` — novo job type
3. `src/pages/AdminControlCenter.tsx` — botão + KPI
4. `supabase/config.toml` — verificar config (já existe)

