
Objetivo: eliminar o “zero registros” falso, destravar a pipeline em lote e garantir visibilidade real de progresso/erros no Kaggle.

1) Diagnóstico confirmado (com evidência)
- Não é limite de 1000 neste caso: há jobs com 49.071 e 47.555 linhas staged (logo a paginação está funcionando).
- O bloqueio principal é erro de execução na função de resolução:
  - `kaggle-resolve` está quebrando com `TypeError: ...insert(...).onConflict is not a function`.
  - Isso interrompe a resolução antes de preencher `matched_home_team_id` / `matched_away_team_id`.
  - Resultado: staging fica `pending`, promote roda com 0.
- A função `kaggle-batch` mascara falhas:
  - ela chama funções internas via `fetch`, mas não valida `resp.ok`;
  - mesmo com erro 500, continua e retorna “sucesso” parcial, gerando sensação de “parado sem explicação”.
- Há outro ponto crítico igual em `kaggle-promote` (`insert(...).onConflict`) que também pode quebrar na promoção quando houver registros resolvidos.

2) Plano de correção (implementação)
- Corrigir `kaggle-resolve`:
  - substituir todos os `insert(...).onConflict(...).ignore()` por padrão compatível (upsert com `onConflict` no options, ou insert com tratamento explícito de duplicidade);
  - alinhar conflitos aos índices reais existentes (`alias` em aliases, etc.).
- Corrigir `kaggle-promote`:
  - remover `insert(...).onConflict(...)` inválido e aplicar upsert/insert-safe no `external_id_map` e links.
- Endurecer `kaggle-batch` (pipeline lote):
  - validar HTTP status em cada chamada interna;
  - se etapa falhar, registrar erro estruturado no job (`error_summary`) + log com stage correto;
  - não reportar “processado com sucesso” quando houve erro técnico.
- Ajustar fluxo de status dos jobs:
  - mover automaticamente para `failed`/`completed_with_alerts` quando houver exceção real;
  - evitar jobs “awaiting_review” sem resolução concluída.
- Melhorar feedback no Admin Kaggle:
  - polling automático enquanto houver jobs ativos;
  - exibir “último erro do job” e etapa atual;
  - para arquivos não-partida (modo misto + estrito), mostrar resultado explícito (“arquivo importado, mas sem pipeline de partidas”), em vez de parecer falha silenciosa.

3) Regra geral “sem limite” (hardening)
- Auditar consultas do módulo Kaggle para remover limites de listagem que afetem completude operacional.
- Manter lotes apenas onde são controle operacional (ex.: `batch_size`) e não truncamento de dados de leitura.
- Aplicar helper paginado em toda tela administrativa que possa ultrapassar 1000 linhas.

4) Saneamento dos dados já travados
- Reprocessar jobs recentes com status incoerente (`extracting` antigo / `awaiting_review` sem resolução final).
- Limpar resíduos de tentativas quebradas apenas quando necessário (sem apagar históricos válidos).
- Rodar novamente em lote (5 por vez) com logs confiáveis após correção.

5) Validação de aceite (fim a fim)
- Importar `results.csv`:
  - deve sair de download → profile → stage → resolve → promote;
  - `total_promoted` precisa ser > 0 (ou `updated` > 0 quando houver dedupe).
- Rodar “Processar Pendentes”:
  - não pode ficar parado sem mensagem;
  - erros devem aparecer no job e na aba Logs com causa técnica.
- Verificar que jobs com erro real não permanecem “awaiting_review” indefinidamente.

Detalhes técnicos (implementação)
- Arquivos foco:
  - `supabase/functions/kaggle-resolve/index.ts`
  - `supabase/functions/kaggle-promote/index.ts`
  - `supabase/functions/kaggle-batch/index.ts`
  - `src/hooks/useKaggleData.ts`
  - `src/pages/AdminKaggle.tsx`
- Sem dependências novas.
- Mudanças no banco só se necessário para observabilidade adicional; prioridade é corrigir runtime e fluxo de status primeiro.
