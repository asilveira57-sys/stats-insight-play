# Motor de Pesquisa Inteligente — DB-Only

## Princípio inegociável

A IA **só responde com dados retornados pelo banco**. Sem conhecimento de mundo, sem fallback externo. Se o banco não tem, a resposta é:
> "Não encontrei esse dado no banco de dados do StatBall."

Isso remove o `externalAnswer` atual da edge function (que hoje deixa a IA inventar respostas factuais quando o DB falha).

## Arquitetura

```text
Usuário (pergunta livre)
   ↓
[1] Classificador de intenção (Gemini via Lovable AI Gateway)
   ↓  → { intent, entities, year, scope, confidence }
[2] Resolver de entidades (DB lookup com aliases)
   ↓  → { competicao_id?, time_id?, jogador_id?, ... }
   ↓  → se ambíguo: devolve chips de desambiguação (sem responder)
   ↓  → se inexistente: devolve "não encontrado"
[3] Query Builder (mapeia intent → SQL/RPC tipado)
   ↓
[4] Execução no Postgres (Supabase client)
   ↓
[5] Formatter (monta StructuredAnswer + frase natural a partir das rows)
   ↓
[6] Persistência SEO (search_posts) — só se houve dado real
```

A IA aparece **só na etapa 1** (interpretar) e na etapa 5 (parafrasear rows). Nunca como fonte de fato.

## Intents suportadas (whitelist)

`resultado`, `placar`, `proximo_jogo`, `ultimo_jogo`, `ultimos_n_jogos`, `campeao`, `classificacao`, `artilharia`, `assistencias`, `cartoes`, `escalacao`, `confronto_direto`, `estatisticas_time`, `estatisticas_jogador`, `jogos_filtrados` (ex: "jogos com +3 gols ontem"), `gols_partida` ("quem fez gol na final"), `odds`.

Qualquer pergunta fora dessa whitelist → "Não encontrei esse dado no banco".

## Entidades + desambiguação

Resolver por (slug exato → alias exato → normalize match → trigram). Sempre devolver `match_confidence`. Quando duas entidades empatam acima do limiar (ex.: "Barcelona" Espanha vs Equador, "França" país vs "Franca" cidade), **não consultar** — devolver `disambiguation: [{id, name, country, kind}]` e exibir chips.

Aliases especiais já existem (`NATIONAL_TEAM_ALIASES`, `team_aliases`, `competition_aliases`). Vamos consolidar num único resolver.

## Mudanças de código

### Backend
- **`supabase/functions/intelligent-search/index.ts`** — reescrito em módulos:
  - `classifyIntent(query)` — único call ao Gemini, retorna JSON estruturado (Output schema). Prompt deixa explícito: "você só classifica, NÃO responde".
  - `resolveEntities(entities)` — DB lookups + desambiguação.
  - `runQuery(intent, resolved)` — switch por intent, cada um com sua função SQL tipada.
  - `formatAnswer(intent, rows)` — gera `summary` + `StructuredAnswer` a partir das linhas.
  - Remove `externalAnswer`, remove qualquer prompt que peça resposta factual à IA.
  - Toda resposta inclui `filters_used` (competição, temporada, tipo).
- **Novas funções SQL** (migration) para casos que hoje não têm query:
  - `search_champion(liga_id, year)` — lê `standings` ordenado por posição = 1.
  - `search_next_matches(time_id, limit)` — `partidas` futuros por data.
  - `search_filtered_matches(date, min_goals)` — para "jogos com +3 gols ontem".
  - `search_match_goals(partida_id)` — quem marcou (já existe parcial em `gols_partida`).

### Frontend
- **`src/components/search/AnswerCard.tsx`** — adicionar bloco `FiltersUsed` (chips discretos abaixo da resposta).
- **`src/components/search/DisambiguationChips.tsx`** — já existe; estender para times/jogadores além de ligas.
- **`src/pages/Pesquisa.tsx`** — quando `data.type === "not_found"`, mostrar mensagem padrão "Não encontrei esse dado no banco de dados do StatBall" com sugestões de busca (trending).
- **`src/hooks/useIntelligentSearch.ts`** — adicionar tipos `filters_used`, `disambiguation` para entidades genéricas, `not_found`.

### SEO
- `search_posts` só é gravado quando `has_data = true`. Páginas "não encontrado" não viram post (evita lixo no Google).

## Casos de teste (vão ser rodados após deploy)

1. "Quem ganhou ontem?" → lista de jogos de ontem com vencedor.
2. "Quanto ficou França x Alemanha?" → último confronto direto seleções.
3. "Quem foi campeão do Brasileirão 2025?" → standings posição 1.
4. "Quantos gols o Neymar fez na Copa?" → gols_partida + escalacoes + filtro Copa.
5. "Jogos do Palmeiras em casa em 2025" → partidas com is_home + ano.
6. "Últimos 5 jogos do Flamengo" → partidas finalizadas ordenadas.
7. "Classificação da Série A" → standings ano corrente.
8. "Próximos jogos do Barcelona" → desambiguação ESP/EQU primeiro.
9. "Jogos com mais de 3 gols ontem" → partidas where gols_casa+gols_fora>3.
10. "Quem fez gol na final da Champions?" → gols_partida da última final.

Casos sem dado no banco devem responder a mensagem padrão, não inventar.

## Fora de escopo desta fase
- Ranking de odds históricas (só Copa 2026 tem hoje).
- Estatísticas avançadas (xG etc) — banco não tem.
- Tradução EN/ES da pergunta (só PT-BR nesta fase).

Posso seguir com a implementação?
