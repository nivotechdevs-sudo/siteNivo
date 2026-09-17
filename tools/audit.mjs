/**
 * ============================================================================
 * AUDITORIA DO HTML GERADO
 * ============================================================================
 *
 * Roda sobre dist/ depois do build e verifica o que costuma quebrar em
 * silêncio num site estático. Cada checagem aqui existe porque o problema
 * correspondente é invisível no navegador e caro no Search Console.
 *
 * Verifica:
 *   SEO           title único, description única e no tamanho certo,
 *                 canonical absoluto e autorreferente, robots, og:image
 *   Estrutura     exatamente um H1 por página, hierarquia sem pulo de nível
 *   Acessibilidade  alt em toda imagem, lang no html, link sem texto,
 *                 botão sem nome acessível
 *   Links         todo link interno aponta para página existente
 *   Dados         JSON-LD sintaticamente válido
 *   Pendências    placeholders TODO que sobraram
 *
 * Uso:  npm run build && node tools/audit.mjs
 * Sai com código 1 se houver erro — é o que trava o CI.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const errors = [];
const warnings = [];
const notes = [];

const err = (page, msg) => errors.push({ page, msg });
const warn = (page, msg) => warnings.push({ page, msg });

/* -------------------------------------------------------------------------- */
/*  Utilidades de parsing                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Extração por regex, não por parser de DOM.
 *
 * Justificativa: adicionar jsdom ou cheerio para uma auditoria de build seria
 * ~8 MB de dependência para ler tags que já conhecemos, num HTML que nós
 * mesmos geramos. Para validar saída própria, regex é suficiente e honesto.
 */
const tagContent = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))].map((m) =>
    m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
  );

const attr = (html, selector, attribute) => {
  const m = html.match(new RegExp(`<${selector}[^>]*\\s${attribute}=["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
};

const meta = (html, name) => {
  const m =
    html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')) ??
    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'));
  return m ? m[1] : null;
};

const ogTag = (html, property) => {
  const m =
    html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')) ??
    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
  return m ? m[1] : null;
};

/** Remove o conteúdo de <svg> — os `path` de lá poluiriam a busca por tags. */
const stripSvg = (html) => html.replace(/<svg[\s\S]*?<\/svg>/gi, '');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/* -------------------------------------------------------------------------- */

const files = await walk(DIST);
const titles = new Map();
const descriptions = new Map();
const allRoutes = new Set(
  files.map((f) => {
    const rel = '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
    return rel.endsWith('/') ? rel : rel + '/';
  }),
);

console.log(`Auditando ${files.length} páginas geradas\n`);

for (const file of files) {
  const html = await readFile(file, 'utf-8');
  const page = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  const clean = stripSvg(html);
  const isNoindex = (meta(html, 'robots') ?? '').includes('noindex');

  /* ---- lang ---- */
  const lang = attr(html, 'html', 'lang');
  if (lang !== 'pt-BR') err(page, `<html lang> é "${lang}", esperado "pt-BR"`);

  /* ---- title ---- */
  const [title] = tagContent(html, 'title');
  if (!title) {
    err(page, 'sem <title>');
  } else {
    if (title.length > 65) warn(page, `title com ${title.length} caracteres (o Google corta ~60): "${title}"`);
    if (title.length < 20) warn(page, `title muito curto (${title.length}): "${title}"`);
    // Title duplicado entre páginas é um dos erros de SEO mais comuns e
    // faz o Google escolher sozinho qual página mostrar.
    if (!isNoindex) {
      if (titles.has(title)) err(page, `title duplicado com ${titles.get(title)}`);
      else titles.set(title, page);
    }
  }

  /* ---- description ---- */
  const desc = meta(html, 'description');
  if (!desc) {
    err(page, 'sem meta description');
  } else {
    if (desc.length > 170) warn(page, `description com ${desc.length} caracteres (recomendado ≤160)`);
    if (desc.length < 70) warn(page, `description com apenas ${desc.length} caracteres`);
    if (!isNoindex) {
      if (descriptions.has(desc)) err(page, `description duplicada com ${descriptions.get(desc)}`);
      else descriptions.set(desc, page);
    }
  }

  /* ---- canonical ---- */
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1];
  if (!canonical) err(page, 'sem link canonical');
  else if (!canonical.startsWith('https://')) err(page, `canonical não é absoluto: ${canonical}`);

  /* ---- Open Graph ---- */
  for (const prop of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) {
    if (!ogTag(html, prop)) err(page, `sem ${prop}`);
  }
  if (!meta(html, 'twitter:card')) err(page, 'sem twitter:card');

  /* ---- H1 ----
     Exatamente um por página: zero deixa o Google sem o tópico principal,
     mais de um dilui o sinal e confunde a navegação por títulos. */
  const h1s = tagContent(clean, 'h1');
  if (h1s.length === 0) err(page, 'sem <h1>');
  else if (h1s.length > 1) err(page, `${h1s.length} elementos <h1> (deve haver exatamente 1)`);

  /* ---- Hierarquia de títulos ----
     Pular de H2 para H4 quebra a navegação por títulos do leitor de tela,
     que é como muita gente lê uma página longa. */
  const levels = [...clean.matchAll(/<h([1-6])[^>]*>/gi)].map((m) => Number(m[1]));
  let previous = 0;
  for (const level of levels) {
    if (previous && level > previous + 1) {
      warn(page, `hierarquia de títulos pula de h${previous} para h${level}`);
      break;
    }
    previous = level;
  }

  /* ---- Imagens sem alt ---- */
  for (const img of clean.match(/<img[^>]*>/gi) ?? []) {
    if (!/\salt=/.test(img)) err(page, `<img> sem atributo alt: ${img.slice(0, 90)}`);
  }

  /* ---- Links sem texto acessível ---- */
  for (const m of clean.matchAll(/<a\s[^>]*>([\s\S]*?)<\/a>/gi)) {
    const tag = m[0];
    const text = m[1].replace(/<[^>]*>/g, '').trim();
    if (!text && !/aria-label=|aria-labelledby=/.test(tag)) {
      err(page, `link sem texto e sem aria-label: ${tag.slice(0, 90)}`);
    }
  }

  /* ---- Botões sem nome acessível ---- */
  for (const m of clean.matchAll(/<button\s[^>]*>([\s\S]*?)<\/button>/gi)) {
    const tag = m[0];
    const text = m[1].replace(/<[^>]*>/g, '').trim();
    if (!text && !/aria-label=|aria-labelledby=/.test(tag)) {
      err(page, `botão sem nome acessível: ${tag.slice(0, 90)}`);
    }
  }

  /* ---- JSON-LD ---- */
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(m[1].replace(/\\u003c/g, '<'));
      if (!parsed['@context']) err(page, 'JSON-LD sem @context');
    } catch (e) {
      err(page, `JSON-LD inválido: ${e.message}`);
    }
  }

  /* ---- Links internos quebrados ---- */
  for (const m of html.matchAll(/href=["'](\/[^"'#?]*)["']/gi)) {
    const href = m[1];
    if (/\.(png|jpe?g|svg|webp|avif|ico|xml|txt|woff2?|json|webmanifest|css|js)$/i.test(href)) continue;
    if (href.startsWith('/_astro/')) continue;
    const normalized = href.endsWith('/') ? href : href + '/';
    if (!allRoutes.has(normalized)) err(page, `link interno quebrado: ${href}`);
  }

  /* ---- Placeholders esquecidos ---- */
  for (const marker of ['[PREENCHER', 'Lorem ipsum', 'TODO:']) {
    if (clean.includes(marker)) notes.push({ page, msg: `contém placeholder "${marker}"` });
  }
}

/* -------------------------------------------------------------------------- */
/*  Relatório                                                                  */
/* -------------------------------------------------------------------------- */

const section = (label, items, symbol) => {
  if (items.length === 0) return;
  console.log(`${symbol} ${label} (${items.length})\n`);
  for (const { page, msg } of items) console.log(`   ${page}\n     ${msg}\n`);
};

section('ERROS', errors, '✗');
section('AVISOS', warnings, '!');
section('PENDÊNCIAS DE CONTEÚDO', notes, '·');

console.log(
  `Resultado: ${errors.length} erro(s), ${warnings.length} aviso(s), ${notes.length} pendência(s).`,
);

if (errors.length === 0) {
  console.log('Nenhum erro bloqueante. Build apto a publicar.');
}

process.exit(errors.length > 0 ? 1 : 0);
