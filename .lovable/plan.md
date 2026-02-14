

## Correcoes no Sistema de Importacao GitHub

### Problema identificado

Os dados estao sendo importados corretamente (567 partidas atualizadas no banco), mas ha dois problemas:

1. **Rastreabilidade zero**: O campo `import_batch_id` nao e gravado quando partidas sao atualizadas (somente quando sao criadas pela primeira vez). Isso impede pesquisar quais jogos vieram de cada importacao.
2. **Contagem enganosa**: O historico mostra "0 inseridos, 564 atualizados" sem contexto -- o usuario nao sabe se os dados realmente foram salvos.

### Solucao

#### 1. Gravar `import_batch_id` em todas as atualizacoes (Edge Function)

No arquivo `supabase/functions/import-github-data/index.ts`, na secao onde atualiza gols (linha ~500), adicionar o `import_batch_id` ao UPDATE:

```typescript
await supabase.from("partidas").update({
  gols_casa: match.home_goals,
  gols_fora: match.away_goals,
  status: "encerrado",
  import_batch_id: batchId,  // ADICIONAR
}).eq("id", matchId);
```

Tambem adicionar o batch ID na chamada para partidas novas, logo apos o RPC `resolve_or_create_match`:

```typescript
if (isNew && matchId) {
  await supabase.from("partidas").update({
    import_batch_id: batchId,
  }).eq("id", matchId);
}
```

#### 2. Adicionar botao "Ver jogos importados" no Historico

No componente `src/components/admin/csv/CsvImportHistory.tsx`, adicionar uma acao para visualizar as partidas de cada importacao:

- Botao com icone de olho (Eye) ao lado dos botoes existentes
- Ao clicar, abre um modal ou expande uma secao mostrando as partidas vinculadas aquele batch
- Consulta: `SELECT * FROM partidas WHERE import_batch_id = '{id}' ORDER BY data`
- Exibe: time casa, time fora, placar, data, liga

#### 3. Melhorar a mensagem de status no historico

No mesmo componente, quando o status for "completed" e `rows_inserted = 0` mas `rows_updated > 0`, mostrar uma dica visual (tooltip ou texto) explicando: "Partidas ja existentes foram atualizadas com novos dados".

### Detalhes tecnicos

**Arquivos a modificar:**
- `supabase/functions/import-github-data/index.ts` -- adicionar `import_batch_id` no UPDATE de gols e no INSERT
- `src/components/admin/csv/CsvImportHistory.tsx` -- botao "Ver jogos" + modal de detalhes + tooltip explicativo

**Impacto:**
- Nenhuma mudanca de schema necessaria (campo `import_batch_id` ja existe na tabela `partidas`)
- A correcao e retroativa apenas para importacoes futuras; as 567 partidas ja atualizadas hoje nao terao o batch ID preenchido
