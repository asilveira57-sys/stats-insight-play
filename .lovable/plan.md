
# Plano — Central Copa 2026 completa

## Diagnóstico atual

Inspeção do banco e do código revelou as causas dos sintomas reportados:

1. **"Só aparece México x África do Sul"** — Existem **72 jogos de grupo** no banco, mas o filtro `stage` da página `/copa-2026/jogos` usa valores antigos (`r32`, `r16`, `qf`...) enquanto o banco grava `round_of_32`, `round_of_16`, `quarter_final`, etc. O default mostra só o próximo, dando a falsa impressão de 1 jogo.
2. **Tela de grupos vazia** — `group_letter` está **NULL em 100% dos 72 jogos** e a tabela `world_cup_2026_standings` tem **0 linhas**. As 48 seleções já têm `group_letter` correto, mas nada foi propagado para partidas/classificação.
3. **Chaveamento desalinhado** — `Copa2026Chaveamento.tsx` filtra por posições `R32-1..16`, mas o `wc2026-sync-fixtures` salva stages como `round_of_32` sem preencher `bracket_position`. Os 32 placeholders do mata-mata existem (R32→Final), porém desconectados dos jogos reais.
4. **IA pré-jogo** — Só 2 análises existem no total. Não há geração em lote para os 72 jogos da fase de grupos.
5. **Palpites na Copa** — `palpites_usuarios.partida_id` aponta para `partidas`, não para `world_cup_2026_matches`. Hoje é impossível palpitar nos jogos da Copa e filtrar por "Copa 2026".

## O que será entregue

### 1. Correção de fases e grupos (base de tudo)
- **Migration**: criar enum/constraint padronizando stages como `group | round_of_32 | round_of_16 | quarter_final | semi_final | third_place | final` e adicionar trigger para popular `group_letter` no insert/update das partidas a partir das seleções participantes.
- **Edge function `wc2026-backfill-groups`**: percorre os 72 jogos atuais, deduz o `group_letter` a partir do `group_letter` dos times, atribui rodada (1/2/3) por ordem de data e cria as 48 linhas iniciais em `world_cup_2026_standings` (zeradas).
- **Ajuste `Copa2026Jogos.tsx`**: select usando os valores reais do enum, label PT correto, agrupamento visual por **fase → grupo → rodada**, mostrando todos os 12 grupos como no print de referência (mini-cards com bandeira, placar, data UTC-3).

### 2. Tela "Grupos" dedicada (`/copa-2026/grupos`)
- Replica o layout do print: 12 cards (Grupo A–L), cada um com a tabela P/J/V/E/D/SG **e** a lista dos 3 jogos do grupo (data, mando, placar quando finalizado).
- Card clicável leva ao detalhe do grupo com chaveamento parcial (top 2 e melhores 3ºs avançam — destaque visual).
- Link adicionado ao Navbar da Copa 2026 e ao `Copa2026Home`.

### 3. Análise pré-jogo por IA para todos os 72 jogos
- **Edge function `wc2026-generate-match-preview`** (Lovable AI Gateway, `google/gemini-2.5-pro`):
  - Entrada: ID do jogo. Carrega histórico das seleções (`team_history`), elencos-base, técnico, confronto direto histórico (se houver em `partidas`), forma recente.
  - Saída JSON estrita: `headline`, `narrative` (≥900 chars, 4 parágrafos), `key_players` (3 por lado), `tactical_matchup`, `predicted_score`, `confidence` (high/medium/low), `bullet_facts[]`.
  - Persiste em `world_cup_2026_ai_analyses` com `analysis_type='pre_match'`, antialucinação (só usa fatos fornecidos), retry de tamanho.
- **Edge function `wc2026-batch-previews`**: roda em lote os 72 jogos com paginação por re-invocação (padrão `edge-functions/timeout-stability-patterns`), registrando progresso em `world_cup_2026_sync_logs`.
- **Frontend**: `Copa2026JogoDetalhe.tsx` ganha bloco "Análise Statball" (usa `AIAnalysisBlock`) + placar previsto + bullets.
- **Admin**: botão "Gerar análises pré-jogo de TODOS" em `AdminCopa2026.tsx` com barra de progresso.

### 4. Palpites do usuário em jogos da Copa 2026
- **Migration**: adicionar coluna nullable `wc2026_match_id UUID REFERENCES world_cup_2026_matches(id)` em `palpites_usuarios`, índice e check `(partida_id IS NOT NULL) <> (wc2026_match_id IS NOT NULL)`. RLS continua scoped a `auth.uid()`.
- **Hook `useUserPalpitesWC2026`**: leitura/escrita análoga ao existente, filtrando por `wc2026_match_id`.
- **`UserPalpiteModal`**: aceita prop `wcMatch` e grava no campo correto.
- **Card de jogo Copa 2026**: botão "Fazer palpite" (logado) com o mesmo fluxo do Brasileirão.
- **Página `/palpites`**: novo filtro "Competição: Brasileirão / Libertadores / Copa 2026" agrupando por origem; histórico unificado.
- **Gamificação**: reaproveita `xp_events` (mesmas regras de acerto exato/parcial).

### 5. Chaveamento interativo (oitavas → final)
- **Mapping**: nova função `wc2026-link-bracket` cria a relação `bracket_position` ↔ `world_cup_2026_matches` a partir das rodadas oficiais ("Round of 32 - 1" → `R32-1`) e plota também a **disputa de 3º lugar**.
- **`Copa2026Chaveamento.tsx`** refeito com base no print "FASES FINAIS":
  - Layout horizontal: Segunda Fase (R32) → Oitavas (R16) → Quartas → Semis → Final, com bloco lateral de 3º lugar.
  - Cada célula: bandeiras, placar (quando finalizado), data/hora UTC-3, status (Agendado / Ao vivo / Encerrado), link para o detalhe.
  - Linhas SVG conectando os jogos; placeholders mostram critério ("1º A", "2º B", "Vencedor R32-1").
  - Avanço automático já existente (`wc2026-advance-bracket`) é disparado por trigger ao marcar `status='finished'`.
- Versão mobile: accordion por fase.
- JSON-LD `SportsEvent` para SEO.

### 6. Ajustes finais
- Navbar Copa 2026 com 5 itens: Visão geral · Grupos · Jogos · Chaveamento · Seleções.
- `Copa2026Home` ganha widget "Próximos 5 jogos" (não só o próximo) e CTA "Faça seu palpite".
- Atualizar `sitemap-static.xml` com novas rotas.

## Resumo técnico

| Item | Tipo |
|---|---|
| Padronização de stages + trigger group_letter | Migration |
| Backfill grupos/standings | Edge `wc2026-backfill-groups` |
| Análises pré-jogo IA | Edge `wc2026-generate-match-preview` + `wc2026-batch-previews` |
| Palpites na Copa | Migration + hook + modal + filtro |
| Link bracket | Edge `wc2026-link-bracket` |
| Telas | `Copa2026Grupos` (nova), `Copa2026Jogos` (refeita), `Copa2026Chaveamento` (refeita), `Copa2026JogoDetalhe` (preview IA + palpite) |
| Admin | Botões: backfill grupos, link bracket, gerar previews em lote |

Tudo respeita: zero limits, UTC-3 na UI, sem logos de clubes (bandeiras de seleção via FlagCDN já está OK), Lovable AI Gateway, e nada de linguagem de apostas (cobertura editorial/estatística).

## Próximo passo

Aprove o plano para eu executar na ordem: (1) migrations → (2) backfill → (3) jogos/grupos UI → (4) chaveamento → (5) IA em lote → (6) palpites.
