# Plano: Completar a Central Copa 2026

## Diagnóstico atual (banco)

| Item | Status |
|---|---|
| Seleções cadastradas | **60** (48 originais PT + 12 novas vindas do `resolve-team-ids` em inglês: Sweden, Norway, Scotland, Czech Republic, Bosnia, Cape Verde, Curaçao, Iraq, Jordan, Haiti, Congo DR) |
| Bandeiras (`flag_url`) | **apenas 12/60** preenchidas — por isso a UI aparece cinza |
| Técnicos (`coach_name`) | **apenas 12/60** |
| Resumo histórico IA | **23/60** |
| Histórico em Copas (tabela `team_history`) | Só 48 cobertas (faltam as 12 novas) |
| Jogadores | 2.285 em 86 registros (duplicatas PT/EN ainda existem) |
| Jogos (`world_cup_2026_matches`) | **72 jogos, todos `group`, 0 finalizados, 0 mata-mata** |
| Chaveamento (bracket) visual | **Não existe** |

## O que vamos fazer

### 1. Limpar e completar o cadastro de seleções (48 → lista oficial 2026)
- Função `wc2026-normalize-teams`: mescla duplicatas PT/EN (Sweden→suecia, Norway→noruega, etc.), criando os slugs PT que faltam (suécia, noruega, escócia, república-tcheca, bósnia, cabo-verde, curaçao, iraque, jordânia, haiti, rd-congo) e movendo `external_team_id`, jogadores e técnico para o registro canônico.
- Marca como `is_active=false` os duplicados em inglês.

### 2. Bandeiras coloridas em TODAS as seleções
- Função `wc2026-sync-flags`: para cada time ativo, popula `flag_url` priorizando:
  1. `https://flagcdn.com/w320/{country_code}.png` (FlagCDN, livre, SVG/PNG colorido)
  2. Fallback: bandeira retornada pela API-Football (`teams` endpoint)
- Garante `country_code` ISO-2 onde estiver faltando (mapa estático no código).
- `TeamCard`/`Copa2026Selecoes` passa a renderizar `<img src={flag_url}>` com fallback para o `TeamBadge` colorido só se a imagem falhar.

### 3. Técnicos e elencos de TODAS
- Roda `wc2026-sync-coach` em lote para os 60 → preenche `coach_name` + `coach_nationality`.
- Roda `wc2026-sync-squads` em lote para as 12 novas, garantindo paridade.
- Botão admin: "Sincronizar bandeiras + técnicos + elencos (TODAS)" que dispara as 3 em sequência.

### 4. Histórico em Copas para as 12 novas
- Adiciona JSONs curados em `public/data/wc-history/` para: suécia, noruega, escócia, república-tcheca, bósnia, cabo-verde, curaçao, iraque, jordânia, haiti, rd-congo (curaçao/cabo-verde/jordânia = estreantes em 2026).
- Roda `wc2026-seed-history` + `wc2026-generate-team-seo` para essas 12.

### 5. Tabela completa de jogos (grupos + mata-mata)
- `wc2026-sync-fixtures` é estendido para também buscar **knockout** da API-Football (round de 32, oitavas, quartas, semi, disputa de 3º, final) — total esperado: 104 jogos (72 grupos + 32 mata-mata no novo formato 48 seleções).
- Quando a API ainda não tem os confrontos definidos (antes do sorteio/classificação), cria placeholders por `stage` + `round` (ex.: "R32-1", "QF-2") com `home_team_id`/`away_team_id` nulos.
- Job/edge `wc2026-advance-bracket` rodando após cada update de resultado: ao detectar `status='finished'` num jogo eliminatório, escreve o vencedor no `home/away_team_id` da próxima fase via mapa de chaveamento FIFA 2026 (R32→R16→QF→SF→3º/Final).

### 6. Página `/copa-2026/chaveamento` (bracket visual)
- Nova rota + componente `BracketView.tsx`:
  - Layout horizontal clássico (R32 → R16 → QF → SF → Final), com a disputa de 3º em destaque lateral.
  - Cada "match cell" mostra bandeira + sigla + placar; vencedor avança visualmente (linha conectora destacada).
  - Estados: `scheduled` (placeholder cinza com data/hora), `live` (pulse), `finished` (placar + vencedor em negrito).
  - Responsivo: vira accordion vertical por fase no mobile.
- Reaproveita `Copa2026SelecaoSEO` para JSON-LD `SportsEvent`.
- Link no menu Copa 2026 ("Chaveamento") e card de destaque na Home da Copa.

### 7. Admin Copa 2026 — novos botões
- **Normalizar seleções (mesclar duplicatas)**
- **Sincronizar bandeiras (TODAS)**
- **Sincronizar técnicos (TODAS)** *(já existe — manter)*
- **Sincronizar elencos das 12 novas**
- **Importar jogos mata-mata (API-Football)**
- **Avançar chaveamento (recomputar vencedores)**

Cada um com barra de progresso + log em `sync_logs`.

## Detalhes técnicos

- **Bandeiras**: FlagCDN é CDN público, sem chave; URL determinística por ISO-2. Cache no `<img loading="lazy">`.
- **Anti-alucinação histórico**: mesma regra atual — só fatos do JSON curado entram no prompt do Gemini.
- **Idempotência**: todas as funções usam upsert por chave natural (slug, external_team_id, external_fixture_id, stage+round).
- **Zero Limits**: paginação em todos os loops admin (sem `.limit()`).
- **RLS**: tabelas já existem; nenhuma alteração de schema necessária além de uma coluna opcional `bracket_position TEXT` em `world_cup_2026_matches` para o mapa do chaveamento.

## Migração mínima
```sql
ALTER TABLE public.world_cup_2026_matches
  ADD COLUMN IF NOT EXISTS bracket_position TEXT,           -- ex.: 'R16-1', 'QF-3', 'SF-1', 'F', '3P'
  ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES public.world_cup_2026_matches(id),
  ADD COLUMN IF NOT EXISTS next_match_slot TEXT;            -- 'home' | 'away'
CREATE INDEX IF NOT EXISTS idx_wc2026_matches_bracket ON public.world_cup_2026_matches(bracket_position);
```

## Entregáveis (ordem de execução)
1. Migração (3 colunas no `matches`).
2. `wc2026-normalize-teams` + execução.
3. `wc2026-sync-flags` + execução (resolve o "tudo cinza" imediatamente).
4. Sync de técnicos/elencos das 12 novas.
5. JSONs históricos + seed + SEO IA das 12 novas.
6. `wc2026-sync-fixtures` estendido (mata-mata) + `wc2026-advance-bracket`.
7. `BracketView.tsx` + rota `/copa-2026/chaveamento` + link no menu.
8. Botões novos no `/admin/copa-2026`.

Confirma que posso executar nessa ordem?
