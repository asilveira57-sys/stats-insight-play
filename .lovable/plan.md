
Objetivo imediato: congelar toda automação excessiva, corrigir a geração nova primeiro e só depois mexer no passivo.

Diagnóstico confirmado
- O “scroll infinito / referências sem fim” do artigo público não vem só do prompt: `src/components/news/RelatedArticles.tsx` hoje busca todos os artigos publicados, sem limite, e renderiza a lista inteira. Isso sozinho já explica a página ficando enorme.
- Ainda existem pontos que podem disparar criação em lote ou contínua:
  - `supabase/functions/process-queue/index.ts`
  - `src/pages/Admin.tsx`
  - `src/pages/AdminControlCenter.tsx`
  - `src/components/admin/images/AuditTab.tsx`
- `generate-validation-article` ainda mantém modo legado sem limite (`limit=0`), e `generate-match-analysis` / `generate-retroactive-articles` / `generate-weekly-validation` ainda aceitam múltiplos itens por execução.
- A correção de imagens no `AuditTab` ainda roda em loop contínuo no navegador.

Plano de implementação

1. Contenção imediata
- Usar a tabela existente `configuracoes` para criar kill-switches de automação:
  - `automation_validations_enabled = false`
  - `automation_weekly_enabled = false`
  - `automation_analyses_enabled = false`
  - `automation_retro_articles_enabled = false`
  - `automation_image_fix_enabled = false`
  - `generation_review_mode = true`
- Fazer `process-queue` checar esses flags antes de executar qualquer job e parar jobs ativos com motivo visível.
- Desabilitar/ocultar no Admin todos os botões de backfill, loop e auto-correção enquanto os flags estiverem desligados.
- Remover o loop automático do `AuditTab`; manter só ação manual.

2. Corrigir a geração nova antes do retroativo
- Colocar as funções de conteúdo em “safe mode”:
  - padrão = 1 item por execução
  - nada de scan aberto por default
  - semanal só com `league_id + week + year`
  - validação só com `match_id` ou lote explícito e pequeno
- Adicionar validação server-side antes de publicar:
  - máximo 1 bloco de “conteúdos relacionados”
  - máximo 6 links recomendados, hard cap 10 no HTML total
  - remover blocos extras gerados pela IA
  - rejeitar publicação fora do padrão em vez de salvar errado
- Em `generate-retroactive-articles`, os links relacionados deixam de ser “montados pela IA” e passam a ser sempre injetados pelo servidor, já limitados e filtrados.

3. Corrigir o artigo público
- Em `src/components/news/RelatedArticles.tsx`, trocar a query sem limite por lista curta e contextual:
  - 6 itens por padrão
  - excluir o artigo atual
  - filtrar por contexto (liga/times quando disponível)
- Se necessário, passar mais contexto por `NoticiaDetalhes.tsx`.
- Resultado: o artigo deixa de parecer “infinito” mesmo antes de qualquer reprocessamento histórico.

4. Dar visibilidade real do que está sendo criado
- Reaproveitar o Admin atual para um “modo revisão”:
  - gerar 1 item
  - mostrar link do artigo criado
  - mostrar thumbnail/status da imagem
  - mostrar último erro/validação
- Manter lista curta dos últimos itens gerados para conferência imediata, sem lote contínuo.

5. Só depois tratar o passivo
- Quando o fluxo novo estiver validado, liberar correção retroativa em micro-lotes:
  - 1 por vez no início
  - depois 3 por clique, nunca em loop automático
- Ordem:
  1. validações novas
  2. semanais novas
  3. imagens novas
  4. retroativo antigo errado

Detalhes técnicos
- Não precisa nova tabela: vou usar `configuracoes`, que já existe no projeto.
- O hard stop ficará em 3 camadas: UI + edge functions + `process-queue`.
- A primeira entrega pode ser feita sem consumir IA: congelamento, limites, guardrails e correção do componente público.

Arquivos principais
- `src/components/news/RelatedArticles.tsx`
- `src/pages/NoticiaDetalhes.tsx`
- `src/pages/Admin.tsx`
- `src/pages/AdminControlCenter.tsx`
- `src/components/admin/images/AuditTab.tsx`
- `supabase/functions/process-queue/index.ts`
- `supabase/functions/generate-validation-article/index.ts`
- `supabase/functions/generate-weekly-validation/index.ts`
- `supabase/functions/generate-match-analysis/index.ts`
- `supabase/functions/generate-retroactive-articles/index.ts`
- migration usando `configuracoes`

Resultado esperado
- Nada continua gerando em lote grande sem você querer
- O artigo público deixa de exibir listas intermináveis
- A geração nova fica travada em modo seguro/manual
- Você consegue validar artigo e imagem antes de pensar no retroativo
- O retroativo só volta quando o fluxo novo estiver confiável
