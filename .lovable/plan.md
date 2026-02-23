

# Correção do Filtro de Ligas na Página de Palpites

## Problemas Identificados

1. **"Brazilian Cup Matches" duplicada 10+ vezes** na tabela `ligas` (todas sem `codigo_api`, importadas incorretamente)
2. **Nomes em inglês** ("Brazilian Cup Matches", "Brasileirao Matches", "Libertadores Matches") que deveriam estar em português
3. **Filtro exibe ligas sem partidas** agendadas, poluindo a interface
4. **Clique seleciona o bloco inteiro** em azul (problema de CSS no componente)

## Solução

### 1. Limpeza do Banco de Dados (Migration SQL)

- Desativar (`ativa = false`) todas as ligas duplicadas "Brazilian Cup Matches" (IDs órfãos sem `codigo_api`)
- Desativar "Brasileirao Matches" e "Libertadores Matches" (duplicatas informais)
- Migrar partidas dessas ligas para as ligas canônicas correspondentes:
  - "Brazilian Cup Matches" -> "Copa do Brasil" (`dadb34d3-...`)
  - "Brasileirao Matches" -> "Campeonato Brasileiro Série A" (`c47cb84c-...`)
  - "Libertadores Matches" -> "Copa Libertadores" (`a05c6f7e-...`)

### 2. Filtro de Ligas Inteligente (Palpites.tsx + usePalpitesDB.ts)

- Alterar `useLeaguesForPredictions` para buscar **somente ligas que possuem partidas agendadas nos próximos 7 dias** (JOIN com `partidas`)
- Remover o `.slice(0, 6)` que limita artificialmente a 6 ligas
- Deduplicar por `slug` no frontend como fallback de segurança
- Ordenar: Brasil primeiro, depois internacionais, alfabeticamente dentro de cada grupo

### 3. Correção Visual (Palpites.tsx)

- Adicionar `outline-none` e `select-none` nos botões de filtro para remover o destaque azul ao clicar
- Garantir que a seleção visual funcione corretamente sem selecionar o bloco inteiro

---

## Detalhes Técnicos

### Migration SQL

```sql
-- Migrar partidas de ligas duplicadas para as canônicas
UPDATE partidas SET liga_id = 'dadb34d3-3d0b-4e0a-a25c-10cbde5dbafd'
WHERE liga_id IN (SELECT id FROM ligas WHERE nome = 'Brazilian Cup Matches');

UPDATE partidas SET liga_id = 'c47cb84c-8cb0-444b-a2b7-9f328c20cc72'
WHERE liga_id IN (SELECT id FROM ligas WHERE nome = 'Brasileirao Matches');

UPDATE partidas SET liga_id = 'a05c6f7e-7a3e-493a-81ab-5c54f59c8b05'
WHERE liga_id IN (SELECT id FROM ligas WHERE nome = 'Libertadores Matches');

-- Desativar duplicatas
UPDATE ligas SET ativa = false WHERE nome IN ('Brazilian Cup Matches', 'Brasileirao Matches', 'Libertadores Matches');
```

### Hook `useLeaguesForPredictions` (usePalpitesDB.ts)

Reescrever para buscar apenas ligas com partidas agendadas, usando uma query que faz JOIN:

```typescript
export function useLeaguesForPredictions() {
  return useQuery({
    queryKey: ['leagues-predictions'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const future = futureDate.toISOString().split('T')[0];

      // Get distinct league IDs from scheduled matches
      const { data: matchLeagues } = await supabase
        .from('partidas')
        .select('liga_id')
        .eq('status', 'scheduled')
        .gte('data', today)
        .lte('data', future);

      const leagueIds = [...new Set((matchLeagues || []).map(m => m.liga_id).filter(Boolean))];
      if (leagueIds.length === 0) return [];

      const { data, error } = await supabase
        .from('ligas')
        .select('id, nome, logo_url, codigo_api, pais, slug')
        .in('id', leagueIds)
        .eq('ativa', true);

      if (error) throw error;

      // Deduplicate by slug
      const seen = new Set();
      const unique = (data || []).filter(l => {
        if (seen.has(l.slug)) return false;
        seen.add(l.slug);
        return true;
      });

      // Sort: Brazil first, then by priority/name
      return unique.sort((a, b) => {
        const priorityA = LEAGUE_PRIORITY[a.codigo_api || ''] ?? 50;
        const priorityB = LEAGUE_PRIORITY[b.codigo_api || ''] ?? 50;
        return priorityA - priorityB;
      });
    },
  });
}
```

### Filtro visual (Palpites.tsx)

- Remover `.slice(0, 6)` para exibir todas as ligas com partidas
- Adicionar classes `outline-none select-none focus:outline-none` nos botões de filtro
- Filtrar por `league.id` em vez de `codigo_api` (pois algumas ligas não possuem `codigo_api`)

### Arquivos modificados

1. **Migration SQL** -- limpeza de duplicatas e migração de partidas
2. **src/hooks/usePalpitesDB.ts** -- hook `useLeaguesForPredictions` inteligente
3. **src/pages/Palpites.tsx** -- remoção do `.slice(0, 6)`, correção do CSS de seleção, filtro por ID

