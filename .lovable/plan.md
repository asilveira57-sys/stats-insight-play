
# Importacao GitHub em Background (Backend Function)

## Problema
Toda a logica de importacao roda no navegador (dentro do componente React `GitHubImportWizard`). Quando voce troca de aba ou navega para outra pagina, o React desmonta o componente e a importacao para imediatamente. Por isso os batches ficam travados em "processing" com 0 linhas.

## Solucao
Mover toda a logica de importacao para uma **backend function** que roda independentemente do navegador. O frontend apenas dispara o job e consulta o progresso via polling.

## Arquitetura

```text
+------------------+          +---------------------------+         +----------+
|   Frontend       |  POST    |  import-github-data       |  SQL    | Database |
|  (GitHubWizard)  | -------> |  (backend function)       | ------> |          |
|                  |          |                           |         |          |
|  Poll csv_imports|  SELECT  |  - Fetch files from GH    |         |          |
|  every 3s        | <------- |  - Parse JSON/CSV         |         |          |
+------------------+          |  - Resolve teams/leagues   |         |          |
                              |  - Insert matches          |         |          |
                              |  - Update csv_imports row  |         |          |
                              +---------------------------+         +----------+
```

## Etapas de Implementacao

### 1. Nova backend function: `import-github-data`
Criar `supabase/functions/import-github-data/index.ts` que recebe:
- `batch_id` (UUID do csv_imports ja criado)
- `owner`, `repo` (do GitHub)
- `provider` (string identificadora)
- `files` (lista de `{ path, leagueName, country, season, fileType }`)

A funcao:
1. Busca os arquivos do GitHub (em lotes de 3, como ja faz hoje)
2. Parseia JSON/CSV usando a mesma logica que ja existe em `githubImportUtils.ts` (reescrita em Deno)
3. Resolve ligas, temporadas e times (usando caches em memoria + queries ao banco)
4. Insere partidas com deduplicacao por `(liga_id, data, time_casa_id, time_fora_id)`
5. Atualiza a linha em `csv_imports` com progresso a cada lote de arquivos processado
6. Registra em `sync_logs` ao final
7. Implementa safety check de tempo (~140s) para salvar progresso parcial antes do timeout

### 2. Reescrever o frontend `GitHubImportWizard`
- **Scan** (passo 1-2): continua no frontend, pois e rapido
- **Import** (passo 3): muda completamente:
  - Cria o registro em `csv_imports` com status `processing`
  - Chama a backend function `import-github-data` via `supabase.functions.invoke()` (fire-and-forget, sem await do resultado)
  - Inicia **polling** a cada 3 segundos na tabela `csv_imports` para mostrar progresso
  - O usuario pode navegar livremente; ao voltar, o polling retoma e mostra o estado atual

### 3. Adicionar coluna `progress_detail` na tabela `csv_imports`
Uma coluna JSONB para a backend function reportar progresso granular:
```json
{
  "processed_files": 3,
  "total_files": 8,
  "current_file": "Brasileirao/2020.csv",
  "inserted": 245,
  "updated": 12,
  "skipped": 3,
  "failed": 1
}
```

### 4. Atualizar `CsvImportHistory` para mostrar jobs em andamento
- Mostrar badge "Em andamento" para batches com status `processing`
- Auto-refresh da lista enquanto houver jobs ativos

## Detalhes Tecnicos

### Backend function (`import-github-data/index.ts`)
- Usa `createClient` do Supabase com `SUPABASE_SERVICE_ROLE_KEY` para acesso irrestrito
- Replica a logica de parsing de `githubImportUtils.ts` e `canonicalUtils.ts` diretamente no arquivo (edge functions nao compartilham codigo do frontend)
- Ja existe `_shared/canonicalUtils.ts` com `normalizeName`, `slugify`, `resolveTeamId`, `resolveLeagueId` -- sera reutilizado
- Busca arquivos do GitHub usando fetch direto (sem depender da outra edge function)
- Atualiza `csv_imports` a cada arquivo processado para dar feedback em tempo real
- Safety check: monitora `Date.now()` e se chegar perto de 140s, salva progresso parcial e retorna com status `partial`

### Frontend (GitHubImportWizard)
- Apos disparar a funcao, entra em modo "polling":
  - `useQuery` com `refetchInterval: 3000` na row do `csv_imports`
  - Le `progress_detail` JSONB para mostrar barra de progresso e contadores
  - Quando `status` muda para `completed` ou `failed`, para o polling
- Se o usuario sair e voltar, o componente re-monta e detecta batches em `processing` automaticamente, retomando a exibicao do progresso

### Migracao SQL
- `ALTER TABLE csv_imports ADD COLUMN progress_detail JSONB DEFAULT '{}'`

### Config
- Adicionar `[functions.import-github-data]` com `verify_jwt = false` no config.toml

## Limpeza
- Marcar os 2 batches travados como `failed` no banco
- Remover toda a logica de importacao pesada do componente React (resolve*, import loops)

## Resultado
- Voce clica "Importar", pode fechar a aba, ir tomar cafe, e quando voltar os dados estarao la
- Progresso visivel em tempo real via polling
- Preparado para futuro cron automatico
