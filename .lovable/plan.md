# Sprint 4 — Monte Carlo + Features avançadas

Objetivo: substituir o modelo Elo "1 placar" por um modelo **probabilístico** que combina ranking FIFA, **histórico em Copas**, **forma na Copa atual** e simula o torneio inteiro **N vezes** (Monte Carlo).

## 1. Novas features estatísticas por seleção

Calculadas no edge function `wc2026-project-bracket` a partir de tabelas que já existem:

| Feature | Fonte |
|---|---|
| `avg_gf_wc` / `avg_ga_wc` | média de gols feitos/sofridos em `world_cup_2026_team_history` |
| `recent_gf` / `recent_ga` | últimos jogos de `world_cup_2026_matches` (status=finished) |
| `form_pts` | pontos nos últimos 3 jogos da Copa 2026 (3/1/0) |
| `effective_rank` | FIFA ranking real ou fallback (já existe) |
| `attack_strength` | média gols feitos ÷ média global |
| `defense_strength` | média gols sofridos ÷ média global |

## 2. Modelo Poisson (substitui o λ único)

```text
λHome = baseGoals · attackHome · defenseAway · homeAdv · formFactor
λAway = baseGoals · attackAway · defenseHome · (1/homeAdv) · formFactor
```

Distribuição de placar: Poisson(λ) para cada lado → matriz de probabilidades 0–6 × 0–6, da qual extraímos `pHome / pDraw / pAway` e o placar **mais provável**.

## 3. Monte Carlo (N = 5.000 simulações)

Em cada simulação:
1. Sortear placar de cada jogo a partir das Poisson distributions.
2. Resolver fase de grupos → 12 primeiros + 12 segundos + 8 melhores terceiros.
3. Simular mata-mata; pênaltis = Bernoulli enviesada pelo ranking.
4. Registrar quem chegou em cada fase e quem foi campeão.

Resultados agregados:
- `p_champion`, `p_final`, `p_semi`, `p_qf`, `p_r16` por seleção
- Placar **modal** (mais comum) por confronto projetado
- Confiança baseada na **entropia** da distribuição de campeões

## 4. Nova tabela

```sql
wc2026_monte_carlo_results (
  id uuid pk,
  projection_version text,
  team_id uuid,
  p_champion numeric,
  p_final numeric,
  p_semi numeric,
  p_qf numeric,
  p_r16 numeric,
  simulations int,
  generated_at timestamptz,
  is_official_version boolean
)
```

RLS: leitura pública, escrita só service_role/admin. Imutabilidade quando `is_official_version=true` (mesmo trigger já usado em `wc2026_bracket_projections`).

## 5. Atualizações de UI

- **Dialog "Como a IA chegou nesse placar"**: já existe — passa a mostrar as novas features (média de gols, forma recente, attack/defense strength) e a distribuição completa de placares.
- **`/copa-2026/projecao`**: nova seção "Probabilidade de Título (Monte Carlo)" — top 16 seleções com barras de progresso para `p_champion`, `p_final`, `p_semi`.
- **`/copa-2026/chaveamento`**: badge de confiança continua, mas agora calculado por entropia.

## 6. Automação

`pg_cron` já roda a projeção a cada 3h — Monte Carlo roda na mesma chamada do edge function (tempo extra estimado: ~3-5s para 5.000 simulações).

## 7. Auditoria / transparência

Cada linha de `wc2026_bracket_projections.basis` passa a incluir:
```json
{
  "source": "monte_carlo",
  "simulations": 5000,
  "features": { "attack_home": 1.12, "defense_away": 0.88, "form_home": 2.0, ... },
  "score_distribution": [{ "h":2, "a":1, "prob":0.087 }, ...]
}
```

## Garantias

- Nada de invenção: todos os números vêm de tabelas reais do banco.
- Resultados oficiais já encerrados continuam imutáveis.
- Versões oficiais publicadas (v1, v2, v3) ficam congeladas — Monte Carlo só altera a versão `live`.
- Nenhuma funcionalidade existente é removida.
