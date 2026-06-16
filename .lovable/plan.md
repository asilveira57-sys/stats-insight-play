## Problema

1. **Busca atual exige digitar nome** — entre 14k times, "fla" devolve dezenas de homônimos (Flat Earth, Flamingos, Flaminia…). É inviável escolher um a um.
2. **IA gera vazio** — o prompt manda só `nome + país` para o OpenAI. Para nomes ambíguos ("Flamengo - PI", "CR Flamengo") o modelo não tem ancoragem suficiente, devolve `titles: []` e `participations: []` por precaução. Sem fontes verificáveis, o modelo se recusa a inventar (bom) mas também não acha o clube certo.
3. **Sem lote** — só dá pra gerar 1 por vez, manualmente. O usuário quer "todos do Brasileirão de uma vez", em background, respeitando rate limit do OpenAI.

## Solução

### 1. Novo seletor: por liga, com lista de participantes

Substituir a busca textual única por um seletor em 2 níveis:

```text
[Liga ▼: Brasileirão Série A 2025]  [Buscar texto: ____]
┌─ Times participantes (20) ────────────────┐
│ ☑ Flamengo (RJ)   • currículo: vazio      │
│ ☐ Palmeiras (SP)  • currículo: ok (24 t.) │
│ ☑ Corinthians (SP)• currículo: parcial    │
│ ...                                        │
└────────────────────────────────────────────┘
[ Gerar selecionados em lote ]  [ Gerar só os vazios ]
```

- Dropdown **Liga** lista ligas com `ativa=true`, ordenadas por `ordem_exibicao` (Brasileirão A/B/C, Copa do Brasil, Libertadores, Sul-Americana, Premier League, La Liga, etc.).
- Lista de participantes derivada de `partidas` (DISTINCT `time_casa_id`/`time_fora_id` WHERE `liga_id = X` AND data nos últimos 24 meses) — não precisa de tabela nova.
- Cada item mostra **status do currículo**: vazio / parcial / completo (contagem de títulos + participações + perfil).
- Filtro texto opcional dentro da liga (refina, não substitui).
- Busca livre global continua disponível em uma aba "Busca avançada".

### 2. Identificação confiável do time (anti-alucinação)

Antes de chamar o OpenAI, montar um **dossiê de contexto** para o prompt:

- `nome`, `pais`, `estado`, `short_code` da tabela `times`.
- Liga(s) que o time disputou (join `partidas → ligas`), com anos.
- Total de partidas, último jogo, primeiro jogo (proxy de "é clube profissional ativo").
- `api_id` (Football-Data / API-Football) — se existir, vira chave de desambiguação.

O prompt passa a dizer: *"Este time disputou Brasileirão Série A entre 2020-2025, está no estado RJ. Se não conseguir identificar com certeza esse clube específico, retorne `confidence: 'low'` e listas vazias — não invente."* Adiciona campo `confidence` no JSON e bloqueia escrita no banco se vier `low`.

### 3. Geração em lote no background

Nova tabela `team_curriculum_jobs`:
```text
id | liga_id | team_ids[] | status (queued/running/done/failed)
   | total | processed | succeeded | skipped_low_conf | failed
   | created_by | created_at | finished_at | error_log jsonb
```

Edge function `generate-team-curriculum-batch`:
- Recebe `liga_id` ou `team_ids[]` + `only_empty: boolean`.
- Cria o job, dispara processamento sequencial com `await sleep(2000ms)` entre chamadas (rate limit OpenAI). 
- Cada item: monta dossiê → chama `generate-team-curriculum` interno → grava se `confidence != low` → atualiza `processed/succeeded`.
- Re-invoca a si mesma a cada ~20 times (padrão do projeto pra escapar do timeout de 150s das edge functions).

UI mostra **progresso ao vivo** (poll a cada 3s na tabela `team_curriculum_jobs`): "12/20 processados, 9 ok, 2 baixa confiança, 1 erro".

### 4. Melhorias no prompt do OpenAI

- Trocar `gpt-4o-mini` por `gpt-4o` para clubes com `priority_score >= 80` (mais conhecimento histórico). Manter `mini` para clubes obscuros.
- Adicionar regra explícita: *"Para títulos estaduais brasileiros, use o nome oficial da federação (FERJ, FPF, etc.). Não inclua amistosos, torneios juvenis ou Sub-20 a menos que seja explicitamente sobre categoria de base."*
- Pedir `source_hint` (Wikipedia, site oficial) em cada título — registrado em `team_titles.source_url` para auditoria.

### 5. Painel de auditoria

Aba nova "Histórico de gerações" no admin:
- Lista últimos jobs com filtro por liga e status.
- Botão "re-gerar baixa-confiança" para tentar novamente os que falharam.
- Visualização rápida de quantos times de uma liga estão com currículo completo.

## Ordem de implementação

1. Migrar `team_curriculum_jobs` (tabela + RLS admin-only + GRANTs).
2. Refatorar `AdminTeamCurriculum.tsx`: novo seletor por liga com checkbox múltiplo e status visual.
3. Reescrever edge function `generate-team-curriculum` para receber dossiê e devolver `confidence`.
4. Criar edge function `generate-team-curriculum-batch` (orquestrador com auto re-invoke).
5. UI de progresso + aba de histórico.

## Detalhes técnicos

- **Rate limit OpenAI**: tier 1 = 500 req/min com `gpt-4o-mini`. Margem confortável com sleep 2s.
- **Custo estimado**: ~$0.002 por time com `mini`, ~$0.02 com `gpt-4o`. Brasileirão A (20 times) ≈ $0.04–$0.40.
- **Idempotência**: job marca times com `pillar_updated_at` recente (<30 dias) e pula, a menos que `force_refresh=true`.
- **Segurança**: edge function batch valida `has_role(auth.uid(),'admin')` antes de aceitar.
- **Sem quebra de memória legal**: continua sem usar escudos de times; perfil só texto + estádio + cores.

## Pendências para o usuário

Antes de implementar preciso confirmar 3 escolhas — vou perguntar logo após você aprovar este plano:
1. **Escopo inicial das ligas** — só ligas brasileiras (A/B/C/D + estaduais + Copa do Brasil) ou já incluir Libertadores/Sul-Americana e Big-5 europeias?
2. **Modelo OpenAI** — usar `gpt-4o` para clubes top (custo ~10x) ou ficar só com `mini` em todos?
3. **Política de re-geração** — pular times com currículo já preenchido por padrão, ou sempre re-gerar e sobrescrever?
