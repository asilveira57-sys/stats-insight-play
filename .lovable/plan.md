## Diagnóstico

Investigando o banco e o código, identifiquei as causas raiz reais (alguns sintomas têm origem diferente do que parece):

| Sintoma | Causa raiz |
|---|---|
| Bandeiras "quebradas" nos cards e na página de palpites IA | `flag_url` aponta para CDN externa instável (api-sports). Todos os 96 times têm URL preenchida, mas várias falham no carregamento. |
| Calendário "será atualizado..." em seleções (Brasil, etc.) | Existem **dois conjuntos** de times em `world_cup_2026_teams`: um em PT (Brasil, Alemanha) usado pela UI de seleções, outro em EN (Brazil, Germany) referenciado em `world_cup_2026_matches.home_team_id/away_team_id`. 0 partidas linkadas aos times PT. |
| Tabela dos grupos toda zerada | `world_cup_2026_standings` nunca é recalculada após partidas encerradas. 10 jogos terminados, 0 pontos lançados. Função `wc2026-update-standings` existe mas não é chamada. |
| Cobertura automática vazia (`/copa-2026/posts`) | `Copa2026Posts` lê de `world_cup_2026_posts` (0 linhas). As crônicas estão sendo gravadas em `noticias`. |
| Imagem de futebol americano na crônica | Prompt do DALL·E só diz "football stadium" — modelo gera estádio NFL. Precisa de termos explícitos (soccer/association football) e listas negativas. |
| `/palpites` com cards em loading infinito + lista poluída de ligas | A lista de ligas mostra **todas** que já tiveram palpites históricos. Ligas sem jogos futuros (≤ 7 dias) continuam aparecendo. Cards travam quando `usePredictions` retorna vazio mas `loadingPredictions` fica `true` por refetch. |
| Copa 2026 ausente em `/palpites` | A página consome a tabela genérica `predicoes`/`palpites`. As predições da Copa estão em `world_cup_2026_predictions` e nunca foram mescladas. |

---

## Plano de correção

### 1. Bandeiras confiáveis (frontend + 1 backfill)
- Criar helper `getFlagSrc(team)` que:
  1. Usa `flag_url` se for de domínio confiável (flagcdn.com).
  2. Caso contrário, monta `https://flagcdn.com/w80/{iso2}.png` a partir de `country_code`.
  3. Fallback final: badge com iniciais (já existe).
- Atualizar `TeamFlag` em `src/components/copa2026/TeamCard.tsx` para usar o helper + `onError` que cai para iniciais.
- Migração leve: atualizar `flag_url` nos 96 times para a URL `flagcdn.com` padronizada (quando `country_code` existir).

### 2. Unificar times PT/EN (calendário da seleção volta a aparecer)
- Migração de consolidação:
  - Detectar pares duplicados (Brasil/Brazil, Alemanha/Germany, etc.) por `country_code` + `confederation`.
  - Manter o registro PT como canônico (é o que a UI usa).
  - `UPDATE world_cup_2026_matches SET home_team_id = canonical.id` para todos os linkados ao EN; idem `away_team_id`.
  - Migrar `world_cup_2026_standings`, `world_cup_2026_players`, `world_cup_2026_team_history` para o canônico.
  - Desativar (`is_active=false`) os duplicados EN.
- Após isso, a página de cada seleção volta a renderizar os jogos automaticamente (a query já existe).
- Adicionar na seção "Jogos" o placar atualizado (já vem via `MatchCard`).

### 3. Tabela dos grupos atualizando
- Reescrever `wc2026-update-standings` para recalcular tudo a partir de `world_cup_2026_matches` com `status='finished'` (zera + soma V/E/D/GP/GC/Pts/SG).
- Chamar essa função no final do loop de `wc2026-sync-live` sempre que houver transição `live→finished` (já existe gancho para post-game; adicionar standings ali).
- Disparar 1 reprocessamento imediato para popular as 10 partidas já encerradas.

### 4. Cobertura `/copa-2026/posts` voltar a listar
- Trocar `Copa2026Posts` para ler de `noticias` filtrando por `tags @> ['copa-2026']` (ou `slug ilike 'copa-2026-%'`), ordenado por `published_at desc`.
- Ajustar `useWC2026Posts` no hook para a mesma fonte.

### 5. Imagens de pós-jogo só de futebol (soccer)
- Em `supabase/functions/wc2026-generate-postgame/index.ts`, reescrever `imgPrompt`:
  - Termos positivos: `"association football (soccer) match, FIFA World Cup atmosphere, grass pitch, round football ball, goal net"`.
  - Termos negativos: `"no american football, no NFL, no helmets, no oval ball, no goalposts with uprights, no rugby, no baseball, no basketball"`.
  - Manter rodízio de estádios/iluminação/ângulo.
- Reprocessar (job pontual) as crônicas já publicadas para regerar imagem.

### 6. Página `/palpites` — 3 ajustes
**6a. Cards não carregam:** corrigir `usePredictions` para retornar `[]` (não `undefined`) e marcar `isLoading=false` quando a query vier vazia; revisar `loadingPredictions` no skeleton (mostrar empty-state após 1 tentativa).
**6b. Lista poluída de ligas:** em `useLeaguesForPredictions`, fazer `JOIN` com contagem de jogos futuros (próx. 7 dias) e devolver **apenas ligas com `count > 0`**. Reduz de ~50 para ~10.
**6c. Copa 2026 listada:** adicionar `World Cup 2026` como liga sintética no resultado de `useLeaguesForPredictions` quando houver jogos futuros em `world_cup_2026_matches`. Em `usePredictions`, quando a liga selecionada for `world-cup-2026`, mesclar resultados vindos de `world_cup_2026_predictions` formatados no mesmo shape do `Prediction`.
- Banner já existe apontando para `/copa-2026/palpites-ia`; manter.

---

## Ordem de execução

1. Migração: unificar times PT/EN + normalizar `flag_url` (passo 1 + 2).
2. Reescrever `wc2026-update-standings` e enganchar no `wc2026-sync-live` + disparo único (passo 3).
3. Frontend: `TeamFlag` helper, `Copa2026Posts` ler de `noticias`, ajustes em `/palpites` (passos 1, 4, 6).
4. Edge function `wc2026-generate-postgame`: novo prompt de imagem + job pontual de regeração das 10 crônicas (passo 5).
5. Hooks `useLeaguesForPredictions` + `usePredictions` com merge da Copa 2026 (passo 6c).

## Fora de escopo
- Não vou refazer textos editoriais existentes (já foi feito em rodada anterior).
- Não vou mexer em `world_cup_2026_predictions` / lógica de IA — apenas exibição.
