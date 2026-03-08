

# Plano: Corrigir Geração de Imagens Usando Gemini API (Google Cloud)

## Diagnóstico

As 4 Edge Functions usam `gemini-2.0-flash-exp` com `responseModalities: ["IMAGE"]`. Este modelo experimental foi descontinuado para geração de imagens pelo Google -- por isso todas as chamadas falham silenciosamente e caem no fallback Unsplash.

A sua `GEMINI_API_KEY` já está configurada e será mantida. A correção é trocar o modelo para um que suporte geração de imagens de forma estável.

## Solução

Substituir `gemini-2.0-flash-exp` por `gemini-2.0-flash-exp-image-generation` (modelo estável do Google para geração de imagens via API direta) em todas as funções. A estrutura da chamada permanece idêntica -- só muda o nome do modelo na URL.

```
// ANTES (quebrado):
.../models/gemini-2.0-flash-exp:generateContent?key=...

// DEPOIS (funcional):
.../models/gemini-2.0-flash-exp-image-generation:generateContent?key=...
```

Caso esse modelo também apresente problemas (o Google deprecia modelos experimentais com frequência), a alternativa é `imagen-3.0-generate-002` via endpoint dedicado da Imagen API, que usa a mesma API key.

## Etapas

### 1. Atualizar modelo nas 4 Edge Functions
Trocar o modelo em todas as chamadas de geração de imagem:
- `generate-match-analysis/index.ts` (2 funções: thumbnail + imagem interna)
- `generate-validation-article/index.ts` (2 funções: thumbnail + imagem interna)
- `generate-retroactive-articles/index.ts` (1 função: thumbnail)
- `generate-weekly-validation/index.ts` (1 função: thumbnail)

### 2. Criar Edge Function `fix-article-thumbnails`
Função retroativa que:
- Busca artigos com `imagem_url LIKE '%unsplash%'` ou `IS NULL`
- Gera nova imagem via Gemini (mesmo modelo corrigido) usando título + contexto
- Upload no bucket `news-thumbnails` e atualiza o registro
- Processa 1 por invocação (evitar timeout)
- Retorna contagem de pendentes

### 3. Motor automático no AdminControlCenter
Card de "Correção de Imagens" com:
- Contador de pendentes / processados / erros
- Botão iniciar/parar loop contínuo (~8s entre chamadas)
- Backoff para erros 429

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-match-analysis/index.ts` | Editar modelo |
| `supabase/functions/generate-validation-article/index.ts` | Editar modelo |
| `supabase/functions/generate-retroactive-articles/index.ts` | Editar modelo |
| `supabase/functions/generate-weekly-validation/index.ts` | Editar modelo |
| `supabase/functions/fix-article-thumbnails/index.ts` | Criar |
| `src/pages/AdminControlCenter.tsx` | Adicionar motor de correção |

## Custo
Zero custo adicional -- usa exclusivamente a sua `GEMINI_API_KEY` existente no plano Google Cloud que você já paga.

