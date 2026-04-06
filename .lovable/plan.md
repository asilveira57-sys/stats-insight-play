

# Plano: Corrigir Geração de Imagens + Substituição das Artísticas

## Diagnóstico

**Problema 1 — Imagens novas saindo iguais:**
As funções `generate-match-analysis` e `generate-retroactive-articles` chamam a **API direta do Google** (`generativelanguage.googleapis.com`) com a sua chave pessoal — isso **custa dinheiro** e o prompt genérico gera imagens muito parecidas.

**Problema 2 — Imagens artísticas (SVG geométricas):**
As ~891 thumbnails com padrões geométricos coloridos não parecem fotos reais de estádio. Precisam ser substituídas por imagens fotorrealísticas.

**7 funções** ainda usam a API direta do Google em vez do Lovable AI Gateway (custo zero):
- `generate-match-analysis` (texto + 2 imagens)
- `generate-retroactive-articles` (texto + 1 imagem)
- `generate-validation-article` (texto + 2 imagens)
- `generate-weekly-validation` (texto + 1 imagem)
- `generate-league-pillar` (texto)
- `generate-team-pillar` (texto)
- `run-team-merge-validation` (texto)

---

## Implementação

### Parte 1 — Migrar TODAS as funções para Lovable AI Gateway (custo zero)

Trocar todas as chamadas `generativelanguage.googleapis.com` pelo gateway `ai.gateway.lovable.dev` usando `LOVABLE_API_KEY` (já disponível automaticamente). Isso elimina qualquer custo de API.

**Para geração de texto:** endpoint `/v1/chat/completions` com modelo `google/gemini-2.5-flash`
**Para geração de imagem:** mesmo endpoint com modelo `google/gemini-3.1-flash-image-preview` e `modalities: ["image", "text"]`

### Parte 2 — Melhorar prompt de imagem para garantir unicidade

O prompt atual é genérico ("stadium at night"). O novo prompt incluirá:
- Nome específico dos dois times no texto do prompt
- Cores dos times como elemento visual obrigatório
- Detalhes únicos por partida (competição, data, contexto)
- Instrução explícita: "esta imagem deve ser completamente diferente de qualquer outra gerada"
- Variação de cenários: "ângulo da torcida", "visão aérea", "close no gramado", etc. — escolhido deterministicamente com base no hash do ID da partida

### Parte 3 — Edge Function para substituir imagens artísticas (batch lento)

Atualizar `fix-article-thumbnails` para:
- **Novo modo**: `mode: "svg_replace"` — busca artigos com `imagem_url` contendo `.svg` ou padrões geométricos do storage
- Processar **3 artigos por execução** (respeitar rate limit)
- Delay de 3 segundos entre cada geração
- Registrar cada imagem gerada com timestamp para auditoria

### Parte 4 — Painel de visualização no Admin

Adicionar ao `AdminImageManager.tsx`:
- **Nova aba "Auditoria"** com grid de cards mostrando:
  - Thumbnail atual do artigo (imagem pequena)
  - Título do artigo
  - Data de geração/atualização
  - Status (SVG artística / IA correta / Pendente)
- **Filtros**: "Somente SVGs", "Últimas geradas", "Todas"
- **Paginação** de 20 em 20
- Botão para abrir a imagem em tamanho completo
- Botão "Regenerar" individual por artigo (gera 1 imagem via gateway)

### Parte 5 — Automação contínua sem intervenção

Criar lógica no `fix-article-thumbnails` para rodar em modo contínuo:
- O admin clica "Iniciar substituição automática"
- O frontend faz chamadas sequenciais: processa 3, espera 10 segundos, processa mais 3
- Mostra progresso em tempo real (X de Y substituídas)
- Botão "Pausar" para interromper a qualquer momento
- Estimativa de tempo restante exibida

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-match-analysis/index.ts` | Migrar texto + imagens para Lovable AI Gateway |
| `supabase/functions/generate-retroactive-articles/index.ts` | Migrar texto + imagem para Lovable AI Gateway |
| `supabase/functions/generate-validation-article/index.ts` | Migrar texto + imagens para Lovable AI Gateway |
| `supabase/functions/generate-weekly-validation/index.ts` | Migrar texto + imagem para Lovable AI Gateway |
| `supabase/functions/generate-league-pillar/index.ts` | Migrar texto para Lovable AI Gateway |
| `supabase/functions/generate-team-pillar/index.ts` | Migrar texto para Lovable AI Gateway |
| `supabase/functions/run-team-merge-validation/index.ts` | Migrar texto para Lovable AI Gateway |
| `supabase/functions/fix-article-thumbnails/index.ts` | Adicionar modo `svg_replace`, melhorar prompt |
| `src/pages/AdminImageManager.tsx` | Aba de auditoria visual + automação contínua |

## Resultado

- **Custo futuro: $0** — tudo via Lovable AI Gateway
- **Imagens novas: sempre únicas** — prompt contextualizado por partida
- **Imagens artísticas: substituídas gradualmente** — 3 por vez, sem pressa
- **Controle visual**: admin consegue ver e confirmar cada imagem gerada

