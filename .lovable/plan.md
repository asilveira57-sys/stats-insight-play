

# Corrigir TeamBadge cinza em todo o sistema

## Problema
Três locais usam `TeamBadge` sem passar `primaryColor`/`secondaryColor`, resultando no fallback cinza (#6B7280). As queries de dados também não buscam o campo `cores` dos times.

## Arquivos afetados

### 1. `src/hooks/useDashboardData.ts`
- **`useTodayMatches`** (linha 34): Adicionar `cores` ao select dos times
  - De: `(id,nome,escudo_url,slug,pais)` → Para: `(id,nome,escudo_url,slug,pais,cores)`
- **`useLiveMatches`** (linha 66): Adicionar `cores` ao select dos times
  - De: `(id,nome,escudo_url,slug)` → Para: `(id,nome,escudo_url,slug,cores)`

### 2. `src/components/dashboard/DashboardLiveMatches.tsx`
- Adicionar `cores` à interface `LiveMatch` nos tipos de `time_casa` e `time_fora`
- Passar `primaryColor` e `secondaryColor` para os dois `TeamBadge`

### 3. `src/components/dashboard/DashboardTodayMatches.tsx`
- Adicionar `cores` à interface `Match` nos tipos de `time_casa` e `time_fora`
- No componente `TeamName`, passar `primaryColor` e `secondaryColor` para `TeamBadge`

### 4. `src/components/admin/slugs/TeamsSlugTable.tsx`
- Passar `primaryColor` e `secondaryColor` do team para o `TeamBadge` (os dados de `cores` já estão disponíveis na query do hook `useSlugAdmin`)

## Verificação completa
Os demais usos de `TeamBadge` no sistema já passam cores corretamente:
- `UserPalpitesHistory.tsx` ✅
- `UserPalpiteModal.tsx` ✅
- `Retrospectiva.tsx` ✅
- `RankingSelecoes.tsx` ✅
- `RankingIAvsHumanos.tsx` ✅
- `hub/Matches.tsx` ✅
- `ClubProfile.tsx` ✅

