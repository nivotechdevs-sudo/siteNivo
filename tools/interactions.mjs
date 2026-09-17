/**
 * Teste das interações com JavaScript próprio.
 *
 * O axe valida o HTML estático; ele não clica em nada. Este arquivo cobre o
 * que só quebra em uso: foco preso no menu, Esc devolvendo o foco, validação
 * do formulário, acordeão do FAQ e troca de tema.
 *
 * São exatamente os pontos onde JavaScript feito à mão costuma falhar em
 * acessibilidade — e onde a falha é invisível para quem usa mouse.
 *
 * Uso: npm run build && node tools/interactions.mjs
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 4350;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
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

const base = `http://127.0.0.1:${PORT}`;
const browser = await launch();
const falhas = [];

const check = (nome, condicao, detalhe = '') => {
  if (condicao) {
    console.log(`  ok    ${nome}`);
  } else {
    console.log(`  FALHA ${nome}${detalhe ? `  — ${detalhe}` : ''}`);
    falhas.push(nome);
  }
};

console.log('\nTESTE DE INTERAÇÕES\n');

/* -------------------------------------------------------------------------- */
/*  1. Link "pular para o conteúdo"                                            */
/* -------------------------------------------------------------------------- */

console.log('Navegação por teclado');
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  // O primeiro Tab da página precisa cair no skip link.
  await page.keyboard.press('Tab');
  const focado = await page.evaluate(() => document.activeElement?.className ?? '');
  check('primeiro Tab foca o link "pular para o conteúdo"', focado.includes('skip-link'), focado);

  // Ele desliza para dentro da tela; a transição leva 220ms.
  await page.waitForTimeout(350);
  const visivel = await page.evaluate(() => {
    const el = document.querySelector('.skip-link');
    return el ? el.getBoundingClientRect().top >= 0 : false;
  });
  check('skip link fica visível ao receber foco', visivel);

  await page.keyboard.press('Enter');
  const hash = new URL(page.url()).hash;
  check('skip link leva ao conteúdo principal', hash === '#conteudo', page.url());

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  2. Menu mobile                                                             */
/* -------------------------------------------------------------------------- */

console.log('\nMenu mobile');
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  const toggle = page.locator('#menu-toggle');
  const panel = page.locator('#mobile-menu');

  check(
    'painel começa com aria-expanded="false"',
    (await toggle.getAttribute('aria-expanded')) === 'false',
  );

  // `inert` tira o painel fechado da ordem de foco e da árvore de acessibilidade.
  check(
    'painel fechado está inerte',
    await page.evaluate(() => document.getElementById('mobile-menu')?.inert === true),
  );

  await toggle.click();
  await page.waitForTimeout(350);

  check('abrir marca aria-expanded="true"', (await toggle.getAttribute('aria-expanded')) === 'true');
  check('painel aberto fica visível', (await panel.getAttribute('data-open')) === 'true');
  check(
    'foco vai para o primeiro link do painel',
    await page.evaluate(() => document.getElementById('mobile-menu')?.contains(document.activeElement) ?? false),
  );
  check(
    'rolagem do fundo é travada',
    await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'),
  );

  // Foco preso: Shift+Tab a partir do primeiro item precisa ir para o último.
  await page.keyboard.press('Shift+Tab');
  check(
    'foco fica preso dentro do painel',
    await page.evaluate(() => document.getElementById('mobile-menu')?.contains(document.activeElement) ?? false),
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  check('Esc fecha o painel', (await toggle.getAttribute('aria-expanded')) === 'false');
  check(
    'Esc devolve o foco ao botão que abriu',
    await page.evaluate(() => document.activeElement?.id === 'menu-toggle'),
  );
  check(
    'rolagem do fundo é liberada',
    await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden'),
  );

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  3. Formulário                                                              */
/* -------------------------------------------------------------------------- */

console.log('\nFormulário de briefing');
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + '/contato/', { waitUntil: 'networkidle' });

  // Sem endpoint configurado o botão fica desabilitado, então disparamos o
  // submit direto para exercitar a validação.
  await page.evaluate(() => {
    const form = document.querySelector('[data-form]');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  await page.waitForTimeout(250);

  const resumo = page.locator('#form-errors');
  check('envio vazio exibe o resumo de erros', await resumo.isVisible());
  check(
    'resumo de erros tem role="alert"',
    (await resumo.getAttribute('role')) === 'alert',
  );
  check(
    'resumo de erros recebe o foco',
    await page.evaluate(() => document.activeElement?.id === 'form-errors'),
  );

  const invalidos = await page.locator('[aria-invalid="true"]').count();
  check('campos obrigatórios ficam aria-invalid', invalidos >= 4, `${invalidos} campos`);

  const descrito = await page.evaluate(() => {
    const campo = document.getElementById('nome');
    const ids = (campo?.getAttribute('aria-describedby') ?? '').split(' ');
    return ids.some((id) => document.getElementById(id)?.textContent?.trim());
  });
  check('campo inválido aponta para a própria mensagem de erro', descrito);

  // Corrigir os campos precisa limpar os erros.
  await page.fill('#nome', 'Maria Souza');
  await page.fill('#email', 'maria@empresa.com.br');
  await page.fill('#mensagem', 'Preciso refazer o site institucional da minha empresa.');
  // O <input> de rádio é visualmente oculto (.sr-only) e o <label> desenhado
  // é que recebe o clique — exatamente como um usuário faz. Clicar no input
  // direto não representa o uso real.
  await page.locator('label.opt').filter({ hasText: 'Refazer o site atual' }).click();
  await page.locator('input[name="consentimento"]').check();

  check(
    'clicar no rótulo marca o rádio oculto',
    await page.evaluate(
      () => document.querySelector('input[name="tipo"][value="refazer"]')?.checked === true,
    ),
  );

  // O rádio precisa ser operável por teclado: as setas navegam o grupo.
  await page.locator('input[name="tipo"][value="refazer"]').focus();
  await page.keyboard.press('ArrowDown');
  check(
    'setas do teclado navegam entre as opções',
    await page.evaluate(() => {
      const marcado = document.querySelector('input[name="tipo"]:checked');
      return marcado?.value !== 'refazer' && marcado !== null;
    }),
  );
  await page.waitForTimeout(200);

  const aindaInvalidos = await page.locator('[aria-invalid="true"]').count();
  check('preencher os campos limpa os erros', aindaInvalidos === 0, `${aindaInvalidos} restantes`);

  // Honeypot precisa existir e estar fora da ordem de tabulação.
  const honeypot = await page.evaluate(() => {
    const el = document.querySelector('[name="site_url"]');
    return el ? { tabindex: el.getAttribute('tabindex'), escondido: el.closest('.hp') !== null } : null;
  });
  check('honeypot presente, escondido e fora do Tab', honeypot?.tabindex === '-1' && honeypot?.escondido);

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  4. FAQ                                                                     */
/* -------------------------------------------------------------------------- */

console.log('\nAcordeão do FAQ');
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  const primeiro = page.locator('details[data-accordion]').first();

  check('acordeão começa fechado', !(await primeiro.evaluate((el) => el.open)));

  // Conteúdo de <details> fechado continua no DOM — é isso que o mantém
  // indexável pelo Google.
  const textoNoDom = await primeiro.evaluate(
    (el) => (el.querySelector('[data-accordion-body] p')?.textContent ?? '').length,
  );
  check('conteúdo fechado permanece no DOM (indexável)', textoNoDom > 50, `${textoNoDom} caracteres`);

  await primeiro.locator('summary').click();
  await page.waitForTimeout(400);
  check('clique abre o acordeão', await primeiro.evaluate((el) => el.open));

  await primeiro.locator('summary').click();
  await page.waitForTimeout(500);
  check('clique novamente fecha', !(await primeiro.evaluate((el) => el.open)));

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  5. Tema                                                                    */
/* -------------------------------------------------------------------------- */

console.log('\nAlternador de tema');
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  // Há duas instâncias do alternador (cabeçalho e menu mobile); no desktop
  // testamos a do cabeçalho. A seleção é por atributo — id duplicado seria
  // HTML inválido.
  const toggle = page.locator('[data-theme-toggle]').first();

  check(
    'existem instâncias do alternador sem id duplicado',
    (await page.locator('[data-theme-toggle]').count()) >= 1 &&
      (await page.locator('#theme-toggle').count()) === 0,
  );

  check(
    'começa em "sistema" (sem data-theme)',
    await page.evaluate(() => !document.documentElement.hasAttribute('data-theme')),
  );

  await toggle.click();
  check(
    'primeiro clique vai para claro',
    (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light',
  );

  await toggle.click();
  check(
    'segundo clique vai para escuro',
    (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark',
  );

  check(
    'escolha é persistida',
    (await page.evaluate(() => localStorage.getItem('nivo-theme'))) === 'dark',
  );

  // Recarregar precisa aplicar o tema ANTES da primeira pintura, sem flash.
  await page.reload({ waitUntil: 'domcontentloaded' });
  check(
    'tema é aplicado no recarregamento, sem flash',
    (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark',
  );

  await toggle.click();
  check(
    'terceiro clique volta para sistema',
    await page.evaluate(
      () => !document.documentElement.hasAttribute('data-theme') && localStorage.getItem('nivo-theme') === null,
    ),
  );

  await context.close();
}

/* -------------------------------------------------------------------------- */
/*  6. Degradação sem JavaScript                                               */
/* -------------------------------------------------------------------------- */

console.log('\nSem JavaScript');
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });

  // A regra mais importante do projeto: nenhum conteúdo depende de JS.
  check('o H1 é renderizado', await page.locator('h1').first().isVisible());
  check('os CTAs do hero são clicáveis', (await page.locator('a[data-cta]').count()) > 0);
  check(
    'todas as seções estão visíveis (nada preso em opacity: 0)',
    await page.evaluate(() => {
      const alvos = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');
      return [...alvos].every((el) => getComputedStyle(el).opacity === '1');
    }),
  );
  check('o FAQ continua legível', (await page.locator('details summary h3').count()) > 0);
  check(
    'o formulário existe e é enviável nativamente',
    await page.goto(base + '/contato/').then(() => page.locator('form#briefing').count().then((n) => n === 1)),
  );

  await context.close();
}

await browser.close();
server.close();

console.log(
  falhas.length === 0
    ? '\nTodas as interações passaram.\n'
    : `\n${falhas.length} falha(s):\n${falhas.map((f) => `  - ${f}`).join('\n')}\n`,
);

process.exit(falhas.length > 0 ? 1 : 0);
