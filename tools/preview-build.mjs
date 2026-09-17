/**
 * Build de PRÉ-VISUALIZAÇÃO — caminhos relativos.
 *
 * Por que existe
 * --------------
 * O site de produção usa caminhos absolutos a partir da raiz (`/assets/...`,
 * `/servicos/`). É o correto: o site vive na raiz de um domínio próprio, e
 * caminho absoluto é imune à profundidade da página.
 *
 * Mas um ambiente de pré-visualização serve o site sob um PREFIXO de caminho
 * (algo como `/preview/abc123/`). Ali, `/assets/estilo.css` sai do prefixo e
 * bate na raiz do host — 404 em todo CSS, JS e fonte. A página aparece só
 * com texto e links, sem nenhum estilo.
 *
 * Este script gera uma cópia do build com todos os caminhos internos
 * reescritos para relativos, calculados pela profundidade de cada página.
 * O resultado funciona sob qualquer prefixo, sem saber qual é.
 *
 * Duas conversões, e a segunda é fácil de esquecer:
 *   1. HTML — href e src que começam com "/"
 *   2. CSS  — os @font-face dentro do arquivo de estilo também apontam para
 *             "/fonts/..." e precisam do mesmo tratamento
 *
 * Diretórios viram index.html explícito (`/servicos/` → `servicos/index.html`)
 * para não depender de o host resolver índice de diretório.
 *
 * O build de produção em dist/ NÃO é alterado.
 *
 * Uso: npm run build && node tools/preview-build.mjs
 * Saída: dist-preview/
 */

import { readdir, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'dist');
const OUT = join(ROOT, 'dist-preview');

/** Caminhos que NÃO devem ser reescritos. */
const EXTERNO = /^(https?:|\/\/|mailto:|tel:|data:|#|javascript:)/i;

/**
 * Converte um caminho absoluto do site em relativo, a partir da profundidade
 * da página que o referencia.
 *
 * Exemplos, de dist/servicos/criacao-de-sites/index.html (profundidade 2):
 *   /assets/app.css  →  ../../assets/app.css
 *   /servicos/       →  ../../servicos/index.html
 *   /                →  ../../index.html
 */
function relativizar(caminho, profundidade) {
  if (EXTERNO.test(caminho) || !caminho.startsWith('/')) return null;

  const prefixo = profundidade === 0 ? '' : '../'.repeat(profundidade);

  // A raiz e qualquer diretório viram index.html explícito: assim a
  // navegação não depende de o host resolver índice de diretório.
  let alvo = caminho.slice(1);
  if (alvo === '' || alvo.endsWith('/')) alvo += 'index.html';

  return prefixo + alvo;
}

async function listar(dir) {
  const saida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const completo = join(dir, entrada.name);
    if (entrada.isDirectory()) saida.push(...(await listar(completo)));
    else saida.push(completo);
  }
  return saida;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });

const arquivos = await listar(OUT);
let htmlAlterados = 0;
let cssAlterados = 0;
let referencias = 0;

for (const arquivo of arquivos) {
  const ext = extname(arquivo);
  if (ext !== '.html' && ext !== '.css') continue;

  const rel = relative(OUT, arquivo);
  // Profundidade = quantos diretórios abaixo da raiz o arquivo está.
  const profundidade = rel.split(/[\\/]/).length - 1;

  let conteudo = await readFile(arquivo, 'utf-8');
  let mudou = 0;

  if (ext === '.html') {
    // href e src. `content=` fica de fora de propósito: ali vivem as URLs
    // absolutas de canonical, Open Graph e JSON-LD, que devem apontar para
    // o domínio real e não para a pré-visualização.
    conteudo = conteudo.replace(
      /\b(href|src)=(["'])(\/[^"']*)\2/g,
      (original, atributo, aspas, caminho) => {
        const novo = relativizar(caminho, profundidade);
        if (novo === null) return original;
        mudou++;
        return `${atributo}=${aspas}${novo}${aspas}`;
      },
    );
  } else {
    // CSS: os @font-face apontam para /fonts/... e quebrariam igual.
    conteudo = conteudo.replace(
      /url\((["']?)(\/[^"')]*)\1\)/g,
      (original, aspas, caminho) => {
        const novo = relativizar(caminho, profundidade);
        if (novo === null) return original;
        mudou++;
        return `url(${aspas}${novo}${aspas})`;
      },
    );
  }

  if (mudou > 0) {
    await writeFile(arquivo, conteudo, 'utf-8');
    referencias += mudou;
    if (ext === '.html') htmlAlterados++;
    else cssAlterados++;
  }
}

console.log('\nBuild de pré-visualização (caminhos relativos)\n');
console.log(`  ${htmlAlterados} arquivos HTML reescritos`);
console.log(`  ${cssAlterados} arquivos CSS reescritos`);
console.log(`  ${referencias} referências convertidas para caminho relativo`);
console.log(`\nSaída em dist-preview/ — dist/ (produção) permanece intacto.\n`);
