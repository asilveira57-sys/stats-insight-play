

# Varredura Geral de Qualidade de Dados -- Diagnóstico e Plano de Ação

## Diagnóstico Completo

### 1. Partidas em Ligas Fantasma (CRÍTICO)
Três ligas informais criadas por importações antigas **ainda contêm partidas** que não foram migradas para as ligas canônicas:

| Liga Fantasma | Partidas | Liga Canônica Correta |
|---|---|---|
| `brazilian-cup-matches` (desativada) | 1.335 | Copa do Brasil (`copa-do-brasil`) |
| `libertadores-matches` (desativada) | 1.254 | Copa Libertadores (`copa-libertadores`) |
| `brasileirao-matches` (desativada) | 552 | Campeonato Brasileiro Série A (`campeonato-brasileiro-serie-a`) |

Adicionalmente, existem **10 registros duplicados** da liga "Brazilian Cup Matches" (IDs diferentes, mesmo nome) que precisam ser limpos.

### 2. Partidas Órfãs
- **20 partidas** sem `liga_id` (sem liga associada).

### 3. Times Duplicados por Slug `-1` (14 times com partidas)
Times que possuem um equivalente canônico sem o sufixo `-1`:

| Duplicata (slug) | Partidas | Canônico |
|---|---|---|
| `abc---rn-1` | 59 | `abc---rn` |
| `crb---al-1` | 32 | `crb---al` |
| `asa---al-1` | 18 | `asa---al` |
| `river-plate-uru-1` | 15 | `river-plate-uru` |
| `godoy-cruz-1` | 14 | `godoy-cruz` |
| `la-guaira-1` | 11 | `la-guaira` |
| + 8 outros com 1-3 partidas cada |

### 4. Times com Mesmo Slug (Duplicatas Exatas -- IDs Diferentes)
**17 grupos** de times com slug idêntico mas IDs diferentes. Destaques:
- `independiente-petrolero-1`: **3 registros** (+ 1 canônico)
- `real-atletico`, `danubio`: **3 registros** cada
- `godoy-cruz`, `colon-1`, `sport-boys`, `sporting-cristal`, `athletico-paranaense---pr`, etc: **2 registros** cada

### 5. Times com Estado que Duplicam Base (30+ pares)
Times no formato `nome---uf` que duplicam um time base sem estado. Exemplos: `brusque---sc` / `brusque`, `londrina---pr` / `londrina`, `mirassol---sp` / `mirassol`. Estes exigem decisão manual (podem ser times **diferentes** em estados diferentes, ex: `santa-cruz---rn` vs `santa-cruz` de Recife).

### 6. Ligas com Problemas
- **USL Championship** com slug `campeonato-paulista-1` (conflito com Campeonato Paulista)
- **Premier League** duplicada (`premier-league` ativa + `premier-league-1` desativada com 129 partidas)

### 7. Slugs de Partidas
- Nenhuma partida sem slug. Sem slugs duplicados. OK.

### 8. Cobertura Temporal das Ligas Canônicas
| Liga | Período | Total |
|---|---|---|
| Brasileirão Série A | 2012--2026 | 7.020 |
| Copa do Brasil | 2012--2023 | 1.513 |
| Copa Libertadores | 2013--2022 | 1.373 |

---

## Plano de Ação (4 etapas)

### Etapa 1 -- Migrar Partidas de Ligas Fantasma
Criar uma migration SQL que:
1. Mova as 1.335 partidas de `brazilian-cup-matches` para `copa-do-brasil`
2. Mova as 1.254 partidas de `libertadores-matches` para `copa-libertadores`
3. Mova as 552 partidas de `brasileirao-matches` para `campeonato-brasileiro-serie-a`
4. Mova as 129 partidas de `premier-league-1` para `premier-league`
5. Associe as 20 partidas órfãs (se possível, via times) ou marque para revisão
6. Delete os registros duplicados das ligas fantasma

### Etapa 2 -- Fundir Times Duplicados por Slug
Invocar `bulk-merge-teams` com a lista de 14 merges de slug `-1`:
- `abc---rn-1` -> `abc---rn`
- `crb---al-1` -> `crb---al`
- `asa---al-1` -> `asa---al`
- `river-plate-uru-1` -> `river-plate-uru`
- `godoy-cruz-1` -> `godoy-cruz`
- `la-guaira-1` -> `la-guaira`
- `universidad-de-concepcion-1` -> `universidad-de-concepcion`
- `vilhena---ro-1` -> `vilhena---ro`
- `independiente-petrolero-1` -> `independiente-petrolero` (3 registros)
- `noroeste---sp-1` -> `noroeste---sp`
- `melgar-1` -> `melgar`
- `estrela-do-norte---es-1` -> `estrela-do-norte---es`
- `fortaleza-ce-1` -> `fortaleza` (se aplicável)

### Etapa 3 -- Deduplicar Times com Mesmo Slug
Criar uma migration SQL para consolidar registros com slug idêntico:
- Para cada grupo (ex: 3x `danubio`, 3x `real-atletico`, 2x `godoy-cruz`), manter o que tiver mais partidas e migrar referências dos outros via `merge_teams` RPC.
- Tratar `colon-1` (2 registros com mesmo slug) e `athletico-paranaense---pr` (2 registros).

### Etapa 4 -- Corrigir Slug da Liga USL
- Atualizar o slug de USL Championship de `campeonato-paulista-1` para `usl-championship`.

### Fora de Escopo (decisão manual necessária)
Os 30+ pares de "time com estado vs time base" **não serão fundidos automaticamente** porque muitos são times **genuinamente diferentes** (ex: `santa-cruz---rn` é Santa Cruz do Rio Grande do Norte, diferente de `santa-cruz` que é Santa Cruz de Recife; `penarol---am` é diferente de `peñarol` do Uruguai). Esses serão listados para revisão manual na interface de duplicados.

---

## Resumo Técnico

**Arquivos a editar:**
1. Nova migration SQL para migrar partidas entre ligas e limpar ligas fantasma
2. Invocação do `bulk-merge-teams` para os 14+ merges de slug `-1`
3. Nova migration SQL para deduplicar times com slug idêntico (via `merge_teams` RPC)
4. Migration para corrigir slug da USL Championship

**Impacto estimado:** ~3.141 partidas migradas para ligas corretas, ~30 times duplicados eliminados, 10+ ligas fantasma removidas.

