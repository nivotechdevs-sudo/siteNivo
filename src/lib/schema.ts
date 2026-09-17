/**
 * ============================================================================
 * DADOS ESTRUTURADOS (JSON-LD, Schema.org)
 * ============================================================================
 *
 * Construtores tipados em vez de JSON solto espalhado pelas páginas. Três
 * razões concretas:
 *
 *   1. O `@id` de cada entidade fica consistente em todo o site. É isso que
 *      permite ao Google ligar Organization, WebSite e cada página numa única
 *      entidade — em vez de tratá-las como coisas soltas e sem relação.
 *   2. Mudança de dado acontece em um lugar só.
 *   3. O TypeScript pega erro de forma antes do build, não no Rich Results Test.
 *
 * O grafo montado aqui:
 *
 *   Organization  ─┬─► WebSite ──► WebPage ──► BreadcrumbList
 *                  └─► LocalBusiness (SEO local)
 *                      Service (páginas de serviço)
 *                      FAQPage (elegível a rich result)
 *                      Article (posts do blog)
 */

import {
  SITE,
  CONTACT,
  LOCATION,
  SOCIAL,
  absoluteUrl,
  cityLabel,
} from '../data/site';

/** `@id` estáveis. Âncoras do grafo — não mude sem motivo. */
export const IDS = {
  organization: `${SITE.url}/#organization`,
  website: `${SITE.url}/#website`,
  localBusiness: `${SITE.url}/#localbusiness`,
  logo: `${SITE.url}/#logo`,
} as const;

type Json = Record<string, unknown>;

/** Remove chaves vazias — JSON-LD com campo nulo polui a validação. */
function clean<T extends Json>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/* -------------------------------------------------------------------------- */

/**
 * A entidade raiz. Tudo mais aponta para ela.
 * `sameAs` com perfis reais é o principal sinal de desambiguação da marca.
 */
export function organization(): Json {
  return clean({
    '@type': ['Organization', 'ProfessionalService'],
    '@id': IDS.organization,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    slogan: SITE.tagline,
    foundingDate: String(SITE.foundingYear),
    logo: {
      '@type': 'ImageObject',
      '@id': IDS.logo,
      url: absoluteUrl('/brand/nivotech-logo.png'),
      contentUrl: absoluteUrl('/brand/nivotech-logo.png'),
      width: 512,
      height: 512,
      caption: `Logotipo ${SITE.name}`,
    },
    image: { '@id': IDS.logo },
    email: CONTACT.email,
    telephone: `+${CONTACT.whatsapp}`,
    areaServed: {
      '@type': 'Country',
      name: 'Brasil',
    },
    knowsLanguage: ['pt-BR'],
    // Só entra no grafo se houver perfil de verdade cadastrado.
    sameAs: SOCIAL.map((s) => s.url),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: `+${CONTACT.whatsapp}`,
        email: CONTACT.email,
        availableLanguage: ['Portuguese'],
        areaServed: 'BR',
      },
    ],
  });
}

/**
 * LocalBusiness só faz sentido com cidade definida. Sem endereço público,
 * declaramos `areaServed` em vez de inventar um endereço — endereço falso
 * em schema é violação de diretriz do Google, não "otimização".
 */
export function localBusiness(): Json | null {
  if (!LOCATION.city) return null;

  return clean({
    '@type': 'ProfessionalService',
    '@id': IDS.localBusiness,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: { '@id': IDS.logo },
    parentOrganization: { '@id': IDS.organization },
    telephone: `+${CONTACT.whatsapp}`,
    email: CONTACT.email,
    priceRange: '$$',
    address: LOCATION.showAddress
      ? clean({
          '@type': 'PostalAddress',
          streetAddress: LOCATION.street,
          addressLocality: LOCATION.city,
          addressRegion: LOCATION.state,
          postalCode: LOCATION.postalCode,
          addressCountry: LOCATION.country,
        })
      : clean({
          '@type': 'PostalAddress',
          addressLocality: LOCATION.city,
          addressRegion: LOCATION.state,
          addressCountry: LOCATION.country,
        }),
    geo: LOCATION.geo
      ? {
          '@type': 'GeoCoordinates',
          latitude: LOCATION.geo.lat,
          longitude: LOCATION.geo.lng,
        }
      : undefined,
    areaServed: [
      { '@type': 'City', name: LOCATION.city },
      { '@type': 'Country', name: 'Brasil' },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
  });
}

/**
 * WebSite com SearchAction: habilita a sitelinks searchbox quando o site
 * tiver busca interna. Já declarado para quando a busca existir.
 */
export function website(): Json {
  return clean({
    '@type': 'WebSite',
    '@id': IDS.website,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { '@id': IDS.organization },
    inLanguage: SITE.locale,
  });
}

export interface WebPageInput {
  url: string;
  title: string;
  description: string;
  /** ISO 8601. Alimenta o sinal de frescor do conteúdo. */
  dateModified?: string;
  datePublished?: string;
  /** Tipo mais específico melhora o entendimento da página. */
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'FAQPage';
  breadcrumb?: readonly { name: string; url: string }[];
  primaryImage?: string;
}

export function webPage(input: WebPageInput): Json {
  const url = absoluteUrl(input.url);
  return clean({
    '@type': input.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.title,
    description: input.description,
    isPartOf: { '@id': IDS.website },
    about: { '@id': IDS.organization },
    inLanguage: SITE.locale,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    primaryImageOfPage: input.primaryImage
      ? { '@type': 'ImageObject', url: absoluteUrl(input.primaryImage) }
      : undefined,
    breadcrumb: input.breadcrumb?.length
      ? { '@id': `${url}#breadcrumb` }
      : undefined,
  });
}

/**
 * Breadcrumbs. Além do rich result, ajudam o Google a entender a hierarquia
 * do site — e, na SERP, substituem a URL crua por um caminho legível.
 */
export function breadcrumbList(
  pageUrl: string,
  items: readonly { name: string; url: string }[],
): Json {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(pageUrl)}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export interface ServiceInput {
  name: string;
  description: string;
  url: string;
  serviceType: string;
}

export function service(input: ServiceInput): Json {
  return clean({
    '@type': 'Service',
    '@id': `${absoluteUrl(input.url)}#service`,
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url: absoluteUrl(input.url),
    provider: { '@id': IDS.organization },
    areaServed: [
      { '@type': 'Country', name: 'Brasil' },
      ...(LOCATION.city ? [{ '@type': 'City', name: LOCATION.city }] : []),
    ],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: absoluteUrl('/contato/'),
      servicePhone: `+${CONTACT.whatsapp}`,
    },
  });
}

/**
 * FAQPage — um dos poucos rich results ainda amplamente exibidos.
 * Regra do Google: a resposta no schema precisa ser a MESMA que está visível
 * na página. Por isso ambos vêm de `content.ts`, nunca duplicados à mão.
 */
export function faqPage(
  pageUrl: string,
  items: readonly { pergunta: string; resposta: string }[],
): Json {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(pageUrl)}#faq`,
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.pergunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.resposta,
      },
    })),
  };
}

export interface ArticleInput {
  url: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName: string;
  keywords?: readonly string[];
  wordCount?: number;
}

export function article(input: ArticleInput): Json {
  const url = absoluteUrl(input.url);
  return clean({
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: input.headline.slice(0, 110), // limite recomendado pelo Google
    description: input.description,
    url,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      '@type': 'Organization',
      '@id': IDS.organization,
      name: input.authorName,
    },
    publisher: { '@id': IDS.organization },
    isPartOf: { '@id': IDS.website },
    mainEntityOfPage: { '@id': `${url}#webpage` },
    image: input.image
      ? { '@type': 'ImageObject', url: absoluteUrl(input.image) }
      : { '@id': IDS.logo },
    inLanguage: SITE.locale,
    keywords: input.keywords?.join(', '),
    wordCount: input.wordCount,
  });
}

/**
 * Empacota tudo num `@graph` único.
 *
 * Um `<script>` com @graph é melhor que vários scripts soltos: as entidades
 * se referenciam por `@id` e o Google resolve o grafo inteiro de uma vez,
 * em vez de tentar adivinhar que Organization A e Organization B são a
 * mesma empresa.
 */
export function graph(...entities: (Json | null)[]): string {
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': entities.filter((e): e is Json => e !== null),
    },
    null,
    // Sem indentação em produção: o JSON-LD vai inline no HTML e cada
    // espaço é byte transferido em toda página.
    import.meta.env.DEV ? 2 : 0,
  );
}

/** Entidades presentes em todas as páginas. */
export function baseEntities(): (Json | null)[] {
  return [organization(), website(), localBusiness()];
}

/** Rótulo de cidade reexportado para as páginas de SEO local. */
export { cityLabel };
