---
title: 'Core Web Vitals explicado para quem não é programador'
description: 'LCP, INP e CLS traduzidos para linguagem de negócio: o que cada métrica mede, por que o Google se importa e o que isso custa em vendas perdidas.'
pubDate: 2026-08-14
category: 'Performance'
keywords:
  - core web vitals
  - site lento
  - velocidade de carregamento
  - LCP
  - otimização de performance
featured: true
---

Todo mundo já ouviu que "site lento perde cliente". O que quase ninguém explica
é **o que exatamente o Google mede**, e por que três siglas decidem parte da
sua posição na busca.

Este texto traduz as Core Web Vitals para linguagem de negócio. Sem código.

## Por que o Google criou essas métricas

Antes de 2020, "site rápido" era uma opinião. Cada ferramenta media uma coisa
diferente, e nenhuma delas media o que o usuário realmente sente.

As Core Web Vitals resolveram isso definindo três perguntas objetivas:

1. Quanto tempo até eu ver o conteúdo que vim buscar?
2. Quanto tempo até o site responder quando eu clico?
3. As coisas ficam paradas no lugar enquanto eu leio?

São três frustrações concretas. E como o Google usa dados de usuários reais —
gente de verdade, no celular de verdade, na conexão de verdade — não dá para
maquiar o resultado.

## LCP: quanto tempo até aparecer o que importa

**LCP (Largest Contentful Paint)** mede quando o maior elemento visível da tela
termina de carregar. Normalmente é a imagem principal ou o título grande.

O limite do Google é **2,5 segundos**. Acima disso, sua página entra na faixa
"precisa melhorar".

O que isso significa em dinheiro: cada segundo a mais derruba a conversão de
forma mensurável. E o efeito é pior no celular, que é onde está a maioria do
seu tráfego.

As causas mais comuns que encontramos em auditoria:

- Imagem principal em PNG de 2 MB que ninguém redimensionou
- Fonte customizada que bloqueia o texto de aparecer
- Banner rotativo que carrega cinco imagens quando só uma é visível
- Hospedagem compartilhada barata com tempo de resposta alto

## INP: quanto tempo até o site reagir

**INP (Interaction to Next Paint)** mede o atraso entre você clicar e a tela
mudar. É a métrica da sensação de "travado".

O limite é **200 milissegundos**.

Essa é a métrica que mais sofre com excesso de plugin. Cada script de terceiro
— chat, pixel de rastreamento, mapa de calor, pop-up de newsletter — disputa
o mesmo processador que precisa responder ao seu clique.

O caso clássico: alguém clica em "Enviar" no formulário, não acontece nada
visível, a pessoa clica de novo, e o lead chega duplicado. Não é bug do
formulário — é INP alto.

## CLS: o site que pula enquanto você lê

**CLS (Cumulative Layout Shift)** mede o quanto o conteúdo se desloca sozinho
durante o carregamento.

Você já viu: começa a ler, uma propaganda carrega acima, o texto pula para
baixo. Ou vai clicar num botão e no último instante ele se move — e você clica
em outra coisa.

O limite é **0,1**, numa escala em que zero é perfeito.

A causa quase sempre é a mesma: **espaço não reservado**. A imagem carrega e
empurra tudo, porque ninguém disse ao navegador o tamanho dela antes. É um dos
problemas mais fáceis de resolver e um dos mais comuns de encontrar.

## Como medir o seu site agora

Duas ferramentas gratuitas, e a diferença entre elas importa:

**PageSpeed Insights** (`pagespeed.web.dev`) — cole a URL. Ele mostra dois
blocos: dados de laboratório (simulação) e dados de campo (usuários reais dos
últimos 28 dias). **Olhe os dados de campo.** É o que o Google usa para
ranquear; o laboratório é só diagnóstico.

**Search Console** — na seção "Core Web Vitals", mostra o site inteiro
agrupado por tipo de página. É assim que você descobre que o problema não é
"o site", é "todas as páginas de produto".

## O que dá para fazer sem refazer tudo

Se o seu site está ruim nas três métricas, nem sempre é caso de reconstrução.
Em ordem de retorno sobre esforço:

1. **Comprimir e redimensionar as imagens.** Costuma ser a maior fatia do
   problema, e é a correção mais barata que existe.
2. **Remover script de terceiro que ninguém usa.** Aquele pixel de uma campanha
   de 2022 ainda está lá, custando INP.
3. **Definir largura e altura em todas as imagens.** Resolve a maior parte do
   CLS.
4. **Trocar a hospedagem** se o tempo de resposta do servidor passa de 600ms.

Se depois disso ainda estiver ruim, aí sim o problema é estrutural — e nenhum
plugin de cache resolve.

## O ponto que importa

Core Web Vitals não é assunto de programador. É a medição de quanta gente
desiste antes de ver o que você tem a oferecer.

Um site que carrega em 1 segundo e um que carrega em 4 podem parecer iguais na
apresentação do fornecedor. Não são iguais no extrato do fim do mês.
