
# Plano: Automação de Geração de Análises (Posts de Blog)

## Situação Atual

Após análise do sistema, identifiquei que:

| Métrica | Valor |
|---------|-------|
| Jogos próximos 7 dias | 62 |
| Com palpite gerado | 52 |
| Com análise/post | 3 |
| **Pendentes (com palpite, sem análise)** | **49** |

### Problema Identificado
A função `generate-match-analysis` já existe e funciona bem, mas **não está agendada automaticamente**. Ela só é executada manualmente pelo admin. Por isso, do dia 11/01 ao dia 30/01 há poucas análises publicadas.

### Cron Jobs Existentes
Atualmente o sistema tem estes agendamentos automáticos:
- `sync-football-data-job`: a cada 6 horas
- `generate-predictions-job`: a cada 6 horas  
- `process-results-job`: a cada 6 horas
- `sync-scorers-auto`: a cada 5 minutos
- `sync-match-details-auto`: a cada 10 minutos

**Não existe cron para gerar análises automaticamente.**

---

## Solução Proposta

### 1. Criar Cron Job para Gerar Análises Automaticamente

Agendar a edge function `generate-match-analysis` para rodar **2x por dia** (às 08h e 20h UTC), garantindo que:
- Jogos com palpite gerado recebam análise automaticamente
- Análises sejam publicadas com pelo menos 1-2 dias de antecedência

### 2. Expandir Janela de Busca na Edge Function

Atualmente a função busca jogos dos próximos 3 dias. Expandir para **7 dias** para garantir cobertura de toda a rodada do fim de semana.

### 3. Adicionar Limite de Processamento por Execução

Para evitar timeouts e consumo excessivo de créditos de IA, processar no máximo **10-15 análises por execução**. Com 2 execuções diárias, isso gera até 30 análises/dia.

### 4. Priorização por Data

Ordenar os jogos por data (mais próximos primeiro) para garantir que análises sejam publicadas a tempo.

---

## Detalhes Técnicos

### Modificações na Edge Function

```text
supabase/functions/generate-match-analysis/index.ts
├── Alterar janela de busca: 3 dias → 7 dias
├── Adicionar limite de processamento: max 15 por execução
├── Ordenar por data ASC (jogos mais próximos primeiro)
└── Log de estatísticas para monitoramento
```

### SQL para Criar o Cron Job

```sql
SELECT cron.schedule(
  'generate-analysis-job',
  '0 8,20 * * *',  -- Às 08:00 e 20:00 UTC
  $$
  SELECT net.http_post(
    url:='https://wlvwcbxegrmobefloikr.supabase.co/functions/v1/generate-match-analysis',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ..."}'::jsonb,
    body:='{"limit": 15}'::jsonb
  ) as request_id;
  $$
);
```

### Parâmetros do Novo Sistema

| Configuração | Valor |
|--------------|-------|
| Frequência | 2x/dia (08h e 20h UTC) |
| Janela de busca | 7 dias à frente |
| Limite por execução | 15 análises |
| Capacidade diária | até 30 análises |

---

## Fluxo Automático

```text
A cada 6 horas                    2x por dia (08h/20h)
       ↓                                  ↓
┌──────────────┐               ┌───────────────────┐
│ sync-data &  │               │ generate-match-   │
│ generate-    │──────────────→│ analysis          │
│ predictions  │   palpites    │                   │
└──────────────┘   prontos     └───────────────────┘
                                        ↓
                               ┌───────────────────┐
                               │ Análise publicada │
                               │ automaticamente   │
                               └───────────────────┘
```

---

## Benefícios

1. **Zero intervenção manual**: Análises geradas automaticamente
2. **Cobertura completa**: Todos os jogos com palpite terão análise
3. **SEO contínuo**: Novos posts diários para indexação
4. **Antecedência garantida**: Análises publicadas 1-7 dias antes do jogo

---

## Arquivos a Modificar

1. **`supabase/functions/generate-match-analysis/index.ts`**
   - Expandir janela para 7 dias
   - Adicionar parâmetro `limit`
   - Ordenar por data ascendente

2. **Banco de dados (via SQL)**
   - Criar cron job `generate-analysis-job`

---

## Observação sobre Créditos de IA

Com até 30 análises/dia, cada uma gerando:
- 1 texto longo (~1500+ palavras) via Gemini
- 1-2 imagens (thumbnail + infográfico)

Pode haver consumo significativo de créditos. Se necessário, ajustar o limite para 10 por execução.
