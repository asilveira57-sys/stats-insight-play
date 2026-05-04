## Problema

A página do time (ex.: `/times/fortaleza`) lista TODAS as análises de uma vez (70+ no caso do Fortaleza), gerando uma página gigantesca e ruim de navegar.

## Solução

### 1. Página do time (`src/pages/TimePilar.tsx`) — mostrar só Top 10

- Na seção "Análises do {time}", exibir apenas as **10 análises mais recentes**.
- Substituir o botão genérico "Ver todas as análises" (que hoje vai pra `/noticias`) por **"Ver todas as análises do {time} →"** que aponta pra nova rota dedicada: `/times/:slug/analises`.
- Adicionar contador discreto: "Mostrando 10 de N análises".

### 2. Nova página dedicada: `src/pages/TimeAnalises.tsx`

Rota: `/times/:slug/analises`

Conteúdo:
- Header com nome do time + breadcrumb (Time → Análises).
- Campo de busca por título (filtro client-side sobre os resultados carregados).
- Filtro opcional por ano (dropdown gerado dinamicamente a partir das datas).
- Lista paginada de análises (12 por página) usando o componente `Pagination` já existente.
- Cada item: thumbnail + título + data, link para `/noticias/{slug}`.
- Estado vazio e loading com `Skeleton`.

### 3. Hook

Em `src/hooks/useTeamPillar.ts`:
- Manter `useTeamRelatedNews` (já retorna todas, ordenado por data desc) — a página do time vai aplicar `.slice(0, 10)` e usar `.length` pro contador.
- Não precisa de hook novo: a página de análises reutiliza `useTeamRelatedNews(teamName)` sem limit, pagina no cliente. Volume esperado (dezenas a baixas centenas) não justifica paginação no servidor.

### 4. Roteamento

Em `src/App.tsx`, adicionar a rota `/times/:slug/analises` apontando para `TimeAnalises`.

## Detalhes técnicos

- Reusar `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext` de `src/components/ui/pagination.tsx`.
- Slug do time: a página `TimePilar` já resolve `slug → team`; replicar a mesma lógica em `TimeAnalises` (ou extrair hook `useTeamBySlug` se ainda não existir — verificar `useTeamPillar`).
- Manter SEO: `<title>` "Análises do {time} | Statball" e meta description.
- Sem alterações em backend/banco.

## Arquivos afetados

- `src/pages/TimePilar.tsx` — limitar a 10, ajustar CTA.
- `src/pages/TimeAnalises.tsx` — **novo**.
- `src/App.tsx` — registrar nova rota.
