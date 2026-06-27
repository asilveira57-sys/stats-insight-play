## Diagnóstico

Achei 3 problemas que somados produzem o "A definir" em tudo:

1. **Mistura de nomes de fase no banco.** Os jogos reais já sincronizados de 32-avos estão gravados com `stage = 'r32'` (9 partidas, com `home_team_id`/`away_team_id` e datas reais). Mas o chaveamento procura `stage = 'round_of_32'`, que só contém 16 linhas placeholder vazias e duplicadas (todas com `bracket_position = 'R32-1'`). O mesmo vale para `round_of_16`/`quarter_final`/`semi_final`/`final`: só existem placeholders vazios, todos com o mesmo `bracket_position`.
2. **UI defaulta para "Oficial + Projeção"** e como o oficial não casa, mostra projeção por cima. O usuário quer "Apenas oficial" como default.
3. **Projeção da IA ignora resultados oficiais do mata-mata.** A função `wc2026-project-bracket` só lê a fase de grupos e simula todo o KO do zero — então quando a R32 oficial avança, a projeção continua jogando dado nos times errados.

## O que vai ser feito

### 1) Limpeza / normalização do banco (migration)
- Padronizar `stage`: renomear `r32` → `round_of_32` nas 9 partidas reais já carregadas.
- Apagar as linhas placeholder vazias e duplicadas (sem times, todas com mesmo `bracket_position`) de `round_of_32`, `round_of_16`, `quarter_final`, `semi_final`, `final`, `third_place`. O chaveamento não precisa dessas linhas — a UI já renderiza os 16/8/4/2/1 slots proceduralmente.
- Atribuir `bracket_position` correto (`R32-1` … `R32-16`) aos jogos oficiais conforme ordem cronológica e par adjacente do chaveamento.

### 2) Sincronizador de KO oficial (nova edge function `wc2026-sync-knockout`)
- Lê os jogos de mata-mata do API-Football (já tem chave), grava em `world_cup_2026_matches` com `stage` correto, `bracket_position`, `home/away_team_id`, status e placar.
- Quando uma partida termina, popula automaticamente a vaga correspondente da próxima fase: o vencedor de `R32-1` vira `home_team_id` de `R16-1`, vencedor de `R32-2` vira `away_team_id` de `R16-1`, e assim por diante.
- Mantém o jogo de 3º lugar acoplado às semis perdedoras.
- Disparada manualmente do Admin Copa 2026 e via cron a cada 15 min durante janelas de jogo.

### 3) Chaveamento.tsx (frontend)
- Default do `mode` passa de `"misto"` para `"oficial"`.
- Query aceita os dois nomes históricos (`r32` e `round_of_32`) por compatibilidade temporária.
- Quando um slot R32 oficial tiver dois times definidos, aparece como card clicável; quando só um time estiver definido (vencedor já conhecido mas adversário ainda não), mostra "X vs A definir".
- No modo "Oficial + Projeção", quando a partida oficial já tem times mas ainda não foi jogada, ainda assim mostra o card oficial (não a projeção) — projeção só preenche slots ainda 100% indefinidos.

### 4) Projeção IA passa a respeitar o oficial
Editar `wc2026-project-bracket`:
- Antes de simular cada rodada do KO, carrega de `world_cup_2026_matches` todos os jogos daquela fase com `status = 'finished'`.
- Se a partida oficial existe e está encerrada, usa o vencedor real (e o placar real) na linha de projeção, marcando `basis = "official"` e `confidence = "high"`.
- Se a partida oficial tem times definidos mas não foi jogada, simula só ela (mantendo os times reais como entrada, não os simulados).
- Só fases totalmente indefinidas continuam sendo simuladas a partir dos vencedores projetados.
- Resultado: assim que as oitavas começarem a ser definidas no oficial, a projeção das quartas/semi/final se reajusta automaticamente.

### 5) Botão "Atualizar projeção"
- Passa a chamar primeiro `wc2026-sync-knockout` (puxa oficial) e em seguida `wc2026-project-bracket` (regenera projeção em cima do oficial atualizado). Realtime já invalida os caches.

## Detalhes técnicos

- Tabelas tocadas: `world_cup_2026_matches` (update de `stage`, delete de placeholders, update de `bracket_position`, popular `home/away_team_id` da próxima fase).
- Nada muda em `wc2026_bracket_projections` exceto que `basis` e `confidence` passam a refletir partidas reais.
- A função `wc2026-sync-knockout` reusa o mapeamento de times (`world_cup_2026_teams.api_football_id`) que `wc2026-sync-live` já usa.

## Fora do escopo agora

- Não vou mexer na sincronização da fase de grupos nem no Monte Carlo de grupos — só no mata-mata.
- Não vou tentar adivinhar `bracket_position` para R16+ enquanto não houver R32 oficial completa — esses slots ficam como "A definir" no modo oficial e ganham projeção no modo misto.
