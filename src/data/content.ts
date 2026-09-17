/**
 * ============================================================================
 * CONTEÚDO EDITORIAL — serviços, método, provas, FAQ
 * ============================================================================
 *
 * Separado de `site.ts` porque muda com outra frequência: aqui vive a copy,
 * lá vivem os dados duros do negócio.
 *
 * IMPORTANTE — prova social:
 * `DEPOIMENTOS`, `CLIENTES` e `METRICAS` estão intencionalmente vazios.
 * Não inventei depoimento, logo de cliente nem número de resultado. Os
 * componentes checam `.length` e simplesmente não renderizam a seção quando
 * não há dado — nada quebra, e o site nunca mostra um placeholder falso.
 * Preencha e a seção aparece sozinha.
 */

import { LOCATION } from './site.ts';

/* -------------------------------------------------------------------------- */
/*  Serviços                                                                   */
/* -------------------------------------------------------------------------- */

export interface Servico {
  /** Slug da URL: /servicos/{slug}/ */
  slug: string;
  /** H1 da página de serviço. */
  titulo: string;
  /** Rótulo curto para navegação e cards. */
  nome: string;
  /** Promessa em uma linha — aparece no card e como subtítulo. */
  promessa: string;
  /** Meta description da página do serviço (150-160 caracteres). */
  metaDescription: string;
  /** Palavra-chave primária que a página persegue. */
  keywordPrimaria: string;
  /** Keywords secundárias e variações semânticas cobertas no texto. */
  keywordsSecundarias: readonly string[];
  /** Parágrafo de abertura da página. */
  intro: string;
  /** Para quem é — qualifica e reduz lead ruim. */
  paraQuem: readonly string[];
  /** O que está incluso na entrega. */
  entregaveis: readonly string[];
  /** Ícone (chave do componente Icon). */
  icone: 'layers' | 'target' | 'gauge' | 'search';
}

export const SERVICOS: readonly Servico[] = [
  {
    slug: 'criacao-de-sites',
    nome: 'Criação de sites',
    titulo: 'Criação de sites profissionais que geram negócio',
    promessa:
      'Site institucional construído como produto: rápido, achável no Google e desenhado para virar contato.',
    metaDescription:
      'Criação de sites profissionais com engenharia de performance e SEO. Site rápido, responsivo e estruturado para gerar contatos qualificados.',
    keywordPrimaria: 'criação de sites profissionais',
    keywordsSecundarias: [
      'criação de site institucional',
      'desenvolvimento de sites',
      'site profissional para empresa',
      'site rápido e otimizado',
      'quanto custa criar um site profissional',
    ],
    intro:
      'A maioria dos sites institucionais é um folder caro. Bonito na entrega, invisível no Google e incapaz de explicar por que alguém deveria contratar aquela empresa. Nós tratamos site como produto digital: arquitetura de informação pensada para a dúvida real de quem visita, engenharia de performance para carregar antes que a pessoa desista, e estrutura semântica para o Google entender quem você é.',
    paraQuem: [
      'Empresas que já têm site, mas ele não traz contato nenhum',
      'Negócios que dependem de credibilidade para fechar venda de ticket alto',
      'Quem foi mal atendido por agência e quer processo transparente',
      'Quem precisa de uma base sólida para investir em tráfego depois',
    ],
    entregaveis: [
      'Arquitetura de informação e mapa de páginas orientado a busca',
      'Design de interface exclusivo, sem tema pronto',
      'Desenvolvimento com HTML semântico e acessibilidade',
      'SEO técnico completo: metadados, dados estruturados, sitemap e canonical',
      'Otimização de Core Web Vitals com medição antes e depois',
      'Painel de edição de conteúdo quando o projeto pedir',
      'Configuração de Google Analytics, Search Console e metas de conversão',
      'Documentação de handover e acompanhamento pós-lançamento',
    ],
    icone: 'layers',
  },
  {
    slug: 'landing-pages',
    nome: 'Landing pages',
    titulo: 'Landing pages de alta conversão para campanhas',
    promessa:
      'Página única, uma decisão, zero distração. Construída sobre argumento e medição — não sobre achismo.',
    metaDescription:
      'Criação de landing pages de alta conversão para tráfego pago e lançamentos. Copy estruturada, carregamento instantâneo e medição de resultado.',
    keywordPrimaria: 'landing page de alta conversão',
    keywordsSecundarias: [
      'criação de landing page',
      'landing page para tráfego pago',
      'página de captura de leads',
      'landing page Google Ads',
      'otimização de conversão',
    ],
    intro:
      'Em campanha paga, cada segundo de carregamento e cada dúvida não respondida custam dinheiro real. Uma landing page não é uma página bonita com um formulário no fim: é um argumento construído em ordem, que antecipa objeção, prova o que promete e deixa uma única ação óbvia. E que carrega instantaneamente, porque o clique já foi pago.',
    paraQuem: [
      'Quem investe em Google Ads ou Meta Ads e vê o custo por lead subir',
      'Lançamentos, campanhas sazonais e ofertas com prazo',
      'Quem precisa testar uma oferta nova antes de mudar o site inteiro',
      'Times que querem parar de adivinhar e começar a medir',
    ],
    entregaveis: [
      'Pesquisa de objeções e estruturação do argumento de venda',
      'Copywriting orientado a conversão, escrito para pessoas',
      'Design exclusivo com hierarquia visual focada em uma única ação',
      'Formulário de baixo atrito com validação acessível',
      'Carregamento otimizado para tráfego mobile e conexão lenta',
      'Eventos de conversão configurados e prontos para o Analytics',
      'Estrutura preparada para teste A/B de headline e oferta',
    ],
    icone: 'target',
  },
];

/* -------------------------------------------------------------------------- */
/*  Diferenciais — o "por que nós"                                             */
/* -------------------------------------------------------------------------- */

export interface Diferencial {
  titulo: string;
  texto: string;
  icone: 'gauge' | 'search' | 'eye' | 'shield' | 'accessibility' | 'code';
}

export const DIFERENCIAIS: readonly Diferencial[] = [
  {
    titulo: 'Performance é requisito, não extra',
    texto:
      'Velocidade entra no escopo desde a primeira linha. Medimos Core Web Vitals durante o desenvolvimento, não depois que o problema já está no ar. Site lento perde visitante antes de mostrar o primeiro argumento.',
    icone: 'gauge',
  },
  {
    titulo: 'SEO na fundação, não no acabamento',
    texto:
      'Arquitetura de informação, estrutura semântica e dados estruturados são decisões de projeto. SEO aplicado no fim é remendo; aplicado na fundação, é vantagem que se acumula.',
    icone: 'search',
  },
  {
    titulo: 'Transparência como método',
    texto:
      'Você acompanha o projeto em ambiente real desde o início. Sem caixa-preta, sem “está quase pronto”. Cada etapa tem entregável visível e critério de aceite combinado antes de começar.',
    icone: 'eye',
  },
  {
    titulo: 'Acessível por padrão',
    texto:
      'Contraste adequado, navegação por teclado e compatibilidade com leitor de tela. Acessibilidade amplia seu público, protege juridicamente e, na prática, melhora o SEO junto.',
    icone: 'accessibility',
  },
  {
    titulo: 'Código que você pode levar embora',
    texto:
      'Sem dependência artificial de fornecedor. O código é limpo, documentado e seu. Se um dia outro time assumir, ele vai entender o que encontrou.',
    icone: 'code',
  },
  {
    titulo: 'Resultado que dá para auditar',
    texto:
      'Analytics, Search Console e metas de conversão configurados na entrega. Você enxerga quanta gente chegou, por onde entrou e quantas viraram contato — sem depender de relatório nosso.',
    icone: 'shield',
  },
];

/* -------------------------------------------------------------------------- */
/*  Método — as etapas do projeto                                              */
/* -------------------------------------------------------------------------- */

export interface Etapa {
  numero: string;
  titulo: string;
  resumo: string;
  detalhes: readonly string[];
  /** Entregável concreto que fecha a etapa. */
  entregavel: string;
}

export const METODO: readonly Etapa[] = [
  {
    numero: '01',
    titulo: 'Diagnóstico',
    resumo:
      'Antes de desenhar qualquer tela, entendemos o negócio, o cliente dele e o que já existe.',
    detalhes: [
      'Conversa de briefing sobre modelo de negócio, ticket e ciclo de venda',
      'Auditoria técnica do site atual: performance, SEO, indexação e acessibilidade',
      'Mapeamento das objeções reais que aparecem na venda',
      'Análise dos concorrentes que já ranqueiam para as buscas que importam',
    ],
    entregavel: 'Documento de diagnóstico com prioridades e metas mensuráveis',
  },
  {
    numero: '02',
    titulo: 'Estratégia',
    resumo:
      'Definimos o que o site precisa provar, em que ordem, e por quais buscas ele deve ser encontrado.',
    detalhes: [
      'Pesquisa de palavras-chave por intenção de busca, não por volume bruto',
      'Arquitetura de informação e mapa de páginas',
      'Definição da ação principal e dos pontos de conversão',
      'Roteiro narrativo: o argumento na ordem em que convence',
    ],
    entregavel: 'Mapa do site, plano de palavras-chave e roteiro de conteúdo',
  },
  {
    numero: '03',
    titulo: 'Design',
    resumo:
      'Interface exclusiva, construída sobre um sistema — não sobre telas soltas.',
    detalhes: [
      'Sistema de design com tipografia, escala de espaçamento e cor',
      'Protótipo navegável das telas principais em desktop e mobile',
      'Validação de contraste e áreas de toque ainda no design',
      'Definição das microinterações e do comportamento em rolagem',
    ],
    entregavel: 'Protótipo navegável aprovado e sistema de design documentado',
  },
  {
    numero: '04',
    titulo: 'Engenharia',
    resumo:
      'Desenvolvimento com orçamento de performance definido e ambiente de homologação aberto.',
    detalhes: [
      'HTML semântico, componentização e código versionado',
      'Otimização de imagens, fontes e JavaScript desde o primeiro commit',
      'Orçamento de performance acordado e verificado a cada entrega',
      'Testes em dispositivos reais e em conexão lenta',
    ],
    entregavel: 'Site em ambiente de homologação com relatório de performance',
  },
  {
    numero: '05',
    titulo: 'Lançamento',
    resumo:
      'Publicação com checklist técnico completo e medição funcionando desde o primeiro visitante.',
    detalhes: [
      'Configuração de domínio, HTTPS e cabeçalhos de segurança',
      'Redirecionamentos 301 das URLs antigas para preservar o que já ranqueia',
      'Envio de sitemap e verificação no Google Search Console',
      'Analytics e metas de conversão validados com evento de teste',
    ],
    entregavel: 'Site no ar, indexável e medindo conversão',
  },
  {
    numero: '06',
    titulo: 'Acompanhamento',
    resumo:
      'Lançar é o começo. Os primeiros meses mostram o que os dados não previam.',
    detalhes: [
      'Monitoramento de Core Web Vitals com dados de usuários reais',
      'Acompanhamento de indexação e primeiras posições no Search Console',
      'Ajustes finos sobre o que os dados de comportamento revelarem',
      'Handover documentado para o seu time manter e expandir',
    ],
    entregavel: 'Relatório de primeiros resultados e documentação de handover',
  },
];

/* -------------------------------------------------------------------------- */
/*  Prova social — VAZIO ATÉ HAVER DADO REAL                                   */
/* -------------------------------------------------------------------------- */

export interface Depoimento {
  /** Texto literal do cliente. Nunca editar o sentido. */
  texto: string;
  autor: string;
  cargo: string;
  empresa: string;
  /** Opcional: caminho em /src/assets. */
  foto?: string;
  /** Opcional: link para o caso ou perfil que comprova o depoimento. */
  fonte?: string;
}

/**
 * TODO: adicionar depoimentos reais, com autorização de uso.
 * Enquanto vazio, a seção de depoimentos não é renderizada e a home usa
 * a seção de garantias no lugar — o layout continua íntegro.
 */
export const DEPOIMENTOS: readonly Depoimento[] = [];

export interface Cliente {
  nome: string;
  /** Caminho do logo em /src/assets/clientes/. SVG de preferência. */
  logo: string;
  url?: string;
}

/** TODO: adicionar logos de clientes com autorização de uso da marca. */
export const CLIENTES: readonly Cliente[] = [];

export interface Metrica {
  /** O número em si. Ex.: '2,1s' ou '+180%'. */
  valor: string;
  /** O que o número significa. */
  rotulo: string;
  /** Como o número foi apurado. Obrigatório: número sem fonte é marketing vazio. */
  fonte: string;
}

/**
 * TODO: preencher com métricas auditáveis (ex.: média de LCP dos projetos
 * entregues, medida no PageSpeed Insights).
 * Número de resultado sem apuração é risco de reputação — por isso está vazio.
 */
export const METRICAS: readonly Metrica[] = [];

export interface Projeto {
  slug: string;
  nome: string;
  segmento: string;
  desafio: string;
  resultado: string;
  imagem: string;
  url?: string;
}

/** TODO: adicionar projetos do portfólio com autorização do cliente. */
export const PROJETOS: readonly Projeto[] = [];

/* -------------------------------------------------------------------------- */
/*  Garantias — o que podemos afirmar sem depender de prova de terceiro        */
/* -------------------------------------------------------------------------- */

/**
 * Compromissos verificáveis no próprio processo. Substituem prova social
 * enquanto ela não existe, sem precisar inventar nada.
 */
export const GARANTIAS: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Escopo fechado por escrito',
    texto:
      'Você aprova escopo, prazo e valor antes do primeiro dia de trabalho. Mudança de escopo é conversada e orçada, nunca cobrada de surpresa no fim.',
  },
  {
    titulo: 'Acompanhamento em ambiente real',
    texto:
      'Desde a primeira semana existe um link onde você vê o site de verdade evoluindo. Você não descobre o resultado na entrega.',
  },
  {
    titulo: 'Performance verificada por terceiro',
    texto:
      'A entrega inclui relatório do PageSpeed Insights, do Google. Não é a nossa opinião sobre a velocidade — é a medição de quem define a regra.',
  },
  {
    titulo: 'O projeto é seu',
    texto:
      'Domínio, hospedagem, código e contas de analytics ficam no seu nome. Você pode nos trocar a qualquer momento sem perder nada.',
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ — alimenta a página e o schema FAQPage                                 */
/* -------------------------------------------------------------------------- */

export interface Pergunta {
  pergunta: string;
  /** Texto puro. Vira JSON-LD, então evite HTML aqui. */
  resposta: string;
}

/**
 * Perguntas escritas a partir de dúvidas reais de quem contrata site.
 * Também são as buscas long-tail que trazem tráfego qualificado.
 */
export const FAQ: readonly Pergunta[] = [
  {
    pergunta: 'Quanto custa criar um site profissional?',
    resposta:
      'O valor depende do número de páginas, da profundidade da pesquisa de conteúdo e das integrações necessárias. Por isso orçamos por projeto, depois de entender seu objetivo: um site de cinco páginas para gerar orçamento é um trabalho diferente de um site de trinta páginas competindo por busca orgânica. No briefing inicial você recebe uma faixa de investimento antes de qualquer compromisso.',
  },
  {
    pergunta: 'Quanto tempo leva para o site ficar pronto?',
    resposta:
      'O prazo é definido no diagnóstico e entra no contrato. Ele depende principalmente de duas coisas: a quantidade de páginas e a velocidade com que o conteúdo e as aprovações chegam do seu lado. Projetos travam muito mais por conteúdo pendente do que por desenvolvimento, então combinamos esse fluxo logo no começo.',
  },
  {
    pergunta: 'Meu site vai aparecer no Google?',
    resposta:
      'Entregamos o site tecnicamente pronto para ranquear: estrutura semântica, dados estruturados, sitemap, canonical, velocidade e conteúdo organizado por intenção de busca. Isso é a fundação, e é o que está sob nosso controle. Posição no Google também depende de concorrência, autoridade do domínio e produção de conteúdo ao longo do tempo. Quem garante primeira posição em prazo determinado está vendendo o que não pode entregar.',
  },
  {
    pergunta: 'Vocês fazem apenas o design ou também o desenvolvimento?',
    resposta:
      'Os dois, e é justamente essa a vantagem. Quando design e engenharia são o mesmo time, a decisão visual já nasce considerando o custo de performance. Layout aprovado que depois inviabiliza a velocidade é um problema clássico de projeto dividido entre fornecedores diferentes.',
  },
  {
    pergunta: 'Consigo editar o conteúdo do site sozinho depois?',
    resposta:
      'Sim, quando o projeto pede. Se você publica conteúdo com frequência, entregamos um painel de edição e treinamento de uso. Se o conteúdo é praticamente estável, um site estático custa menos, carrega mais rápido e tem menos superfície de ataque — nesse caso as alterações pontuais entram no acompanhamento.',
  },
  {
    pergunta: 'O que acontece com meu site atual e com o que ele já ranqueia?',
    resposta:
      'Antes da troca, mapeamos as URLs que já recebem tráfego e configuramos redirecionamentos 301 de cada uma para o endereço novo. É o passo que a maioria dos projetos pula e que faz empresas perderem tráfego orgânico da noite para o dia. O conteúdo que já funciona é preservado e melhorado, não descartado.',
  },
  {
    pergunta: 'Vocês atendem empresas de fora da cidade?',
    resposta: `Sim. O processo é remoto de ponta a ponta, com reuniões por vídeo e acompanhamento do projeto em ambiente online, e atendemos ${LOCATION.areaServed}. Na prática, a distância deixou de ser variável: o que importa é a clareza do processo e a frequência da comunicação.`,
  },
  {
    pergunta: 'E depois que o site entra no ar?',
    resposta:
      'O lançamento inclui um período de acompanhamento com monitoramento de performance, indexação e ajustes finos sobre o comportamento real dos visitantes. Depois disso, você pode seguir sozinho — o código e a documentação são seus — ou continuar com a gente em manutenção e evolução contínua.',
  },
];
