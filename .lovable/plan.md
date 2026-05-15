## Objetivo

Zerar o custo de imagens. Gerar 100% das capas via **template SVG dinâmico** (cores dos times + escudo da liga + tipografia do confronto) — sem chamada a IA, sem créditos consumidos, infinitamente escalável para os 30k+ artigos retroativos. Manter Google AI Studio (free tier ~1500 img/dia, sua API key, fora do Lovable Gateway) como camada **opcional** para destaques editoriais — também $0/mês desde que respeite o limite diário.

## Diagnóstico do custo atual

- Hoje: `regenerate-article-images` chama `google/gemini-2.5-flash-image` via Lovable AI Gateway → **~$0,003/imagem**
- 1 dólar = ~330 imagens. Em 30k artigos = **~$90**, fora do orçamento ($0)
- Mesmo só conteúdo novo já queimou o saldo do mês em 1 dia
- Solução: deixar de pagar IA na maioria dos casos. SVG é renderizado em milissegundos no edge, custa zero

## Arquitetura proposta

```text
Artigo publicado
   │
   ├─ tem partida_id? ──► gera card SVG personalizado (cores casa+fora, escudo liga, "TIME A vs TIME B", data, liga)
   │
   ├─ é destaque editorial flag (novo campo)? ──► usa Google AI Studio direto (sua key, free tier)
   │
   └─ fallback ──► SVG genérico com gradiente neutro + logo Statball
```

## Etapa 1 — Edge function `generate-article-card-svg`

Nova function que produz SVG 1200x630 (Open Graph friendly) com:

- Fundo: gradiente diagonal entre `cores.primary` do time casa → `cores.primary` do time fora (cai pra `#0F172A → #1e293b` quando não houver)
- Camada superior: nome da liga + data (cor branca semi-transparente)
- Centro: `TIME CASA` em letras grandes, "VS" estilizado, `TIME FORA` (uso da fonte do projeto via `<text>` SVG embutido)
- Canto inferior direito: logo da liga (URL já disponível em `ligas.logo_url`) — respeitando regra de NÃO usar logos de times
- Canto inferior esquerdo: marca "statball.com.br"
- Saída: PNG renderizado server-side via `npm:@resvg/resvg-js` (binário Deno), upload em `news-thumbnails`

Custo por imagem: **$0** (CPU/memória do edge é coberto pelo plano).

## Etapa 2 — Refatoração de `regenerate-article-images`

- Renomear para `regenerate-article-images-ai` (mantém capacidade IA para destaques)
- Adicionar campo `noticias.image_source` (`'svg' | 'ai_gemini' | 'ai_lovable'`) pra rastreabilidade
- Modo padrão da aba "Regenerar imagens" passa a chamar a nova function SVG
- Botão secundário "Gerar via IA (premium)" continua disponível, mas com aviso de custo

## Etapa 3 — Google AI Studio direto (opcional, $0)

- Pedir nova secret `GOOGLE_AI_STUDIO_API_KEY` (você gera grátis em aistudio.google.com)
- Free tier do `gemini-2.5-flash-image-preview` no AI Studio: ~1500 req/dia sem cobrança
- Function `generate-image-google-aistudio` chama direto `generativelanguage.googleapis.com` (sem passar pelo Lovable Gateway → zero crédito Lovable)
- Reserva esse caminho para artigos marcados como "destaque" (novo toggle no editor)

## Etapa 4 — Backfill em massa dos 30k

- Adicionar aba "Recarregar capas SVG (lote)" em `/admin/imagens`
- Worker dispara em batches de 200 (SVG é rápido, ~50ms/imagem)
- Roda via pg_cron a cada 5min até concluir, atualiza `image_source='svg'` e `image_regenerated_at`
- Estimativa: 30k imagens em ~25 minutos de processamento total

## UI do admin

Aba existente `RegenerateNanoBananaTab` ganha 2 modos:

```text
[ ] Modo SVG (custo zero, recomendado)         ◀ default
[ ] Modo Google AI Studio (free tier diário)
[ ] Modo Lovable AI Gateway (pago, $0.003/img)
```

Card de status mostra:
- Pendentes • Já com SVG • Já com IA • Custo gasto no mês

## Detalhes técnicos

- **Renderização SVG → PNG**: `npm:@resvg/resvg-js@2.6.2` no Deno edge (já testado no ecossistema Supabase)
- **Fontes embutidas**: usar fonte system-safe (Inter via base64) ou texto puro com `<tspan>` pra evitar dependência externa
- **Cache busting**: manter `?v=timestamp` no URL final
- **Conformidade**: nunca renderizar escudo/badge de time (regra `mem://style/team-badge-compliance`); só logo da liga via `ligas.logo_url` (regra `mem://style/league-branding`)
- **Bucket**: reusa `news-thumbnails` que já existe
- **Coluna nova**: `noticias.image_source TEXT DEFAULT 'svg'`

## Resultado esperado

| Métrica | Antes | Depois |
|---|---|---|
| Custo/imagem padrão | $0,003 | **$0** |
| Custo p/ 30k retroativos | ~$90 | **$0** |
| Custo p/ artigos novos diários | ~$0,15/dia | **$0** (SVG) ou $0 (AI Studio free) |
| Tempo p/ regerar 30k | ~25h (IA) | **~25min** (SVG) |
| Saldo Lovable AI consumido | alto | praticamente nulo |

## Ordem de execução

1. Migration: adiciona `noticias.image_source`
2. Cria edge function `generate-article-card-svg` (com `@resvg/resvg-js`)
3. Refatora aba do admin pra ter os 3 modos, padrão SVG
4. Worker de backfill em lote
5. (Opcional, depois) pede secret `GOOGLE_AI_STUDIO_API_KEY` e cria function pro modo destaque
