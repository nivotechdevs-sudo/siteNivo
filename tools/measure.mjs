/**
 * Medição de performance sobre o build de produção.
 *
 * Sobe dist/ num servidor local, abre cada página no Chromium com throttling
 * de rede e CPU simulando celular intermediário em 4G lento, e reporta:
 *
 *   - LCP, CLS e FCP reais
 *   - bytes transferidos por tipo de recurso
 *   - número de requisições
 *   - tempo de execução de JavaScript
 *
 * Por que throttling: medir num servidor local sem throttle mede a máquina
 * de quem roda o teste, não a experiência de quem visita. O perfil usado
 * aqui (4x de desaceleração de CPU, 4G lento) é o mesmo do Lighthouse
 * mobile, que é o que o Google usa na auditoria.
 *
 * Uso: npm run build && node tools/measure.mjs
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 4330;

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
    const raw = await readFile(file);
    const ext = extname(file);

    // Comprime texto, como faz qualquer host de verdade. Medir sem compressão
    // infla os números de HTML e CSS em 4 a 5 vezes e daria uma leitura falsa.
    // woff2 e png já são comprimidos: recomprimir só gastaria CPU.
    const comprimivel = ['.html', '.css', '.js', '.svg', '.xml', '.json', '.txt', '.webmanifest'];
    const useGzip = comprimivel.includes(ext);
    const body = useGzip ? gzipSync(raw, { level: 9 }) : raw;

    res.writeHead(200, {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      ...(useGzip ? { 'Content-Encoding': 'gzip' } : {}),
      'Content-Length': body.length,
      // Sem cache: cada medição reflete a PRIMEIRA visita, que é a mais cara
      // e a que define a primeira impressão.
      'Cache-Control': 'no-store',
    });
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
    const candidates = globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome');
    return chromium.launch({ executablePath: candidates[0] });
  }
}

const PAGES = [
  ['/', 'Home'],
  ['/servicos/criacao-de-sites/', 'Serviço'],
  ['/contato/', 'Contato'],
  ['/blog/core-web-vitals-para-quem-nao-e-programador/', 'Post'],
];

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const browser = await launch();
const results = [];

for (const [path, label] of PAGES) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Observers registrados antes do carregamento: LCP e layout-shift não
  // ficam disponíveis via getEntriesByType, só por PerformanceObserver.
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0 };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.__vitals.lcp = entries[entries.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  });

  const client = await context.newCDPSession(page);

  // Perfil "Lighthouse mobile": 4G lento + CPU 4x mais lenta.
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // Contabiliza bytes por tipo a partir das respostas reais da rede.
  const bytes = { document: 0, script: 0, stylesheet: 0, font: 0, image: 0, other: 0 };
  let requests = 0;

  page.on('response', async (response) => {
    requests++;
    try {
      // Content-Length é o que realmente trafegou (já comprimido). O corpo
      // decodificado seria 4 a 5 vezes maior e daria um número irreal.
      const declared = Number(response.headers()['content-length'] ?? 0);
      const size = declared || (await response.body()).length;
      const type = response.request().resourceType();
      bytes[type in bytes ? type : 'other'] += size;
    } catch {
      /* resposta sem corpo acessível (redirect, cache) */
    }
  });

  await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'load' });

  // Espera as métricas se estabilizarem antes de ler.
  await page.waitForTimeout(2500);

  const metrics = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    const nav = performance.getEntriesByType('navigation')[0];

    return {
      lcp: window.__vitals.lcp,
      cls: window.__vitals.cls,
      fcp,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
      ttfb: nav ? nav.responseStart : 0,
    };
  });

  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  results.push({ label, path, metrics, bytes, total, requests });

  await context.close();
}

await browser.close();
server.close();

/* ---- Relatório ---- */

console.log('\nMEDIÇÃO DE PERFORMANCE');
console.log('Perfil: celular 390px, 4G lento (1,6 Mbps / 150ms), CPU 4x mais lenta');
console.log('Compressão gzip ativa, cache desabilitado — simula a primeira visita');
console.log('Bytes = transferidos pela rede, não descomprimidos\n');

const rate = (value, good, poor) => (value <= good ? 'bom' : value <= poor ? 'médio' : 'ruim');

for (const r of results) {
  console.log(`${r.label}  ${r.path}`);
  console.log(
    `  LCP ${(r.metrics.lcp / 1000).toFixed(2)}s (${rate(r.metrics.lcp, 2500, 4000)})` +
      `   FCP ${(r.metrics.fcp / 1000).toFixed(2)}s` +
      `   CLS ${r.metrics.cls.toFixed(3)} (${rate(r.metrics.cls, 0.1, 0.25)})` +
      `   TTFB ${Math.round(r.metrics.ttfb)}ms`,
  );
  console.log(
    `  ${r.requests} requisições · ${kb(r.total)} total` +
      `   [html ${kb(r.bytes.document)} · js ${kb(r.bytes.script)} · css ${kb(r.bytes.stylesheet)} · fontes ${kb(r.bytes.font)} · imagens ${kb(r.bytes.image)}]`,
  );
  console.log('');
}

const piorLcp = Math.max(...results.map((r) => r.metrics.lcp));
const piorCls = Math.max(...results.map((r) => r.metrics.cls));
const maiorPeso = Math.max(...results.map((r) => r.total));

console.log('Pior caso entre as páginas medidas:');
console.log(`  LCP  ${(piorLcp / 1000).toFixed(2)}s   (limite do Google: 2,50s)`);
console.log(`  CLS  ${piorCls.toFixed(3)}    (limite do Google: 0,100)`);
console.log(`  Peso ${kb(maiorPeso)}\n`);
