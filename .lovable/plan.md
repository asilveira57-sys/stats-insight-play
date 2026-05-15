## Objetivo

1. Validar visualmente que cada card SVG é único entre lotes (você roda 100 em 100).
2. Transformar a "máquina de imagem" em uma alavanca de SEO: nome de arquivo com palavra-chave, alt descritivo, dimensões/og corretos e structured data.

---

## Parte 1 — Histórico ao vivo dos últimos 10 gerados

**Onde:** `src/components/admin/images/SvgCardTab.tsx` (Admin → Imagens → SVG Cards)

**O que muda:**
- Nova seção **"Últimos 10 gerados"** abaixo da "Amostra do último lote", sempre visível.
- Lê direto da tabela `noticias` (não depende do retorno do edge function), ordenado por `image_regenerated_at DESC`, filtrando `image_source = 'svg'`.
- Atualiza automaticamente: `refetchInterval: 3s` enquanto rodando, `15s` em idle.
- Cada card mostra: thumbnail (1200x630), título, confronto (time casa vs fora), data/hora UTC-3 do `image_regenerated_at`, badge com a liga.
- Botão "Abrir imagem" em nova aba para inspeção em tamanho real.
- Indicador visual de duplicidade: se duas thumbnails geradas no mesmo lote tiverem o mesmo `partida_id`, marca com badge amarelo "MESMO JOGO" (ajuda a flagrar repetições reais — quando o confronto é realmente o mesmo, o card será idêntico de propósito).

**Por que isso resolve sua dúvida de unicidade:**
O card SVG é determinístico em função de `(time_casa, time_fora, cores, liga, data)`. Logo:
- **Confrontos diferentes → cards diferentes** (cores e nomes mudam).
- **Mesmo confronto, artigos diferentes (ex: prévia + pós-jogo) → card idêntico**, porque os dados de origem são iguais. Isso é esperado e correto. O badge "MESMO JOGO" deixa isso explícito pra você não confundir com bug.
- Se quiser variar mesmo entre artigos do mesmo confronto, posso adicionar um sufixo no SVG (ex: "PRÉVIA" / "ANÁLISE" / "PÓS-JOGO") usando `noticia.tipo` ou heurística no título. **Quer que eu inclua isso já?** (default = não, mantém o card limpo)

---

## Parte 2 — SEO via imagem

A engine de imagens hoje só salva o arquivo. Vamos extrair valor de SEO em 4 frentes:

### 2.1 Filename com palavra-chave (no edge function)

**Hoje:** `svg-{uuid}.png` → zero valor SEO.

**Mudança em `generate-article-card-svg/index.ts`:**
- Gerar slug a partir de `{slug-do-artigo}` ou fallback `{time-casa}-vs-{time-fora}-{liga}-{ano}` usando o slugify já existente no projeto.
- Limite 80 chars, ASCII, kebab-case.
- Nome final: `${slug}-statball.png` (ex: `flamengo-vs-palmeiras-brasileirao-2026-statball.png`).
- Mantém `upsert: true` — re-gerações sobrescrevem o mesmo arquivo (sem lixo no bucket).
- Para evitar colisão entre artigos diferentes do mesmo jogo, anexar 6 chars do `art.id` ao final: `${slug}-{shortId}.png`.

### 2.2 Alt text descritivo persistido

**Adicionar coluna** `noticias.imagem_alt TEXT` (nullable).

**Edge function preenche** com template:
> `"Capa do artigo: {Time Casa} vs {Time Fora} pela {Liga} em {data por extenso} — análise estatística Statball"`

**Frontend (`NoticiaDetalhes.tsx` linha 219):** trocar `alt={noticia.titulo}` por `alt={noticia.imagem_alt || noticia.titulo}`.

Aplicar o mesmo em `NewsCard.tsx`, `RelatedArticles.tsx` e qualquer `<img>` que usa `imagem_url`.

### 2.3 Open Graph + Twitter image dimensions corretas

`ArticleSEO.tsx` já emite `og:image:width=1280 / height=720`. Card SVG é **1200x630**. Corrigir para os valores reais (1200/630) — se errado, Facebook/LinkedIn rejeitam ou recortam.

### 2.4 Schema.org ImageObject no JSON-LD

Em `ArticleSEO.tsx`, expandir o campo `image` do JSON-LD de string simples para objeto:

```json
"image": {
  "@type": "ImageObject",
  "url": "...",
  "width": 1200,
  "height": 630,
  "caption": "{imagem_alt}"
}
```

Google usa isso para Rich Results de notícias.

### 2.5 Bonus barato: lazy + loading hints

- `<img loading="lazy" decoding="async">` em listas (NewsCard, RelatedArticles).
- Hero do artigo usa `loading="eager" fetchpriority="high"` (já é LCP, não pode ser lazy).

---

## Ordem de implementação

1. **Migration**: `ALTER TABLE noticias ADD COLUMN imagem_alt TEXT;`
2. **Edge function** `generate-article-card-svg`: slug no filename, geração e persistência do `imagem_alt`.
3. **Frontend admin** `SvgCardTab.tsx`: seção "Últimos 10 gerados" com auto-refresh + badge de duplicata.
4. **SEO**: `ArticleSEO.tsx` (dimensões + ImageObject), `NoticiaDetalhes.tsx` + `NewsCard.tsx` + `RelatedArticles.tsx` (alt dinâmico, loading hints).

## Impacto

- **Custo:** $0 (continua tudo no SVG).
- **SEO:** filename com keyword + alt rico + ImageObject = sinais claros pro Google Images e Discover.
- **Operação:** você acompanha o histórico em tempo real e identifica visualmente se algo repetiu indevidamente.

## Pergunta aberta

Quer que eu adicione o sufixo "PRÉVIA / ANÁLISE / PÓS-JOGO" no card pra diferenciar visualmente artigos do mesmo confronto, ou mantém o card limpo (default)?
