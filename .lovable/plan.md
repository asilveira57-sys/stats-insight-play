

# Plano de Melhorias - Perfil e Configuracoes

## Problemas Identificados e Solucoes

### 1. Icone de perfil some no modo noite
A Navbar forca `className="dark"` no elemento `<nav>`, o que faz o icone `<User>` (com `variant="ghost"`) ficar invisivel por falta de contraste. O botao usa cor do foreground que no contexto dark-on-dark desaparece.

**Solucao:** Adicionar classe explicita de cor ao icone do User no botao de perfil (ex: `text-foreground`) para garantir visibilidade independente do tema.

### 2. Remover "Meu Plano" do dropdown do usuario
Conforme indicado nas imagens, o link "Meu Plano" no dropdown da Navbar e redundante.

**Solucao:** Remover as linhas 251-256 do Navbar.tsx que conteem o `DropdownMenuItem` com "Meu Plano" apontando para `/precos`.

### 3. "Minha Assinatura" deve voltar para dentro do Perfil
Atualmente o botao "Gerenciar Pagamentos" na aba Plano redireciona para `/minha-assinatura` (pagina separada). O usuario quer que a gestao de assinatura fique integrada dentro da aba "Plano" em `/configuracoes/perfil`.

**Solucao:** Incorporar o conteudo essencial de "Minha Assinatura" (historico de pagamentos e assinaturas recorrentes) diretamente na aba `GestaoPlanoTab`, removendo o botao de redirecionamento externo. O link "Gerenciar Pagamentos" passara a expandir/mostrar as secoes de historico inline.

### 4. "Fazer Upgrade" deve abrir na aba Avulso por padrao
O botao "Fazer Upgrade" na aba Plano navega para `/precos` que abre na aba "Assinatura" por padrao. O usuario quer que abra na aba "Avulso".

**Solucao:** Alterar a navegacao do botao "Fazer Upgrade" de `navigate("/precos")` para `navigate("/precos?tab=onetime")`. A pagina Precos ja le o parametro `tab` da URL (linha 39), entao basta passar o valor correto.

### 5. Faturamento: puxar dados do perfil e adicionar IE
O formulario de faturamento nao puxa dados ja preenchidos no perfil (nome, cidade, estado). Alem disso, falta campo de IE (Inscricao Estadual) para pessoa juridica com opcao "Isento".

**Solucao:**
- Adicionar botao "Preencher com dados do perfil" que copia `nome` do profile para `nome_fiscal`, e `cidade`/`estado` do profile para os campos correspondentes de faturamento.
- Adicionar deteccao automatica PF/PJ baseada no tamanho do CPF/CNPJ (11 = PF, 14 = PJ).
- Quando PJ detectada, exibir campo "Inscricao Estadual (IE)" com checkbox "Isento de IE".
- Requer migration para adicionar colunas `ie` (text) e `ie_isento` (boolean default false) na tabela `user_fiscal_data`.

### 6. Preferencias bugada na rota
A aba Preferencias carrega uma query de times (`useQuery` para `times`) dentro do componente, mas o `Select` com valor vazio (`value=""` para "Nenhum") causa problemas no Radix Select que nao aceita string vazia como valor valido.

**Solucao:** Substituir `value=""` por `value="none"` no SelectItem de "Nenhum" e ajustar a logica para converter "none" em `null` ao salvar. Tambem garantir que o estado inicial trate `null` como `"none"`.

---

## Detalhes Tecnicos

### Arquivos a modificar:
1. **`src/components/layout/Navbar.tsx`** - Fix icone dark mode + remover "Meu Plano"
2. **`src/pages/Configuracoes.tsx`** - Integrar assinatura na aba Plano, fix Preferencias, melhorar Faturamento
3. **`src/pages/Precos.tsx`** - Nenhuma mudanca necessaria (ja suporta `?tab=`)

### Migration SQL necessaria:
- Adicionar `ie TEXT` e `ie_isento BOOLEAN DEFAULT false` a `user_fiscal_data`

### Ordem de execucao:
1. Migration SQL (ie/ie_isento)
2. Navbar.tsx (icone + remover Meu Plano)
3. Configuracoes.tsx (todas as melhorias das abas)

