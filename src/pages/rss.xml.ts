/**
 * Feed RSS do blog.
 *
 * Vale manter mesmo com RSS "fora de moda": agregadores, leitores e várias
 * ferramentas de monitoramento consomem o feed, e ele é um caminho de
 * descoberta que não depende de algoritmo de rede social.
 *
 * O `<link rel="alternate">` no BaseLayout aponta para cá.
 */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

import { SITE } from '../data/site';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  return rss({
    title: `${SITE.name} — Blog`,
    description:
      'Artigos sobre performance, SEO e conversão, escritos para quem decide.',
    site: context.site ?? SITE.url,
    // `trailingSlash` para bater com a configuração de URL do site: link do
    // feed diferente do canonical confunde agregador e rastreador.
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: [post.data.category],
      author: post.data.author,
    })),
    customData: `<language>pt-BR</language><copyright>© ${new Date().getFullYear()} ${SITE.legalName}</copyright>`,
    stylesheet: false,
  });
}
