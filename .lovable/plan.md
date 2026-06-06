
## Objetivo
Transformar `/copa-2026/selecoes/:slug` em uma página completa, com dados **reais** de cada seleção (histórico em Copas, posições por edição, elenco, técnico, próximos jogos) e fortemente otimizada para SEO.

## Fontes de dados reais (sem inventar)
1. **Histórico de participações em Copas (1930–2022)** — dataset estático curado a partir de fonte oficial (FIFA / Wikipedia em PT-BR), versionado no repo em `src/data/wc-history/*.json` por país. Cada registro: ano, sede, fase alcançada, posição final, J/V/E/D, GP/GC, técnico daquela edição, observações. Esses dados são imutáveis e podem viver no código.
2. **Elenco atual, técnico, agenda Copa 2026** — API-Football, via novas edge functions de sync (já temos `wc2026-sync-fixtures`). Adicionar:
   - `wc2026-sync-squads`: popula `world_cup_2026_players` por seleção (jogador, posição, clube, nº camisa, idade).
   - `wc2026-sync-coach`: atualiza `coach_name` + `coach_nationality` em `world_cup_2026_teams`.
3. **Resumo histórico textual** — geração única via `wc2026-ai-generate` (Lovable AI Gateway / Gemini) **a partir** dos dados reais do JSON histórico (não invenção livre): grava em `world_cup_2026_teams.historical_summary` e `best_campaign`. Prompt restrito ao JSON enviado para evitar alucinação.

## Mudanças no banco
Migration única:
- Seed em `world_cup_2026_team_history` a partir do JSON estático (script de seed em edge function `wc2026-seed-history` lendo o arquivo via fetch público em `/data/wc-history/<slug>.json`).
- Adicionar colunas em `world_cup_2026_teams`: `fifa_ranking int`, `confederation_full text`, `first_participation_year int`, `titles_count int`, `coach_nationality text`, `meta_description text`, `seo_keywords text[]`.

## Edge functions novas
- `wc2026-sync-squads` (API-Football `/players/squads?team=`) — logs obrigatórios em `world_cup_2026_sync_logs`.
- `wc2026-sync-coach` (API-Football `/coachs?team=`) — logs.
- `wc2026-seed-history` — lê JSONs públicos e popula `world_cup_2026_team_history` + agrega `titles_count`/`first_participation_year`/`best_campaign` na tabela `teams`.
- `wc2026-generate-team-seo` — usa Gemini para produzir `historical_summary` e `meta_description` **somente** a partir dos dados reais já no banco (prompt fechado, sem web).

## Conteúdo estático (repo)
- `public/data/wc-history/brasil.json`, `argentina.json`, ... (32 seleções confirmadas + principais candidatas a vaga).
- Cada arquivo: array de edições com campos listados acima.
- Fonte: Wikipedia PT-BR (artigos "Seleção X em Copas do Mundo FIFA"), revisada manualmente; entregaremos primeiro lote completo para as 10 seleções de maior tráfego (Brasil, Argentina, Alemanha, França, Itália, Inglaterra, Espanha, Portugal, Uruguai, Holanda) e estrutura pronta para as demais.

## Reescrita da página `Copa2026SelecaoDetalhe.tsx`
Estrutura nova com SEO no topo:

```
[Hero]
  Bandeira + Nome + Apelido + Confederação + Ranking FIFA
  Badges: Grupo 2026, Status, Nº de participações, Nº de títulos
[Seção 1] Resumo histórico (texto gerado, exibido como artigo, 2-3 parágrafos)
[Seção 2] Tabela cronológica "Participações em Copas do Mundo"
  Ano | Sede | Fase | Pos. final | J V E D | GP-GC | Técnico
[Seção 3] Melhor campanha + curiosidades reais (campos do JSON)
[Seção 4] Elenco convocado 2026 (agrupado por posição: GOL/DEF/MEI/ATA)
[Seção 5] Comissão técnica (técnico + nacionalidade)
[Seção 6] Calendário na Copa 2026 (MatchCard por jogo + status)
[Seção 7] FAQ (acordeão) — perguntas geradas a partir dos dados, ótimas para rich results
```

### SEO técnico
- Novo componente `Copa2026SelecaoSEO.tsx` (espelha `TeamPillarSEO`):
  - `<title>`: `"{Seleção} na Copa do Mundo 2026 — Histórico, Elenco, Jogos | Statball"` (< 60 chars quando possível).
  - `meta description` < 160 chars, usando `meta_description` da tabela.
  - `<link rel="canonical">`.
  - Open Graph + Twitter Card com bandeira.
  - **JSON-LD** múltiplo:
    - `SportsTeam` (nome, esporte, técnico, atletas).
    - `BreadcrumbList` (Home › Copa 2026 › Seleções › {Seleção}).
    - `FAQPage` a partir da Seção 7.
    - `ItemList` das edições de Copa.
- Um único `<h1>` (nome da seleção + "na Copa do Mundo 2026").
- `h2/h3` semânticos por seção, `alt` em todas as imagens, `loading="lazy"`.
- Sitemap: incluir rotas `/copa-2026/selecoes/:slug` em `public/sitemap-static.xml` (gerador adicionado).
- Links internos: linkar para `/copa-2026/jogos/:id`, `/copa-2026` e entre seleções do mesmo grupo (boost de crawl).

## Admin
Em `/admin/copa-2026` adicionar 4 botões: "Seed Histórico", "Sync Elencos", "Sync Técnicos", "Gerar SEO por Seleção". Logs visíveis em `world_cup_2026_sync_logs`.

## Política anti-invenção
- Resumo IA recebe **apenas** o JSON real da seleção + instrução: "Use somente os fatos abaixo. Não invente posições, anos ou jogadores. Se faltar dado, omita."
- Página nunca renderiza seções vazias — se não há dados reais, exibe estado "Em curadoria" em vez de placeholder fictício.

## Entregáveis
1. JSONs históricos (10 seleções principais) em `public/data/wc-history/`.
2. Migration: novas colunas + grants.
3. 4 edge functions (squads, coach, seed-history, generate-team-seo) registradas em `config.toml`.
4. `Copa2026SelecaoSEO.tsx` + página `Copa2026SelecaoDetalhe.tsx` reescrita.
5. Botões admin + logs.
6. Atualização do `useWC2026Team` para trazer também histórico ordenado e contagens agregadas.
