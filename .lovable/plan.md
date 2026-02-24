

# Plano: Migrar toda geracão de conteudo para OpenAI

## Contexto
Atualmente, 6 edge functions usam o Lovable AI Gateway (modelos Gemini) para gerar conteudo. O objetivo e migrar todas para a API da OpenAI diretamente, igual ao padrao ja usado no `run-team-merge-validation`.

A chave `OPENAI_API_KEY` ja esta configurada no projeto.

## Funcoes Afetadas

| # | Edge Function | Uso atual | Chamadas AI |
|---|-------------|-----------|-------------|
| 1 | `generate-retroactive-articles` | Lovable AI / gemini-2.5-flash | 1 texto + 1 imagem |
| 2 | `generate-match-analysis` | Lovable AI / gemini-2.5-flash | 1 texto + 2 imagens |
| 3 | `generate-validation-article` | Lovable AI / gemini-2.5-flash | 1 texto + 2 imagens |
| 4 | `generate-weekly-validation` | Lovable AI / gemini-2.5-flash | 1 texto + 1 imagem |
| 5 | `generate-team-pillar` | Lovable AI / gemini-2.5-flash | 1 texto |
| 6 | `generate-league-pillar` | Lovable AI / gemini-2.5-flash | 1 texto |

**Total: 6 funcoes, 6 chamadas de texto, 6 chamadas de imagem**

## Mudancas Tecnicas

### Texto: Lovable AI Gateway -> OpenAI API direta

Todas as chamadas de geracao de texto serao migradas de:

```text
ANTES:
URL: https://ai.gateway.lovable.dev/v1/chat/completions
Header: Authorization: Bearer ${LOVABLE_API_KEY}
Model: google/gemini-2.5-flash

DEPOIS:
URL: https://api.openai.com/v1/chat/completions
Header: Authorization: Bearer ${OPENAI_API_KEY}
Model: gpt-4o-mini
```

O modelo `gpt-4o-mini` e o mesmo usado na validacao de fusao de times -- equilibrio entre custo, velocidade e qualidade para geracao de conteudo em portugues.

### Imagens: Lovable AI (Gemini Image) -> OpenAI DALL-E 3

As chamadas de geracao de imagem usam uma API diferente no OpenAI:

```text
ANTES:
URL: https://ai.gateway.lovable.dev/v1/chat/completions
Model: google/gemini-2.5-flash-image
Format: chat completions com modalities: ["image", "text"]

DEPOIS:
URL: https://api.openai.com/v1/images/generations
Model: dall-e-3
Format: API de imagens dedicada
Size: 1792x1024 (equivalente 16:9)
Quality: standard (para otimizar custo)
```

### Tratamento de erros

Cada funcao tera tratamento para erros 429 (rate limit) e 402 (creditos insuficientes) da API OpenAI, alem de erros genericos.

## Detalhamento por Funcao

### 1. generate-retroactive-articles (572 linhas)
- `generateArticleContent()`: trocar URL, header e modelo para OpenAI
- `generateThumbnail()`: migrar de Gemini Image para DALL-E 3
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY` em todo o arquivo

### 2. generate-match-analysis (576 linhas)
- `generateLongFormContent()`: trocar para OpenAI
- `generateThumbnail()`: migrar para DALL-E 3
- `generateInternalImage()`: migrar para DALL-E 3
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY`

### 3. generate-validation-article (630 linhas)
- `generateValidationContent()`: trocar para OpenAI
- `generateValidationThumbnail()`: migrar para DALL-E 3
- `generateValidationInternalImage()`: migrar para DALL-E 3
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY`

### 4. generate-weekly-validation (622 linhas)
- `generateWeeklyContent()`: trocar para OpenAI
- `generateWeeklyThumbnail()`: migrar para DALL-E 3
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY`

### 5. generate-team-pillar (270 linhas)
- `generatePillarContent()`: trocar para OpenAI
- Somente texto, sem geracao de imagem
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY`

### 6. generate-league-pillar (~200 linhas)
- `generatePillarContent()`: trocar para OpenAI
- Somente texto, sem geracao de imagem
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY`

## Padrao de Migracao (texto)

Cada chamada de texto segue este padrao:

```text
// Substituir fetch URL e headers
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [...],
    max_tokens: 8000,  // manter o valor existente
    temperature: 0.7,  // manter o valor existente
  }),
});
```

## Padrao de Migracao (imagem)

```text
const response = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1792x1024",
    quality: "standard",
    response_format: "b64_json",
  }),
});

// Resposta DALL-E 3:
const data = await response.json();
const base64Image = data.data?.[0]?.b64_json;
// Converter para data URL:
const imageDataUrl = `data:image/png;base64,${base64Image}`;
```

## Custos Estimados

- **gpt-4o-mini**: ~$0.15/1M input tokens, ~$0.60/1M output tokens (muito mais barato que GPT-4o)
- **DALL-E 3 standard 1792x1024**: ~$0.08/imagem
- Para 10 artigos retroativos: ~$0.80 texto + $0.80 imagens = ~$1.60 total

## Nenhuma alteracao necessaria no frontend

O hook `useRetroactiveArticles.ts` e todas as paginas admin continuam funcionando sem mudancas -- a interface com as edge functions permanece identica.
