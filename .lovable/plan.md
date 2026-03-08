
# Corrigir geração de imagens nos artigos — eliminar placeholder padrão

## Problema
Três edge functions geram artigos com a imagem padrão do Unsplash (`unsplash.com/photo-1574629810360-7efbbe195018`) como fallback. Depois, o job `fix-article-thumbnails` detecta essa URL e regenera a imagem via IA — duplicando o custo.

Causa raiz principal: `generate-retroactive-articles` e `generate-validation-article` têm `skipImages = true` por padrão no modo batch. E `generate-match-analysis` usa o placeholder quando a geração falha silenciosamente.

## Plano de correção

### 1. Remover skip automático de imagens no modo batch
**Arquivos:** `generate-retroactive-articles/index.ts`, `generate-validation-article/index.ts`

- Remover a lógica `skipImages = body?.skip_images ?? (batchLimit > 0)` — imagens devem ser sempre geradas.
- Manter o parâmetro `skip_images` como opt-in explícito (só se o caller enviar `skip_images: true` de propósito), mas nunca como default.

### 2. Tornar a geração de imagem obrigatória com retry
**Arquivos:** Todas as 3 functions de geração

- Se `generateThumbnail` retornar `null`, fazer **1 retry** com delay de 3s antes de desistir.
- Se após retry ainda falhar, **não** inserir placeholder Unsplash. Em vez disso, usar uma URL marcada que não dispare o `fix-article-thumbnails` (ex: `null` no campo, e tratar `null` no frontend com fallback visual local).
- Alternativa mais simples: gerar a imagem **antes** do texto e, se falhar, registrar o artigo com `imagem_url = null` para que o frontend exiba um fallback genérico do lado do cliente sem que o job de correção o detecte.

### 3. Atualizar o frontend para tratar `imagem_url = null`
**Arquivos:** `src/components/cards/NewsCard.tsx`, `src/pages/NoticiaDetalhes.tsx`

- Se `imagem_url` for `null`, exibir um fallback visual CSS (gradiente com ícone) em vez de depender de URL externa.
- Isso já existe parcialmente via `onError` handler no `NewsCard`, mas precisa cobrir o caso `null` também.

### 4. Melhorar o atributo `alt` das imagens
**Arquivos:** Todas as 3 functions de geração + `fix-article-thumbnails`

- No upload da imagem, usar o nome do arquivo como `{time_casa}-vs-{time_fora}-{liga}-{data}.png` (slugificado) para SEO.
- No HTML do artigo, garantir que o `alt` siga o padrão: `"Análise {Time Casa} x {Time Fora} - {Liga}"`.
- No `<img>` do `NewsCard`, usar o título do artigo como `alt` text.

### 5. Ajustar `fix-article-thumbnails` para não reprocessar artigos novos
**Arquivo:** `fix-article-thumbnails/index.ts`

- Alterar o filtro para ignorar artigos com `imagem_url IS NULL` (estes são artigos que falharam na geração e podem ser reprocessados sob demanda, não automaticamente).
- Manter a detecção do padrão Unsplash apenas para artigos legados.

### Resumo de impacto
- **Custo IA:** Eliminação do loop duplo (gerar placeholder → detectar → regenerar).
- **SEO:** Alt text e nomes de arquivo otimizados para indexação.
- **Cobertura:** 100% dos artigos novos terão imagem única ou `null` (sem placeholder genérico).
