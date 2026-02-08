
# Plano: Geração Retroativa de Análises para SEO

## Contexto Atual

| Métrica | Valor |
|---------|-------|
| Partidas finalizadas | 4.512 |
| Partidas sem notícia | 4.407 |
| Notícias existentes | 129 |
| Período histórico | Jun/2018 a Fev/2026 |
| Dados disponíveis | Palpites, times, ligas, resultados |

---

## Requisitos do Cliente

1. **Análise retroativa autêntica**: Texto deve refletir o momento histórico, não usar dados atuais
2. **Mínimo 800 palavras, ideal 1.200-1.800 palavras**: Conteúdo longo para SEO
3. **Data de publicação = data do jogo - 2 dias**: Simular publicação prévia
4. **Imagem thumbnail + imagem interna**: Com atributo alt descritivo
5. **Links internos**: Para outros jogos do mesmo time
6. **Não revelar resultado**: O texto deve ser análise pré-jogo
7. **Slug, meta title, meta description**: Otimização SEO completa

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│              Admin Control Center                           │
│  [Gerar Análises Retroativas] [Progresso: 129/4512]         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   Edge Function: generate-retroactive-articles              │
│  • Busca partidas finalizadas SEM notícia                   │
│  • Ordena por data ASC (mais antigas primeiro)              │
│  • Processa em lotes de 10-15 partidas                      │
│  • Define data_publicacao = data_jogo - 2 dias              │
│  • Gera links internos para jogos do mesmo time             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Lovable AI Gateway                             │
│  • Gemini 2.5 Flash: Texto 1200+ palavras                   │
│  • Prompt retroativo: "Analise como se fosse [DATA]"        │
│  • Gemini Flash Image: Thumbnail estádio/contexto           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Storage + Banco de Dados                       │
│  • Thumbnail: news-thumbnails/{partida_id}.png              │
│  • Imagem interna: news-thumbnails/{partida_id}-interno.png │
│  • Notícia: tabela noticias com partida_id                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Prompt de Geração Retroativa (Diferencial Crítico)

O prompt deve instruir a IA a escrever **como se estivesse no passado**:

```text
Você é um analista esportivo em [DATA DO JOGO MENOS 2 DIAS].

CONTEXTO TEMPORAL CRÍTICO:
- Estamos em [DATA], antes do jogo acontecer
- NÃO mencione nada que aconteceu após [DATA]
- NÃO revele o resultado do jogo
- Analise baseado apenas nos dados que existiam até [DATA]:
  • Forma recente das equipes baseada nos últimos 5 jogos
  • Posição na tabela naquele momento
  • Histórico do confronto
  • Fatores táticos conhecidos

DADOS DO CONFRONTO:
- [Time Casa] x [Time Fora]
- Competição: [Liga]
- Rodada: [N]
- Força [Time Casa]: [X]/100
- Força [Time Fora]: [Y]/100
- Probabilidades: Casa [%] | Empate [%] | Fora [%]
- Placar provável: [N] x [M]

ESTRUTURA DO ARTIGO (mínimo 1200 palavras):

<h2>O Grande Confronto: [Time Casa] x [Time Fora]</h2>
- Contexto do jogo e importância (150+ palavras)

<h2>Momento das Equipes na [Liga]</h2>
- Análise baseada em forma recente (200+ palavras)

<h2>Histórico do Confronto Direto</h2>
- Retrospecto entre as equipes (150+ palavras)

<h2>Análise Tática e Fatores Decisivos</h2>
- Pontos fortes e fracos (200+ palavras)

<!-- INSERIR IMAGEM INTERNA -->

<h2>O Que os Números Indicam</h2>
- Análise estatística detalhada (200+ palavras)

<h2>Cenários Prováveis</h2>
- Possibilidades de resultado (150+ palavras)

<h2>Palpite Estatístico</h2>
- Placar estimado com justificativa (150+ palavras)
- NÃO revelar resultado real

REGRAS ABSOLUTAS:
- Mínimo 1200 palavras
- Linguagem jornalística profissional
- NÃO mencionar resultado do jogo
- NÃO usar informações pós-[DATA]
- NÃO fazer referência a apostas
```

---

## Geração de Links Internos

Para cada artigo, buscar e linkar:

```text
1. Últimos 3 jogos do time mandante (que tenham notícia)
2. Últimos 3 jogos do time visitante (que tenham notícia)
3. Próximo jogo da competição (se houver)
4. Link para página pilar do time (se existir slug)
5. Link para página pilar da liga (se existir slug)
```

HTML de links internos:

```html
<div class="related-matches">
  <h3>Outras Análises dos Times</h3>
  <ul>
    <li><a href="/noticias/{slug}">Time Casa x Adversário - dd/mm/yyyy</a></li>
    <li><a href="/time/{time-slug}">Todas análises do Time Casa</a></li>
    ...
  </ul>
</div>
```

---

## Geração de Imagens

**Thumbnail (obrigatória):**
```text
Create a professional sports thumbnail:
- Stadium atmosphere with crowd silhouettes
- Team colors incorporated: [cor_casa] and [cor_fora]
- Modern sports broadcast typography
- Text overlay: "[Time Casa] vs [Time Fora]"
- Subtitle: "[Data] - [Liga]"
- 16:9 aspect ratio
- CRITICAL: Do NOT include any team logos, crests, badges, or shields
```

**Imagem Interna (obrigatória):**
```text
Create a sports analytics infographic:
- Football field tactical view
- Abstract data visualization elements
- Team colors: [cor_casa] and [cor_fora]
- Professional sports analytics aesthetic
- 16:9 aspect ratio
- CRITICAL: No team logos or crests
```

**Atributo alt:**
```text
Análise pré-jogo: [Time Casa] x [Time Fora] pela [Liga] - [Data]
```

---

## Campos SEO Completos

| Campo | Formato |
|-------|---------|
| titulo | "[Time Casa] x [Time Fora]: Análise Pré-Jogo - [Liga]" (max 60 chars) |
| resumo | Meta description até 155 caracteres |
| slug | `time-casa-x-time-fora-yyyy-mm-dd-analise-pre-jogo` |
| data_publicacao | data_jogo - 2 dias (ISO string) |
| imagem_url | URL da thumbnail no storage |
| partida_id | FK para a partida |
| publicada | true |

---

## Tratamento de Erros

| Erro | Ação |
|------|------|
| 402 Payment Required | Pausar e exibir toast pedindo créditos |
| 429 Too Many Requests | Retry com backoff exponencial |
| Timeout | Reduzir lote para 5 partidas |
| Falha na imagem | Usar fallback (Unsplash estádio) |
| Texto curto (<800 palavras) | Re-gerar com prompt reforçado |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-retroactive-articles/index.ts` | **Criar** - Nova edge function |
| `supabase/config.toml` | **Modificar** - Adicionar config |
| `src/pages/AdminControlCenter.tsx` | **Modificar** - Adicionar seção com progresso |
| `src/hooks/useRetroactiveArticles.ts` | **Criar** - Hook para progresso e controle |

---

## Fluxo de Execução

```text
Dia 1:
  └── Admin clica "Iniciar Lote Retroativo"
       └── Função processa 10-15 partidas mais antigas
            └── Gasta créditos de IA
                 └── Se rate limit (402/429), pausa
                      └── Admin adiciona créditos
                           └── Retoma no próximo clique

Dias subsequentes:
  └── Repetir até zerar backlog de 4.407 partidas
       └── Progresso visível no painel
            └── Estatísticas: X de Y processados
```

---

## Interface no Admin Control Center

```text
┌────────────────────────────────────────────────────────────┐
│  📰 Geração Retroativa de Análises                         │
├────────────────────────────────────────────────────────────┤
│  Progresso: ████████░░░░░░░░░░░░ 129 de 4.512 (2.8%)       │
│  Partidas sem análise: 4.383                               │
│  Última execução: 15 jan 2025 às 14:32                     │
│                                                            │
│  Configurações:                                            │
│  • Partidas por lote: [15 ▼]                               │
│  • Filtrar liga: [Todas ▼]                                 │
│                                                            │
│  [▶️ Iniciar Lote] [⏸️ Pausar] [📊 Ver Progresso]           │
│                                                            │
│  Últimos processados:                                      │
│  ✓ Russia x Saudi Arabia (14/06/2018) - 1.245 palavras     │
│  ✓ Egypt x Uruguay (15/06/2018) - 1.312 palavras           │
│  ✓ Morocco x Iran (15/06/2018) - 1.189 palavras            │
└────────────────────────────────────────────────────────────┘
```

---

## Estimativa de Execução

- ~4.400 partidas restantes
- 10-15 partidas por execução
- ~300-440 execuções necessárias
- Com créditos suficientes: ~7-10 dias de processamento contínuo
- Cada execução: ~2-3 minutos (delay de 2s entre partidas)

---

## Resultado Esperado

Após conclusão:
- 4.512+ artigos de análise pré-jogo
- Todos com data de publicação retroativa (2 dias antes)
- Conteúdo autêntico sem revelar resultado
- Imagens únicas geradas por IA
- Links internos entre jogos relacionados
- Slugs e meta tags otimizados para SEO
- Automação para jogos futuros via cron existente
