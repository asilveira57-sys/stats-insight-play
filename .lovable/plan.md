

# Varredura completa: remoção de brasões de time

## Resultado da varredura

A boa noticia: **nenhuma pagina renderiza `<img>` com brasao de time**. Todas as paginas visíveis ja usam o componente `TeamBadge` (círculo colorido com iniciais). Porem, existem resíduos no código que ainda carregam `escudo_url` do banco e o passam como propriedade `logo` — criando risco de uso futuro acidental.

## Locais encontrados

### Risco real (campo `logo` propagado, pode ser usado por engano)

1. **`src/hooks/useMatchesDB.ts`** (linhas 79, 86) — `transformMatch` preenche `logo: match.time_casa?.escudo_url || '/placeholder.svg'`. Esse `logo` é passado para `MatchDetailsModal` e `Resultados.tsx`. Nenhum deles renderiza como `<img>`, mas o campo existe e pode ser usado.

2. **`src/hooks/useTopScorers.ts`** (linhas 7-9, 137-139, 220-243) — Define e propaga `teamLogo: escudo_url`. Nao renderizado como `<img>`, mas campo existe.

3. **`src/hooks/useFootballData.ts`** (linha 187) — `teamLogo: standing.team.crest` (vem de API externa). Nunca renderizado como img no frontend.

4. **`src/hooks/usePalpitesDB.ts`** (linhas 139, 235, 243) — `escudo_url` e `logo` propagados. Usado em `PredictionCard` como prop `logo`, mas o componente usa `TeamBadge` (nao `<img>`).

### Resíduos em tipos/queries (sem rendering, limpeza preventiva)

5. **`src/pages/Times.tsx`** — Query inclui `escudo_url` na select (linha 133), tipo o define (linha 24), mas rendering usa `TeamBadge`.

6. **`src/pages/Retrospectiva.tsx`** — Interface `TeamData` define `escudo_url`, query carrega, armazena em `teamStats`. Rendering usa `TeamBadge`.

7. **`src/pages/RankingIAvsHumanos.tsx`** — Tipo e query incluem `escudo_url`. Rendering usa `TeamBadge`.

8. **`src/pages/hub/SyncDetails.tsx`** — Tipo e query incluem `escudo_url`. Nao renderizado.

9. **`src/pages/PerfilPublico.tsx`** — Query carrega `escudo_url` (linha 77). Nao renderizado.

10. **`src/components/dashboard/DashboardLiveMatches.tsx`** e **`DashboardTodayMatches.tsx`** — Tipos definem `escudo_url`. Nao renderizado.

11. **`src/components/admin/csv/CsvImportExecutor.tsx`** — CSV import salva `escudo_url` no banco. Isso é backend/ingestao, nao rendering.

## Plano de acao

### Prioridade 1: Eliminar campo `logo` dos transforms (evitar uso acidental)

- **`useMatchesDB.ts`**: Remover `logo: escudo_url` do `transformMatch`. Remover `escudo_url` da query select.
- **`useTopScorers.ts`**: Remover `teamLogo` do tipo `PlayerScorer` e da lógica de mapeamento.
- **`useFootballData.ts`**: Remover `teamLogo: standing.team.crest`.
- **`usePalpitesDB.ts`**: Remover `escudo_url` do select, tipo, e campo `logo` nas previsoes.

### Prioridade 2: Remover `escudo_url` dos selects e tipos (limpeza)

- **`Times.tsx`**: Remover `escudo_url` do select e do tipo `Time`.
- **`Retrospectiva.tsx`**: Remover `escudo_url` do `TeamData`, do select, e do `teamStats`.
- **`RankingIAvsHumanos.tsx`**: Remover `escudo_url` do tipo e select.
- **`hub/SyncDetails.tsx`**: Remover `escudo_url` do tipo e select.
- **`hub/Matches.tsx`**: Remover `escudo_url` do select.
- **`PerfilPublico.tsx`**: Remover `escudo_url` do select.
- **`DashboardLiveMatches.tsx`** e **`DashboardTodayMatches.tsx`**: Remover `escudo_url` dos tipos.

### Prioridade 3: Atualizar interfaces dependentes

- **`MatchCard.tsx`**: Remover campo `logo` do tipo `Team` (nao é usado no render).
- **`PredictionCard.tsx`**: Remover campo `logo` dos tipos (nao é usado no render).
- **`MatchDetailsModal.tsx`**: Remover `logo` do tipo `Team`.
- **`Resultados.tsx`**: Remover referências a `.logo` ao montar props do modal.
- **`useMatchesDB.ts`**: Remover `teamLogo` do tipo `Standing`.

### Nota

O campo `escudo_url` continua existindo na tabela `times` do banco de dados e no `types.ts` auto-gerado. Isso é aceitável — o campo pode existir no banco, o importante é que **nunca seja renderizado como imagem no frontend**. O CSV importer (`CsvImportExecutor`) continua gravando `escudo_url` porque é um campo do banco; sem impacto visual.

**Total: ~15 arquivos editados, 0 impacto visual (tudo ja usa TeamBadge), mas elimina qualquer risco de regressao.**

