

# Plano: Corrigir Mapeamento da Liga "Campeonato Paulista" e Limpar Dados Incorretos

## Problema Identificado

A API-Football retornou `api_id=255` que na verdade corresponde a **USL Championship** (liga americana), mas foi cadastrada como "Campeonato Paulista". Resultado: 205 partidas de times americanos (Memphis 901, Tampa Bay Rowdies, Detroit City, etc.) vinculadas incorretamente.

| Liga no sistema | Slug | api_id | Partidas | Problema |
|-----------------|------|--------|----------|----------|
| Campeonato Paulista | campeonato-paulista-1 | 255 | 205 | Dados da USL Championship (EUA) |
| Campeonato Paulista | campeonato-paulista | NULL | 0 | Liga correta, sem dados |
| Ligue 1 | ligue-1-1 | NULL | 143 | Possível duplicata |

## Ações Planejadas

### 1. Renomear a liga incorreta
- Alterar nome de "Campeonato Paulista" (slug `campeonato-paulista-1`) para "USL Championship"
- Manter as 205 partidas vinculadas (dados são válidos, só o nome da liga estava errado)
- Atualizar país para "United States"

### 2. Vincular api_id correto ao Paulistão real
- A liga correta do Campeonato Paulista na API-Football é `api_id=475`
- Atualizar a liga existente (`campeonato-paulista`, sem api_id) com `api_id=475`

### 3. Verificar duplicata Ligue 1
- Investigar se `ligue-1-1` (143 partidas, sem api_id) contém dados válidos do OpenFootball
- Se sim, fundir as partidas na liga principal `ligue-1` (api_id=2015)

### 4. Importar dados reais do Paulistão
- Usar a edge function `sync-api-football` existente para sincronizar partidas reais do Paulistão 2024/2025

## Detalhes Técnicos

### Migração SQL

```sql
-- 1. Renomear liga errada para USL Championship
UPDATE ligas 
SET nome = 'USL Championship', pais = 'United States'
WHERE id = '2f680751-21ff-4e2d-91e4-b809f965a435';

-- 2. Vincular api_id 475 ao Paulistão real
UPDATE ligas 
SET api_id = 475
WHERE id = 'f09b1df4-fd53-4803-95e2-cc2b67de1c83';
```

### Arquivos a modificar
Nenhum arquivo de código precisa ser alterado -- apenas dados no banco.

### Pós-correção
- Rodar sincronização do Paulistão via `sync-api-football` para importar jogos reais
- Verificar se a Ligue 1 duplicada precisa de fusão

