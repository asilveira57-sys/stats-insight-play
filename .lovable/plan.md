# Plano: voltar para thumbnails SVG e eliminar Gemini Image

## Problema
- `generate-match-analysis`, `generate-retroactive-articles` e `regenerate-article-images` chamam `google/gemini-3.1-flash-image-preview` (e `gemini-2.5-flash-image`) na Lovable AI Gateway.
- Resultado: imagens repetidas (mesmo "estádio genérico"), custo alto e ainda assim erradas.
- Já existe a função `generate-article-card-svg` que monta cards SVG dinâmicos (times, cores, liga, data) — barata, determinística por `article.id`, sem chamada de IA.

## Objetivo
Toda thumbnail de artigo deve ser produzida pelo gerador SVG (que aceita texto + cores + logo da liga). Nenhum endpoint de imagem do Gemini permanece em uso. Mantemos o Gemini só para texto.

## Mudanças

### 1. Backend — remover chamadas de imagem Gemini
- **`supabase/functions/generate-match-analysis/index.ts`**
  - Remover `generateImageViaGateway` / segunda tentativa em ~L311 e L363.
  - Após inserir/atualizar a notícia (com `imagem_url: null`), invocar `generate-article-card-svg` com `{ target_ids: [novaNoticiaId] }` para preencher o card.
- **`supabase/functions/generate-retroactive-articles/index.ts`**
  - Remover bloco de geração de imagem (~L259–L278 + uso em L529/L540/L556).
  - Inserir notícia com `imagem_url: null` e disparar `generate-article-card-svg` no final do batch (ou um `target_ids` acumulado).
- **`supabase/functions/regenerate-article-images/index.ts`**
  - Reescrever para apenas re-disparar `generate-article-card-svg` nos artigos alvo (mesma assinatura do request: `limit`, `target_ids`, `mode`).
  - Manter compatibilidade com `RegenerateNanoBananaTab` para não quebrar UI.
- **`supabase/functions/fix-article-thumbnails/index.ts`**
  - Substituir `generateThumbnailViaGateway` por chamada interna a `generate-article-card-svg` (mantendo os dois `mode`: `unsplash` e `svg_replace`). O modo `svg_replace` passa a forçar regeneração mesmo se já é SVG.

### 2. Frontend — renomear/clarificar
- `RegenerateNanoBananaTab.tsx`: trocar copy ("Nano Banana" → "Card SVG"), manter funcional pois invoca a mesma edge function.
- `AdminImageManager.tsx`: deixar claro que todo botão gera SVG.

### 3. Garantir unicidade
- O `generate-article-card-svg` já varia por `partida` (times, cores, liga, estádio quando disponível) e por `article.id`. Adicionar pequena variação visual (rotação/offset/pattern) derivada de `hashCode(article.id)` para evitar dois cards iguais quando a partida for a mesma.

## Resultado esperado
- Zero chamadas a `gemini-*-image-preview` → custo de imagem cai a zero.
- Cada notícia ganha um card SVG único, com nomes de times + liga + data legíveis.
- Pipeline de criação de artigo: texto via Lovable AI (mantido) → thumbnail SVG instantâneo.

## Riscos
- Artigos já existentes com PNG do Gemini permanecem até serem reprocessados pelo admin (botão "Regenerar" agora produz SVG).
- Storage `news-thumbnails` passará a receber `.svg`; o front já lida com isso.

Confirma para eu aplicar?
