
# Varredura Completa do Banco de Dados -- Diagnóstico e Plano de Ação

## Diagnóstico

### Resumo Geral
| Recurso | Total | Observação |
|---|---|---|
| Ligas | 27 (26 ativas) | 4 ativas sem partidas, 1 inativa já migrada |
| Times | 888 (759 ativos, 129 merged) | 28 duplicatas `-1` ativas com 1.429 partidas |
| Partidas | 19.516 | **3.293 duplicatas** em 2.824 grupos |
| Gols | 5.869 | Sem variações de nome de jogador |
| Artilharia Agregada | 2.516 | Precisa ser reconstruída após dedup |
| Notícias/Artigos | 469 | Em geração retroativa |
| Palpites | 15.012 | OK |

### 1. PARTIDAS DUPLICADAS (CRÍTICO -- 3.293 excedentes)
A maior questão. **2.824 grupos** de partidas duplicadas (mesmo time_casa + time_fora + data), totalizando 3.293 registros excedentes:

| Liga | Grupos Dup | Excedentes |
|---|---|---|
| Brasileirão Série A | 1.136 | 1.511 |
| Copa do Brasil | 777 | 817 |
| Copa Libertadores | 581 | 635 |
| Premier League | 149 | 149 |

**Causa raiz**: Importações de fontes diferentes (Football-Data.org vs API-Football) criaram registros para a mesma partida com IDs de time diferentes (ex: "CR Flamengo" vs "Flamengo", "Fortaleza EC" vs "Fortaleza"). Apenas 717 dos 2.824 grupos têm placar idêntico; os 2.107 restantes envolvem IDs de times diferentes (cross-source dups).

### 2. TIMES DUPLICADOS COM SUFIXO `-1` (28 times, 1.429 partidas)
Times ativos cujo slug termina em `-1` e cujo equivalente canônico já está marcado como `merged`. Exemplos:

| Time Dup (ativo) | Partidas | Canônico (merged) |
|---|---|---|
| avai-sc-1 | 447 | avai-sc |
| juventude-rs-1 | 191 | juventude-rs |
| santa-cruz-pe-1 | 143 | santa-cruz-pe |
| csa-al-1 | 134 | csa-al |
| universidad-catolica-1 | 64 | universidad-catolica |
| + 23 outros | ~450 | ... |

**Problema**: O merge anterior inverteu a relação -- marcou o canônico como `merged` e deixou o `-1` como `active`. Precisa ser corrigido.

### 3. LIGAS ATIVAS SEM PARTIDAS (4)
Copa Sudamericana, Copa do Nordeste, Campeonato Gaúcho, Campeonato Paranaense -- todas do API-Football. A conta estava suspensa, **agora está ativa novamente**, mas o sync tenta acessar a temporada 2026 (fora do plano free que cobre 2022-2024).

### 4. API-Football STATUS
**A API NÃO está mais suspensa.** Respondeu com dados, mas o sync está configurado para a temporada atual (2026), que está fora do plano gratuito. Precisa ajustar para sincronizar temporadas 2022-2024.

### 5. ARTILHARIA AGREGADA
Com 2.516 registros cobrindo 645 jogadores e 10 competições, precisa ser reconstruída após a deduplicação de partidas para evitar contagem dupla de gols.

---

## Plano de Ação (5 etapas)

### Etapa 1 -- Corrigir Merge Invertido dos 28 Times `-1`
Criar uma Edge Function `fix-inverted-merges` que:
1. Para cada time com slug `-1` ativo cujo canônico está `merged`:
   - Migra todas as partidas do `-1` para o canônico
   - Migra aliases e external_id_map
   - Marca o `-1` como `merged` e restaura o canônico como `active`
2. Executa via botão no Admin Control Center

### Etapa 2 -- Deduplicar 3.293 Partidas Excedentes
Criar uma Edge Function `dedup-matches` que:
1. Identifica grupos de partidas duplicadas (mesmo time_casa + time_fora + data)
2. Para cada grupo, mantém o registro com mais dados (api_id, gols, detalhes) e remove os excedentes
3. Para duplicatas cross-source (IDs de time diferentes mas mesmo jogo), identifica via data + liga + placar e consolida
4. Migra referências (palpites, comparativo_resultados, gols_partida, noticias) para o registro mantido antes de deletar
5. Roda em background via process-queue (lotes de 50 por execução)
6. Registra log detalhado em sync_logs

### Etapa 3 -- Corrigir Sync do API-Football (Temporada)
Editar `sync-api-football/index.ts`:
1. Alterar a lógica de seleção de temporada para usar 2024 (ou a mais recente disponível no plano free) em vez da temporada atual
2. Adicionar fallback: se a temporada atual falhar com erro de plano, tentar 2024, 2023, 2022
3. Isso vai popular as 4 ligas vazias (Sudamericana, Nordeste, Gaúcho, Paranaense)

### Etapa 4 -- Reconstruir Artilharia
Após a deduplicação, executar `rebuild-artilharia` para reprocessar todos os gols com os dados limpos. Nenhuma mudança de código necessária -- apenas executar a função existente.

### Etapa 5 -- Card de Diagnóstico no Admin Control Center
Adicionar um card "Saúde do Banco de Dados" no Admin Control Center que mostra:
- Partidas duplicadas pendentes
- Times com merge invertido
- Ligas sem partidas
- Botões para executar cada correção

### Arquivos a editar/criar:
1. `supabase/functions/fix-inverted-merges/index.ts` (nova)
2. `supabase/functions/dedup-matches/index.ts` (nova)
3. `supabase/functions/sync-api-football/index.ts` (ajuste de temporada)
4. `supabase/functions/process-queue/index.ts` (adicionar job dedup_matches)
5. `src/pages/AdminControlCenter.tsx` (card de saúde do banco)

### Impacto estimado:
- ~3.293 partidas duplicadas removidas
- ~28 times com merge invertido corrigidos (1.429 partidas migradas)
- ~4 ligas populadas com dados históricos 2022-2024
- Artilharia reconstruída com dados limpos
