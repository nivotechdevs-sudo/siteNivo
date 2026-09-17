/**
 * Geração dos assets binários: ícones e imagens sociais (Open Graph).
 *
 * Por que um script e não arquivos soltos no repositório:
 *  - a marca fica definida em UM lugar; mudou a cor, roda de novo
 *  - as variantes ficam consistentes entre si por construção
 *  - o Git guarda o gerador, não dez PNGs que ninguém sabe editar
 *
 * As saídas SÃO versionadas: o build normal (`npm run build`) não depende
 * deste script nem de fontes instaladas no sistema.
 *
 * Uso: node tools/generate-assets.mjs
 * Requisito: as fontes da marca instaladas no sistema (ver README).
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

/* ---- Tokens da marca (espelham src/styles/global.css) ---- */
const INK = '#07090d';
const BRAND = '#2e5cff';
const SIGNAL = '#c8f25c';
const PAPER = '#fbfaf8';
const MUTED = '#8a94a2';

/** Símbolo da marca: três patamares ascendentes. */
const mark = (x, y, scale = 1, onDark = true) => {
  const c = onDark ? '#ffffff' : INK;
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <rect x="0"  y="18" width="7" height="8"  rx="1.8" fill="${c}" opacity=".3"/>
      <rect x="9.5" y="10" width="7" height="16" rx="1.8" fill="${c}" opacity=".6"/>
      <rect x="19" y="0"  width="7" height="26" rx="1.8" fill="${BRAND}"/>
      <circle cx="22.5" cy="3.8" r="1.7" fill="${SIGNAL}"/>
    </g>`;
};

/* -------------------------------------------------------------------------- */
/*  Ícones                                                                     */
/* -------------------------------------------------------------------------- */

const iconSvg = (size, maskable = false) => {
  // Ícone maskable precisa da zona de segurança: o sistema pode recortar
  // até 20% de cada borda em máscaras circulares ou de squircle.
  const pad = maskable ? size * 0.22 : size * 0.16;
  const inner = size - pad * 2;
  const scale = inner / 26;
  const radius = maskable ? 0 : size * 0.22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
    ${mark(pad, pad, scale, true)}
  </svg>`;
};

/* -------------------------------------------------------------------------- */
/*  Open Graph                                                                 */
/* -------------------------------------------------------------------------- */

/** Quebra o título em linhas respeitando um limite de caracteres. */
function wrap(text, max) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Cartão social 1200x630.
 *
 * Contraste alto e fonte grande: a maioria das pessoas vê esta imagem como
 * miniatura no feed ou no WhatsApp, não em tamanho real.
 */
const ogSvg = (title, kicker) => {
  const lines = wrap(title, 24);
  const fontSize = lines.length > 2 ? 62 : 72;
  const lineHeight = fontSize * 1.12;
  // Bloco de título centrado em y=340, com folga suficiente abaixo do
  // rótulo para que a altura de maiúscula da primeira linha não o toque.
  const startY = 340 - ((lines.length - 1) * lineHeight) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#07090d"/>
        <stop offset="55%"  stop-color="#0c1018"/>
        <stop offset="100%" stop-color="#0a1330"/>
      </linearGradient>
      <radialGradient id="glow" cx="78%" cy="18%" r="62%">
        <stop offset="0%"   stop-color="${BRAND}" stop-opacity=".42"/>
        <stop offset="100%" stop-color="${BRAND}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
        <path d="M56 0H0v56" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/>
      </pattern>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>

    <!-- Curvas de nível: eco do motivo da marca. -->
    <g fill="none" stroke="${BRAND}" stroke-opacity=".3">
      <ellipse cx="1010" cy="150" rx="150" ry="96"/>
      <ellipse cx="1010" cy="150" rx="215" ry="138" stroke-opacity=".2"/>
      <ellipse cx="1010" cy="150" rx="285" ry="182" stroke-opacity=".13"/>
      <ellipse cx="1010" cy="150" rx="360" ry="228" stroke-opacity=".08"/>
    </g>
    <circle cx="1010" cy="150" r="5" fill="${SIGNAL}"/>

    <!-- Marca -->
    ${mark(80, 74, 1.5, true)}
    <text x="146" y="103" font-family="Sora800" font-size="30" fill="#ffffff" letter-spacing="-.8">NivoTech</text>

    <!-- Rótulo -->
    <text x="80" y="162" font-family="Inter700" font-size="19" fill="${SIGNAL}" letter-spacing="3.4">${kicker.toUpperCase()}</text>

    <!-- Título -->
    ${lines
      .map(
        (l, i) =>
          `<text x="80" y="${startY + i * lineHeight}" font-family="Sora800" font-size="${fontSize}" fill="#ffffff" letter-spacing="-2.6">${l
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')}</text>`,
      )
      .join('\n    ')}

    <!-- Rodapé -->
    <rect x="80" y="516" width="1040" height="1" fill="#ffffff" fill-opacity=".12"/>
    <text x="80" y="566" font-family="Inter400" font-size="23" fill="${MUTED}">nivotech.com.br</text>
    <text x="1120" y="566" font-family="Inter700" font-size="23" fill="#ffffff" text-anchor="end">Fale com a gente →</text>
  </svg>`;
};

/* -------------------------------------------------------------------------- */

const OG_PAGES = [
  ['default', 'Sites de alta conversão construídos como engenharia', 'Engenharia de presença digital'],
  ['servicos', 'Sites e landing pages que geram negócio', 'Serviços'],
  ['criacao-de-sites', 'Criação de sites profissionais que geram negócio', 'Serviço'],
  ['landing-pages', 'Landing pages de alta conversão para campanhas', 'Serviço'],
  ['metodo', 'Como conduzimos um projeto do briefing ao resultado', 'Método'],
  ['sobre', 'Engenharia, transparência e resultado mensurável', 'Sobre'],
  ['contato', 'Vamos conversar sobre o seu projeto', 'Contato'],
  ['blog', 'Performance, SEO e conversão na prática', 'Blog'],
];

async function main() {
  await mkdir(join(PUBLIC, 'og'), { recursive: true });
  await mkdir(join(PUBLIC, 'brand'), { recursive: true });

  console.log('Ícones');
  for (const [name, size, maskable] of [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['icon-maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, false],
    ['brand/nivotech-logo.png', 512, false],
  ]) {
    const buf = Buffer.from(iconSvg(size, maskable));
    await sharp(buf, { density: 384 })
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(PUBLIC, name));
    console.log(`  ${name} (${size}px)`);
  }

  // favicon.ico: 32px, formato que navegadores antigos ainda pedem na raiz.
  await sharp(Buffer.from(iconSvg(32)), { density: 384 })
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC, 'favicon.ico'));
  console.log('  favicon.ico (32px)');

  console.log('\nImagens sociais (1200x630)');
  for (const [slug, title, kicker] of OG_PAGES) {
    const buf = Buffer.from(ogSvg(title, kicker));
    // Rasteriza em 2x e reduz: o texto fica com antialiasing melhor do que
    // renderizando direto em 1200px. O resize garante a dimensão exata que
    // Open Graph e Twitter Cards esperam.
    await sharp(buf, { density: 144 })
      .resize(1200, 630)
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(join(PUBLIC, 'og', `${slug}.png`));
    console.log(`  og/${slug}.png`);
  }

  console.log('\nPronto.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
