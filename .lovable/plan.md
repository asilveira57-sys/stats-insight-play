

# Plano: Completar Migração do Sistema Anti-Duplicidade

## Diagnóstico

Identifiquei que a migração anterior criou as **funções SQL** necessárias, mas **não criou as estruturas de tabela** que essas funções referenciam. Resultado: as funções existem mas falham ao executar porque as colunas/tabelas não existem.

### Estado Atual
| Item | Status |
|------|--------|
| Tabela `times` | Existe, mas **falta coluna `status`** |
| Tabela `team_aliases` | Existe, mas **falta coluna `source`** (usa `source_id`) |
| Tabela `team_merge_logs` | **Não existe** |
| Função `consolidate_team_aliases` | Existe, mas falha ao executar |
| Função `get_suggested_duplicates` | Existe, mas falha (referencia `status`) |
| Função `merge_teams` | Existe, mas falha (referencia `status` e `team_merge_logs`) |

### Dados Existentes
- 303 times cadastrados
- 52 aliases cadastrados
- Objetivo: criar alias 'internal' para todos os times que ainda não têm

---

## Solução

### Etapa 1: Migração de Schema

Criar migração SQL para adicionar as estruturas ausentes:

```text
+-------------------------+     +-------------------------+
|        times            |     |     team_aliases        |
+-------------------------+     +-------------------------+
| id (pk)                 |     | id (pk)                 |
| nome                    |     | team_id (fk)            |
| slug                    |     | alias                   |
| pais                    |     | normalized_alias        |
| escudo_url              |     | source_id (existente)   |
| + status (novo)         |     | + source (novo)         |
| + (índice por status)   |     | + external_id (novo)    |
| ...                     |     | + confidence (novo)     |
+-------------------------+     +-------------------------+
                                         |
                                         v
                              +-------------------------+
                              |    team_merge_logs      |
                              +-------------------------+
                              | id (pk)                 |
                              | team_target_id (fk)     |
                              | team_source_id          |
                              | source_canonical_name   |
                              | source_canonical_slug   |
                              | merged_by               |
                              | summary (jsonb)         |
                              | created_at              |
                              +-------------------------+
```

**Alterações específicas:**

1. **Tabela `times`**
   - Adicionar coluna `status` com default `'active'`
   - Criar índice para filtros por status

2. **Tabela `team_aliases`**
   - Adicionar coluna `source` com default `'unknown'`
   - Adicionar coluna `external_id` nullable
   - Adicionar coluna `confidence` com default `100`
   - Criar índice único `(source, external_id)` quando `external_id` não for null

3. **Criar tabela `team_merge_logs`**
   - Estrutura completa para auditoria de fusões

### Etapa 2: Atualizar Funções SQL

Recriar as funções SQL para garantir compatibilidade:

- `consolidate_team_aliases()` - Corrigida para usar a nova coluna `source`
- `get_suggested_duplicates()` - Corrigida para usar a coluna `status`
- `merge_teams()` - Corrigida para escrever em `team_merge_logs`
- `get_teams_with_aliases()` - Corrigida para ler `status`
- `count_teams_with_aliases()` - Corrigida para ler `status`

### Etapa 3: Executar Consolidação

Após a migração, o botão "Consolidar Aliases" na página Admin funcionará corretamente e:

1. Identificará os ~251 times sem alias 'internal'
2. Criará automaticamente um alias para cada um
3. Retornará um resumo da operação

---

## Resultado Esperado

Após a execução:

| Métrica | Antes | Depois |
|---------|-------|--------|
| Times com alias 'internal' | ~52 | 303 |
| Sistema de fusão | Inoperante | Funcional |
| Detecção de duplicados | Falha | Ativo |
| Histórico de fusões | Falha | Registrando |

---

## Detalhes Técnicos

### Migração SQL Completa

A migração incluirá:

1. **ALTER TABLE times**
   - `ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'merged', 'disabled'))`

2. **ALTER TABLE team_aliases**
   - `ADD COLUMN source text DEFAULT 'unknown'`
   - `ADD COLUMN external_id text`
   - `ADD COLUMN confidence integer DEFAULT 100`
   - `CREATE UNIQUE INDEX ON team_aliases (source, external_id) WHERE external_id IS NOT NULL`

3. **CREATE TABLE team_merge_logs**
   - Todas as colunas necessárias para auditoria
   - RLS policies para admin access

4. **Recriar todas as funções** com referências corrigidas

### Backfill de Dados Existentes

- Aliases existentes terão `source` atualizado de `NULL` para `'legacy'`
- Todos os times receberão `status = 'active'`

