# Plano — Auditoria da IA, temporadas e odds

Dividido em 3 tarefas independentes, executadas em sequência com poucas chamadas (para gastar menos crédito): cada tarefa é uma rodada de edições em lote + uma verificação.

## Fatos verificados no banco
- Brasileirão Série A (`campeonato-brasileiro-serie-a`) tem partidas de 2012 a 2026: 2026 = 213 (198 encerradas), 2025 = 306, 2024 = 306, 2023 = 306, e anos anteriores parciais.
- Existem 4.660 palpites da IA em partidas do Brasileirão antes de 2026 — ou seja, o histórico auditado de temporadas passadas já é possível sem nova geração de dados.
- Odds hoje existem apenas para a Copa (tabela `wc2026_match_odds`). Não há tabela de odds para `partidas` — precisa ser criada.

## Tarefa 1 — Dashboard de auditoria da IA (Brasileirão + Copa)
Um único componente reutilizável `AuditDashboard`, alimentado por dados já carregados no cliente (sem novas consultas).

Métricas por campeonato/temporada, sobre jogos encerrados com palpite:
- **Acerto de resultado (1X2)**: tendência da IA = resultado oficial.
- **Dupla chance**: acerto se o resultado oficial estiver entre as duas opções mais prováveis da IA (ex.: IA aponta Casa → acerta em Casa ou Empate). Métrica estatística, sem linguagem de aposta.
- **Erro real**: quando nem a dupla chance acertaria.
- **Placar exato**.
- Contagem de jogos auditados + barra de distribuição visual.

Aplicado em `/brasileirao/palpites-ia` (substituindo os 4 cartões atuais) e na página equivalente da Copa 2026 (`Copa2026PalpitesIA`), com a mesma lógica de cálculo centralizada em `useBrasileirao`/util compartilhado.

## Tarefa 2 — Seletor de temporada por campeonato
- Adicionar estado de temporada ao hub do Brasileirão (contexto leve via query param `?temporada=2025`), com um `<Select>` de anos.
- Os anos vêm de uma consulta única e barata (anos distintos com partidas da liga), então nada é hardcoded.
- Todas as páginas do hub (visão geral, jogos, classificação, palpites IA, artilharia) passam a respeitar a temporada escolhida — os hooks já recebem `season`.
- Botão "Atualizar" ao lado do seletor que invalida o cache e refaz a busca da temporada selecionada.

## Tarefa 3 — Odds pré-jogo e histórica nos jogos
- Migração: nova tabela `match_odds` genérica (partida_id, casa de aposta, 1X2, over/under, probabilidades implícitas, snapshot pré-jogo, origem, timestamps) com GRANTs, RLS de leitura pública e escrita restrita a admin/serviço.
- Nova edge function `sync-match-odds`: busca odds na API-Football usando o mapeamento de fixture já existente (`external_id_map`), grava as odds da Bet365/Betfair quando disponíveis e mantém o snapshot pré-jogo (não sobrescreve depois do início do jogo). Cobre jogos futuros e, quando a API retornar, odds históricas de jogos passados.
- Exibição: bloco compacto de odds (1 / X / 2) nos cartões de jogo do Brasileirão e na página da partida, com rótulo "pré-jogo" ou "histórica". Quando não houver odds, nada é exibido (sem placeholder inventado).
- Observação: a API-Football está sujeita a quota/suspensão; a função registra falhas e não sobrescreve dados com valores vazios.

## Notas técnicas
- Nenhuma métrica é estimada: tudo derivado de `partidas` (placar oficial) + `palpites` (registro pré-jogo).
- A política de "zero limits" é mantida (paginação via `fetchAllRecords`).
- Fuso UTC-3 preservado na exibição.
- Odds nunca aparecem como recomendação de aposta — apenas referência de mercado ao lado da métrica estatística.
