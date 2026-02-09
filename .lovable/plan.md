

# Plano: Sincronizar Estaduais - Todos os Anos com Rate Limiting

## Resumo

Criar uma nova edge function dedicada (`sync-estaduais-bulk`) que descobre automaticamente as temporadas disponiveis para cada campeonato estadual na API-Football e importa todas, com controle rigoroso de rate limit. O botao no painel admin dispara essa funcao e retorna imediatamente ao usuario (background).

## Problema Atual

- O botao "Sincronizar Estaduais" chama `sync-api-football` com apenas `season: 2024`
- Nao descobre quais temporadas estao disponiveis por liga
- Nao tem tratamento adequado para multiplas temporadas + rate limit do plano free (100 req/dia)

## Solucao

### 1. Nova Edge Function: `sync-estaduais-bulk`

Funcao que:
1. Consulta `/leagues?id={leagueId}` para descobrir as temporadas disponiveis de cada estadual
2. Itera liga por liga, temporada por temporada, chamando a funcao `sync-api-football` existente para cada combinacao
3. Implementa rate limiting inteligente:
   - 2s entre requisicoes de fixtures por liga/temporada  
   - Monitora headers `x-ratelimit-remaining` da API-Football
   - Pausa automatica se aproximar do limite (backoff exponencial)
   - Desativa syncGoals para economizar requisicoes (cada gol = 1 req extra)
4. Retorna progresso acumulado (ligas, temporadas, partidas importadas)

Ligas estaduais a sincronizar (10 + Copa do Nordeste):
- 475 (Paulista), 423 (Carioca), 425 (Mineiro), 442 (Gaucho)
- 444 (Paranaense), 422 (Pernambucano), 441 (Cearense), 440 (Baiano)
- 519 (Catarinense), 428 (Goiano), 461 (Copa do Nordeste)

### 2. Atualizar Frontend (AdminControlCenter.tsx)

- Modificar `handleSyncEstaduais` para chamar `sync-estaduais-bulk` em vez de `sync-api-football`
- Adicionar estado de loading no botao durante a execucao
- Toast informando que o processo esta rodando em background com estimativa

## Detalhes Tecnicos

### Edge Function `sync-estaduais-bulk/index.ts`

```text
Para cada liga estadual:
  1. GET /leagues?id={leagueId} -> extrair seasons[]
  2. Para cada season disponivel:
     a. Chamar sync-api-football internamente (reutilizar logica)
     b. Aguardar delay de 2-3s entre chamadas
     c. Verificar rate limit headers
     d. Se rate limit < 10, pausar 60s
  3. Acumular stats (matches, teams, errors)
  4. Retornar resultado consolidado
```

Rate limiting:
- Delay base: 2s entre requisicoes de fixtures
- Delay entre ligas: 5s  
- Backoff: se `x-ratelimit-remaining < 10`, pausa de 60s
- syncGoals desativado por padrao (economia de requisicoes)
- Timeout: funcao Deno permite ate ~150s; se exceder, retorna resultado parcial

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/sync-estaduais-bulk/index.ts` | Criar nova edge function |
| `supabase/config.toml` | Adicionar config `verify_jwt = false` |
| `src/pages/AdminControlCenter.tsx` | Atualizar handler e adicionar loading state |

### Fluxo de execucao

```text
[Botao Admin] 
    |
    v
[sync-estaduais-bulk] 
    |
    +--> GET /leagues?id=475 -> seasons: [2020,2021,2022,2023,2024,2025]
    |    |
    |    +--> GET /fixtures?league=475&season=2020
    |    +--> (2s delay)
    |    +--> GET /fixtures?league=475&season=2021
    |    +--> ...
    |
    +--> (5s delay)
    +--> GET /leagues?id=423 -> seasons: [2020,2021,2022,2023,2024,2025]
    |    +--> GET /fixtures?league=423&season=2020
    |    +--> ...
    |
    v
[Retorna stats consolidado]
```

