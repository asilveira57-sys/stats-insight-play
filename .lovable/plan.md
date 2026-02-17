

## Painel Administrativo Central do Statball

### Problema atual

O admin esta fragmentado em 14 rotas separadas, sem navegacao unificada. Cada pagina e acessada por slug direto (/admin/planos, /admin/webhooks, etc.), e a unica forma de navegar entre elas e pelo Control Center, que tem uma barra de botoes horizontais desorganizada. Nao existe um menu lateral persistente.

### Solucao

Criar um **layout administrativo com sidebar fixa** que funcione como hub central, agrupando todos os modulos em categorias logicas. A pagina `/admin` passa a ser o dashboard principal com a sidebar sempre visivel.

### Estrutura do menu lateral

```text
+---------------------------------------+
|  STATBALL ADMIN                       |
+---------------------------------------+
|                                       |
|  VISAO GERAL                          |
|    Dashboard (atual /admin)           |
|    Control Center                     |
|                                       |
|  CONTEUDO                             |
|    Editorial                          |
|    Noticias / Analises (atual Admin)  |
|                                       |
|  DADOS & SYNC                         |
|    Qualidade de Dados                 |
|    Slugs                              |
|    Times / Aliases                    |
|    CSV Import                         |
|    Cartola FC                         |
|                                       |
|  USUARIOS & MONETIZACAO               |
|    Usuarios                           |
|    Planos                             |
|    Webhooks (Mercado Pago)            |
|    Assinaturas                        |
|                                       |
|  CONFIGURACOES                        |
|    Analytics                          |
|    LGPD / Privacidade                 |
|                                       |
+---------------------------------------+
```

### O que muda

1. **Novo componente `AdminLayout`**: Wrapper com sidebar + area de conteudo. Substitui o `<Layout>` nas paginas admin.

2. **Sidebar responsiva**: No desktop, sidebar fixa a esquerda (240px). No mobile, abre como drawer/sheet.

3. **Pagina `/admin` vira o Dashboard**: Mostra resumo rapido (health cards do Control Center + atalhos para acoes mais usadas).

4. **Todas as paginas admin usam `AdminLayout`**: Cada pagina existente troca `<Layout>` por `<AdminLayout>` e ganha navegacao lateral automaticamente.

5. **Nenhuma funcionalidade e removida**: Todas as paginas continuam existindo, apenas ganham o menu lateral.

### Sobre os Planos (Mercado Pago)

Os planos ja estao cadastrados no banco:
- Mensal (R$ 19,90/mes - assinatura recorrente)
- 30 dias (R$ 24,90)
- 90 dias (R$ 59,90)
- 180 dias (R$ 99,90 - "Mais vendido")
- 365 dias (R$ 179,90)

Todos estao ativos, com features configuradas. O campo `mp_preapproval_plan_id` esta vazio em todos -- isso precisara ser preenchido com o ID do plano criado no Mercado Pago para que assinaturas recorrentes funcionem. A pagina `/admin/planos` ja permite editar isso.

### Detalhes tecnicos

**Arquivos novos:**
- `src/components/admin/AdminLayout.tsx` -- Layout com sidebar, menu agrupado, indicador de pagina ativa
- `src/components/admin/AdminSidebar.tsx` -- Componente da sidebar com grupos e itens

**Arquivos modificados (troca de Layout por AdminLayout):**
- `src/pages/Admin.tsx`
- `src/pages/AdminControlCenter.tsx`
- `src/pages/AdminPlanos.tsx`
- `src/pages/AdminSlugs.tsx`
- `src/pages/AdminTeams.tsx`
- `src/pages/AdminDataQuality.tsx`
- `src/pages/AdminUserProfiles.tsx`
- `src/pages/AdminUserDetail.tsx`
- `src/pages/AdminWebhooks.tsx`
- `src/pages/AdminCsvImport.tsx`
- `src/pages/AdminCartola.tsx`
- `src/pages/AdminAnalyticsIntegrations.tsx`
- `src/pages/AdminLgpdPage.tsx`
- `src/pages/EditorialDashboard.tsx`

**Impacto:** Apenas visual/navegacao. Nenhuma alteracao de banco de dados, edge functions ou logica de negocio.

