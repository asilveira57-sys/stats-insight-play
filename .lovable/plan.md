## Diagnóstico

### 1. Por que `/times` (hub) trava
A página `src/pages/Times.tsx` faz, **em todas as visitas**:
- `fetchAllRecords('times', ...)` → puxa **14.042 times** do banco (todos os clubes/seleções importados pelas APIs).
- `fetchAllRecords('partidas', ...)` filtrando jogos finalizados nos últimos 30 dias → **~2.372 partidas**.
- `fetchAllRecords('partidas', ...)` filtrando agendados a partir de hoje → **~5.973 partidas**.
- Renderiza **14 mil cards** simultaneamente no DOM (sem paginação/virtualização), agrupados por região.

Resultado: payload de vários MB, JS travado por segundos, layout shift gigantesco. O navegador parece congelado. Esse hub não tem propósito real para o usuário — listar 14k clubes amadores/U20/regionais não ajuda ninguém a encontrar nada.

### 2. Por que aparece "Time não encontrado" em `/times/betim---mg`
O slug `betim---mg` **existe no banco** (id `0cf8cdd5...`, nome "Betim - MG", 7 partidas). O hook `useTeamBySlug` usa `.single()` na query de `times`. Quando o hub ainda está martelando o banco (ou quando o tab fica em segundo plano), a chamada PostgREST pode retornar erro/timeout, `team` vira `null` e o componente cai no fallback "Time não encontrado". Não é problema de dados — é consequência da sobrecarga gerada pelo hub e da falta de cache/fallback resiliente.

Além disso, mesmo carregando, o nome "Betim - MG" viola a convenção do projeto (sufixo de estado proibido — ver memória **Team Naming**) e o time não tem absolutamente nenhum conteúdo curatorial (`team_profiles` está **vazio** — 0 linhas; só **17 de 14.042** times têm `pillar_content` preenchido).

### 3. Conteúdo hoje vs. o que você quer
A tabela `times` tem: nome, país, cores, escudo_url, slug, priority_score, total_matches. Existe `team_profiles` (history/stadium/culture/rivalries/legacy) — **vazia**. Existe `pillar_content` em `times` (visão geral, estilo de jogo, desempenho) — preenchido em 17 clubes. **Não há tabela de títulos, participações em campeonatos (estadual/nacional/Conmebol), elenco histórico, fundação, etc.** A página `TimePilar` mostra hoje: hero + jogos/aproveitamento/saldo + visão geral em prosa + estilo de jogo + temporada + forma + próximos jogos + resultados + notícias relacionadas. Não há currículo nem títulos.

---

## Plano

### Parte A — Curadoria de quais times merecem página rica
Em vez de tentar criar 14 mil páginas, qualificar um subconjunto:

1. **Definir critério de "time elegível"** (campo já existente: `status='active'` e `priority_score`):
   - Clubes com `total_matches >= 50` **ou** `priority_score >= 70` **ou** que apareceram em campeonatos nacionais/Conmebol/Copa do Mundo no banco.
   - Estimativa: ~300-800 clubes profissionais reais (Brasil + grandes ligas + seleções) em vez de 14k.
2. Times fora desse recorte continuam acessíveis por slug (rota viva), mas:
   - **Não** aparecem no hub `/times`.
   - Exibem uma página enxuta (header + jogos + aviso "Perfil completo em breve").

### Parte B — Consertar o hub `/times` (lentidão)
1. Trocar `fetchAllRecords('times')` por uma query paginada server-side **só dos times elegíveis** (filtro por `priority_score` ou flag `is_featured`), ordenada por prioridade. Carregar máximo de **~60 cards inicialmente**, com "carregar mais" ou paginação por região.
2. Remover as duas queries gigantes de partidas (recentes + próximas) do hub. Quem quer ver jogos abre a página do time. Se for indispensável, fazer uma única RPC agregada (`SELECT time_id, count(*) FILTER (...) ...`) retornando só os IDs visíveis na página.
3. Adicionar busca server-side (debounce) por `nome ILIKE %termo%` para que o usuário ache qualquer time mesmo fora do recorte destacado.

### Parte C — Consertar `/times/:slug` (erro "não encontrado")
1. Trocar `.single()` por `.maybeSingle()` para distinguir "0 linhas" de "erro de rede".
2. Em caso de erro de rede, mostrar mensagem "Erro ao carregar — tente novamente" com botão de retry, **não** "Time não encontrado".
3. `fetchAllRecords` para histórico do time → trocar por query única paginada (50 últimos jogos) com botão "ver mais". Time como Betim só tem 7 jogos, mas Flamengo tem milhares — fetchAllRecords pode pegar 5k+ partidas.
4. Aplicar a convenção de nome ("Betim - MG" → exibir "Betim"; já há memória **Team Naming**).

### Parte D — Novo padrão "página bonita" por clube (currículo)
Criar duas novas tabelas e estender `team_profiles`:

```text
public.team_titles
  team_id (fk times)
  competition_name        ex: "Campeonato Brasileiro Série A"
  competition_tier        enum: estadual | regional | nacional | continental | mundial | amistoso
  edition_year            ex: 2019
  position                ex: "Campeão" | "Vice" | "3º"
  confederation           ex: CBF, Conmebol, FIFA, FMF
  source_url

public.team_participations
  team_id
  competition_name
  competition_tier
  year_from, year_to
  total_editions
  notes

team_profiles (já existe — preencher)
  history_text, stadium_text, culture_text, rivalries_text, legacy_text
  + founded_year, stadium_name, stadium_capacity, mascot, anthem_url
```

Estrutura da nova página (`TimePilar` reformulada):
```text
┌─────────────────────────────────────────────────┐
│ HERO: badge + nome + país/estado + fundado em   │
│       + estádio + cores oficiais (faixa)        │
├─────────────────────────────────────────────────┤
│ CURRÍCULO (tabs ou seções)                      │
│  • Títulos por categoria                        │
│      Estadual: 35 (último 2024)                 │
│      Nacional: 8                                │
│      Continental (Conmebol): 3                  │
│      Mundial: 1                                 │
│  • Participações (Brasileirão, Libertadores...) │
├─────────────────────────────────────────────────┤
│ DESEMPENHO ATUAL (já existe)                    │
│  Jogos, aproveitamento, forma, próximos jogos   │
├─────────────────────────────────────────────────┤
│ HISTÓRIA / ESTÁDIO / RIVALIDADES / LEGADO       │
│  (texto curatorial — team_profiles)             │
├─────────────────────────────────────────────────┤
│ NOTÍCIAS RELACIONADAS + análises                │
└─────────────────────────────────────────────────┘
```

### Parte E — Como popular o currículo
1. **Manual via admin** (`/admin/times`): formulários para títulos/participações dos ~50-100 grandes clubes brasileiros primeiro (Flamengo, Palmeiras, Corinthians, São Paulo, Cruzeiro, Atlético-MG, Grêmio, Internacional, Santos, Botafogo, Fluminense, Vasco, Bahia, Atlético-PR, Athletico, Fortaleza, Ceará, Sport, Náutico, etc.).
2. **Geração assistida por IA** (Lovable AI Gateway / Gemini) opcional: edge function `generate-team-curriculum` que recebe `team_id`, faz prompt estruturado e devolve JSON com títulos por categoria, que o admin revisa antes de publicar.
3. Para seleções, importar do `world_cup_2026_teams` que já tem `titles_count`, `participations_count`, `historical_summary`, `best_campaign`.

### Parte F — Ordem de execução sugerida
1. Hotfix urgente: `.maybeSingle()` + filtragem de times elegíveis no hub + remoção das queries de partidas no hub → resolve a lentidão e o "não encontrado".
2. Criar tabelas `team_titles` e `team_participations` + grants/RLS.
3. Reformular `TimePilar` com a nova estrutura (sem dados ainda → mostra "Em construção" nas seções vazias).
4. Tela admin para preencher currículo manualmente.
5. (Opcional) Edge function de geração via IA.

---

## Decisões que preciso de você antes de implementar

1. **Recorte do hub:** ok limitar `/times` a "times com perfil curado" (~300-800 clubes/seleções) e deixar o resto acessível só por busca/URL direta? Ou prefere paginação simples mantendo todos os 14k visíveis?
2. **Currículo:** começamos preenchendo manualmente os ~50 grandes clubes brasileiros, ou já criamos o gerador via IA junto?
3. **Escopo da reforma da página:** mantemos as seções atuais (visão geral, estilo de jogo, próximos jogos) e **adicionamos** currículo/história, ou refazemos a página inteira do zero com nova identidade visual?