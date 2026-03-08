

# Diagnóstico da Qualidade de Dados — Resultados e Plano de Ação

## Descobertas Críticas

### Bug no hook `useDataQuality.ts` — números inflados
O número **655 "times sem partidas"** está **errado**. O real é **62**. O bug: o hook busca partidas com `.select("time_casa_id")` que retorna no máximo 1000 linhas (limite padrão do banco), mas existem **16.718 partidas**. Então ele só vê ~1000 IDs de time e conclui que os outros 655 não têm jogo. O mesmo afeta o cálculo de "Nomes Similares" (378) — ele carrega todos os 858 times e faz O(n²) no cliente, mas isso em si funciona; o problema é que inclui times merged/inativos.

### Os 62 times órfãos reais
São quase todos **seleções nacionais e regiões** (Algeria, Cambodia, Sealand, Basque Country, Catalonia, etc.) — importadas provavelmente pela sync de Copa do Mundo/seleções. Nenhum tem `api_id`, nenhum tem `pais` preenchido, todos criados em 08/03/2026. Apenas 1 tem alias e 0 têm external_id_map. São registros fantasmas, sem nenhuma referência.

**Exceção importante**: Curaçao aparece **3 vezes** como active + 1 merged — duplicata real que precisa de fusão.

### Os 71 duplicados sugeridos
- **5 pares com 95-100% de certeza**: Curaçao×3, Criciuma/Criciúma EC, Club Brugge KV×2 — fusões seguras
- **66 pares com 70%**: Falsos positivos na maioria (Deportivo Cali ≠ Deportivo Táchira, Ferroviário-CE ≠ Ferroviária-SP), mas alguns são reais (Internacional = Internacional-RS, Fluminense-RJ pode ser o mesmo)

## Plano de Correção

### 1. Corrigir o bug do hook (números inflados) — `useDataQuality.ts`
Substituir as 3 queries client-side por queries SQL server-side que retornam os dados corretos sem limite de 1000 linhas:
- **Times sem partidas**: Usar subquery `NOT EXISTS` direto no banco (via RPC ou query com filtro server-side), filtrando apenas times `active`
- **Nomes similares**: Reutilizar a RPC `get_suggested_duplicates` que já existe no banco, em vez de calcular Dice coefficient O(n²) no cliente

### 2. Adicionar ação "Limpar Órfãos" na página — `AdminDataQuality.tsx`
- Botão "Limpar times sem partidas" que chama uma nova Edge Function
- A Edge Function verifica cada time: se não tem partidas, aliases com referências, external_id_map, nem merge_logs → marca como `disabled` (soft delete, não exclui)
- Mostrar preview antes de executar (lista dos 62 times que serão desativados)
- Excluir da limpeza times que tenham qualquer rastro (aliases de merge, external IDs)

### 3. Fusão automática dos duplicados óbvios
- Curaçao: fundir as 3 cópias active em uma só (a que tem matches, se houver; senão a primeira)
- Criciuma/Criciúma EC e Club Brugge: fundir via `merge_teams` existente
- Isso pode ser feito pela rotina "Resolver com IA" já implementada, ou diretamente

### Arquivos modificados

**`src/hooks/useDataQuality.ts`** — Reescrever as 3 queries:
1. `useTeamsWithoutMatches`: Usar `fetchAllRecords` (helper de paginação) para buscar partidas, OU melhor: criar uma query RPC que retorna times sem partidas diretamente no banco
2. `useSimilarTeams`: Substituir pelo `get_suggested_duplicates` RPC existente
3. `useDuplicateAliases`: Manter (já funciona, aliases não têm problema de volume)

**`src/pages/AdminDataQuality.tsx`** — Adicionar:
1. Botão "Desativar Órfãos" na seção "Times sem Partidas"
2. Modal de confirmação mostrando a lista dos times que serão desativados
3. Filtro para mostrar apenas times `active` (excluir merged da contagem)

**Nova Edge Function `supabase/functions/cleanup-orphan-teams/index.ts`**:
- Recebe auth admin
- Busca times active sem partidas, sem external_id_map, sem aliases relevantes
- Marca como `status = 'disabled'`
- Retorna resumo: quantos desativados, quais nomes

**Nova migration**: Criar RPC `get_teams_without_matches()` que faz a query no servidor sem limite de linhas

