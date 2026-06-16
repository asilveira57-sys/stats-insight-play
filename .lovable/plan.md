## Problema

A pergunta "resultado da Alemanha no último jogo da Copa" cai em `entity_lookup`, que não tem nenhum resolvedor. O frontend então mostra "Nenhum resultado direto". O mesmo acontece com qualquer pergunta cujo formato não bata exatamente com as regex de intenção atuais (ex.: "último jogo do Flamengo", "placar de Brasil x Argentina", "quem treina o Palmeiras", "onde nasceu o Neymar").

Hoje só temos resolvers para `top_scorer`, `team_stats` e parte de `open_question`. `match_lookup`, `player_stats` e `entity_lookup` não geram resposta — e não existe fallback de IA quando o banco não tem dados.

## Objetivo

Garantir que **toda** pergunta retorne uma resposta útil, seguindo essa cascata:

1. Entender a intenção (com LLM como roteador, não só regex)
2. Buscar no banco com o resolver certo
3. Se faltar dado, buscar em fonte externa (web/Perplexity quando disponível, ou Lovable AI com Google Search grounding)
4. Sempre responder algo — nunca tela vazia

## Mudanças

### 1. Roteador de intenção híbrido (`detectIntent` + LLM classifier)
- Manter regex rápidas como atalho.
- Quando não houver match claro, chamar **Lovable AI Gateway (`google/gemini-3-flash-preview`)** com schema estruturado pra classificar:
  - `intent`: top_scorer | player_stats | team_stats | match_lookup | last_match | next_match | coach_lookup | entity_lookup | open_question
  - `entities`: { team?, player?, league?, year?, opponent? }
  - `time_modifier`: last | next | specific_date | range | none
- Substituir `OPENAI_API_KEY` por `LOVABLE_API_KEY` em todo o arquivo (padrão da plataforma).

### 2. Novos resolvers no edge function

**`resolveLastMatch(teamId, leagueFilter?)`** — usado para perguntas tipo "resultado da Alemanha no último jogo da Copa":
- Busca em `partidas` (status=finished) + `world_cup_2026_matches` quando a liga for Copa do Mundo
- Filtra por liga se o usuário citou ("copa", "brasileirão", etc.) usando os alias groups existentes
- Retorna placar, adversário, data, gols (de `gols_partida` / `world_cup_2026_match_events`), cartões e link pra `/partida/:slug`
- Persiste `search_post` (intent=last_match) com slug `ultimo-jogo-<time>-<liga>` e meta SEO

**`resolveMatchLookup(teamA, teamB, year?)`** — para "Brasil x Argentina 2022":
- Procura partidas entre os dois times; retorna lista ou jogo único

**`resolvePlayerStats(playerName, year?)`** — para "quantos gols Vinicius fez em 2024":
- Procura em `players`, agrega `gols_partida` ou `artilharia_agregada`

**`resolveCoach(teamId)`** — para "quem treina o X":
- Consulta `tecnicos` / `tecnico_partida` do último jogo

### 3. Fallback obrigatório (nunca retornar vazio)
Quando nenhum resolver produzir `structured_answer`:
1. Tenta Lovable AI com o contexto disponível (entidades encontradas, normalized query) e o sistema atual.
2. Se ainda não houver resposta útil, chama Lovable AI novamente em modo "resposta geral de futebol" com aviso explícito de que veio de **conhecimento externo** (não do banco) — UI marca como `source: "external"` com badge "Fonte externa".
3. Se houver `PERPLEXITY_API_KEY` configurado (connector), usar `sonar` em vez do passo 2 para respostas com citação. Caso contrário, pular.
4. Sempre gerar pelo menos `ai_answer.answer` + `structured_answer.kind = "external"` com `summary` para que a UI renderize algo.

### 4. UI (`Pesquisa.tsx` + `AnswerCard.tsx`)
- Quando `structured_answer.kind === "last_match"` ou `"match_detail"`, renderizar `AnswerCard` com placar grande, adversário, data e botão "Ver detalhes" → `/partida/:slug`.
- Quando `structured_answer.kind === "external"`, mostrar resposta com badge amarelo "Fonte externa — dados não confirmados pelo Statball".
- Remover o estado "Nenhum resultado direto" e substituir por skeleton enquanto carrega; após a resposta, sempre mostrar `AnswerCard`.

### 5. SEO posts
- Cada resolver novo persiste em `search_posts` com `meta_title`/`meta_description` apropriados e cria página em `/pesquisa/:slug` (já existe — só passa o payload novo).
- `last_match` cria post separado por (time + liga), `match_lookup` por (timeA + timeB + ano).

## Detalhes técnicos

- Não cria tabelas novas. `search_posts.answer_payload` (JSONB) acomoda os novos `kind`s.
- Adiciona `kind: "last_match" | "match_detail" | "player_stats" | "coach" | "external"` ao tipo `StructuredAnswer` no frontend (`useIntelligentSearch.ts`, `SearchPost.tsx`).
- `callAI` migra pra Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1`, header `Lovable-API-Key`) — remove dependência do `OPENAI_API_KEY`.
- Tratamento explícito de 402/429 do gateway com mensagem para o usuário.

## Arquivos afetados

- `supabase/functions/intelligent-search/index.ts` (grande refactor: roteador LLM, novos resolvers, fallback obrigatório, migração pra Lovable AI)
- `src/hooks/useIntelligentSearch.ts` (novos `kind`s no tipo)
- `src/pages/Pesquisa.tsx` (sempre renderizar resposta; remover estado vazio)
- `src/components/search/AnswerCard.tsx` (renderizar `last_match`, `match_detail`, `external`)
- `src/pages/SearchPost.tsx` (suportar novos `kind`s no SEO)

## Fora do escopo

- Não muda esquema de banco.
- Não mexe em outras páginas/fluxos.
- Conector Perplexity só é usado se já existir (não vou pedir pra configurar agora) — se o usuário quiser citações web ricas, posso sugerir depois.
