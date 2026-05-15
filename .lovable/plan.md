## Diagnóstico

A nova key foi validada: plano **Ultra ativo até 14/jun/2026, 75.000 req/dia, 0 usadas hoje**. Já fiz uma sondagem direta na API para te dar o cenário real (não estimativa). O que está disponível hoje:

| Liga | ID | Temporadas | Período |
|---|---|---|---|
| Brasileirão Série A | 71 | **17** | 2010–2026 |
| Brasileirão Série B | 72 | **15** | 2012–2026 |
| Brasileirão Série C | 75 | 15 | 2012–2026 |
| Brasileirão Série D | 76 | 15 | 2012–2026 |
| Copa do Brasil | 73 | 11 | 2016–2026 |
| Estaduais (12 estados) | 422–520 | 11–17 | desde 2014–2016 |
| Copa Libertadores | 13 | (já temos) | 2010+ |
| Sul-Americana | 11 | (já temos) | 2010+ |
| Champions League | 2 | 15 | 2011–2025 |
| Premier League (ENG) | 39 | 16 | 2010–2025 |
| La Liga (ESP) | 140 | 16 | 2010–2025 |
| Serie A (ITA) | 135 | 16 | 2010–2025 |
| Bundesliga (GER) | 78 | 16 | 2010–2025 |
| Ligue 1 (FRA) | 61 | 16 | 2010–2025 |
| MLS (USA) | 253 | 15 | 2012–2026 |
| Liga Argentina | 128 | 12 | 2015–2026 |
| Copa do Mundo | 1 | **5 edições** | 2010, 2014, 2018, 2022, 2026 |
| Eurocopa | 4 | 5 | 2008–2024 |
| Mundial de Clubes | 15 | 12 | 2011–2025 |
| Copa América (id 9) | – | – | confirmado disponível |

A API tem **109 ligas para o Brasil**, **46 para Inglaterra**, **176 mundiais** — o universo total é gigantesco.

## Estimativa de custo (em requisições)

Cada `/fixtures?league=X&season=Y` devolve **a temporada inteira** em **1 req**. Eventos, lineups e estatísticas são **1 req cada por jogo** (3 reqs por jogo se você quer tudo).

**Cenário 1 — só fixtures (placar + data + rodada + status):**
~60 ligas × ~13 temporadas = **~780 reqs** → cabe em **20 minutos** de execução (1% do dia).

**Cenário 2 — fixtures + eventos + lineups + estatísticas (completo):**

| Bloco | Jogos estimados | Reqs (×4: 1 fixture + 3 detalhes) |
|---|---|---|
| Brasileirão A+B (32 temporadas) | ~12.200 | ~48.800 |
| Copa do Brasil + Estaduais | ~12.000 | ~48.000 |
| Libertadores + Sul-Americana | ~4.500 | ~18.000 |
| Big-5 Europa (16 anos) | ~28.800 | ~115.200 |
| Champions + Mundial Clubes | ~2.700 | ~10.800 |
| Copas FIFA (Mundo, Euro, Copa América) | ~700 | ~2.800 |
| MLS + Argentina | ~10.000 | ~40.000 |
| **TOTAL** | **~71.000 jogos** | **~283.000 reqs ≈ 4 dias úteis** |

Logo, com 75k/dia dá pra importar **tudo que você listou** em ~**4 dias corridos** rodando 24/7. Se quiser priorizar, dá pra ter **fixtures de tudo em 1h** e ir aprofundando depois.

## O que vou construir

### 1. Infraestrutura de banco
Tabelas novas em migration:
- `api_football_inventory` — cache da resposta `/leagues` (país, league_id, type, seasons[], last_refresh). Alimentada por edge function de inventário.
- `api_football_import_jobs` — fila por (league_id, season, depth: `fixtures` | `events` | `lineups` | `stats`). Status: `queued`, `running`, `done`, `failed`, `skipped`. Conta `requests_used`.
- `api_football_quota_log` — uma linha por dia com `requests_used` (sincronizada com endpoint `/status`) para nunca estourar 75k.

### 2. Edge functions
- **`apifootball-inventory`** — sob demanda, busca `/leagues?country=X` para os 10–12 países-alvo + ligas individuais por id (Champions, Mundial). Popula `api_football_inventory`.
- **`apifootball-enqueue`** — recebe seleção do admin (lista de league_id × seasons × depths) e insere na fila com estimativa de reqs.
- **`apifootball-worker`** — processa N jobs por chamada, respeitando quota diária. Para `fixtures`, faz 1 req por (league, season) e insere via `resolve_or_create_match`. Para `events/lineups/stats`, busca jogos da temporada já promovidos e faz 1 req por fixture. Atualiza quota antes/depois via `/status`. Se quota >= 70k, aborta o lote.
- **`apifootball-cron`** — pg_cron a cada 5min chama o worker se houver jobs `queued` e quota disponível.

### 3. Página admin: `/admin/api-football`
Sub-rotas em abas:
- **Inventário** — botão "Atualizar inventário" (chama `apifootball-inventory`). Lista por país com expand → ligas → temporadas (checkbox por temporada). Mostra "já importado" baseado em `partidas` existentes por liga+ano.
- **Profundidade** — checkboxes globais: `[x] Fixtures` `[ ] Eventos` `[ ] Lineups` `[ ] Estatísticas`. Conforme marca, recalcula custo total em reqs e dias estimados.
- **Adicionar à fila** — botão que envia a seleção para `apifootball-enqueue` e mostra toast com total enfileirado.
- **Fila & Progresso** — tabela ao vivo (realtime no `api_football_import_jobs`) com filtro por status. Barra de progresso geral por liga. Botão "Pausar worker" / "Retomar".
- **Quota do dia** — card grande com `requests_used / 75.000` (consultado em tempo real do `/status`), reset diário.

### 4. Pré-seleção sugerida (one-click)
Botão "Selecionar prioridade Statball" marca automaticamente:
- Brasileirão Série A + B + C (todas temporadas)
- Copa do Brasil (todas)
- Libertadores + Sul-Americana (todas)
- 12 estaduais brasileiros (todas)
- Premier, La Liga, Serie A, Bundesliga, Ligue 1 (todas)
- Champions League + Mundial de Clubes (todas)
- Copa do Mundo + Eurocopa + Copa América (todas)
- MLS + Liga Argentina (todas)

### 5. Resolução de duplicatas
O worker reusa `resolve_or_create_team` e `resolve_or_create_match` que já existem (mapeiam por `external_id_map`), então não cria duplicados com partidas Kaggle/Football-Data já importadas.

## Detalhes técnicos
- Worker faz **8 reqs em paralelo** com `Promise.all` (ainda dentro de um req/segundo equivalente; API-Football permite até 10 req/min em chamadas concorrentes do mesmo fixture sem 429).
- `api_football_quota_log` é checada antes de cada lote; se passou de 70k no dia, jobs ficam `queued` para o cron do dia seguinte retomar.
- Logs detalhados em `api_football_import_jobs.error` quando falhar — sem reinventar log table.
- Temporadas em curso (2025/2026) são re-sincronizadas semanalmente via cron separado (já existe `sync-api-football`, vou só registrar as novas ligas selecionadas em `ligas.ativa = true`).
- Memória de rate-limit (`mem://technical/api-rate-limit-constraints`) é atualizada para refletir o novo plano Ultra (75k/dia em vez de 100/dia).

## Ordem de execução sugerida (depois que você aprovar)
1. Migration cria as 3 tabelas + 1 cron job pausado.
2. Deploy das 4 edge functions.
3. Você abre `/admin/api-football`, clica **Atualizar inventário** (gasta ~12 reqs) → vê a árvore real disponível.
4. Clica **Selecionar prioridade Statball** + marca `[x] Fixtures` → enfileira ~780 jobs.
5. Liga o worker. Em **~30 min** todas as fixtures históricas estão no banco.
6. Validamos qualidade (datas, placares, times resolvidos).
7. Você decide: marca eventos/lineups/stats e enfileira o aprofundamento (4 dias rodando).
