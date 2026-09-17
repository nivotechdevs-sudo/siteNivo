// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

import { SITE } from './src/data/site.ts';

/**
 * Astro configuration.
 *
 * `output: 'static'` is deliberate: every page is pre-rendered at build time, so
 * the browser receives finished HTML. That is what keeps LCP low and makes the
 * whole site indexable without JavaScript execution.
 */
export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'always',

  // Emit /servicos/criacao-de-sites/index.html so URLs stay clean and
  // extension-free on any static host.
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  integrations: [
    mdx(),
    sitemap({
      // Legal pages and the post-conversion page carry no search value and
      // would only dilute crawl budget.
      filter: (page) =>
        !page.includes('/obrigado/') &&
        !page.includes('/politica-de-privacidade/') &&
        !page.includes('/termos-de-uso/'),
      i18n: {
        defaultLocale: 'pt-BR',
        locales: { 'pt-BR': 'pt-BR' },
      },
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],

  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },

  image: {
    // Sharp handles AVIF/WebP derivatives at build time.
    responsiveStyles: true,
    layout: 'constrained',
  },

  prefetch: {
    // Only prefetch what the user signals intent for — never blanket-prefetch,
    // which wastes bandwidth on mobile connections.
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: 'lightningcss',
    },
  },

  experimental: {
    clientPrerender: true,
  },
});
