

# Sinalização de status de importação nos arquivos do Kaggle

## Problema
Ao abrir o dialog "Ver Arquivos" de um dataset, todos os CSVs aparecem iguais -- sem indicação de quais já foram importados, falharam ou estão em andamento. Isso causa reimportações acidentais.

## Solução
Quando o dialog de arquivos abrir, consultar o banco para buscar o status do job mais recente de cada arquivo daquele dataset. Exibir um indicador visual ao lado de cada arquivo:
- **Verde (CheckCircle2)** + "Importado" -- se o job mais recente é `completed`
- **Amarelo (AlertTriangle)** + "Em andamento" -- se está em `downloading/extracting/profiling/mapping/staging`
- **Laranja** + "Aguardando revisão" -- se está em `awaiting_review`
- **Vermelho** + "Falhou" -- se `failed`
- Sem badge -- nunca importado

O botao "Importar" muda de label para "Reimportar" quando o arquivo ja tem job completed, para deixar claro que seria uma reimportacao.

## Mudancas

### `src/pages/AdminKaggle.tsx`
1. Adicionar state `fileImportStatuses` (Record de `fileName -> { status, created_at }`)
2. Na funcao `handleListFiles`, apos receber a lista de arquivos, fazer uma query ao banco:
   ```sql
   SELECT DISTINCT ON (kdf.file_name) kdf.file_name, kij.status, kij.created_at
   FROM kaggle_dataset_files kdf
   JOIN kaggle_import_jobs kij ON kij.dataset_file_id = kdf.id
   JOIN kaggle_datasets kd ON kd.id = kdf.dataset_id
   WHERE kd.dataset_slug = <selectedDatasetSlug>
   ORDER BY kdf.file_name, kij.created_at DESC
   ```
   Isso retorna o job mais recente por arquivo.
3. No render do dialog de arquivos, para cada arquivo:
   - Exibir um Badge colorido com o status (Importado/Em andamento/Falhou)
   - Mostrar a data da ultima importacao em texto pequeno
   - Mudar label do botao para "Reimportar" se ja completou

Nenhuma mudanca de banco necessaria -- os dados ja existem em `kaggle_import_jobs` + `kaggle_dataset_files`.

