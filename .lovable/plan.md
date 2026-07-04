## Diagnóstico do problema

A pesquisa não está “lendo” corretamente porque o motor atual mistura três comportamentos incompatíveis:

1. **Parser de intenção fraco**
   - “jogos do Palmeiras em casa em 2025” caiu como `entity_lookup`, não como busca de jogos/time.
   - “últimos 5 jogos do Flamengo” virou resposta de **um único último jogo**, ignorando o número 5.
   - “quanto ficou França x Alemanha” caiu como `open_question` e resolveu **Martina Franca** como time, uma interpretação totalmente errada.

2. **Resolução de entidades perigosa**
   - O sistema usa tokens soltos demais: “França” foi usado para achar “Martina Franca”.
   - “Palmeiras” está pegando registros duplicados/menos canônicos, como Palmeiras-SP ou até contexto incorreto de Série B.
   - Não há camada rígida para separar: seleção, clube, competição, jogador, ano, mando, quantidade, adversário.

3. **Consulta factual incompleta**
   - Para “campeão do Brasileirão 2025”, o banco tem 306 partidas finalizadas e consegue calcular a tabela, mas o motor só consulta `team_titles`; como não há título gravado para 2025, retorna “sem resultado”.
   - Se a tabela agregada existe por partidas, o campeão/líder deveria ser derivado quando a temporada tem dados completos ou, no mínimo, responder “líder pela tabela calculada”, não falhar seco.

## Plano de correção definitiva

### 1. Trocar o núcleo por um parser determinístico antes da IA
Criar uma camada local que extrai filtros sem gastar crédito:

- `intent`: campeão, tabela, jogos_do_time, últimos_jogos, placar/confronto, artilheiro, entidade.
- `year`: ano explícito ou relativo.
- `scope`: casa/fora.
- `limit`: “últimos 5”, “últimos 10”, etc.
- `teams`: time principal e adversário.
- `league`: competição.
- `isNationalTeamQuery`: quando detectar seleções como França, Alemanha, Brasil, Argentina.

A IA só entra como fallback controlado, nunca como primeira ferramenta para perguntas simples.

### 2. Endurecer a resolução de entidades
Implementar ranking mais seguro:

- Para confronto `A x B`, resolver dois times/seleções separadamente, não por tokens genéricos.
- Bloquear matches parciais perigosos: “França” não pode bater em “Martina Franca”.
- Priorizar times canônicos por `total_matches`, país, slug e nome normalizado.
- Penalizar categorias U20/U17/Women e sufixos estaduais quando a consulta não menciona isso.
- Usar aliases explícitos para seleções nacionais.

### 3. Corrigir consultas por tipo
Implementar respostas factuais específicas:

- **Campeão**
  - Primeiro: `team_titles`.
  - Segundo: `seasons.winner_team_id`.
  - Terceiro: tabela calculada por partidas finalizadas quando não houver campeão registrado.
  - Para temporadas atuais/incompletas: responder “líder atual pela tabela calculada”, não “campeão”, se apropriado.

- **Jogos do time / últimos N jogos**
  - Retornar lista de partidas, respeitando ano, mando e limite.
  - Exemplo: “últimos 5 jogos do Flamengo” deve mostrar 5 jogos, não só um.

- **Placar/confronto**
  - Resolver dois participantes de `França x Alemanha` e buscar confrontos entre eles.
  - Se houver múltiplos, retornar o mais recente ou pedir desambiguação quando necessário.

- **Tabela/classificação**
  - Manter fallback por partidas, mas expor que a fonte é “calculada a partir dos jogos”.

### 4. Melhorar resposta e filtros no frontend
A tela deve mostrar filtros reais extraídos:

- Competição
- Ano/temporada
- Time
- Adversário
- Mando
- Quantidade
- Tipo de busca
- Fonte dos dados

Também corrigir cards para renderizar:

- lista de jogos;
- confrontos diretos;
- campeão/líder calculado;
- mensagem clara quando realmente faltar dado.

### 5. Reduzir gasto com crédito
Remover chamadas de IA para:

- classificação de intenção simples;
- último jogo;
- jogos de time;
- campeão;
- tabela;
- placar/confronto.

A IA ficará apenas para reformular resposta quando já houver dados, ou fallback raro. Isso reduz custo e evita respostas inventadas/erradas.

### 6. Testar casos críticos antes de considerar pronto
Validar diretamente na função:

- `campeão do brasileirão 2025`
- `campeão brasileirão 2022`
- `tabela do brasileirão 2025`
- `jogos do Palmeiras em casa em 2025`
- `últimos 5 jogos do Flamengo`
- `quanto ficou França x Alemanha`
- `artilheiro da Copa de 2014`
- `quem ganhou a Libertadores 2019`

## Arquivos prováveis

- `supabase/functions/intelligent-search/index.ts`
- `src/hooks/useIntelligentSearch.ts`
- `src/components/search/AnswerCard.tsx`
- possivelmente um pequeno ajuste em tipos/cards de lista de jogos

## Resultado esperado

A pesquisa passa a funcionar como motor factual: interpreta a frase, separa filtros, consulta o banco e só responde com dados encontrados/calculados no StatBall, sem depender de IA para entender casos básicos e sem gastar crédito desnecessário.