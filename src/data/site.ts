/**
 * ============================================================================
 * FONTE UNICA DE VERDADE DO SITE
 * ============================================================================
 *
 * Todo dado factual do negocio vive aqui. Nenhum componente inventa informacao.
 *
 * Os campos marcados com `TODO:` precisam ser preenchidos por voce antes do
 * lancamento. Eles estao agrupados no final do arquivo em `PENDENCIAS` para
 * facilitar a conferencia — e o build emite um aviso enquanto houver pendencia.
 *
 * Regra de ouro: se um numero ou nome aparece no site, ele sai daqui. Assim
 * nunca existe metrica inventada perdida dentro de um componente.
 */

/* -------------------------------------------------------------------------- */
/*  Identidade                                                                 */
/* -------------------------------------------------------------------------- */

export const SITE = {
  name: 'NivoTech',
  legalName: 'NivoTech', // TODO: razao social completa (ex.: "NivoTech Ltda")
  /**
   * Usado em canonical, sitemap, Open Graph e JSON-LD.
   * Sem barra no final.
   */
  url: 'https://nivotech.com.br',
  locale: 'pt-BR',
  lang: 'pt',
  /** Posicionamento em uma frase. Aparece no JSON-LD e no OG default. */
  tagline: 'Engenharia de sites de alta conversão',
  /**
   * Descricao institucional curta (155-160 caracteres) usada como fallback
   * de meta description e no schema Organization.
   */
  description:
    'Criamos sites e landing pages de alta conversão com engenharia de performance e SEO. Design premium, carregamento instantâneo e resultado mensurável.',
  /** Ano de fundacao — alimenta o schema e o rodape. */
  foundingYear: 2023, // TODO: confirmar o ano de fundacao real
} as const;

/* -------------------------------------------------------------------------- */
/*  Contato e conversao                                                        */
/* -------------------------------------------------------------------------- */

export const CONTACT = {
  /**
   * Numero do WhatsApp em formato internacional, apenas digitos.
   * Ex.: 5511999999999 (55 = Brasil, 11 = DDD).
   */
  whatsapp: '5500000000000', // TODO: numero real do WhatsApp comercial
  /** Como o numero aparece escrito para humanos. */
  whatsappDisplay: '(00) 00000-0000', // TODO
  /** Mensagem pre-preenchida ao abrir o WhatsApp. */
  whatsappMessage:
    'Olá! Vim pelo site da NivoTech e quero conversar sobre um projeto.',
  email: 'contato@nivotech.com.br', // TODO: confirmar e-mail comercial
  /** Horario de atendimento humano, exibido perto dos CTAs. */
  hours: 'Seg a Sex, 9h às 18h',
  /** Tempo medio de primeira resposta. So use se for verdade — e uma promessa. */
  responseTime: 'até 1 dia útil', // TODO: confirmar o SLA real de resposta
} as const;

/**
 * Endereco. Alimenta o schema LocalBusiness e o SEO local.
 * Se a empresa nao tem endereco publico, mantenha `showAddress: false`:
 * o schema passa a usar apenas `areaServed`, sem endereco fisico — que e a
 * forma correta de fazer SEO local para negocio sem ponto de atendimento.
 */
export const LOCATION = {
  showAddress: false,
  street: '', // TODO: logradouro e numero (se houver atendimento presencial)
  city: 'São Paulo', // TODO: CIDADE-BASE REAL — usada em todo o SEO local
  state: 'SP', // TODO: UF
  postalCode: '', // TODO: CEP
  country: 'BR',
  /** Regioes atendidas — string livre exibida no site e no schema. */
  areaServed: 'Brasil',
  /** Coordenadas para o schema. Deixe null se nao houver endereco publico. */
  geo: null as { lat: number; lng: number } | null,
} as const;

/* -------------------------------------------------------------------------- */
/*  Redes sociais                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Apenas perfis que existem de verdade. Links quebrados no `sameAs` do
 * JSON-LD enfraquecem a validacao da entidade no Google.
 * Comente ou remova a linha do que nao existir.
 */
export const SOCIAL: ReadonlyArray<{ name: string; url: string; label: string }> =
  [
    // TODO: substituir pelos perfis reais e remover os que nao existem
    {
      name: 'Instagram',
      url: 'https://instagram.com/nivotech',
      label: 'NivoTech no Instagram',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/company/nivotech',
      label: 'NivoTech no LinkedIn',
    },
  ];

/* -------------------------------------------------------------------------- */
/*  Analytics e verificacao                                                    */
/* -------------------------------------------------------------------------- */

export const ANALYTICS = {
  /**
   * ID do Google Analytics 4 (formato G-XXXXXXXXXX).
   * Deixe string vazia para nao carregar nada — o site nao faz nenhuma
   * requisicao de terceiro enquanto isso estiver vazio.
   */
  ga4Id: '', // TODO: colar o ID do GA4 quando a propriedade existir
  /** Token de verificacao do Google Search Console (metodo meta tag). */
  googleSiteVerification: '', // TODO: colar o token do Search Console
  /**
   * Respeita consentimento: quando `true`, o GA4 so inicializa apos o usuario
   * aceitar cookies no banner. Obrigatorio para LGPD com analytics.
   */
  requireConsent: true,
} as const;

/* -------------------------------------------------------------------------- */
/*  Navegacao                                                                  */
/* -------------------------------------------------------------------------- */

export interface NavItem {
  label: string;
  href: string;
  /** Descricao curta exibida no menu mobile e no mega-menu. */
  description?: string;
}

export const NAV: ReadonlyArray<NavItem> = [
  {
    label: 'Serviços',
    href: '/servicos/',
    description: 'Sites institucionais e landing pages que convertem',
  },
  {
    label: 'Método',
    href: '/metodo/',
    description: 'Como conduzimos um projeto do briefing ao resultado',
  },
  {
    label: 'Sobre',
    href: '/sobre/',
    description: 'Quem constrói e no que acreditamos',
  },
  {
    label: 'Blog',
    href: '/blog/',
    description: 'Performance, SEO e conversão na prática',
  },
];

export const FOOTER_NAV: ReadonlyArray<{
  title: string;
  items: ReadonlyArray<NavItem>;
}> = [
  {
    title: 'Serviços',
    items: [
      { label: 'Criação de sites', href: '/servicos/criacao-de-sites/' },
      { label: 'Landing pages', href: '/servicos/landing-pages/' },
      { label: 'Todos os serviços', href: '/servicos/' },
    ],
  },
  {
    title: 'Empresa',
    items: [
      { label: 'Método', href: '/metodo/' },
      { label: 'Sobre', href: '/sobre/' },
      { label: 'Blog', href: '/blog/' },
      { label: 'Contato', href: '/contato/' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Política de privacidade', href: '/politica-de-privacidade/' },
      { label: 'Termos de uso', href: '/termos-de-uso/' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Pendencias — checklist de lancamento                                       */
/* -------------------------------------------------------------------------- */

/**
 * Cada item aqui e um dado que EU nao podia inventar. O build imprime este
 * checklist para que nada suba com placeholder.
 */
export const PENDENCIAS: ReadonlyArray<{
  campo: string;
  arquivo: string;
  impacto: 'bloqueia-lancamento' | 'alto' | 'medio';
  nota: string;
}> = [
  {
    campo: 'CONTACT.whatsapp / whatsappDisplay',
    arquivo: 'src/data/site.ts',
    impacto: 'bloqueia-lancamento',
    nota: 'E a conversao principal do site. Sem isso nenhum CTA funciona.',
  },
  {
    campo: 'CONTACT.email',
    arquivo: 'src/data/site.ts',
    impacto: 'bloqueia-lancamento',
    nota: 'Destino do formulario de briefing e do schema de contato.',
  },
  {
    campo: 'LOCATION.city / state',
    arquivo: 'src/data/site.ts',
    impacto: 'alto',
    nota: 'Define todo o SEO local: schema, titles e a pagina de cidade.',
  },
  {
    campo: 'SOCIAL',
    arquivo: 'src/data/site.ts',
    impacto: 'medio',
    nota: 'Perfis reais fortalecem a entidade no Google (sameAs).',
  },
  {
    campo: 'ANALYTICS.ga4Id / googleSiteVerification',
    arquivo: 'src/data/site.ts',
    impacto: 'alto',
    nota: 'Sem isso nao ha medicao de trafego nem de conversao.',
  },
  {
    campo: 'PROVA SOCIAL (depoimentos e clientes)',
    arquivo: 'src/data/content.ts',
    impacto: 'alto',
    nota:
      'Depoimento inventado e risco juridico e de reputacao. A secao so renderiza quando houver dado real.',
  },
  {
    campo: 'METRICAS (numeros de resultado)',
    arquivo: 'src/data/content.ts',
    impacto: 'alto',
    nota:
      'Numeros de resultado precisam ser auditaveis. A secao so renderiza com dados reais.',
  },
  {
    campo: 'FORM_ENDPOINT',
    arquivo: 'src/data/site.ts',
    impacto: 'bloqueia-lancamento',
    nota: 'Endpoint que recebe o formulario de briefing. Ver README.',
  },
  {
    campo: 'SITE.legalName / foundingYear',
    arquivo: 'src/data/site.ts',
    impacto: 'medio',
    nota: 'Usados no schema Organization e no rodape.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Formulario                                                                 */
/* -------------------------------------------------------------------------- */

export const FORM = {
  /**
   * Endpoint que recebe o POST do briefing.
   *
   * O site e estatico, entao o formulario precisa de um receptor externo.
   * Opcoes testadas e recomendadas (ver README para o passo a passo):
   *   - Formspree      https://formspree.io/f/SEU_ID
   *   - Web3Forms      https://api.web3forms.com/submit
   *   - Netlify Forms  (adicione data-netlify="true" no <form>)
   *
   * Enquanto estiver vazio, o formulario degrada com elegancia: mostra um
   * aviso claro e oferece WhatsApp e e-mail como caminho alternativo.
   */
  endpoint: '', // TODO: colar o endpoint do provedor escolhido
  /** Para onde o usuario vai depois do envio (pagina de conversao medida). */
  successUrl: '/obrigado/',
} as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Monta o link do WhatsApp com a mensagem pre-preenchida. */
export function whatsappUrl(message: string = CONTACT.whatsappMessage): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Resolve um caminho relativo para URL absoluta (canonical, OG, JSON-LD). */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).href;
}

/** Cidade formatada "Sao Paulo, SP" — reutilizada em SEO local e schema. */
export function cityLabel(): string {
  return LOCATION.state ? `${LOCATION.city}, ${LOCATION.state}` : LOCATION.city;
}
