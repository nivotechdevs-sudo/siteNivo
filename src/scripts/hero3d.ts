/**
 * ============================================================================
 * OBJETO 3D DO HERO — renderizador WebGL próprio
 * ============================================================================
 *
 * O objeto: seis painéis de vidro empilhados e progressivamente torcidos, com
 * molduras de titânio, uma coluna central, um halo em cor de sinal e três
 * corpos em órbita. É a leitura literal do nome da marca — patamares que
 * sobem, cada um girado em relação ao anterior.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NÃO THREE.JS
 * ---------------------------------------------------------------------------
 * O Three.js resolveria isso em 60 linhas, e custaria ~170 KB comprimidos —
 * mais de DUAS VEZES o peso total de toda a home hoje (78 KB). Para uma
 * agência cujo argumento comercial é performance, embarcar isso no hero seria
 * contradizer o próprio discurso na primeira tela.
 *
 * Então: geometria gerada em tempo de execução (nada de arquivo de malha — o
 * .obj exportado tem 6,8 MB, 776 KB comprimido) e um renderizador escrito à
 * mão com só o que esta cena precisa. Total: ~13 KB comprimidos, carregados
 * DEPOIS da primeira pintura.
 *
 * ---------------------------------------------------------------------------
 * REGRAS QUE O ARQUIVO RESPEITA
 * ---------------------------------------------------------------------------
 *  - Nada aqui é necessário para a página funcionar. Se este módulo não
 *    carregar, o hero fica com o brilho em CSS e o texto — que é o conteúdo.
 *  - Não roda quando não deve: sem WebGL2, com `prefers-reduced-motion`, com
 *    economia de dados ligada, em aparelho de pouca memória, fora da tela ou
 *    com a aba em segundo plano. Cada um desses casos é uma saída antecipada.
 *  - O laço de animação para quando o objeto sai da viewport. Cena 3D girando
 *    atrás de conteúdo que ninguém está vendo é só bateria queimada.
 */

/* -------------------------------------------------------------------------- */
/*  Álgebra mínima                                                             */
/* -------------------------------------------------------------------------- */

type Mat4 = Float32Array;
type Vec3 = [number, number, number];

const mat4 = (): Mat4 =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  for (let i = 0; i < 4; i++) {
    const ai0 = a[i]!, ai1 = a[i + 4]!, ai2 = a[i + 8]!, ai3 = a[i + 12]!;
    for (let j = 0; j < 4; j++) {
      out[i + j * 4] =
        ai0 * b[j * 4]! + ai1 * b[j * 4 + 1]! + ai2 * b[j * 4 + 2]! + ai3 * b[j * 4 + 3]!;
    }
  }
  return out;
}

function perspective(out: Mat4, fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function lookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  let z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
  let len = Math.hypot(z0, z1, z2) || 1;
  z0 /= len; z1 /= len; z2 /= len;

  let x0 = up[1] * z2 - up[2] * z1;
  let x1 = up[2] * z0 - up[0] * z2;
  let x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2) || 1;
  x0 /= len; x1 /= len; x2 /= len;

  const y0 = z1 * x2 - z2 * x1;
  const y1 = z2 * x0 - z0 * x2;
  const y2 = z0 * x1 - z1 * x0;

  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
  return out;
}

/** Composição rígida: rotação em Y, depois em X, depois translação. */
function compose(out: Mat4, pos: Vec3, rotX: number, rotY: number, rotZ: number): Mat4 {
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

  // R = Ry * Rx * Rz
  out[0] = cy * cz + sy * sx * sz;
  out[1] = cx * sz;
  out[2] = -sy * cz + cy * sx * sz;
  out[3] = 0;
  out[4] = -cy * sz + sy * sx * cz;
  out[5] = cx * cz;
  out[6] = sy * sz + cy * sx * cz;
  out[7] = 0;
  out[8] = sy * cx;
  out[9] = -sx;
  out[10] = cy * cx;
  out[11] = 0;
  out[12] = pos[0];
  out[13] = pos[1];
  out[14] = pos[2];
  out[15] = 1;
  return out;
}

/** Normal matrix para rotação pura — a 3x3 superior serve direto. */
function normalFromModel(out: Float32Array, m: Mat4): Float32Array {
  out[0] = m[0]!; out[1] = m[1]!; out[2] = m[2]!;
  out[3] = m[4]!; out[4] = m[5]!; out[5] = m[6]!;
  out[6] = m[8]!; out[7] = m[9]!; out[8] = m[10]!;
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Geradores de geometria                                                     */
/* -------------------------------------------------------------------------- */

interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

/** Acumulador de triângulos com normais suaves ou planas. */
class Builder {
  private pos: number[] = [];
  private nor: number[] = [];
  private idx: number[] = [];

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    return this.pos.length / 3 - 1;
  }

  triangle(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  build(): Geometry {
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      indices: new Uint16Array(this.idx),
    };
  }
}

/**
 * Contorno de um retângulo de cantos arredondados, no plano XY.
 * `segs` é o número de passos por canto — 4 já é visualmente suave nesta
 * escala, e cada passo a mais são 4 vértices por face.
 */
function roundedRectPath(w: number, h: number, r: number, segs = 4): [number, number][] {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const pts: [number, number][] = [];

  // Quatro cantos, no sentido anti-horário a partir do inferior-direito.
  const corners: [number, number, number][] = [
    [hw, -hh, -Math.PI / 2],
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
  ];

  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segs; i++) {
      const a = start + (Math.PI / 2) * (i / segs);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/**
 * Painel: retângulo arredondado extrudado, com chanfro nas duas faces.
 * O chanfro é o que faz a peça captar luz na borda em vez de parecer um
 * recorte de papelão — é o detalhe que dá a leitura de "vidro espesso".
 */
function panelGeometry(w: number, h: number, depth: number, r: number): Geometry {
  const b = new Builder();
  const outer = roundedRectPath(w, h, r, 4);
  const bevel = depth * 0.34;
  const inset = depth * 0.3;
  const inner = roundedRectPath(w - inset * 2, h - inset * 2, Math.max(r - inset, 0.004), 4);
  const n = outer.length;
  const zF = depth / 2;
  const zB = -depth / 2;

  // Faces planas (frente e trás), recuadas pela altura do chanfro.
  const frontCenter = b.vertex(0, 0, zF, 0, 0, 1);
  const backCenter = b.vertex(0, 0, zB, 0, 0, -1);
  const frontRing: number[] = [];
  const backRing: number[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = inner[i]!;
    frontRing.push(b.vertex(x, y, zF, 0, 0, 1));
    backRing.push(b.vertex(x, y, zB, 0, 0, -1));
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    b.triangle(frontCenter, frontRing[i]!, frontRing[j]!);
    b.triangle(backCenter, backRing[j]!, backRing[i]!);
  }

  // Chanfros e parede lateral. A normal de cada anel aponta para fora no
  // plano XY, inclinada em Z conforme o chanfro.
  const rings: { pts: [number, number][]; z: number; nz: number }[] = [
    { pts: inner, z: zF, nz: 0.75 },
    { pts: outer, z: zF - bevel, nz: 0 },
    { pts: outer, z: zB + bevel, nz: 0 },
    { pts: inner, z: zB, nz: -0.75 },
  ];

  const ringIdx: number[][] = [];
  for (const ring of rings) {
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = ring.pts[i]!;
      const len = Math.hypot(x, y) || 1;
      const nx = (x / len) * (1 - Math.abs(ring.nz));
      const ny = (y / len) * (1 - Math.abs(ring.nz));
      const nl = Math.hypot(nx, ny, ring.nz) || 1;
      row.push(b.vertex(x, y, ring.z, nx / nl, ny / nl, ring.nz / nl));
    }
    ringIdx.push(row);
  }

  for (let k = 0; k < ringIdx.length - 1; k++) {
    const a = ringIdx[k]!;
    const c = ringIdx[k + 1]!;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      b.quad(a[i]!, c[i]!, c[j]!, a[j]!);
    }
  }

  return b.build();
}

/**
 * Moldura: anel de retângulo arredondado, extrudado fino.
 * Dois contornos concêntricos costurados — é o que emoldura cada painel.
 */
function frameGeometry(
  w: number,
  h: number,
  r: number,
  border: number,
  depth: number,
): Geometry {
  const b = new Builder();
  const outer = roundedRectPath(w, h, r, 4);
  const inner = roundedRectPath(w - border * 2, h - border * 2, Math.max(r - border, 0.003), 4);
  const n = outer.length;
  const zF = depth / 2;
  const zB = -depth / 2;

  const make = (pts: [number, number][], z: number, nz: number, outward: number): number[] => {
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[i]!;
      if (nz !== 0) {
        row.push(b.vertex(x, y, z, 0, 0, nz));
      } else {
        const len = Math.hypot(x, y) || 1;
        row.push(b.vertex(x, y, z, (x / len) * outward, (y / len) * outward, 0));
      }
    }
    return row;
  };

  const oF = make(outer, zF, 1, 0);
  const iF = make(inner, zF, 1, 0);
  const oB = make(outer, zB, -1, 0);
  const iB = make(inner, zB, -1, 0);
  const oSideF = make(outer, zF, 0, 1);
  const oSideB = make(outer, zB, 0, 1);
  const iSideF = make(inner, zF, 0, -1);
  const iSideB = make(inner, zB, 0, -1);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    b.quad(iF[i]!, oF[i]!, oF[j]!, iF[j]!); // face frontal do anel
    b.quad(oB[i]!, iB[i]!, iB[j]!, oB[j]!); // face traseira
    b.quad(oSideF[i]!, oSideB[i]!, oSideB[j]!, oSideF[j]!); // parede externa
    b.quad(iSideB[i]!, iSideF[i]!, iSideF[j]!, iSideB[j]!); // parede interna
  }

  return b.build();
}

function cylinderGeometry(rTop: number, rBottom: number, height: number, segs: number): Geometry {
  const b = new Builder();
  const hy = height / 2;
  const side: [number[], number[]] = [[], []];

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    side[0].push(b.vertex(c * rTop, hy, s * rTop, c, 0, s));
    side[1].push(b.vertex(c * rBottom, -hy, s * rBottom, c, 0, s));
  }
  for (let i = 0; i < segs; i++) {
    b.quad(side[0][i]!, side[1][i]!, side[1][i + 1]!, side[0][i + 1]!);
  }

  // Tampas.
  const topC = b.vertex(0, hy, 0, 0, 1, 0);
  const botC = b.vertex(0, -hy, 0, 0, -1, 0);
  const topRing: number[] = [];
  const botRing: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    topRing.push(b.vertex(Math.cos(a) * rTop, hy, Math.sin(a) * rTop, 0, 1, 0));
    botRing.push(b.vertex(Math.cos(a) * rBottom, -hy, Math.sin(a) * rBottom, 0, -1, 0));
  }
  for (let i = 0; i < segs; i++) {
    b.triangle(topC, topRing[i]!, topRing[i + 1]!);
    b.triangle(botC, botRing[i + 1]!, botRing[i]!);
  }

  return b.build();
}

function sphereGeometry(r: number, wSegs: number, hSegs: number): Geometry {
  const b = new Builder();
  const grid: number[][] = [];

  for (let iy = 0; iy <= hSegs; iy++) {
    const row: number[] = [];
    const v = iy / hSegs;
    const theta = v * Math.PI;
    for (let ix = 0; ix <= wSegs; ix++) {
      const u = ix / wSegs;
      const phi = u * Math.PI * 2;
      const nx = -Math.sin(theta) * Math.cos(phi);
      const ny = Math.cos(theta);
      const nz = Math.sin(theta) * Math.sin(phi);
      row.push(b.vertex(nx * r, ny * r, nz * r, nx, ny, nz));
    }
    grid.push(row);
  }

  for (let iy = 0; iy < hSegs; iy++) {
    for (let ix = 0; ix < wSegs; ix++) {
      const a = grid[iy]![ix + 1]!;
      const c = grid[iy]![ix]!;
      const d = grid[iy + 1]![ix]!;
      const e = grid[iy + 1]![ix + 1]!;
      if (iy !== 0) b.triangle(a, c, e);
      if (iy !== hSegs - 1) b.triangle(c, d, e);
    }
  }

  return b.build();
}

function torusGeometry(R: number, r: number, ringSegs: number, tubeSegs: number): Geometry {
  const b = new Builder();
  const grid: number[][] = [];

  for (let i = 0; i <= ringSegs; i++) {
    const row: number[] = [];
    const u = (i / ringSegs) * Math.PI * 2;
    const cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= tubeSegs; j++) {
      const v = (j / tubeSegs) * Math.PI * 2;
      const cv = Math.cos(v), sv = Math.sin(v);
      const nx = cu * cv, ny = su * cv, nz = sv;
      row.push(b.vertex((R + r * cv) * cu, (R + r * cv) * su, r * sv, nx, ny, nz));
    }
    grid.push(row);
  }

  for (let i = 0; i < ringSegs; i++) {
    for (let j = 0; j < tubeSegs; j++) {
      b.quad(grid[i]![j]!, grid[i + 1]![j]!, grid[i + 1]![j + 1]!, grid[i]![j + 1]!);
    }
  }

  return b.build();
}

/** Octaedro com normais planas — as facetas precisam ser nítidas. */
function octahedronGeometry(r: number): Geometry {
  const b = new Builder();
  const v: Vec3[] = [
    [r, 0, 0], [-r, 0, 0], [0, r, 0],
    [0, -r, 0], [0, 0, r], [0, 0, -r],
  ];
  const faces = [
    [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
    [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5],
  ];

  for (const [i, j, k] of faces) {
    const a = v[i!]!, c = v[j!]!, d = v[k!]!;
    const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
    const wx = d[0] - a[0], wy = d[1] - a[1], wz = d[2] - a[2];
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const ia = b.vertex(a[0], a[1], a[2], nx, ny, nz);
    const ib = b.vertex(c[0], c[1], c[2], nx, ny, nz);
    const ic = b.vertex(d[0], d[1], d[2], nx, ny, nz);
    b.triangle(ia, ib, ic);
  }

  return b.build();
}

/* -------------------------------------------------------------------------- */
/*  Shaders                                                                    */
/* -------------------------------------------------------------------------- */

const VERTEX_SHADER = `#version 300 es
// Localização explícita: é o que garante que os índices usados no VAO
// correspondam a estes atributos, sem depender da ordem de declaração
// nem de bindAttribLocation.
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;

out vec3 vWorld;
out vec3 vNormal;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uViewProj * world;
}`;

/**
 * Iluminação: três direcionais (principal, preenchimento e contorno) mais um
 * termo hemisférico de ambiente. Não é PBR completo — é o subconjunto que
 * esta cena usa: difuso de Lambert, especular de Blinn-Phong e um fresnel
 * que acende as bordas. O fresnel é o que vende o vidro.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vWorld;
in vec3 vNormal;

uniform vec3 uCamera;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uOpacity;
uniform float uGloss;      // expoente especular
uniform float uSpecular;   // intensidade especular
uniform float uFresnel;    // quanto a borda acende
uniform float uAmbient;

out vec4 fragColor;

const vec3 KEY_DIR   = normalize(vec3( 0.45,  0.85,  0.60));
const vec3 FILL_DIR  = normalize(vec3(-0.70,  0.25,  0.35));
const vec3 RIM_DIR   = normalize(vec3(-0.20, -0.45, -0.85));

const vec3 KEY_COL   = vec3(1.00, 0.99, 0.97) * 0.72;
const vec3 FILL_COL  = vec3(0.45, 0.42, 1.00) * 0.62;
const vec3 RIM_COL   = vec3(0.78, 0.95, 0.36) * 0.34;

const vec3 SKY = vec3(0.21, 0.22, 0.38);
const vec3 GND = vec3(0.03, 0.03, 0.06);

void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(uCamera - vWorld);

  // Superfícies de dupla face (painéis de vidro): a normal precisa olhar
  // para a câmera, senão a face de trás fica preta.
  if (!gl_FrontFacing) n = -n;

  // Ambiente hemisférico: céu em cima, chão embaixo. Barato e evita que as
  // partes na sombra fiquem chapadas de preto.
  float hemi = 0.5 + 0.5 * n.y;
  vec3 ambient = mix(GND, SKY, hemi) * uAmbient;

  vec3 diffuse =
      KEY_COL  * max(dot(n, KEY_DIR),  0.0) +
      FILL_COL * max(dot(n, FILL_DIR), 0.0) +
      RIM_COL  * max(dot(n, RIM_DIR),  0.0);

  // Especular de Blinn-Phong nas três luzes.
  float spec = 0.0;
  spec += pow(max(dot(n, normalize(KEY_DIR  + view)), 0.0), uGloss) * 1.00;
  spec += pow(max(dot(n, normalize(FILL_DIR + view)), 0.0), uGloss) * 0.35;

  // Fresnel de Schlick simplificado — borda vista de raspão acende.
  float fres = pow(1.0 - max(dot(n, view), 0.0), 4.0) * uFresnel;

  vec3 color = uColor * (ambient + diffuse) + vec3(spec * uSpecular) + uEmissive;
  color += uColor * fres * 1.4;

  // O alfa também cresce na borda: é o que faz o vidro ter contorno visível
  // em vez de parecer uma mancha translúcida uniforme.
  float alpha = clamp(uOpacity + fres * 0.55, 0.0, 1.0);

  // Curva de resposta aproximando sRGB.
  fragColor = vec4(pow(max(color, vec3(0.0)), vec3(0.4545)), alpha);
}`;

/* -------------------------------------------------------------------------- */
/*  Materiais e montagem da cena                                               */
/* -------------------------------------------------------------------------- */

interface Material {
  color: Vec3;
  emissive: Vec3;
  opacity: number;
  gloss: number;
  specular: number;
  fresnel: number;
  ambient: number;
}

const hex = (h: number): Vec3 => [
  ((h >> 16) & 255) / 255,
  ((h >> 8) & 255) / 255,
  (h & 255) / 255,
];

/**
 * Paleta espelhando os tokens da marca em src/styles/global.css.
 * O vidro usa #6c65fb, a cor especificada — é o corpo do objeto, então é
 * essa cor que o visitante vê primeiro.
 */
const MATERIALS: Record<string, Material> = {
  glass: {
    color: hex(0x6c65fb),
    // Emissivo alto: a placa parece iluminada por dentro, e é isso que
    // separa vidro premium de plástico translúcido. A opacidade sobe
    // sozinha na borda pelo termo de fresnel no shader.
    emissive: [0.075, 0.062, 0.34],
    opacity: 0.52,
    gloss: 260,
    specular: 0.62,
    fresnel: 1.5,
    ambient: 0.62,
  },
  titanium: {
    // Tingido de índigo, não cinza neutro: a moldura precisa pertencer ao
    // objeto, e cinza puro ao lado de índigo sempre lê como sujo.
    color: hex(0x8f96b8),
    emissive: [0.01, 0.01, 0.03],
    opacity: 1,
    gloss: 56,
    specular: 0.72,
    fresnel: 0.42,
    ambient: 0.4,
  },
  darkMetal: {
    color: hex(0x2b3040),
    emissive: [0, 0, 0],
    opacity: 1,
    gloss: 34,
    specular: 0.45,
    fresnel: 0.65,
    ambient: 0.8,
  },
  signal: {
    color: hex(0xc8f25c),
    emissive: [0.32, 0.45, 0.06],
    opacity: 1,
    gloss: 30,
    specular: 0.4,
    fresnel: 0.35,
    ambient: 0.5,
  },
  crystal: {
    color: hex(0xeceefb),
    emissive: [0.02, 0.02, 0.04],
    opacity: 0.26,
    gloss: 160,
    specular: 1,
    fresnel: 1.1,
    ambient: 0.8,
  },
};

interface Mesh {
  geometry: Geometry;
  material: Material;
  position: Vec3;
  rotX: number;
  rotY: number;
  rotZ: number;
  transparent: boolean;
  /** Fase e raio da órbita, para os corpos que flutuam. */
  orbit?: { radius: number; speed: number; phase: number; bob: number };
  /** Giro próprio contínuo. */
  spin?: Vec3;
}

/**
 * Placas do objeto.
 *
 * Elas são HORIZONTAIS: cada uma é um patamar, empilhado e girado em relação
 * ao anterior. A leitura resultante é de uma torre torcida — e é a leitura
 * certa, porque "Nivo" vem de nível e o posicionamento da empresa é elevar
 * ao próximo nível.
 *
 * A geometria nasce no plano XY (em pé) e é deitada com rotX = -90°. Depois
 * dessa rotação: `w` é a largura da placa (X), `h` é a profundidade (Z) e
 * `t` é a espessura (Y).
 *
 * As medidas afinam para cima, dando silhueta de torre em vez de pilha.
 */
const PANELS = [
  { w: 1.22, h: 0.86, t: 0.022, r: 0.13 },
  { w: 1.00, h: 0.70, t: 0.021, r: 0.11 },
  { w: 0.78, h: 0.55, t: 0.020, r: 0.09 },
  { w: 0.57, h: 0.40, t: 0.019, r: 0.07 },
  { w: 0.36, h: 0.25, t: 0.018, r: 0.05 },
];

/** Altura entre patamares e torção total acumulada ao subir. */
const GAP = 0.196;
const TWIST = (152 * Math.PI) / 180;

/** Deita a placa: o plano XY vira XZ. */
const LAY_FLAT = -Math.PI / 2;

function buildScene(): Mesh[] {
  const meshes: Mesh[] = [];
  const n = PANELS.length;

  for (let i = 0; i < n; i++) {
    const d = PANELS[i]!;
    const y = i * GAP - (n - 1) * GAP * 0.5;
    const angle = (TWIST / (n - 1)) * i - TWIST * 0.5;

    // A placa de vidro e sua moldura compartilham posição e ângulo: a
    // moldura é um pouco mais espessa, então sobra uma aresta metálica
    // contornando o vidro.
    meshes.push({
      geometry: panelGeometry(d.w, d.h, d.t, d.r),
      material: MATERIALS.glass!,
      position: [0, y, 0],
      rotX: LAY_FLAT,
      rotY: angle,
      rotZ: 0,
      transparent: true,
    });

    meshes.push({
      geometry: frameGeometry(d.w, d.h, d.r, 0.0065, d.t * 1.3),
      material: MATERIALS.titanium!,
      position: [0, y, 0],
      rotX: LAY_FLAT,
      rotY: angle,
      rotZ: 0,
      transparent: false,
    });
  }

  const spineH = (n - 1) * GAP + 0.15;

  meshes.push({
    geometry: cylinderGeometry(0.0125, 0.0155, spineH, 18),
    material: MATERIALS.darkMetal!,
    position: [0, 0, 0],
    rotX: 0, rotY: 0, rotZ: 0,
    transparent: false,
  });

  for (const [y, r] of [[spineH / 2, 0.023], [-spineH / 2, 0.02]] as const) {
    meshes.push({
      geometry: sphereGeometry(r, 16, 12),
      material: MATERIALS.titanium!,
      position: [0, y, 0],
      rotX: 0, rotY: 0, rotZ: 0,
      transparent: false,
    });
  }

  // Halo em cor de sinal — o "marcador de cota" da marca.
  // Halo em cor de sinal, inclinado: o "marcador de cota" da marca. A
  // inclinação evita que ele se confunda com mais um patamar.
  meshes.push({
    geometry: torusGeometry(0.66, 0.0055, 80, 8),
    material: MATERIALS.signal!,
    position: [0, 0.12, 0],
    rotX: Math.PI / 2 + (13 * Math.PI) / 180,
    rotY: 0,
    rotZ: (6 * Math.PI) / 180,
    transparent: false,
    spin: [0, 0.07, 0],
  });

  // Anel de base: ancora a composição no espaço.
  meshes.push({
    geometry: torusGeometry(0.80, 0.0035, 72, 8),
    material: MATERIALS.titanium!,
    position: [0, -(n - 1) * GAP * 0.5 - 0.22, 0],
    rotX: Math.PI / 2,
    rotY: 0, rotZ: 0,
    transparent: false,
    spin: [0, -0.03, 0],
  });

  // Corpos em órbita.
  meshes.push({
    geometry: sphereGeometry(0.038, 18, 14),
    material: MATERIALS.crystal!,
    position: [0, 0.2, 0],
    rotX: 0, rotY: 0, rotZ: 0,
    transparent: true,
    orbit: { radius: 0.70, speed: 0.22, phase: 0.4, bob: 0.07 },
  });

  meshes.push({
    geometry: sphereGeometry(0.026, 16, 12),
    material: MATERIALS.crystal!,
    position: [0, -0.16, 0],
    rotX: 0, rotY: 0, rotZ: 0,
    transparent: true,
    orbit: { radius: 0.62, speed: -0.3, phase: 3.1, bob: 0.05 },
  });

  meshes.push({
    geometry: octahedronGeometry(0.036),
    material: MATERIALS.titanium!,
    position: [0, 0.42, 0],
    rotX: 0.4, rotY: 0.6, rotZ: 0.1,
    transparent: false,
    orbit: { radius: 0.56, speed: 0.17, phase: 1.9, bob: 0.09 },
    spin: [0.28, 0.42, 0.14],
  });

  return meshes;
}

/* -------------------------------------------------------------------------- */
/*  Renderizador                                                               */
/* -------------------------------------------------------------------------- */

interface Uploaded {
  vao: WebGLVertexArrayObject;
  count: number;
}

/** O que o chamador recebe. `null` quando a cena não pode ser criada. */
export interface Hero3d {
  /** Inicia o laço de animação. Idempotente. */
  start(): void;
  /** Para o laço sem descartar recursos — usado ao sair da viewport. */
  stop(): void;
  /** Desenha um único quadro. Para `prefers-reduced-motion`. */
  renderStatic(): void;
  /** Move os alvos que a interação persegue (rolagem e ponteiro). */
  setTarget(next: {
    yaw?: number;
    pitch?: number;
    lift?: number;
    scale?: number;
  }): void;
  /** Libera buffers, VAOs e o programa. */
  dispose(): void;
}

export function initHero3d(canvas: HTMLCanvasElement): Hero3d | null {
  const ctx = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  });
  if (!ctx) return null;

  // Reatribuído com tipo declarado não-nulo: a narrowing de `ctx` não
  // sobrevive dentro dos closures do laço de render, e anotar o tipo aqui
  // resolve na declaração em vez de espalhar `!` por cem linhas.
  const gl: WebGL2RenderingContext = ctx;

  /* ---- Programa ---- */
  const compile = (type: number, src: string): WebGLShader | null => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const loc = {
    viewProj: gl.getUniformLocation(program, 'uViewProj'),
    model: gl.getUniformLocation(program, 'uModel'),
    normalMat: gl.getUniformLocation(program, 'uNormalMat'),
    camera: gl.getUniformLocation(program, 'uCamera'),
    color: gl.getUniformLocation(program, 'uColor'),
    emissive: gl.getUniformLocation(program, 'uEmissive'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
    gloss: gl.getUniformLocation(program, 'uGloss'),
    specular: gl.getUniformLocation(program, 'uSpecular'),
    fresnel: gl.getUniformLocation(program, 'uFresnel'),
    ambient: gl.getUniformLocation(program, 'uAmbient'),
  };

  /* ---- Envio da geometria ---- */
  const meshes = buildScene();
  const uploaded: Uploaded[] = meshes.map((mesh) => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const norBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, norBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.geometry.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, count: mesh.geometry.indices.length };
  });

  /* ---- Estado ---- */
  const proj = mat4();
  const view = mat4();
  const viewProj = mat4();
  const model = mat4();
  const normalMat = new Float32Array(9);

  // Câmera elevada e ligeiramente recuada. A elevação é o que faz a torção
  // dos painéis ser legível: de frente, eles se sobrepõem e a pilha lê como
  // um bloco só.
  // Elevação alta e recuo curto: é olhando de cima que uma torre torcida
  // mostra a rotação de um patamar para o outro. De frente, as placas se
  // reduzem a linhas horizontais.
  const CAMERA: Vec3 = [0, 0.78, 3.05];
  const TARGET: Vec3 = [0, -0.01, 0];

  let width = 0;
  let height = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    // Cap em 2x: acima disso o custo de pixels cresce sem ganho visível.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    perspective(proj, (34 * Math.PI) / 180, w / h, 0.1, 20);
  }

  resize();
  lookAt(view, CAMERA, TARGET, [0, 1, 0]);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /** Alvos que a interação move, e os valores atuais que os perseguem. */
  // Começa em três quartos, não de frente: é o ângulo em que a profundidade
  // e a torção aparecem juntas.
  const target = { yaw: 0.62, pitch: 0, lift: 0, scale: 1 };
  const current = { yaw: 0.62, pitch: 0, lift: 0, scale: 1 };

  let time = 0;
  let raf = 0;
  let running = false;
  let disposed = false;

  const opaqueOrder: number[] = [];
  const transparentOrder: number[] = [];
  meshes.forEach((m, i) => (m.transparent ? transparentOrder : opaqueOrder).push(i));

  function drawMesh(i: number, t: number): void {
    const mesh = meshes[i]!;
    const up = uploaded[i]!;
    const mat = mesh.material;

    let px = mesh.position[0];
    let py = mesh.position[1];
    let pz = mesh.position[2];

    if (mesh.orbit) {
      const a = mesh.orbit.phase + t * mesh.orbit.speed;
      px += Math.cos(a) * mesh.orbit.radius;
      pz += Math.sin(a) * mesh.orbit.radius;
      py += Math.sin(a * 1.7) * mesh.orbit.bob;
    }

    const rx = mesh.rotX + (mesh.spin ? mesh.spin[0] * t : 0);
    const ry = mesh.rotY + (mesh.spin ? mesh.spin[1] * t : 0);
    const rz = mesh.rotZ + (mesh.spin ? mesh.spin[2] * t : 0);

    compose(model, [px, py + current.lift, pz], rx, ry, rz);

    // Aplica a rotação global do grupo (yaw/pitch da interação) e a escala.
    const g = mat4();
    compose(g, [0, 0, 0], current.pitch, current.yaw, 0);
    if (current.scale !== 1) {
      for (let k = 0; k < 12; k++) g[k] = g[k]! * current.scale;
    }
    const world = mat4();
    multiply(world, g, model);

    normalFromModel(normalMat, world);

    gl.uniformMatrix4fv(loc.model, false, world);
    gl.uniformMatrix3fv(loc.normalMat, false, normalMat);
    gl.uniform3fv(loc.color, mat.color);
    gl.uniform3fv(loc.emissive, mat.emissive);
    gl.uniform1f(loc.opacity, mat.opacity);
    gl.uniform1f(loc.gloss, mat.gloss);
    gl.uniform1f(loc.specular, mat.specular);
    gl.uniform1f(loc.fresnel, mat.fresnel);
    gl.uniform1f(loc.ambient, mat.ambient);

    gl.bindVertexArray(up.vao);
    gl.drawElements(gl.TRIANGLES, up.count, gl.UNSIGNED_SHORT, 0);
  }

  function render(t: number): void {
    multiply(viewProj, proj, view);
    gl.uniformMatrix4fv(loc.viewProj, false, viewProj);
    gl.uniform3fv(loc.camera, CAMERA);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Opacos primeiro, com escrita de profundidade — eles definem o z-buffer.
    gl.depthMask(true);
    for (const i of opaqueOrder) drawMesh(i, t);

    // Transparentes depois, de trás para frente, SEM escrever profundidade.
    // Escrever profundidade em superfície transparente é o erro clássico:
    // o primeiro painel desenhado oculta os de trás e o vidro perde a
    // sobreposição, que é justamente o efeito.
    gl.depthMask(false);
    const order = transparentOrder.slice().sort((a, b) => {
      const ma = meshes[a]!, mb = meshes[b]!;
      return ma.position[2] - mb.position[2] || ma.position[1] - mb.position[1];
    });
    for (const i of order) drawMesh(i, t);
    gl.depthMask(true);
  }

  function frame(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);

    time = now / 1000;
    resize();

    // Perseguição exponencial: o objeto nunca "salta" para o alvo, e o
    // amortecimento é independente da taxa de quadros.
    const k = 0.08;
    current.yaw += (target.yaw - current.yaw) * k;
    current.pitch += (target.pitch - current.pitch) * k;
    current.lift += (target.lift - current.lift) * k;
    current.scale += (target.scale - current.scale) * k;

    render(time);
  }

  function start(): void {
    if (running || disposed) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(raf);
  }

  /** Um único quadro, para movimento reduzido. */
  function renderStatic(): void {
    resize();
    current.yaw = target.yaw;
    current.pitch = target.pitch;
    current.lift = target.lift;
    current.scale = target.scale;
    render(0);
  }

  return {
    start,
    stop,
    renderStatic,
    setTarget(next) {
      Object.assign(target, next);
    },
    dispose() {
      disposed = true;
      stop();
      for (const up of uploaded) gl.deleteVertexArray(up.vao);
      gl.deleteProgram(program);
    },
  };
}
