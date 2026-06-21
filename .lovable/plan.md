# Projeção Automática do Chaveamento — Copa 2026

## Objetivo
Acabar com os "A Definir" no `/copa-2026/chaveamento`. A IA simula a fase de grupos, classifica as seleções, e propaga vencedores pelo mata-mata (32 avos → final + 3º lugar), incluindo critério de pênaltis em caso de empate.

## Entregas Visuais

### 1. Página `/copa-2026/chaveamento` (atualizada)
Toggle no topo com 3 modos:
- **Oficial** — apenas resultados já confirmados (estado atual)
- **Projeção IA** (default novo) — preenche todos os slots vazios com a projeção
- **Misto** — oficial onde existir, IA no resto (recomendado)

Cada card projetado mostra:
- Seleções previstas (com bandeira)
- Placar mais provável (ex: `2 - 1`)
- Badge `PROJEÇÃO IA` + barra de confiança (Alta/Média/Baixa)
- Ícone de pênaltis quando a decisão foi por pênaltis (ex: `1 (4) - 1 (3)`)
- Tooltip "Por que?" reaproveitando `PredictionExplanationDialog`

### 2. Página nova `/copa-2026/projecao` (sumário)
- Campeão projetado, vice, 3º e 4º lugar (cards grandes)
- Probabilidade de título de cada seleção (top 10, barras)
- "Zebras possíveis" — confrontos onde o favorito tem <55%
- Botão "Ver chaveamento completo" → `/copa-2026/chaveamento?modo=projecao`

### 3. Selo de versionamento
Quando admin publicar uma "Projeção Oficial v1/v2/v3" (Sprint 3 do plano original), aparece selo `Projeção Oficial v2 · congelada em DD/MM` em cima da projeção viva.

## Lógica de Projeção

### Fase de grupos
Para cada jogo `scheduled`:
1. Buscar probabilidades já calculadas em `world_cup_2026_ai_analyses` (placar mais provável, prob casa/empate/visitante).
2. Se ausente, gerar via mesma função usada hoje (`wc2026-generate-match-preview`) ou fallback Elo + ranking FIFA.
3. Aplicar placar projetado → atribuir pontos (3/1/0) e saldo.
4. Ranquear conforme regras FIFA (pontos → saldo → gols pró → confronto direto).
5. Selecionar 1º, 2º e melhores terceiros (formato 48 seleções da Copa 2026).

### Mata-mata
Para cada confronto `A definir`:
1. Resolver as duas seleções a partir da projeção anterior (32 avos pega do grupo, oitavas pega de 32 avos, etc.).
2. Rodar previsão pareada (mesma função que já existe) → placar + probabilidades.
3. Se empate no tempo normal → **disputa de pênaltis**:
   - Buscar histórico de pênaltis (taxa de conversão em DPP) em `world_cup_2026_team_history`
   - Se faltar dado: usar base FIFA 75% conversão + leve viés (Elo + experiência em mata-mata)
   - Vencedor sai com placar `X (P) - Y (P-1)` registrado nos campos novos
4. Propaga o vencedor para o próximo slot.

### Disputa do 3º lugar
Perdedores das semifinais se enfrentam, mesma lógica.

## Backend

### Tabela nova `wc2026_bracket_projections`
```
id, projection_version (text, ex: 'live-2026-06-20T12:00Z' ou 'v1'),
match_id (fk world_cup_2026_matches, nullable para slots fantasmas),
phase (group|r32|r16|qf|sf|final|third),
slot_code (ex: 'R16-1'),
home_team_id, away_team_id,
home_score, away_score,
home_pens, away_pens,
winner_team_id,
confidence (high|medium|low),
prob_home, prob_draw, prob_away,
went_to_penalties bool,
basis jsonb (Elo, FIFA, forma, pesos),
generated_at timestamptz,
is_official_version bool default false,
frozen_at timestamptz null
```
RLS: leitura pública; escrita só `service_role`; `is_official_version=true` + `frozen_at` ⇒ imutável (trigger bloqueia UPDATE/DELETE), reaproveitando padrão da Sprint 1.

### Edge functions
- `wc2026-project-bracket` — orquestrador: simula grupos, propaga mata-mata, escreve linhas com `projection_version='live'` (upsert por slot). Idempotente. Roda:
  - on demand (botão admin)
  - via pg_cron a cada 3h ou após cada partida `finished` (trigger chama via `pg_net`)
- `wc2026-publish-projection` (admin-only, já no plano) — copia snapshot `live` para `v{n}` com `is_official_version=true`, `frozen_at=now()`.

### Hooks frontend
- `useBracketProjection(version?: 'live'|'v1'|...)` — junta partidas oficiais com a projeção, devolve estrutura pronta pro componente bracket existente.

## Componentes a editar
- `src/pages/Copa2026Chaveamento.tsx` — adicionar toggle de modo + consumir hook
- `src/components/league/TournamentBracket.tsx` (ou equivalente em uso aí) — aceitar `projected` flag por card, render do badge/penaltis/confiança
- `src/pages/Copa2026Projecao.tsx` (novo) — página sumário
- Rota nova em `src/App.tsx`

## Fora de escopo desta etapa
- Monte Carlo 10k simulações (continua na Sprint 4)
- ISC por jogo (Sprint 4)
- `/historico-previsoes` comparando v1/v2/v3 (Sprint 3, depois desta)
- Não remove nada das páginas `/ia-performance` e `/transparencia-ia` já feitas

## Ordem de execução
1. Migration: tabela + RLS + trigger imutável + GRANTs
2. Edge function `wc2026-project-bracket` (grupos → mata-mata → pênaltis)
3. Hook `useBracketProjection` + integração no `Copa2026Chaveamento` com toggle
4. Página `/copa-2026/projecao` (sumário + campeão)
5. Cron + trigger pós-jogo para regerar projeção `live`
6. Validar visualmente que nenhum card mostra "A Definir" no modo Projeção IA

Confirma para eu começar?
