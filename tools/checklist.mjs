/**
 * Checklist de lançamento.
 *
 * Lê os dados de src/data/site.ts e src/data/content.ts e aponta o que ainda
 * está com valor de exemplo. Existe para que nada suba com placeholder — e
 * para que a lista do que falta viva no código, não num documento paralelo
 * que envelhece sem ninguém notar.
 *
 * Uso: npm run checklist
 */

import {
  SITE,
  CONTACT,
  LOCATION,
  ANALYTICS,
  FORM,
  SOCIAL,
  PENDENCIAS,
} from '../src/data/site.ts';
import {
  DEPOIMENTOS,
  CLIENTES,
  METRICAS,
  PROJETOS,
} from '../src/data/content.ts';

const C = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
};

/** Valores que denunciam campo ainda não preenchido. */
const EXEMPLOS = ['5500000000000', '(00) 00000-0000', ''];

const checks = [
  {
    campo: 'WhatsApp',
    ok: !EXEMPLOS.includes(CONTACT.whatsapp) && !EXEMPLOS.includes(CONTACT.whatsappDisplay),
    valor: CONTACT.whatsappDisplay,
    impacto: 'bloqueia',
    nota: 'É a conversão principal: todo CTA do site aponta para cá.',
  },
  {
    campo: 'Endpoint do formulário',
    ok: FORM.endpoint !== '',
    valor: FORM.endpoint || '(vazio)',
    impacto: 'bloqueia',
    nota: 'Sem isso o formulário exibe aviso e não envia. Ver README.',
  },
  {
    campo: 'E-mail comercial',
    ok: CONTACT.email !== '' && !CONTACT.email.includes('exemplo'),
    valor: CONTACT.email,
    impacto: 'alto',
    nota: 'Confirme que a caixa existe e é monitorada de verdade.',
  },
  {
    campo: 'Cidade-base (SEO local)',
    ok: LOCATION.city !== '' && LOCATION.city !== 'São Paulo',
    valor: `${LOCATION.city}/${LOCATION.state}`,
    impacto: 'alto',
    nota: 'São Paulo/SP é o valor de exemplo. Alimenta schema e SEO local.',
  },
  {
    campo: 'Google Analytics 4',
    ok: ANALYTICS.ga4Id !== '',
    valor: ANALYTICS.ga4Id || '(vazio)',
    impacto: 'alto',
    nota: 'Sem isso não há medição de tráfego nem de conversão.',
  },
  {
    campo: 'Verificação do Search Console',
    ok: ANALYTICS.googleSiteVerification !== '',
    valor: ANALYTICS.googleSiteVerification || '(vazio)',
    impacto: 'alto',
    nota: 'Necessário para enviar o sitemap e acompanhar indexação.',
  },
  {
    campo: 'Depoimentos de clientes',
    ok: DEPOIMENTOS.length > 0,
    valor: `${DEPOIMENTOS.length} cadastrado(s)`,
    impacto: 'alto',
    nota: 'A seção só renderiza com dado real — nada foi inventado.',
  },
  {
    campo: 'Métricas de resultado',
    ok: METRICAS.length > 0,
    valor: `${METRICAS.length} cadastrada(s)`,
    impacto: 'alto',
    nota: 'Cada métrica exige fonte de apuração. Número sem fonte não entra.',
  },
  {
    campo: 'Portfólio de projetos',
    ok: PROJETOS.length > 0,
    valor: `${PROJETOS.length} cadastrado(s)`,
    impacto: 'alto',
    nota: 'É a prova social de maior peso para serviço de ticket alto.',
  },
  {
    campo: 'Razão social',
    ok: SITE.legalName !== SITE.name,
    valor: SITE.legalName,
    impacto: 'medio',
    nota: 'Usada no schema Organization e nas páginas legais.',
  },
  {
    campo: 'Perfis sociais',
    ok: SOCIAL.length > 0,
    valor: SOCIAL.map((s) => s.name).join(', ') || '(nenhum)',
    impacto: 'medio',
    nota: 'Confirme que cada URL existe: link morto em sameAs enfraquece a entidade.',
  },
  {
    campo: 'Logos de clientes',
    ok: CLIENTES.length > 0,
    valor: `${CLIENTES.length} cadastrado(s)`,
    impacto: 'medio',
    nota: 'Precisa de autorização de uso da marca.',
  },
];

const ORDEM = { bloqueia: 0, alto: 1, medio: 2 };
const ROTULO = {
  bloqueia: `${C.red}BLOQUEIA LANÇAMENTO${C.reset}`,
  alto: `${C.yellow}ALTO IMPACTO${C.reset}`,
  medio: `${C.dim}IMPACTO MÉDIO${C.reset}`,
};

const pendentes = checks
  .filter((c) => !c.ok)
  .sort((a, b) => ORDEM[a.impacto] - ORDEM[b.impacto]);
const prontos = checks.filter((c) => c.ok);

console.log(`\n${C.bold}CHECKLIST DE LANÇAMENTO — ${SITE.name}${C.reset}\n`);

if (prontos.length > 0) {
  console.log(`${C.green}Configurado (${prontos.length})${C.reset}`);
  for (const c of prontos) {
    console.log(`  ${C.green}OK${C.reset}  ${c.campo}  ${C.dim}${c.valor}${C.reset}`);
  }
  console.log('');
}

if (pendentes.length > 0) {
  console.log(`${C.bold}Pendente (${pendentes.length})${C.reset}\n`);
  for (const c of pendentes) {
    console.log(`  ${C.red}--${C.reset}  ${C.bold}${c.campo}${C.reset}   ${ROTULO[c.impacto]}`);
    console.log(`      atual: ${C.dim}${c.valor}${C.reset}`);
    console.log(`      ${c.nota}\n`);
  }
}

const bloqueantes = pendentes.filter((c) => c.impacto === 'bloqueia');

console.log(
  bloqueantes.length > 0
    ? `${C.red}${C.bold}${bloqueantes.length} item(ns) impedem o lançamento.${C.reset} Edite src/data/site.ts.\n`
    : `${C.green}Nenhum bloqueio de lançamento.${C.reset} Os demais itens melhoram o resultado.\n`,
);

console.log(
  `${C.dim}Detalhe de cada campo em src/data/site.ts (PENDENCIAS: ${PENDENCIAS.length} itens documentados)${C.reset}\n`,
);
