

# Rotina Automática de Resolução de Duplicados com IA

## Resumo

Criar uma nova Edge Function `auto-resolve-duplicates` que processa todos os duplicados sugeridos em lote, usando a função existente `run-team-merge-validation` como base de análise. No frontend, adicionar um botão "Resolver com IA" na aba Duplicados e um painel de progresso em tempo real.

## Arquitetura

```text
[Botão "Resolver com IA"]
        │
        ▼
[Edge Function: auto-resolve-duplicates]
        │
        ├── Busca todos os duplicados sugeridos (RPC get_suggested_duplicates)
        ├── Filtra já dispensados (dismissed_duplicates)
        │
        └── Loop por cada par:
              │
              ├── Checa cache em team_merge_validation_runs
              │     (se já tem resultado, reutiliza)
              │
              ├── Busca partidas de ambos os times
              ├── Gera amostra inteligente (selectSmartSample)
              ├── Busca evidência externa via Firecrawl
              ├── Envia para Gemini (tool calling)
              │
              ├── Se SAME_TEAM + confiança ≥ 85%:
              │     → merge_teams RPC + registra em team_merge_decisions
              │
              ├── Se DIFFERENT_TEAM + confiança ≥ 70%:
              │     → insere em dismissed_duplicates
              │
              ├── Se INCONCLUSIVE:
              │     → pula, deixa pra revisão manual
              │
              ├── Se erro 429 (rate limit):
              │     → aguarda 60s e retenta
              │
              └── Atualiza progresso na tabela background_jobs
```

## Mudanças

### 1. Nova Edge Function: `supabase/functions/auto-resolve-duplicates/index.ts`

Função que:
- Recebe auth do admin (valida com `has_role`)
- Busca todos os pares de duplicados sugeridos (usa mesma RPC `get_suggested_duplicates`)
- Filtra os já dispensados (consulta `dismissed_duplicates`)
- Para cada par, executa a lógica de análise (extraída/copiada de `run-team-merge-validation`):
  - Busca partidas, gera samples, busca evidência Firecrawl, chama Gemini
  - Salva resultado em `team_merge_validation_runs`
  - Se `SAME_TEAM` com confiança ≥ 85%: executa `merge_teams` RPC
  - Se `DIFFERENT_TEAM` com confiança ≥ 70%: insere em `dismissed_duplicates`
  - Se `INCONCLUSIVE`: registra o run mas não toma ação
- Trata rate limits (429) com retry após delay de 60s, máximo 3 retries por par
- Trata erros genéricos: loga, pula pro próximo par, continua
- Registra progresso em `background_jobs` (tabela já existente) para o frontend acompanhar
- Retorna resumo final: { merged, dismissed, inconclusive, errors, total }

**Timeout**: Como a função pode demorar, ela processará em batches de no máximo 10 pares por invocação (respeitando o timeout de ~120s). O frontend fará polling e reinvocará enquanto houver pendentes.

### 2. Frontend: `src/hooks/useAutoResolveDuplicates.ts`

Hook que:
- Dispara a Edge Function em loop: chama, espera resultado, se ainda houver pendentes, chama de novo
- Mantém state de progresso: `{ total, processed, merged, dismissed, inconclusive, errors, isRunning }`
- Trata 429 no frontend: espera e retenta
- Permite cancelar (flag `shouldStop`)

### 3. Frontend: `src/pages/AdminTeams.tsx`

Na aba Duplicados:
- Adicionar botão "Resolver com IA" ao lado do título
- Quando ativo, exibir barra de progresso com contadores (Fundidos / Dispensados / Inconclusivos / Erros)
- Botão "Parar" para cancelar
- Ao finalizar, invalidar queries de duplicados/teams/merge-logs

### 4. Atualizar `supabase/config.toml`

Não necessário — config.toml é auto-gerenciado.

## Tratamento de erros (sem parar)

- **Rate limit 429**: Aguarda 60s, retenta até 3x
- **Firecrawl falha**: Pula evidência externa, usa apenas análise de dados internos (ligas, adversários)
- **Gemini falha**: Marca como INCONCLUSIVE, prossegue
- **merge_teams falha**: Loga erro, prossegue para o próximo par
- **Timeout de função**: Frontend detecta e reinvoca para o batch seguinte

