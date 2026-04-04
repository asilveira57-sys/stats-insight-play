

# Diagnóstico e Plano de Correção de Imagens Repetidas

## Situação Atual no Banco

| Categoria | Quantidade |
|-----------|-----------|
| Total de artigos publicados | **2.920** |
| Sem imagem (NULL) | **2.025** |
| Com imagem única no storage | **891** |
| Unsplash placeholder restante | **4** |

As 891 imagens no storage são **tecnicamente únicas** (URLs diferentes), mas visualmente muito parecidas porque o prompt de geração é genérico ("stadium at night with dramatic lighting"). O AdSense interpreta isso como conteúdo repetitivo.

Os 2.025 artigos com imagem NULL mostram o fallback CSS (gradiente), que também é visualmente idêntico em todos.

**Total a corrigir: ~2.025 artigos sem imagem + ~891 com imagens visualmente similares = ~2.916 artigos.**

---

## Análise de Custo por Abordagem

| Abordagem | Custo estimado | Tempo | Qualidade |
|-----------|---------------|-------|-----------|
| Gemini IA (como antes) | ~$150-250 para 2.900 imagens | Dias (rate limit) | Alta, mas risco de repetição |
| SVG/Canvas dinâmico (custo zero) | **$0** | Horas de dev | Boa, 100% única |
| Lovable AI Gateway | **$0** (incluso) | Dias (rate limit) | Alta |

---

## Recomendação: Abordagem Híbrida (Custo Zero)

### Estratégia em 2 camadas

**Camada 1 — Thumbnail SVG/Canvas gerado no servidor (custo zero, imediato)**
Criar uma edge function que gera imagens PNG únicas **sem IA**, usando as cores dos times, o nome do confronto e padrões geométricos dinâmicos. Cada imagem será visualmente distinta porque combina:
- Cores primárias e secundárias dos dois times
- Nome dos times como seed para o padrão geométrico
- Data da partida como variação adicional
- Layout profissional estilo broadcast

**Camada 2 — Lovable AI Gateway para artigos de destaque (custo zero)**
Para artigos mais recentes ou de destaque, usar o Lovable AI Gateway (modelo `google/gemini-3.1-flash-image-preview`) que **não cobra API key** — já está incluso no plano. Isso gera imagens de alta qualidade sem custo adicional.

---

## Plano de Implementação

### 1. Nova Edge Function `generate-svg-thumbnails`
- Recebe batch de artigos sem imagem
- Para cada artigo, extrai os nomes dos times do título
- Busca cores dos times no banco
- Gera PNG único via Canvas/SVG com padrão geométrico baseado nas cores
- Upload para `news-thumbnails` bucket
- Atualiza `imagem_url` no artigo
- Processa em batches de 20-50 (sem rate limit, é local)

### 2. Atualizar `fix-article-thumbnails` para usar Lovable AI Gateway
- Trocar Gemini API direta pelo gateway `ai.gateway.lovable.dev`
- Modelo: `google/gemini-3.1-flash-image-preview`
- Custo: zero (incluso no Lovable)
- Usar para artigos premium/destaque apenas

### 3. Página Admin para monitorar progresso
- Mostrar contadores: artigos com/sem imagem
- Botão para disparar geração SVG em batch
- Botão para gerar IA em artigos selecionados

### 4. Limpeza das 4 imagens Unsplash restantes
- Corrigir os 4 artigos que ainda têm placeholder Unsplash

---

## Resultado Esperado

- **2.920 artigos** com imagens visuais **100% únicas**
- **Custo: $0** (SVG para maioria + Lovable AI Gateway para destaques)
- **AdSense**: conformidade total — nenhuma imagem repetida
- **Tempo de execução**: SVG batch pode processar todos em minutos (sem rate limit)

