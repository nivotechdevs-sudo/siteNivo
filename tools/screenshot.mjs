/**
 * Captura de tela do site já construído, para revisão visual.
 *
 * Sobe um servidor estático apontando para dist/ e fotografa as páginas em
 * desktop e mobile, nos dois temas. Também coleta erros de console — uma
 * página pode parecer perfeita e estar quebrando JavaScript em silêncio.
 *
 * Uso:
 *   npm run build
 *   node tools/screenshot.mjs                    # páginas principais
 *   SHOT_TARGETS='[["/contato/","contato"]]' node tools/screenshot.mjs
 *
 * `reducedMotion: reduce` é proposital: congela as animações para que duas
 * capturas da mesma página sejam comparáveis.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = process.env.SHOT_OUT || join(ROOT, '.screenshots');
const PORT = 4321;

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
    try {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(await readFile(join(DIST, '404.html')));
    } catch {
      res.writeHead(404);
      res.end('404');
    }
  }
});

const DEFAULT_TARGETS = [
  ['/', 'home'],
  ['/servicos/', 'servicos'],
  ['/servicos/criacao-de-sites/', 'criacao-de-sites'],
  ['/metodo/', 'metodo'],
  ['/sobre/', 'sobre'],
  ['/contato/', 'contato'],
  ['/blog/', 'blog'],
];

const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
];

await mkdir(OUT, { recursive: true });
await new Promise((resolve) => server.listen(PORT, resolve));

const base = `http://127.0.0.1:${PORT}`;
const targets = JSON.parse(process.env.SHOT_TARGETS ?? JSON.stringify(DEFAULT_TARGETS));

/**
 * Resolve o Chromium.
 *
 * O ambiente traz o navegador pré-instalado em PLAYWRIGHT_BROWSERS_PATH, mas
 * a revisão empacotada pode não bater com a que este @playwright espera. Se
 * o caminho padrão falhar, procuramos um binário compatível em disco em vez
 * de baixar 150 MB.
 */
async function launch() {
  try {
    return await chromium.launch();
  } catch {
    const { globSync } = await import('node:fs');
    const candidates = [
      ...globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome'),
      ...globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell'),
    ];
    if (candidates.length === 0) {
      throw new Error('Chromium não encontrado em /opt/pw-browsers.');
    }
    return chromium.launch({ executablePath: candidates[0] });
  }
}

const browser = await launch();

let failures = 0;

for (const [path, name, opts = {}] of targets) {
  for (const [label, width, height] of VIEWPORTS) {
    if (opts.only && opts.only !== label) continue;

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      colorScheme: opts.dark ? 'dark' : 'light',
      reducedMotion: 'reduce',
      locale: 'pt-BR',
    });

    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);

    const file = join(OUT, `${name}-${label}${opts.dark ? '-dark' : ''}.png`);
    await page.screenshot({ path: file, fullPage: opts.full !== false });

    if (errors.length) failures++;
    console.log(
      `  ${file.replace(ROOT + '/', '')}  ${errors.length ? 'ERROS: ' + errors.join(' | ') : 'ok'}`,
    );

    await context.close();
  }
}

await browser.close();
server.close();
process.exit(failures > 0 ? 1 : 0);
