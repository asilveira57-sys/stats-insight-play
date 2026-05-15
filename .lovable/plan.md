## Diagnóstico do print que você mandou

Os 6 cards saíram **idênticos** (gradiente azul→vermelho, badge ciano, sem texto). O motivo real:

1. **`@resvg/resvg-wasm` não tem fonte carregada por padrão.** Quando o SVG tem `<text>`, ele é renderizado **vazio** se nenhuma fonte foi registrada. Por isso nem o nome dos times, nem a liga, nem o badge "PRÉVIA" apareceram. O que você vê é só o gradiente + o `<rect>` do badge (a forma sem o texto dentro).
2. **Sem imagem de fundo**, o card vira só "duas cores em diagonal" — visualmente parece tudo igual mesmo entre confrontos diferentes, porque sem texto você não percebe a variação de cores (e cores default `#1e3a8a` / `#7f1d1d` predominam quando o time não tem `cores` cadastradas, o que parece ser o caso da maioria).
3. **O thumb no admin não é clicável** — só o ícone de "abrir imagem em tamanho real" abre o PNG, sem link pro artigo.

Resolver os 3 pontos é o que esse plano faz, mantendo **custo zero**.

---

## Parte 1 — Fonte real embutida no edge function

**Problema:** resvg-wasm não tem fontes do sistema; precisa receber TTF explicitamente.

**Solução:**
- No `generate-article-card-svg/index.ts`, baixar **uma vez por cold-start** uma fonte open-source da Google Fonts via CDN (ex: `Inter-Bold.ttf` + `Inter-Black.ttf` da `fonts.gstatic.com`) como `ArrayBuffer`.
- Passar via `new Resvg(svg, { font: { fontBuffers: [interBold, interBlack], defaultFontFamily: "Inter" } })`.
- Trocar `font-family="Helvetica, Arial, sans-serif"` por `font-family="Inter"` no SVG.
- Cachear em variável module-level pra não baixar a cada request.

Isso sozinho já faz o **nome dos times, VS, liga, data, badge "PRÉVIA/ANÁLISE/PÓS-JOGO" e marca Statball aparecerem**. Por si só, dois cards de jogos diferentes ficam visivelmente distintos (texto + cores).

---

## Parte 2 — Imagem de estádio como fundo (zero custo)

**Estratégia:** banco fixo de ~12 fotos genéricas de estádio (sem identificação de clube — só arquibancada, gramado iluminado, vista aérea, holofotes). Usadas como background com overlay escuro pra texto continuar legível.

**Implementação:**
1. **Bucket `card-backgrounds`** (público) com 12 imagens 1200x630 JPG pré-otimizadas (~80KB cada). Faço o seed copiando 12 imagens livres de direitos (Pexels/Unsplash CC0) ou geradas via `imagegen`.
2. **Seleção determinística por jogo** para garantir variedade sem aleatoriedade entre rodadas:  
   `idx = hash(partida_id || titulo) % 12`  
   → Mesmo confronto sempre cai no mesmo estádio (estável). Confrontos diferentes caem em estádios diferentes.
3. **No SVG**, embutir a imagem como `<image href="data:image/jpeg;base64,..." width="1200" height="630"/>` na primeira camada, **antes** do gradiente — que vira overlay semi-transparente colorido com as cores dos times. Resultado: foto real visível por baixo + tom dos times por cima + texto branco legível.
4. **Pré-carrega** as 12 imagens em base64 uma única vez (cache module-level), assim cada request só pega a do índice escolhido.

```text
┌─────────────────────────────────────────────┐
│  [foto estádio]                             │
│  [overlay diagonal cor casa→cor fora 60%]   │
│  [overlay vertical preto 0→0.55]            │
│  LIGA            [PRÉVIA]                   │
│  data                                       │
│         FLAMENGO                            │
│            VS                               │
│         PALMEIRAS                           │
│  statball.com.br             [logo liga]    │
└─────────────────────────────────────────────┘
```

---

## Parte 3 — Card admin clicável

**Em `SvgCardTab.tsx`**, no bloco "Últimos 10 gerados" (linhas 285–325):
- Envolver a imagem inteira em `<Link to={"/noticia/" + n.slug} target="_blank">` (rota correta: vou conferir no `App.tsx`, mas pelo `useNoticiaBySlug` é `/noticias/:slug` ou `/noticia/:slug` — uso o que já está em produção).
- Manter o ícone "abrir imagem PNG raw" como botão secundário no canto.
- Adicionar mais um botão pequeno "↻ Regenerar este" que invoca `generate-article-card-svg` com `{ article_ids: [n.id] }` — útil pra você corrigir um caso ruim sem rodar o lote todo.

---

## Parte 4 — Estratégia de re-execução

Como os ~4.600 cards atuais saíram quebrados (sem texto), o fluxo certo é:
1. Deploy das mudanças (fonte + estádio).
2. **Resetar o backlog**: marcar todos os SVGs atuais como "pendentes de novo" via SQL (`UPDATE noticias SET image_regenerated_at = NULL WHERE image_source = 'svg'`).
3. Rodar Auto-run de novo. Cada batch agora gera card de verdade, com texto e estádio.

Vou pedir confirmação antes do reset, porque é destrutivo do estado atual.

---

## Ordem técnica de implementação

1. Editar `supabase/functions/generate-article-card-svg/index.ts`:
   - carregar Inter-Bold + Inter-Black (cache module-level)
   - carregar 12 estádios em base64 (cache module-level)
   - função `pickStadium(seed)` determinística
   - SVG novo: `<image>` estádio + overlay gradiente cores + overlay preto + textos com `font-family="Inter"`
2. Criar bucket `card-backgrounds` (público) via migration + seed das 12 imagens (uso `imagegen` premium pra ficar bom — feito uma vez só, custo único de ~$0.50 que vale para sempre).
3. Editar `src/components/admin/images/SvgCardTab.tsx`:
   - thumb vira link pro artigo (`/noticia/:slug` ou `/noticias/:slug` — confirmo na implementação)
   - botão "↻ Regerar este" por card
4. Deploy edge function + perguntar se reseta backlog dos 4.600 antigos.

## Custo

- **Recorrente:** $0 (fontes via CDN, estádios em storage do projeto).
- **Único, no setup:** ~$0.50 pra gerar as 12 fotos de estádio com `imagegen` em qualidade boa. Alternativa $0: baixar de Pexels/Unsplash CC0 via curl. **Quer que eu use Pexels grátis ou gere com imagegen pra ter controle total do estilo?**

## Dúvida pra você decidir

A foto de estádio deve ser:
- **(A)** Genérica sempre (12 ambientes diferentes, sem identidade de clube) — seguro, $0 recorrente, atende copyright.
- **(B)** Tentar usar foto do estádio do mandante quando soubermos (ex: Maracanã pro Flamengo) — mais bonito, mas exige mapeamento manual time→estádio e fotos sem direitos. Mais trabalho, mais risco.

Recomendo **(A)** pra subir rápido e iterar pra (B) depois se valer a pena.
