

# Plano: Importação Kaggle Automatizada com Visibilidade

## O que existe hoje

O fluxo atual é 100% manual: você pesquisa → escolhe dataset → clica em "Ver Arquivos" → clica em "Importar" para cada arquivo individualmente. Não há visão consolidada do progresso.

## O que vamos criar

Uma rotina **"Auto-Discovery"** que encadeia tudo automaticamente:

1. **Pesquisa automática** — percorre as 8 queries populares já definidas (football results, soccer matches, brasileirao, etc.) buscando datasets relevantes
2. **Filtra e prioriza** — seleciona apenas CSVs com nomes que indicam partidas (match, result, game, score) e ignora datasets já importados
3. **Pipeline encadeado** — para cada arquivo elegível: Download → Profile → Stage → Resolve → Promote, com pausa de 5s entre arquivos
4. **Painel de progresso em tempo real** — nova aba "Auto Import" no AdminKaggle mostrando:
   - Fila de arquivos descobertos (com status: aguardando / processando / completo / falhou)
   - Barra de progresso geral
   - Log em tempo real de cada etapa
   - Botão de **Parar** a qualquer momento
5. **Controle de segurança** — limita a 5 arquivos por execução (configurável), respeita o circuit breaker, e nunca reimporta um hash já presente

## Implementação técnica

### Nova Edge Function: `kaggle-autodiscover`
- Recebe `{ queries: string[], max_files: number }`
- Para cada query, chama a Kaggle API, filtra CSVs de partidas
- Registra os candidatos numa fila temporária (retorna a lista)
- Não processa ainda — só descobre

### Mudança no `kaggle-batch/index.ts`
- Nova action `auto_pipeline`: recebe lista de `{ dataset_slug, file_name }[]`
- Para cada item: chama quick_import → kaggle-process (profile+stage) → kaggle-resolve → kaggle-promote
- Retorna progresso parcial a cada arquivo concluído
- Respeita timeout de 110s e retorna `{ partial: true, completed: N, remaining: [...] }` para o frontend re-invocar

### Frontend: nova aba "Auto Import" no `AdminKaggle.tsx`
- Botão "Descobrir Datasets" → chama `kaggle-autodiscover`
- Mostra lista de arquivos encontrados com checkbox para selecionar/deselecionar
- Botão "Iniciar Pipeline" → chama `kaggle-batch` action `auto_pipeline` em loop
- Polling a cada 5s para atualizar status dos jobs
- Contador: "3 de 12 arquivos processados — 2.847 partidas importadas"
- Botão vermelho "Parar" que interrompe o loop do frontend

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/kaggle-batch/index.ts` | Nova action `auto_pipeline` |
| `src/pages/AdminKaggle.tsx` | Nova aba "Auto Import" com painel de progresso |
| `supabase/config.toml` | Já tem `kaggle-batch` configurado |

### Segurança
- Máximo 5 arquivos por sessão (ajustável)
- Skip automático de datasets/arquivos já importados (via hash ou job existente)
- Circuit breaker: se qualquer etapa retornar 402/429, para tudo
- Sem cron — execução sempre manual, iniciada por você

