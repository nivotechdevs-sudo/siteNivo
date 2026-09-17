# NivoTech — site institucional

Site de alta performance construído em **Astro 7 + TypeScript + Tailwind CSS 4**,
com saída totalmente estática.

**Números medidos** (celular, 4G lento, CPU 4× mais lenta, gzip, primeira visita):

| Métrica | Medido | Limite do Google |
| --- | --- | --- |
| LCP (pior página) | **0,90 s** | 2,50 s |
| CLS (todas as páginas) | **0,000** | 0,100 |
| Peso da home | **86,6 KB** | — |
| JavaScript na home | **8,2 KB** (inclui o objeto 3D) | — |
| JavaScript nas demais | **1,3 KB** | — |

A home carrega um objeto 3D em WebGL no hero. Ele custa **5,5 KB
comprimidos** e é carregado depois da primeira pintura — ver
[O objeto 3D do hero](#o-objeto-3d-do-hero).

Reproduza com `npm run build && node tools/measure.mjs`.

---

## Índice

1. [Começando](#começando)
2. [O que falta configurar antes de publicar](#o-que-falta-configurar-antes-de-publicar)
3. [Arquitetura do projeto](#arquitetura-do-projeto)
4. [O objeto 3D do hero](#o-objeto-3d-do-hero)
5. [A cor da marca](#a-cor-da-marca)
6. [Onde mexer em cada coisa](#onde-mexer-em-cada-coisa)
7. [Comandos](#comandos)
8. [Como publicar](#como-publicar)
9. [Depois do lançamento](#depois-do-lançamento)

---

## Começando

Requisitos: **Node 20.11+** (recomendado 22).

```bash
npm install
npm run dev          # http://localhost:4321
```

Para build de produção:

```bash
npm run verify       # tipos + build + auditoria, tudo de uma vez
```

---

## O que falta configurar antes de publicar

Nenhum dado factual da empresa foi inventado neste projeto. Onde faltou
informação, o campo ficou marcado e a seção correspondente simplesmente não
renderiza — o site sobe íntegro, sem nenhum "Cliente Satisfeito — Lorem Ipsum".

Rode a qualquer momento:

```bash
npm run checklist
```

### Bloqueiam o lançamento

| O quê | Onde | Por quê |
| --- | --- | --- |
| Número do WhatsApp | `src/data/site.ts` → `CONTACT.whatsapp` | É a conversão principal; todo CTA aponta para lá |
| Endpoint do formulário | `src/data/site.ts` → `FORM.endpoint` | Sem ele o formulário exibe aviso e não envia |

**Configurando o formulário.** O site é estático, então o formulário precisa de
um receptor externo. As três opções abaixo funcionam sem alterar código —
basta colar a URL em `FORM.endpoint`:

- **[Web3Forms](https://web3forms.com)** — gratuito, sem conta. Crie uma
  chave de acesso e use `https://api.web3forms.com/submit`. Adicione também um
  campo oculto `access_key` no formulário.
- **[Formspree](https://formspree.io)** — plano gratuito com 50 envios/mês.
  Use `https://formspree.io/f/SEU_ID`.
- **Netlify Forms** — se hospedar na Netlify, adicione `data-netlify="true"`
  ao `<form>` em `src/components/sections/ContactForm.astro` e deixe o
  endpoint vazio.

Os domínios do Web3Forms e do Formspree já estão liberados na Content Security
Policy (`public/_headers` e `vercel.json`). Ao usar outro provedor, adicione o
domínio dele em `form-action` e `connect-src`.

### Alto impacto (não bloqueiam, mas mudam muito o resultado)

| O quê | Onde |
| --- | --- |
| Cidade-base real (SEO local) | `src/data/site.ts` → `LOCATION.city` / `state` |
| ID do Google Analytics 4 | `src/data/site.ts` → `ANALYTICS.ga4Id` |
| Token do Search Console | `src/data/site.ts` → `ANALYTICS.googleSiteVerification` |
| Depoimentos de clientes | `src/data/content.ts` → `DEPOIMENTOS` |
| Métricas de resultado | `src/data/content.ts` → `METRICAS` |
| Portfólio | `src/data/content.ts` → `PROJETOS` |
| CNPJ nas páginas legais | `src/pages/politica-de-privacidade.astro`, `termos-de-uso.astro` |

Os arrays de prova social estão **vazios de propósito**. Depoimento e métrica
inventados são risco jurídico (CDC art. 37, publicidade enganosa) e destroem a
confiança no dia em que alguém pedir para falar com o cliente citado. Os
componentes checam `.length` e não renderizam nada enquanto estiverem vazios.
Preencha o array e a seção aparece sozinha — nenhuma alteração de código.

### Antes de publicar as páginas legais

A política de privacidade e os termos de uso descrevem com precisão **o que
este site faz** — quais dados o formulário coleta, qual cookie o analytics usa,
como funciona o consentimento. Isso é factual e verificável no código.

Mas **não são parecer jurídico.** Preencha CNPJ e razão social e passe os dois
textos por um advogado antes de publicar, principalmente se houver tratamento
de dados fora do site (CRM, e-mail marketing, remarketing).

---

## Arquitetura do projeto

```
src/
├─ data/                 ← FONTE ÚNICA DE VERDADE
│  ├─ site.ts            contato, navegação, analytics, pendências
│  └─ content.ts         serviços, método, FAQ, prova social
│
├─ lib/
│  └─ schema.ts          construtores tipados de JSON-LD (Schema.org)
│
├─ layouts/
│  ├─ BaseLayout.astro   <head>, SEO, tema, cabeçalho e rodapé
│  └─ LegalLayout.astro  casca das páginas legais
│
├─ components/
│  ├─ seo/               Seo, JsonLd, Breadcrumbs
│  ├─ layout/            Header, Footer, Analytics
│  ├─ ui/                Button, Icon, Logo, Section, ContourField,
│  │                     VitalsMonitor, ThemeToggle
│  └─ sections/          blocos de página (Hero, Serviços, Método, FAQ…)
│
├─ pages/                rotas (o arquivo define a URL)
├─ content/blog/         posts em Markdown, validados por schema
├─ scripts/
│  ├─ app.ts             JS de todas as páginas (1,3 KB comprimido)
│  └─ hero3d.ts          renderizador WebGL do objeto do hero (5,5 KB)
└─ styles/global.css     sistema de design completo

tools/                   utilitários de build e qualidade
public/                  assets servidos como estão
```

### Por que Astro e não Next.js

Next.js entrega o runtime do React (~90 KB comprimido) mesmo numa página
totalmente estática. Para um site institucional, esse JavaScript não faz
absolutamente nada além de reidratar HTML que já estava pronto — e cobra o
preço em INP e em tempo de bloqueio da thread principal.

Astro envia **zero JavaScript por padrão** e só embarca o que tem interação
real. O resultado é o 1,3 KB da tabela lá em cima, contra os ~90 KB que o
equivalente em Next.js custaria.

Para uma agência que vende performance, isso não é detalhe de implementação:
é o argumento comercial funcionando no próprio site. Qualquer prospecto pode
rodar o PageSpeed no nivotech.com.br e ver.

### Bibliotecas que o projeto deliberadamente NÃO usa

| Descartado | Custo | O que usamos |
| --- | --- | --- |
| Framer Motion / GSAP | 40–120 KB | Transições CSS + `IntersectionObserver` |
| Lenis / Locomotive | 15–30 KB | `scroll-behavior: smooth` nativo |
| Biblioteca de ícones | 30–80 KB | 20 SVGs inline, ~200 bytes cada |
| **Three.js** | ~170 KB | Renderizador WebGL próprio, 5,5 KB |
| reCAPTCHA | ~250 KB | Honeypot + validação de tempo |
| Google Fonts (CDN) | DNS + TLS + bloqueio | Fontes auto-hospedadas e subsetadas |

---

## O objeto 3D do hero

O hero traz uma torre torcida de patamares de vidro — a leitura literal do
nome da marca: níveis que sobem, cada um girado em relação ao anterior.

### Por que não Three.js

O Three.js resolveria isso em 60 linhas e custaria **~170 KB comprimidos** —
mais de duas vezes o peso de toda a home. Para uma agência cujo argumento
comercial é performance, embarcar isso no hero seria contradizer o próprio
discurso na primeira tela.

Em vez disso, `src/scripts/hero3d.ts` tem:

- **geradores de geometria** (retângulo arredondado extrudado com chanfro,
  cilindro, esfera, toro, octaedro) que constroem a malha em tempo de
  execução — nada de arquivo de modelo. O `.obj` exportado da cena original
  tem 6,8 MB, 776 KB comprimido;
- **um renderizador WebGL2** com o subconjunto que esta cena usa: difuso de
  Lambert, especular de Blinn-Phong, fresnel de Schlick simplificado e
  ambiente hemisférico, com ordenação de transparência.

Resultado: **5,5 KB comprimidos**, 20× menos que a biblioteca, e o LCP
subiu 70 ms.

### Quando ele NÃO roda

Todos os guardas correm **antes** do `import()`, então um aparelho que não
deveria rodar a cena não baixa um byte do renderizador:

| Condição | Motivo |
| --- | --- |
| Sem WebGL2 | nada a fazer |
| `saveData` ligado | o usuário pediu para poupar dados |
| Conexão 2G/3G | o renderizador competiria com o conteúdo |
| `deviceMemory < 2 GB` | cena 3D em aparelho fraco trava a rolagem |
| `prefers-reduced-motion` | desenha **um** quadro e para |
| Fora da viewport | o laço para — GPU e bateria não são gastas no que ninguém vê |
| Aba em segundo plano | idem |

Sem o 3D, o hero fica com as camadas de luz em CSS e o texto. Não existe
estado "quebrado" nem buraco vazio: o objeto é um acréscimo, não a base.

---

## A cor da marca

A cor principal é **`hsl(243 95% 69%)` = `#6c65fb`**, um índigo vivo.

Ela aparece na paleta como `--p-brand-500` e é a assinatura visual do site:
o vidro do objeto 3D, os brilhos do hero, as bordas em gradiente, a barra de
progresso e o ponto do item ativo no menu.

**Por que existem dois tons em uso.** O `#6c65fb` dá 4,12:1 sobre o papel
claro — abaixo dos 4,5:1 que a WCAG exige para texto normal. Então:

| Uso | Token | Contraste |
| --- | --- | --- |
| Decoração (brilho, borda, 3D) | `--c-brand-vivid` → 500 | não se aplica |
| Texto e links (tema claro) | `--c-brand` → 600 | 6,19:1 |
| Botão preenchido | `--c-brand-solid` → 600 | 6,46:1 com branco |
| Texto e links (tema escuro) | `--c-brand` → 300 | 9,00:1 |

Assim a cor pedida domina a percepção do site sem que nada fique ilegível —
e é por isso que a auditoria de acessibilidade continua em zero violações.

---

## Onde mexer em cada coisa

| Quero… | Arquivo |
| --- | --- |
| Trocar telefone, e-mail ou endereço | `src/data/site.ts` |
| Mudar o menu | `src/data/site.ts` → `NAV` |
| Editar textos de serviço | `src/data/content.ts` → `SERVICOS` |
| Adicionar um serviço novo | `src/data/content.ts` → `SERVICOS` (a página, o sitemap, o schema e os links internos aparecem sozinhos) |
| Editar o FAQ | `src/data/content.ts` → `FAQ` (alimenta a página **e** o schema, sempre em sincronia) |
| Mudar cores ou tipografia | `src/styles/global.css` → blocos `:root` e `@theme` |
| Escrever um post | criar `.md` em `src/content/blog/` |
| Ajustar as etapas do método | `src/data/content.ts` → `METODO` |

### Sistema de design em duas camadas

```css
/* 1. Paleta crua — valores fixos, não mudam nunca */
--p-brand-600: #1540e6;

/* 2. Token semântico — aponta para a paleta e TROCA no tema escuro */
--c-brand: var(--p-brand-600);
```

Os componentes usam só a camada semântica (`bg-canvas`, `text-ink`,
`border-line`). Por isso o tema escuro custa **uma redefinição de variáveis**,
não um `dark:` duplicado em cada classe — e nenhum componente fica para trás
quando o tema muda.

### Fontes

Inter e Sora são auto-hospedadas e otimizadas por `tools/subset-fonts.py`, que
faz duas coisas em sequência:

1. **Instanciação parcial do eixo** — recorta a faixa de peso variável para
   só o que o design usa (Inter 400–800, Sora 600–800). É aqui que mora a
   maior economia: os deltas de interpolação dos pesos extremos são a maior
   parte do arquivo.
2. **Subsetting de glifos** — mantém apenas os caracteres do português e a
   pontuação tipográfica usada.

Resultado: **80,0 KB → 46,2 KB (−42 %)**, com o eixo variável intacto na faixa
útil.

Os `.woff2` gerados são versionados, então o build normal **não** depende de
Python. Rode `npm run fonts` apenas ao trocar de fonte ou de pesos.

---

## Comandos

```bash
npm run dev           # servidor de desenvolvimento
npm run build         # build de produção em dist/
npm run preview       # serve o build localmente
npm run check         # verificação de tipos (astro check)

npm run verify        # tipos + build + todos os testes — rode antes de publicar
npm test              # auditoria + acessibilidade + interações

npm run audit         # SEO e estrutura do HTML gerado
npm run a11y          # axe-core, WCAG 2.2 AA, em 10 páginas × 3 variantes
npm run interactions  # teclado, foco, formulário, tema e degradação sem JS
npm run measure       # Core Web Vitals com throttling de celular

npm run checklist     # o que ainda falta configurar
npm run shots         # capturas de tela de todas as páginas
npm run preview:paths # cópia com caminhos relativos, para hospedar sob prefixo
npm run fonts         # regenera as fontes subsetadas (requer Python)
npm run assets        # regenera ícones e imagens sociais
```

As três verificações de `npm test` são **bloqueantes no CI**.

### `npm run audit` — SEO e estrutura

Roda sobre o HTML gerado e pega o que **não quebra o build e não aparece no
navegador** — só aparece no Search Console semanas depois:

- title ou description duplicados entre páginas
- title acima de 65 caracteres (o Google reescreve)
- canonical ausente ou relativo
- mais de um `<h1>`, ou nenhum
- hierarquia de títulos pulando nível (h2 → h4)
- `<img>` sem `alt`
- link ou botão sem nome acessível
- JSON-LD com sintaxe inválida
- link interno apontando para página inexistente
- placeholders `[PREENCHER` esquecidos

### `npm run a11y` — acessibilidade

Roda o axe-core (o mesmo motor do Lighthouse e das DevTools) em 10 páginas,
nos dois temas e em duas larguras — 30 verificações contra WCAG 2.1 e 2.2,
níveis A e AA. **Estado atual: zero violações.**

Vale ser honesto sobre o limite: ferramenta automatizada detecta com confiança
contraste, rótulo ausente, ordem de títulos e ARIA inválido. Ela **não** julga
se um texto alternativo é bom, se a ordem de foco faz sentido para a tarefa,
nem se a linguagem é compreensível. Isso continua exigindo revisão humana e
teste com leitor de tela real.

### `npm run preview:paths` — hospedar sob um prefixo de caminho

O site de produção usa caminhos absolutos (`/assets/...`, `/servicos/`). É o
correto para um domínio próprio: caminho absoluto é imune à profundidade da
página.

Mas um ambiente de **pré-visualização** costuma servir o site sob um prefixo
(`/preview/abc123/`). Ali o caminho absoluto sai do prefixo e bate na raiz do
host — 404 em todo CSS, JS e fonte, e a página aparece só com texto e links.

`npm run preview:paths` gera `dist-preview/` com todos os caminhos internos
reescritos para relativos, calculados pela profundidade de cada página. Dois
detalhes que esse script cobre e que é fácil esquecer:

- o `@font-face` **dentro do CSS** também aponta para `/fonts/...` e precisa
  do mesmo tratamento
- diretórios viram `index.html` explícito, para não depender de o host
  resolver índice de diretório

`dist/` (produção) não é alterado.

### `npm run interactions` — o que só quebra em uso

34 verificações sobre o JavaScript próprio do site, que é onde acessibilidade
costuma falhar de um jeito invisível para quem usa mouse:

- o primeiro Tab foca o link "pular para o conteúdo", e ele fica visível
- menu mobile: `aria-expanded` correto, `inert` quando fechado, foco preso
  dentro do painel, Esc fecha e devolve o foco ao botão que abriu
- formulário: resumo de erros com `role="alert"` que recebe foco, campos com
  `aria-invalid`, cada campo ligado à própria mensagem por `aria-describedby`,
  rádios operáveis por rótulo e por setas do teclado
- FAQ: conteúdo fechado permanece no DOM, portanto indexável
- tema: ciclo sistema → claro → escuro, persistência e aplicação antes da
  primeira pintura (sem flash)
- **degradação sem JavaScript**: com o JS desligado, o H1 renderiza, os CTAs
  funcionam, nenhuma seção fica presa em `opacity: 0` e o formulário continua
  enviável nativamente

Estes testes encontraram três defeitos reais durante o desenvolvimento, entre
eles um `id` duplicado que deixava o alternador de tema do menu mobile sem
efeito — algo que nenhuma inspeção visual pegaria.

---

## Como publicar

O build gera HTML estático em `dist/`. Funciona em qualquer host de arquivos.

### Vercel (recomendado)

1. Importe o repositório em [vercel.com/new](https://vercel.com/new)
2. O `vercel.json` já define build, saída, cabeçalhos de segurança e cache
3. Em **Settings → Domains**, aponte `nivotech.com.br`

### Netlify

1. Importe o repositório em [app.netlify.com](https://app.netlify.com)
2. `netlify.toml` e `public/_headers` já estão configurados
3. Adicione os redirecionamentos do site antigo em `netlify.toml` (veja abaixo)

### Cloudflare Pages

1. Crie o projeto apontando para o repositório
2. Build: `npm run build` · Saída: `dist`
3. `public/_headers` é lido automaticamente

### Passo crítico: redirecionamentos do site antigo

**Este é o passo que a maioria das migrações pula, e é o que faz empresas
perderem tráfego orgânico da noite para o dia.** Toda URL do site antigo que
já recebe visita precisa de um 301 para o endereço novo.

Levante a lista **antes** de trocar o site:

1. Search Console → Desempenho → Páginas → exporte as URLs com cliques
2. Analytics → Páginas de destino → exporte as mais acessadas
3. Rode um rastreador (Screaming Frog, gratuito até 500 URLs) no site atual

Depois adicione cada uma em `netlify.toml` (ou em `redirects` no
`vercel.json`). O arquivo já tem exemplos comentados.

### Verificação pós-publicação

```
[ ] HTTPS ativo e redirecionando de http://
[ ] www e sem-www resolvem para a mesma versão (escolha uma, 301 na outra)
[ ] https://securityheaders.com → nota A ou A+
[ ] https://pagespeed.web.dev → verde nos três Core Web Vitals
[ ] https://search.google.com/test/rich-results → schema sem erro
[ ] Envie o sitemap no Search Console: /sitemap-index.xml
[ ] Teste o formulário de ponta a ponta e confirme que o e-mail chega
[ ] Teste um CTA de WhatsApp no celular, não só no desktop
[ ] Confirme que a 404 devolve status 404 (não 200)
```

---

## Depois do lançamento

### Primeira semana

- **Search Console** — adicione a propriedade, verifique com a meta tag
  (`ANALYTICS.googleSiteVerification`) e envie `/sitemap-index.xml`. Use
  "Inspeção de URL" para indexar a home e as páginas de serviço imediatamente,
  em vez de esperar o rastreio natural.
- **Analytics** — crie a propriedade GA4, cole o ID e configure a conversão:
  evento `page_view` com `page_location` contendo `/obrigado/`. Marque como
  "evento principal".
- **Confirme o consentimento** — abra o site numa janela anônima e verifique
  que nenhum cookie `_ga` aparece antes de você clicar em "Aceitar".

### Rotina mensal

| Onde | O que olhar |
| --- | --- |
| Search Console → Desempenho | quais buscas trazem impressão sem clique (title fraco) e quais trazem clique (dobre a aposta) |
| Search Console → Core Web Vitals | dados de campo, não de laboratório — é o que o Google usa |
| Search Console → Indexação | páginas descobertas mas não indexadas |
| GA4 → Aquisição | de onde vem o tráfego que converte |
| GA4 → evento `cta_click` | qual CTA é clicado e em qual página |

O rastreio de CTA já está implementado: todo botão tem `data-cta` e o
`Analytics.astro` dispara o evento por delegação. Nada a configurar.

### As três coisas de maior retorno

1. **Portfólio com casos reais.** É a maior lacuna do site hoje. Para serviço
   de ticket alto, caso concreto vale mais que qualquer argumento escrito.
2. **Foto e trajetória na página "sobre".** O Google usa essa página como sinal
   de E-E-A-T, e pessoas compram de pessoas. Há um ponto de expansão marcado
   no código.
3. **Um artigo por mês no blog.** A estrutura está pronta e cada post é uma
   porta de entrada nova para busca informacional.

---

## Decisões que valem registrar

**Todas as interações de rolagem usam `animation-timeline` nativo onde
existe.** A barra de progresso no cabeçalho, a linha que preenche a timeline
do método e o parallax das camadas de fundo são resolvidos pelo navegador no
compositor: nenhum listener de rolagem, nenhum trabalho por quadro na thread
principal. É a diferença entre uma interação de rolagem que custa zero e uma
que derruba o INP. A rotação do objeto 3D usa `IntersectionObserver` com
vários limiares pelo mesmo motivo.

**Nada acima da dobra tem animação de entrada.** Animar o hero atrasaria o LCP
em centenas de milissegundos, porque o navegador pinta o elemento com
`opacity: 0`. A textura de fundo anima; o conteúdo não.

**Nenhum conteúdo depende de JavaScript para existir.** Se `app.ts` falhar ao
carregar, o site continua legível, navegável e convertendo. A classe que ativa
as animações de entrada só é adicionada ao `<html>` **depois** de o JS
confirmar suporte a `IntersectionObserver` — sem isso, um erro de script
deixaria o conteúdo invisível para sempre.

**O FAQ usa `<details>`/`<summary>` nativos.** Já vêm com teclado e leitor de
tela corretos em todos os navegadores, e o conteúdo fechado continua no DOM,
portanto indexável. Acordeão feito com `div` precisa reimplementar tudo isso —
e quase sempre reimplementa errado.

**Sem captcha.** reCAPTCHA custa ~250 KB de JavaScript de terceiro, prejudica
o INP, é hostil à acessibilidade e envia dados dos visitantes ao Google. O
honeypot mais a validação de tempo mínimo bloqueiam a esmagadora maioria dos
bots genéricos, a custo zero.

---

## Licença

Código e conteúdo © NivoTech. Todos os direitos reservados.
