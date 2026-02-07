
# Plano: Importação de Campeonatos Estaduais Brasileiros

## Problema Identificado
A função `rebuild-artilharia` processa 5.484 gols corretamente, mas o **Campeonato Paulista não possui partidas** no banco de dados. A liga existe, mas está vazia porque:
- A edge function `sync-api-football` está limitada a apenas 4 ligas: Série B, Copa do Brasil, Libertadores e Sudamericana
- Os estaduais brasileiros não estão incluídos no sync automático

## Solução
Expandir a edge function `sync-api-football` para suportar todos os estaduais brasileiros disponíveis na API-Football.

---

## IDs dos Estaduais na API-Football

| Campeonato | ID API-Football |
|------------|-----------------|
| Paulista A1 | 255 |
| Carioca | 423 |
| Mineiro | 425 |
| Gaúcho | 442 |
| Paranaense | 444 |
| Pernambucano A1 | 422 |
| Cearense | 441 |
| Baiano | 440 |
| Catarinense | 519 |
| Goiano | 428 |
| Copa do Nordeste | 461 |

---

## Alterações Necessárias

### 1. Atualizar `supabase/functions/sync-api-football/index.ts`

Adicionar os estaduais ao mapeamento de ligas:

```typescript
const API_FOOTBALL_LEAGUES = {
  // Série B, Copa, Internacionais (já existentes)
  71: { code: 'BSB', name: 'Campeonato Brasileiro Série B', country: 'Brazil' },
  73: { code: 'CDB', name: 'Copa do Brasil', country: 'Brazil' },
  13: { code: 'CLI', name: 'Copa Libertadores', country: 'South America' },
  11: { code: 'CSA', name: 'Copa Sudamericana', country: 'South America' },
  
  // NOVOS: Estaduais Brasileiros
  255: { code: 'SPA', name: 'Campeonato Paulista', country: 'Brazil', tipo: 'ESTADUAL', estado: 'São Paulo' },
  423: { code: 'RJA', name: 'Campeonato Carioca', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Rio de Janeiro' },
  425: { code: 'MGA', name: 'Campeonato Mineiro', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Minas Gerais' },
  442: { code: 'RSA', name: 'Campeonato Gaúcho', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Rio Grande do Sul' },
  444: { code: 'PRA', name: 'Campeonato Paranaense', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Paraná' },
  422: { code: 'PEA', name: 'Campeonato Pernambucano', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Pernambuco' },
  441: { code: 'CEA', name: 'Campeonato Cearense', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Ceará' },
  440: { code: 'BAA', name: 'Campeonato Baiano', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Bahia' },
  519: { code: 'SCA', name: 'Campeonato Catarinense', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Santa Catarina' },
  428: { code: 'GOA', name: 'Campeonato Goiano', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Goiás' },
  461: { code: 'CNE', name: 'Copa do Nordeste', country: 'Brazil', tipo: 'COPA' },
};
```

### 2. Atualizar lógica de upsert da liga

Modificar para incluir `tipo_principal` e `estado` ao criar/atualizar ligas:

```typescript
const { data: newLeague, error: leagueError } = await supabase
  .from('ligas')
  .upsert({
    nome: leagueInfo.name,
    codigo_api: leagueInfo.code,
    pais: leagueInfo.country,
    ativa: true,
    api_source: 'api-football',
    api_id: leagueId,
    tipo_principal: leagueInfo.tipo || 'NACIONAL',  // NOVO
    estado: leagueInfo.estado || null,               // NOVO
  }, { onConflict: 'codigo_api' })
```

### 3. Adicionar extração de gols das partidas

A API-Football fornece eventos de gols. Adicionar busca de eventos para cada partida finalizada:

```typescript
// Para partidas finalizadas, buscar eventos (gols)
if (status === 'finished') {
  const eventsData = await fetchFromApiFootball(`/fixtures/events?fixture=${fixture.fixture.id}`, apiKey);
  const events = eventsData.response || [];
  
  for (const event of events) {
    if (event.type === 'Goal') {
      await supabase.from('gols_partida').upsert({
        partida_id: matchId,
        time_id: event.team.id === fixture.teams.home.id ? homeTeam.id : awayTeam.id,
        jogador_nome: event.player.name,
        minuto: event.time.elapsed,
        tipo: event.detail, // 'Normal Goal', 'Penalty', 'Own Goal'
      }, { onConflict: 'partida_id,jogador_nome,minuto' });
    }
  }
}
```

### 4. Adicionar botão no Admin Control Center

Criar botão para sincronizar estaduais sob demanda:

```tsx
<Button 
  variant="outline" 
  className="w-full justify-start" 
  onClick={() => handleSyncEstaduais()}
>
  <MapPin className="w-4 h-4 mr-2" /> 
  Sincronizar Estaduais
</Button>
```

Com handler:

```typescript
const handleSyncEstaduais = async () => {
  const estaduais = [255, 423, 425, 442, 444, 422, 441, 440, 519, 428, 461];
  const { data, error } = await supabase.functions.invoke('sync-api-football', {
    body: { leagues: estaduais, season: 2025 }
  });
  // Toast com resultado
};
```

---

## Fluxo de Execução

```text
1. Admin clica "Sincronizar Estaduais"
       ↓
2. sync-api-football busca partidas da API-Football
       ↓
3. Cria/atualiza ligas com tipo_principal = 'ESTADUAL'
       ↓
4. Upsert times e partidas
       ↓
5. Busca eventos de gols para partidas finalizadas
       ↓
6. Admin clica "Reconstruir Artilharia"
       ↓
7. rebuild-artilharia processa gols e cria agregações
       ↓
8. Dados aparecem na página /artilheiros com filtro por campeonato
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-api-football/index.ts` | Adicionar estaduais ao mapeamento + extração de gols |
| `src/pages/AdminControlCenter.tsx` | Adicionar botão "Sincronizar Estaduais" |

---

## Considerações Técnicas

- **Rate Limiting**: API-Football tem limite de requisições. Adicionaremos delays entre chamadas (1s entre ligas, 200ms entre fixtures)
- **Temporada**: Estaduais 2025 já estão em andamento. Usaremos `season: 2025` como padrão
- **Gols**: A extração de eventos aumentará o número de requisições, mas é necessária para popular a artilharia

---

## Resultado Esperado

Após a implementação:
- 11 estaduais brasileiros disponíveis para sync
- Partidas do Paulista, Carioca, Mineiro etc. populadas automaticamente
- Gols extraídos e salvos em `gols_partida`
- Artilharia filtrada por campeonato funcionando corretamente
