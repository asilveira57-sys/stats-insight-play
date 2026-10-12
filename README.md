# Math Odds Hub

Portal Inteligente de Resultados, Estatísticas e Palpites Matemáticos

Crie um portal moderno, responsivo e freemium, com foco em resultados de jogos, estatísticas detalhadas e análises matemáticas de partidas de futebol.
Não é um site de apostas. O sistema apenas calcula probabilidades com base em dados estatísticos.

O portal deve ter excelente interface, utilizar AdSense de forma discreta, oferecer uma área Premium e possuir painel administrativo completo.

OBJETIVO DO SISTEMA

Construir um Web App que apresente:

Resultados atualizados de diversas ligas.

Estatísticas de times, partidas, rodadas e desempenho.

Palpites matemáticos gerados a partir de cálculos internos.

Notícias publicadas pelo Admin.

Monetização com Ads e assinatura Premium.

INTEGRAÇÃO COM API

Integrar duas APIs externas:

1. Football-Data.org (free forever)

Usar para:

Lista de ligas

Partidas

Resultados

Tabela

Rodadas

2. API-Football (freemium)

Usar para:

Estatísticas detalhadas

Desempenho dos times

Informações avançadas úteis para cálculo dos palpites

Criar funções internas para:

Atualizar dados diariamente

Atualizar resultados automaticamente

Buscar jogos por data

Buscar jogos por liga

Buscar estatísticas

Calcular probabilidades e gerar o palpite final da partida

ESTRUTURA DE BANCO DE DADOS

Criar as seguintes tabelas:

tabela_times

id

nome

escudo_url

pais

tabela_ligas

id

nome

codigo_api

ativa

tabela_partidas

id

liga_id

time_casa

time_fora

data

hora

gols_casa

gols_fora

status

rodada

tabela_estatisticas

partida_id

posse

finalizacoes

finalizacoes_no_alvo

escanteios

faltas

xg

passes

outros atributos relevantes

tabela_palpites

partida_id

prob_casa

prob_empate

prob_fora

placar_estimado

forca_time_casa

forca_time_fora

tabela_usuarios

id

nome

email

plano

data_criacao

tabela_assinaturas

usuario_id

tipo_plano

status

data_inicio

data_fim

tabela_noticias

id

titulo

texto

imagem_url

data_publicacao

LÓGICA DE PALPITES

Implementar lógica interna baseada em:

Média de gols marcados e sofridos pelos dois times.

Últimos 5 jogos.

Aproveitamento casa e fora.

Indicadores xG, posse e volume ofensivo.

Cálculo Poisson para probabilidade de gols.

Ajuste de força relativa das equipes.

Resultado final:

probabilidade de vitória do mandante

probabilidade de empate

probabilidade de vitória do visitante

placar sugerido

Tudo isso sem qualquer caráter de aposta. É apenas estatística aplicada.

TELAS DO SISTEMA
1. Tela Home

Elementos obrigatórios:

Banner de testeira do AdSense.

Vitrine de vídeo curto (configuração no Admin).

Card principal do próximo jogo da liga selecionada.

Cards de últimos resultados.

Grid com cards das ligas disponíveis.

Cards de palpites automáticos em destaque.

Campo de busca de times ou ligas.

Interface:

Visual moderno, com cards chamativos e limpos.

Paleta escura com detalhes em neon.

Botões arredondados e animações leves.

2. Tela Resultados

Filtro por liga

Filtro por rodada

Filtro por data

Cards de jogos com:

escudo dos times

placar

horário

status

Acesso ao detalhe da partida

3. Tela Estatísticas

Estatísticas completas por time

Estatísticas da partida

Comparador de times lado a lado

Indicadores como:

gols marcados

gols sofridos

média de gols

forma recente

aproveitamento casa/fora

4. Tela Palpites

Exibir:

Probabilidade calculada de cada resultado

Gráficos simples de força ofensiva e defensiva

Placar sugerido

Motivos do palpite (explicação textual)

5. Tela Simulador de Campeonato

Disponível apenas no Premium:

Escolher liga

Simular resultados futuros

Previsão final de tabela

Média de pontuação

6. Tela Notícias

Admin posta notícias com:

título

texto

imagem

data
Exibir na Home e em página dedicada.

7. Tela Preço

Exibir:

Plano Gratuito

Plano Premium

Benefícios

Botão de checkout externo (link configurável no Admin)

PAINEL ADMIN

O Admin deve ter acesso a:

Publicar notícias

Gerenciar usuários

Gerenciar assinaturas

Ativar/desativar ligas

Trocar URL do vídeo vitrine

Inserir códigos:

AdSense

GA4

Pixel Meta

Atualizar resultados manualmente

Exportar dados em CSV

MONETIZAÇÃO

Integrar espaço para inserir o código do AdSense

Exibir apenas:

testeira

um banner lateral discreto

Plano Premium liberando recursos avançados

DESIGN

Layout com estilo de aplicativo moderno

Paleta escura (cinza grafite) com detalhes neon azul ou verde

Tipografia simples e legível

Cards com sombras leves

Ícones esportivos nas listas

Animações suaves em hover

RECURSOS AVANÇADOS

Sistema de cache para evitar excesso de chamadas às APIs

Atualização automática diária

Webhooks internos para sincronização

Sistema modular para permitir incluir novas ligas no futuro

URLs amigáveis para SEO

Blog otimizado para indexação

ENTREGA FINAL

Gerar:

todas as telas

rotas

banco de dados

integrações

funções internas

lógica dos palpites

visual completo

fluxo de usuário (free e premium)

painel administrativo

Todo o sistema deve ser funcional, limpo e de fácil navegação.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stats-insight-play.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d859c839-bf9b-4293-8c15-9ddfb32225f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
