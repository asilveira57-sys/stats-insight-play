

# Plano: Histórico Interativo por Temporada com Visualização de Chaveamento

## Problema Identificado

Os cards de temporada na seção "Histórico por Temporada" são estáticos e não respondem ao clique. O usuário espera:
1. Ver todos os jogos de cada temporada selecionada
2. Para competições mata-mata (Copa do Brasil, Libertadores), ver uma árvore/chaveamento visual das fases eliminatórias
3. Para competições de pontos corridos (Brasileirão), ver rodada por rodada

## Análise dos Dados

| Liga | Tipo | Rodadas Disponíveis |
|------|------|---------------------|
| Brasileirão Série A | Pontos Corridos | 1-38 (completo) |
| Copa do Brasil | Mata-mata | 1-8 (fases + 1386 sem rodada) |
| Libertadores | Mata-mata | 1-16 (grupos + fases) |

**Cobertura de dados por ano (Brasileirão):**
- 2023-2026: 380 jogos/ano (completo)
- 2012, 2013, 2015, 2016, 2019, 2021: 170-380 jogos (parcial a completo)

---

## Solução Proposta

### 1. Componente `SeasonDetailModal`
Modal que abre ao clicar em um card de temporada, exibindo:

**Para Pontos Corridos (Brasileirão):**
```text
┌─────────────────────────────────────────────┐
│  Brasileirão 2024                           │
├─────────────────────────────────────────────┤
│  [Filtros: Rodada ▼] [Time ▼] [Buscar]      │
├─────────────────────────────────────────────┤
│  Rodada 1 (10-14 Abr 2024)                  │
│  ┌─────────────────────────────────────┐    │
│  │ Flamengo 2 x 1 Palmeiras            │    │
│  │ Corinthians 0 x 0 São Paulo         │    │
│  │ ...                                 │    │
│  └─────────────────────────────────────┘    │
│  Rodada 2 ...                               │
└─────────────────────────────────────────────┘
```

**Para Mata-mata (Copa do Brasil, Libertadores):**
```text
┌─────────────────────────────────────────────────────────────┐
│  Copa do Brasil 2023                                        │
├─────────────────────────────────────────────────────────────┤
│                    ┌──────────┐                             │
│      ┌──────────┐  │  FINAL   │  ┌──────────┐              │
│  SF1 │ Time A   │──┤          ├──│ Time C   │ SF2          │
│      │ Time B   │  │ Campeão  │  │ Time D   │              │
│      └──────────┘  └──────────┘  └──────────┘              │
│           ▲                            ▲                    │
│      ┌────┴────┐                  ┌────┴────┐              │
│  QF  │ A vs X  │                  │ C vs Y  │ QF           │
│      │ B vs W  │                  │ D vs Z  │              │
│      └─────────┘                  └─────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Hook `useSeasonMatches`
Novo hook para carregar partidas filtradas por liga + ano:
- Agrupa partidas por `rodada`
- Detecta tipo de competição (mata-mata vs pontos corridos) via campo `ligas.tipo_principal`
- Retorna estrutura otimizada para ambos os layouts

### 3. Componente `TournamentBracket`
Componente reutilizável para visualização de chaveamento:
- Suporta formatos: 16-avos, oitavas, quartas, semi, final
- Renderização horizontal com linhas conectoras via SVG/CSS
- Mostra placares agregados para jogos ida/volta
- Destaque visual para o campeão

### 4. Componente `RoundByRoundView`
Para campeonatos de pontos corridos:
- Accordion por rodada (1-38)
- Cards de partida com placares
- Links para página do time

---

## Arquivos a Criar/Editar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSeasonMatches.ts` | Criar |
| `src/components/league/SeasonDetailModal.tsx` | Criar |
| `src/components/league/TournamentBracket.tsx` | Criar |
| `src/components/league/RoundByRoundView.tsx` | Criar |
| `src/pages/CampeonatoPilar.tsx` | Editar (adicionar onClick nos cards) |

---

## Detalhes Técnicos

### Detecção de Tipo de Competição
Usar o campo `ligas.tipo_principal`:
- `"liga"` / `"campeonato"` → Pontos corridos → `RoundByRoundView`
- `"copa"` / `"eliminatoria"` → Mata-mata → `TournamentBracket`
- Fallback: se rodada máxima > 10 → pontos corridos

### Mapeamento de Fases (Copa do Brasil)
```typescript
const PHASE_LABELS: Record<number, string> = {
  1: "Primeira Fase",
  2: "Segunda Fase", 
  3: "Terceira Fase",
  4: "Oitavas de Final",
  5: "Quartas de Final",
  6: "Semifinal",
  7: "Final - Ida",
  8: "Final - Volta"
};
```

### Estrutura do Bracket (SVG/CSS)
- Usar CSS Grid para posicionamento
- Linhas conectoras via `::before`/`::after` com borders
- Animação de hover para destacar caminho até a final

---

## UX/UI

1. **Cards clicáveis** com cursor pointer e efeito hover mais pronunciado
2. **Modal responsivo** com scroll interno para temporadas com muitos jogos
3. **Tabs** no modal: "Todas Rodadas" | "Classificação" (se disponível)
4. **Loading skeleton** durante carregamento das partidas
5. **Filtro por time** para encontrar jogos específicos rapidamente

