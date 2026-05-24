
# Plano: Limpeza Cirúrgica SEM Parar a API-Football

## Diagnóstico real (importante)

Verifiquei `db_health` + tamanho de tabelas. O cenário não é o que aparece no print:

- **Disco de dados: 19% usado** (banco tem 1.13 GB). Você NÃO está com armazenamento estourado.
- O que está em 100% no print é **"Disk read and write — IO budget"** (taxa de leitura/escrita por segundo). Está saturado porque a API-Football está bombando jogos + worker processando + gerar palpites + gerar artigos, tudo ao mesmo tempo.
- Conclusão: o gargalo é **IO**, não espaço. Limpar dados ajuda (índices menores = menos IO por query), mas o que realmente destrava o sistema agora é **reduzir bloat e podar logs** sem mexer em uma única partida da API-Football.

## Princípios deste plano

1. **Não parar a importação.** O worker `apifootball-worker` continua rodando o tempo todo.
2. **API-Football é verdade absoluta.** Nada que veio dela é tocado. Qualquer dedup mantém o registro `api_source = 'api-football'`.
3. **Limpeza em paralelo**, em janelas curtas, sem `VACUUM FULL` durante o pico (ele trava a tabela).
4. **Cortes só atingem fontes não-API-Football, bloat e logs.**

## Onde está o espaço/IO hoje

| Tabela | Tamanho | Vivos | Mortos | Status |
|---|---|---|---|---|
| `partidas` | 435 MB | 429k | 76k | Mantida 100%, apenas remover bloat |
| `cron.job_run_details` | 153 MB | 184k execuções | — | **Podar** (não mexe em dado real) |
| `kaggle_staging_matches` | 150 MB | **0** | — | **Truncar** (já consumido) |
| `palpites` | 89 MB | 283k | 40k | Reindex/vacuum (sem deletar) |
| `comparativo_resultados` | 68 MB | 257k | 30k | Reindex/vacuum |
| `noticias` | 61 MB | 4.984 | 506 | Manter |
| `historical_staging_matches` | 39 MB | **0** | — | **Truncar** |
| `sync_logs` | 35 MB | 2.246 | 1.872 | **Podar antigos** |
| `cartola_scouts_rodada` | 30 MB | **0** | — | **Truncar** |
| `kaggle_raw_assets`, `historical_raw_documents`, `kaggle_staging_rows`, `kaggle_match_links`, `kaggle_import_logs`, `historical_import_logs`, `cartola_partidas`, `cartola_atletas`, `team_merge_analysis_cache` | ~45 MB | 0 cada | — | **Truncar** |
| `partidas` com `api_source IS NULL` | 38.385 linhas | — | — | **Mover para API-Football ou deletar** (etapa 4) |

Importante: as 404.605 partidas com `api_source = 'api-football'` permanecem intactas — incluindo as antigas. A API-Football é a sua biblioteca histórica e fica.

## Etapas (em ordem, todas seguras com worker rodando)

### Etapa 1 — Esvaziar staging e caches já consumidos  *(ganho ~300 MB, zero risco)*
- `TRUNCATE` em: `kaggle_staging_matches`, `kaggle_staging_rows`, `kaggle_raw_assets`, `kaggle_match_links`, `kaggle_import_logs`, `historical_staging_matches`, `historical_raw_documents`, `historical_import_logs`, `cartola_scouts_rodada`, `cartola_partidas`, `cartola_atletas`, `team_merge_analysis_cache`.
- Todas estão com **0 linhas vivas** — é só casco inchado de imports passados.
- Roda em segundos, não trava a API-Football.

### Etapa 2 — Podar logs operacionais  *(ganho ~180 MB)*
- `DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days'`.
- `DELETE FROM sync_logs WHERE created_at < now() - interval '7 days'`.
- `DELETE FROM net._http_response WHERE created < now() - interval '1 day'`.
- Criar **cron semanal** que repete essa poda automaticamente — assim o problema não volta sozinho.

### Etapa 3 — `VACUUM` (não `FULL`) nas tabelas "quentes"
- `VACUUM (ANALYZE) partidas, palpites, comparativo_resultados, noticias, times`.
- `VACUUM` normal **não trava** — pode rodar com worker ativo. Devolve espaço lógico (reaproveitado pelos próximos inserts da API-Football, então cabe muito mais sem crescer o disco).
- `VACUUM FULL` fica para a janela noturna **opcional** (>=23h), tabela por tabela, e só se quisermos devolver disco ao SO.

### Etapa 4 — Deduplicação priorizando API-Football  *(sem perder histórico)*
Hoje há 38.385 partidas com `api_source IS NULL` (CSV/Kaggle/Cartola). A maioria provavelmente tem irmã `api-football` cobrindo o mesmo jogo. Estratégia:

1. Criar tabela temporária `tmp_dedup_partidas` com pares `(api_id, sem_api_id)` que coincidem em `(liga_id, data, time_casa_id, time_fora_id)`.
2. Para cada par: mover `palpites`, `comparativo_resultados`, `gols_partida`, `noticias` que apontam para o `sem_api_id` → passa a apontar para o `api_id`.
3. `DELETE` apenas o duplicado **sem** `api_source = 'api-football'`.
4. Para as partidas órfãs (sem irmã API-Football), **manter** — você pediu o maior banco do mundo, então não jogamos fora dado único só porque veio de CSV.

Tudo embrulhado em função `dedup_partidas_apifootball_first(p_batch_size int)` que roda em lotes pequenos (500/vez), evitando lock longo enquanto o worker insere novos jogos.

### Etapa 5 — Times duplicados
Mesma lógica via `merge_teams` (função já existe): para cada par detectado por `get_suggested_duplicates`, manter o time com `api_id` da API-Football, migrar partidas/aliases/external_ids para ele, marcar o outro como `merged`. Lotes pequenos, processo já tem hook `useAutoResolveDuplicates`.

### Etapa 6 — Worker e geração de artigos respiram em ritmo controlado (não param)
- Manter `apifootball-worker` rodando, mas reduzir `MAX_JOBS_PER_INVOCATION` de 8 → 4 **só enquanto o cleanup roda**. Depois volta a 8.
- Geração de artigos pós-jogo e palpites retroativos: continuam, mas o cron desses processos roda **escalonado** (não no mesmo minuto do worker) para distribuir IO.
- Resultado: importação não para; o sistema só deixa de ter três coisas pesadas competindo pelo mesmo segundo.

### Etapa 7 — Quando faz sentido fazer upgrade
- Se mesmo com tudo isso o IO continuar em 100% (porque você quer "maior banco do mundo" rodando 24/7), aí sim **upgrade de instância** (não de disco — o gargalo é IOPS/CPU). Caminho: Backend → Advanced settings → Upgrade instance.
- Documentação: https://docs.lovable.dev/features/cloud#advanced-settings-upgrade-instance
- Mas só recomendo confirmar isso **depois** das etapas 1–3 (que sozinhas costumam derrubar o uso de IO em 40–60%).

## Ganho esperado

- Espaço: banco cai de **1.13 GB → ~0.75 GB** sem perder nenhuma partida da API-Football.
- IO: queda significativa porque índices de `partidas`, `palpites`, `comparativo_resultados` ficam menores e logs param de crescer.
- Importação API-Football: **continua ininterrupta** o tempo todo.

## O que NÃO toco

- Nenhuma partida com `api_source = 'api-football'` (404.605 linhas).
- `auth.*`, `storage.*`, `realtime.*`, `vault.*`.
- Dados de usuário (`palpites_usuarios`, `xp_events`, perfis, assinaturas).
- O fluxo de enqueue/worker da API-Football descrito em `.lovable/plan.md`.

## Próximo passo (o que vou fazer assim que você aprovar)

1. **Migration A** — Etapa 1 (truncar staging/caches). É a maior vitória imediata e zero risco.
2. **Migration B** — Etapa 2 (podar cron/sync/http logs) + cron semanal de poda recorrente.
3. **Migration C** — Etapa 3 (`VACUUM ANALYZE` nas tabelas quentes).
4. Medir IO e tamanho. Te mostro o resultado.
5. Se quiser seguir, **Migration D + E** — função de dedup priorizando API-Football, rodada em lotes via background job.
6. Pequeno ajuste no worker (Etapa 6) para escalonar carga sem parar.

Posso seguir nessa ordem?
