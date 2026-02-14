
## Integração Cartola FC - IMPLEMENTADO

### Tabelas criadas
- `cartola_clubes` (id, nome, abreviacao, slug, escudo_url)
- `cartola_atletas` (id, apelido, nome, posicao_id, clube_id, status_id)
- `cartola_temporadas` (season, fonte_historico)
- `cartola_partidas` (season, rodada, casa/visitante, placares, link statball)
- `cartola_scouts_rodada` (season, rodada, atleta, pontos, preco, scouts JSON)

### Edge Functions
- `cartola-import`: Importação histórica do GitHub (CartolaFCDados 2014-2017)
- `cartola-sync`: Sincronização via API pública (temporada atual + rodada específica)

### Frontend
- Página admin: `/admin/cartola`
- Hook: `src/hooks/useCartola.ts`
- Tabs: Importar Histórico, Sincronizar, Mapeamento, Logs

### Pendente
- Adicionar link no menu de navegação admin
- Testar importação completa
