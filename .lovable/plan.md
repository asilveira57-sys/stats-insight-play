

## Filtro por Confianca no Historico de Palpites

### O que sera feito
Adicionar filtros de confianca (Alta, Media, Baixa, Todas) no historico de palpites do usuario, permitindo analisar o percentual de acerto por nivel de confianca -- tanto nos cards de estatisticas quanto na lista de palpites.

### Como funciona hoje
- O historico mostra todos os palpites sem distincao de confianca
- Os cards de estatisticas (Sua Assertividade, IA do Sistema, Quando Seguiu a IA) mostram numeros agregados
- A confianca ja e calculada no sistema a partir das probabilidades (prob_casa, prob_empate, prob_fora) usando a funcao `calculateConfidence` do poisson.ts

### Logica de confianca
A confianca e derivada das probabilidades do palpite do sistema:
- **Alta**: probabilidade maxima >= 55% e spread >= 30
- **Media**: probabilidade maxima >= 40% e spread >= 15
- **Baixa**: demais casos

### Mudancas planejadas

#### 1. Hook `useUserPalpites` (src/hooks/useUserPalpites.ts)
- Na query `useUserPalpites`, incluir `prob_casa, prob_empate, prob_fora` no select do `palpite_sistema` (ja busca `placar_casa_estimado, placar_fora_estimado, prob_casa, prob_empate, prob_fora` -- ja esta la)
- Na funcao `useUserAccuracyStats`, adicionar parametro opcional `confidenceFilter` e calcular as estatisticas segmentadas por nivel de confianca
- Na funcao `useSystemAccuracyStats`, adicionar o mesmo filtro de confianca, cruzando com a tabela `palpites` para obter as probabilidades

#### 2. Componente `UserPalpitesHistory` (src/components/palpites/UserPalpitesHistory.tsx)
- Adicionar estado `confidenceFilter` com opcoes: "all", "high", "medium", "low"
- Adicionar botoes de filtro (estilo similar aos botoes de periodo ja existentes) na area de filtros
- Aplicar o filtro na lista `filteredPalpites`, calculando a confianca de cada palpite a partir das probabilidades do sistema
- Passar o filtro para os hooks de estatisticas para que os cards reflitam apenas o nivel selecionado
- Exibir badge de confianca em cada item do historico para referencia visual

#### 3. Detalhes tecnicos
- Importar `calculateConfidence` de `@/lib/poisson` no componente de historico
- Para cada palpite que tem `palpite_sistema` com probabilidades, calcular o nivel de confianca
- Palpites sem sistema vinculado serao tratados como "sem confianca definida" e incluidos apenas no filtro "Todas"
- Os tres cards de estatisticas (Sua Assertividade, IA do Sistema, Quando Seguiu a IA) serao recalculados com base no filtro de confianca ativo

### Resultado esperado
O usuario podera clicar em "Alta", "Media", "Baixa" ou "Todas" e ver imediatamente:
- Percentual de acerto de resultado e placar exato filtrado por confianca
- Lista de palpites filtrada mostrando apenas os do nivel selecionado
- Badge de confianca visivel em cada palpite da lista

