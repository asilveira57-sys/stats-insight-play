

# Fixar Navbar e Footer no Tema Escuro (Independente do Toggle)

## Problema
A logo do Statball (`statball-logo.png`) foi desenhada para fundo escuro. No modo claro, ela aparece com fundo branco/acinzentado e perde legibilidade. No modo escuro, a transparencia do PNG tambem causa artefatos visuais. Trocar logos dinamicamente ja gastou creditos e nao funcionou bem.

## Solucao
Forcar a **Navbar** e o **cabecalho do Footer** a sempre usarem o tema escuro, independente do toggle claro/escuro. Isso elimina a necessidade de duas versoes da logo e garante consistencia visual.

O **Hero** tambem sera fixado no tema escuro, pois ja usa overlays escuros sobre a imagem de fundo.

## O que muda

### 1. Navbar (sempre escura)
- Envolver o `<nav>` com a classe `dark` forcada, aplicando cores de fundo e texto do tema escuro diretamente
- Substituir classes que dependem de variaveis CSS do tema (`bg-background`, `text-foreground`, etc.) por valores fixos escuros
- A logo usara sempre `statball-logo.png` (versao escura), sem logica condicional de tema

### 2. Footer (sempre escuro)
- Aplicar a classe `dark` no container principal do Footer
- Manter todas as cores internas no padrao escuro, independente do tema global

### 3. HeroSection (sempre escura)
- Remover a importacao do `useTheme` e da logo light
- Usar sempre `statball-logo.png`
- Os overlays ja sao escuros, entao o visual permanece identico

### 4. Sem impacto no resto da pagina
- O toggle claro/escuro continua funcionando normalmente para todo o conteudo abaixo do hero e acima do footer
- Cards, tabelas, graficos, paginas internas -- tudo responde ao tema normalmente

## Detalhes Tecnicos

### Abordagem CSS
A forma mais limpa e usar a classe `dark` do Tailwind como escopo local:

```html
<nav class="dark bg-background ...">
```

Quando um elemento tem a classe `dark`, as variaveis CSS do tema escuro se aplicam a ele e a todos os filhos, independente do tema global. Isso funciona porque o Tailwind usa `class` strategy para temas.

### Arquivos a editar
1. **`src/components/layout/Navbar.tsx`** -- Adicionar classe `dark` ao `<nav>`, remover logica condicional de tema se houver
2. **`src/components/layout/Footer.tsx`** -- Adicionar classe `dark` ao `<footer>`
3. **`src/components/home/HeroSection.tsx`** -- Remover `useTheme`, usar sempre logo escura, adicionar classe `dark` ao `<section>`

### Arquivos que NAO mudam
- `ThemeContext.tsx` -- o toggle continua funcionando
- `ThemeToggle.tsx` -- o botao continua visivel e funcional
- `index.css` -- nenhuma variavel CSS muda
