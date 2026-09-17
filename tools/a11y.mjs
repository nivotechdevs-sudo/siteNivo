/**
 * Varredura de acessibilidade com axe-core.
 *
 * Roda o axe (o mesmo motor por trás do Lighthouse e das DevTools) em cada
 * página, nos dois temas e em duas larguras. Testa contra WCAG 2.1 e 2.2,
 * níveis A e AA.
 *
 * O que ferramenta automatizada pega e o que não pega — vale ser honesto:
 * o axe detecta de forma confiável contraste, rótulo ausente, ordem de
 * títulos, ARIA inválido e nome acessível faltando. Ele NÃO julga se o texto
 * alternativo de uma imagem é bom, se a ordem de foco faz sentido para
 * a tarefa, nem se a linguagem é compreensível. Isso continua exigindo
 * revisão humana e teste com leitor de tela real.
 *
 * Uso: npm run build && node tools/a11y.mjs
 * Sai com 1 se houver violação — é o que trava o CI.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 4340;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
};

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(req.url.split('?')[0]);
    let file = join(DIST, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(DIST, path.replace(/\/$/, '') + '.html');
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('404');
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    const { globSync } = await import('node:fs');
    return chromium.launch({
      executablePath: globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome')[0],
    });
  }
}

const PAGES = [
  '/',
  '/servicos/',
  '/servicos/criacao-de-sites/',
  '/metodo/',
  '/sobre/',
  '/contato/',
  '/blog/',
  '/blog/core-web-vitals-para-quem-nao-e-programador/',
  '/404.html',
  '/politica-de-privacidade/',
];

const VARIANTES = [
  ['claro · desktop', 1440, 900, 'light'],
  ['escuro · desktop', 1440, 900, 'dark'],
  ['claro · mobile', 390, 844, 'light'],
];

const axeSource = await readFile(axePath, 'utf-8');
const browser = await launch();
const violacoes = [];
let totalVerificacoes = 0;

console.log('\nVARREDURA DE ACESSIBILIDADE (axe-core)');
console.log('Padrão: WCAG 2.1 e 2.2, níveis A e AA\n');

for (const path of PAGES) {
  const problemas = new Map();

  for (const [label, width, height, scheme] of VARIANTES) {
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: scheme,
      locale: 'pt-BR',
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axeSource });

    const result = await page.evaluate(async () =>
      // @ts-ignore — axe é injetado acima
      await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        resultTypes: ['violations'],
      }),
    );

    totalVerificacoes++;

    for (const v of result.violations) {
      const existente = problemas.get(v.id);
      if (existente) existente.variantes.add(label);
      else
        problemas.set(v.id, {
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)),
          variantes: new Set([label]),
        });
    }

    await context.close();
  }

  if (problemas.size === 0) {
    console.log(`  ok   ${path}`);
  } else {
    console.log(`  FALHA ${path}  (${problemas.size} tipo(s) de violação)`);
    for (const p of problemas.values()) {
      violacoes.push({ path, ...p });
      console.log(`         [${p.impact}] ${p.id}: ${p.help}`);
      console.log(`         em: ${[...p.variantes].join(', ')}`);
      for (const node of p.nodes) console.log(`           ${node}`);
    }
  }
}

await browser.close();
server.close();

console.log(
  `\n${PAGES.length} páginas × ${VARIANTES.length} variantes = ${totalVerificacoes} verificações`,
);
console.log(
  violacoes.length === 0
    ? 'Nenhuma violação de WCAG A/AA detectada.\n'
    : `${violacoes.length} violação(ões) a corrigir.\n`,
);

process.exit(violacoes.length > 0 ? 1 : 0);
