
# Plano — Pesquisa Inteligente Statball v2

## Diagnóstico do caso "quem é o maior artilheiro da copa até agora"

A função `intelligent-search` hoje:

1. **Classifica como "question"** e cai num caminho que só monta contexto para um **time**. Não existe nenhum ramo para "artilheiro" / ranking de jogadores. Resultado: o contexto enviado à IA fica vazio de gols, então ela responde "dados insuficientes".
2. **Resolve "copa"** chamando `search_global("copa")`. Isso devolve TODA liga com "Copa" no nome em ordem alfabética/relevância textual: Copa Alagoas, Copa Centro-Oeste, Copa do Brasil U17, U20, Nordeste… A função pega a *primeira* (`Copa Alagoas`) e nem tenta saber se o usuário quis dizer **Copa do Mundo** ou **Copa do Brasil** (sênior).
3. **Não consulta `artilharia_agregada` nem `gols_partida`** em nenhum momento — as duas tabelas que de fato têm artilharia.
4. **Sub-ligas (U17/U20/Feminino) não são despriorizadas** (o filtro `SUBTEAM_RE` só existe para times).
5. Não há fallback externo nem para placar do dia, nem para artilheiros oficiais de torneios em andamento (Copa do Mundo 2026 já tem tabela própria `world_cup_2026_*`).

## O que vamos construir

### 1. Detector de intenção real (na edge function)
Substituir o `classify` binário por um classificador com intenções nomeadas:

- `top_scorer` — gatilhos: "artilheir", "mais gols na", "maior goleador", "quem fez mais gols"
- `top_assists`, `top_cards` (mesma infra, fácil de adicionar depois)
- `team_stats` (o caminho atual)
- `player_stats` — "quantos gols X fez", "estatísticas do Y"
- `match_lookup` — "jogo de X contra Y", "placar de X hoje"
- `entity_lookup` — busca pura
- `open_question` — fallback IA com contexto do que foi resolvido

Cada intenção decide qual *resolver* roda e qual contexto factual é montado.

### 2. Desambiguação de ligas (espelho do que já existe para times)
Novo `LEAGUE_NOISE_RE` para `U-?\d+|Sub-?\d+|Feminin|Women|Amador`. E uma tabela de **apelidos canônicos** em código:

- "copa" sozinha + ano ≥ 2022 → Copa do Mundo (FIFA) **e** mostra alternativas (Copa do Brasil, Libertadores).
- "copa" + "brasil" → Copa do Brasil sênior masculina.
- "mundial", "world cup", "copa do mundo" → Copa do Mundo (preferir `world_cup_2026_*` quando ano = 2026).
- Quando houver ambiguidade real, devolver as 3 melhores ligas como **"Você quis dizer?"** ao usuário antes de chamar IA.

### 3. Resolver de artilheiros (novo)
Função `resolveTopScorers(leagueId, year?, limit=10)`:

1. Tenta `artilharia_agregada` filtrando por `liga_id` (e `season` quando aplicável). Retorna jogador + clube + gols.
2. Se a tabela não tem dados pra essa liga/ano, faz fallback agregando `gols_partida` → `partidas` (join por `partida_id`, filtra `liga_id`, `data` no range do ano), contando linhas por `jogador_id`.
3. Para Copa do Mundo 2026 especificamente, ler `world_cup_2026_match_events` (tipo gol) e agrupar por jogador.

A IA recebe um contexto pronto, factual, do tipo:
```
Liga: Copa do Brasil 2025
Top 10 artilheiros (gols):
1. Pedro (Flamengo) — 7 gols
2. ...
Fonte: artilharia_agregada (217 partidas, atualizado em 2025-06-12)
```

E nesses casos a IA só **redige** — não inventa. Se o resolver devolver 0 linhas, devolvemos a mensagem "dados insuficientes" sem nem chamar IA.

### 4. Resolver de jogador individual
Para perguntas tipo "quantos gols Pedro fez em 2025": agregar `gols_partida` por `jogador_id` + filtros de período / liga. Hoje a função só anexa o nome do jogador no contexto.

### 5. Fallback externo controlado (opt-in, sem alucinação)
Quando o resolver interno devolve 0 e a pergunta é factual e datada:

- Chamar **API-Football** se a liga estiver mapeada em `api_football_inventory` (respeitando o `circuit_breaker_policy` da memória).
- Para Copa do Mundo: usar dados já sincronizados em `world_cup_2026_*` antes de qualquer rede externa.
- Nunca consultar web aberta a partir da edge function — manter o princípio "sem inventar". O fallback externo só entra se a fonte for estruturada e mapeada.

Marcar a resposta com `source: "api-football"` ou `source: "internal"` para o card de IA exibir um selo de origem.

### 6. UI da Pesquisa
- Mostrar **chips de desambiguação** quando houver mais de uma liga candidata ("Você quis dizer: Copa do Mundo · Copa do Brasil · Copa Sul-Americana"). Click refaz a busca com `liga_id` fixado.
- No `AIAnswerCard`, exibir o **selo de fonte** (interno / API-Football / Statball WC2026) e a contagem de registros usados.
- Quando a intenção for `top_scorer`, renderizar uma **tabela top-10** acima do texto da IA (componente novo `TopScorersTable`), porque é o que o usuário quer ver.
- Filtros existentes (Tudo / Times / Campeonatos / Jogadores) ganham um quarto botão **"Artilheiros"** quando a intenção for detectada.

### 7. Logs e métricas
- Estender `ai_answers_log` com `intent`, `resolved_league_id`, `source`, `external_called` (já tem campos genéricos; adicionar via migration se faltarem).
- Logar todas as buscas que caíram em "dados insuficientes" para virar backlog de ingestão.

## Seção técnica (para referência interna)

Arquivos tocados:

- `supabase/functions/intelligent-search/index.ts` — refator: intent router, resolvers separados, desambiguação de liga, contexto factual por intenção, log de origem.
- `supabase/functions/_shared/resolvers/top-scorers.ts` (novo) — encapsula a lógica das 3 fontes (artilharia_agregada / gols_partida / world_cup_2026).
- `supabase/functions/_shared/resolvers/player-stats.ts` (novo).
- `supabase/functions/_shared/league-aliases.ts` (novo) — mapa "copa", "mundial", "brasileirão", etc.
- `src/components/search/TopScorersTable.tsx` (novo).
- `src/components/search/DisambiguationChips.tsx` (novo).
- `src/components/search/AIAnswerCard.tsx` — exibir selo de fonte e contagem.
- `src/pages/Pesquisa.tsx` — renderizar tabela de artilheiros e chips quando o backend devolver `intent === "top_scorer"` ou `disambiguation`.
- `src/hooks/useIntelligentSearch.ts` — incluir `liga_id` opcional no payload pra fixar liga após clique no chip.
- Migration: ampliar `ai_answers_log` com `intent text`, `source text`, `external_called boolean`, `resolved_entity jsonb` (se já não existirem).

Ordem de execução:
1. Edge function (intent + resolvers + desambiguação) — destrava o caso real do print.
2. UI (chips + tabela + selo).
3. Migration de logs.
4. Fallback API-Football (último, opcional por feature flag).

## Fora do escopo

- Pesquisa web aberta (Google/Wikipédia) — viola a regra "sem inventar / fonte estruturada".
- Reescrever `search_global` SQL — só consumimos os resultados com regras melhores em cima.
- Importação massiva de dados que estejam faltando — esse plano resolve o motor de busca; a falta de dados em si vira backlog via logs.
