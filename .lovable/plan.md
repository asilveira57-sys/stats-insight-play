

# Diagnóstico: Por Que os Jobs Param Depois de 1-2 Itens

## Causa Raiz

O sistema de background jobs (`background_jobs` + `process-queue`) foi construído para ser disparado por um **pg_cron** a cada minuto. Mas **o cron job nunca foi criado no banco de dados**. Quando você clica "Iniciar", o frontend apenas muda o status para `running` na tabela -- mas ninguém chama a Edge Function `process-queue` automaticamente. O resultado: o job fica "running" para sempre sem executar nada.

Além disso, o `process-queue/index.ts` tem código morto duplicado (linhas 287-301, um `case image_fix` órfão depois do `case fix_merges`) que pode causar erro de parsing.

## Plano de Correção (3 partes)

### 1. Criar cron job `pg_cron` para chamar `process-queue` a cada minuto
Usar SQL direto (via `supabase--read_query`) para registrar um cron job que faz HTTP POST para a Edge Function `process-queue` a cada minuto. Isso garante que enquanto houver jobs com status `running`, eles serão processados automaticamente sem parar.

### 2. Corrigir código morto no `process-queue/index.ts`
Remover o bloco duplicado de `image_fix` (linhas 287-301) que ficou depois do `case fix_merges`. Também ajustar a lógica `isDone` do `validations` para não marcar como concluído quando `gen === 0` em uma única iteração (pode ser que simplesmente não houve tempo, não que acabou).

### 3. Corrigir botão na tela `/admin` para usar o job em background
O botão "Gerar Artigos de Validação" na tela `/admin` chama `generate-validation-article` diretamente (sem `limit`), gerando poucos e parando. Trocar para usar o mesmo padrão do Control Center: setar `status: 'running'` no `background_jobs` e deixar o cron processar.

### Arquivos a editar:
1. `supabase/functions/process-queue/index.ts` -- Remover código morto, ajustar isDone
2. `src/pages/Admin.tsx` -- Botão de validação usar background job
3. SQL via read_query -- Criar cron job para `process-queue`

### Resultado esperado:
- Clicar "Iniciar" uma vez → cron executa `process-queue` a cada minuto → processa 2-3 artigos por execução → repete até acabar os 14.817 pendentes
- ~180 artigos/hora sem intervenção manual
- Se der erro, o sistema volta e tenta novamente (até 10 erros consecutivos antes de pausar)

