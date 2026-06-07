# Plano — Copa 2026: cobertura completa por seleção

Objetivo: deixar **toda seleção** com histórico completo de Copas, elenco/convocação real (quando publicada), calendário de jogos e um resumo histórico maior (≥ 800 caracteres) — sem alucinação.

## 1. Histórico completo (todas as seleções, não apenas 10)

### 1a. Curadoria de dados reais
Hoje existem 10 JSONs em `public/data/wc-history/`. Vou adicionar JSONs curados (Wikipedia PT-BR + FIFA) para **todas as seleções com participação histórica em Copas** que estão no banco da 2026, incluindo: México, EUA, Canadá, Bélgica, Croácia, Portugal, Sérvia, Suíça, Dinamarca, Polônia, Senegal, Marrocos, Camarões, Nigéria, Gana, Costa do Marfim, Argélia, Egito, Tunísia, Japão, Coreia do Sul, Austrália, Irã, Arábia Saudita, Equador, Chile, Colômbia, Paraguai, Costa Rica, Honduras, Catar, etc. Seleções sem histórico de Copa (estreantes em 2026, ex.: Cabo Verde, Curaçao, Jordânia, Uzbequistão) recebem JSON marcando `editions: []` e `first_participation_year: 2026` — a página exibirá "Estreia em 2026".

> Saneamento: o banco tem **duplicidades PT/EN** (Brasil/Brazil, França/France, etc.). Vou consolidar usando o slug PT-BR como canônico e remover/marcar duplicatas em EN para o seed não rodar duas vezes a mesma seleção. (Confirmar antes de deletar.)

### 1b. Index expandido + seed em lote
`public/data/wc-history/index.json` passa a listar todos os slugs novos. O `wc2026-seed-history` será chamado **uma vez por slug** automaticamente a partir do admin (loop com progresso e logs). Idempotente: re-rodar não duplica linhas.

## 2. Elenco / convocação real

Hoje `wc2026-sync-squads` chama API-Football `/players/squads?team=ID`, mas:
- só funciona se a seleção tiver `external_team_id` preenchido (muitas estão NULL);
- a FIFA só publica convocações oficiais a partir de **maio/2026** — antes disso a API retorna o "elenco base" da seleção (não a convocação oficial).

Ações:
- **Preencher `external_team_id`** em massa via nova função `wc2026-resolve-team-ids` que consulta `/teams?country=...&search=...` na API-Football e grava o ID.
- Rodar `wc2026-sync-squads` para **todas** as seleções (sem `team_slug`, fazendo loop completo) gravando o elenco-base atual com `is_called_up=false` e `source='api-football-base'`. Quando a convocação oficial sair (≥ mai/2026), o mesmo job é re-executado com flag `official=true` e grava `is_called_up=true`.
- Rodar `wc2026-sync-coach` para todas as seleções em loop.
- Na página, deixar de mostrar "Elenco oficial ainda não publicado" como bloco vazio: passar a renderizar o **elenco-base atual** com um aviso pequeno no topo ("Elenco-base atual; convocação oficial será publicada pelas federações a partir de maio/2026").

## 3. Calendário de jogos

`wc2026-sync-fixtures` já existe e trouxe 72 jogos. Vou:
- Garantir que **todos os jogos** (fase de grupos + mata-mata até onde estiver definido pela FIFA) sejam importados — paginar resposta da API-Football sem `.limit()`.
- Na página da seleção, mostrar a lista de jogos da seleção (já temos `world_cup_2026_matches`) ordenada por data. Quando vazia, exibir "Confrontos da seleção serão publicados após o sorteio da FIFA" em vez do bloco genérico atual.

## 4. Resumo histórico ≥ 800 caracteres (sem inventar)

Hoje o `wc2026-generate-team-seo` pede 300-450 palavras mas o modelo às vezes entrega texto curto. Ajustes:
- Subir o piso: pedir explicitamente **4 parágrafos, mínimo 900 caracteres e máximo 1600**, cobrindo:
  1. Trajetória geral (nº de participações, primeira Copa, padrão de desempenho);
  2. Maiores conquistas e momentos marcantes (anos de título, finais, melhores campanhas, técnicos campeões);
  3. Resultados das últimas 3 edições (com anos e fases reais);
  4. Cenário para 2026 (grupo, técnico atual, expectativa baseada apenas nos fatos).
- **Validação automática**: após receber resposta, contar caracteres. Se `< 800`, refazer chamada uma vez pedindo expansão (mantendo a regra "apenas fatos fornecidos"). Se ainda assim falhar, salvar como `historical_summary_status='short'` e logar — nunca inventar.
- Reforço anti-alucinação no prompt: lista numerada explícita de fatos permitidos; instrução para **não** citar jogadores, gols ou frases famosas que não estejam nos fatos; proibição de adjetivos especulativos ("certamente buscará", "favorita").
- Trocar modelo para `google/gemini-2.5-pro` apenas neste endpoint (qualidade > custo, roda 1x por seleção).

## 5. Painel admin — execução em lote

Em `/admin/copa-2026`, adicionar botões:
- **"Resolver IDs API-Football (todas)"** → roda `wc2026-resolve-team-ids`.
- **"Seed histórico de TODAS"** → itera `index.json` chamando `wc2026-seed-history` por slug, com barra de progresso.
- **"Sincronizar elenco-base de TODAS"** → loop `wc2026-sync-squads` sem filtro.
- **"Sincronizar técnico de TODAS"** → loop `wc2026-sync-coach`.
- **"Gerar resumo IA + SEO de TODAS"** → loop `wc2026-generate-team-seo`, respeitando rate-limit (delay 1.5s entre chamadas).

Cada execução grava em `world_cup_2026_sync_logs` (já existente) — sucesso, erro, contagem.

## 6. Detalhes técnicos

- **Sem `.limit()`** em nenhuma query (Zero Limits policy).
- Logs obrigatórios em toda função (`console.log`/tabela `sync_logs`).
- Migração leve: nova coluna `world_cup_2026_teams.historical_summary_status` (`ok|short|missing`) e `world_cup_2026_players.source` (`api-football-base|api-football-official|manual`).
- Idempotência: seed usa upsert por `(team_id, year)`; squad faz delete+insert por team.
- Tratamento de quota API-Football: se 429, parar o loop e gravar onde parou para retomar.

## 7. Entregáveis

- ~40 novos JSONs em `public/data/wc-history/` + index atualizado.
- 1 nova edge function `wc2026-resolve-team-ids`.
- Edge functions existentes ajustadas: `wc2026-sync-squads` (loop completo + flag base/oficial), `wc2026-generate-team-seo` (prompt mais longo + validação de tamanho + retry + modelo pro).
- `AdminCopa2026.tsx` com 5 novos botões em lote e progresso.
- `Copa2026SelecaoDetalhe.tsx` ajustado para mostrar elenco-base e jogos reais quando existirem (sem fallback "não publicado" quando há dado).
- Migração: 2 colunas novas.

Confirma que posso seguir — incluindo a consolidação das duplicatas PT/EN (manter slugs em português)?
