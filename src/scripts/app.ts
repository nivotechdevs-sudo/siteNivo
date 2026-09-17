/**
 * ============================================================================
 * JAVASCRIPT DO SITE — módulo único, carregado com `defer`
 * ============================================================================
 *
 * Orçamento: abaixo de 4 KB comprimido. Sem framework, sem biblioteca de
 * animação, sem biblioteca de rolagem.
 *
 * Três princípios que valem para tudo aqui:
 *
 *  1. NADA É OBRIGATÓRIO. Todo recurso é progressivo. Se este arquivo falhar
 *     ao carregar, o site continua legível, navegável e convertendo. Nenhum
 *     conteúdo depende de JS para aparecer.
 *  2. ZERO TRABALHO NO SCROLL. Nenhum listener de `scroll` que force layout.
 *     Onde precisamos reagir à rolagem usamos IntersectionObserver, que roda
 *     fora da thread principal. É o que mantém o INP baixo.
 *  3. ANIMA SÓ `transform` E `opacity`. São as duas propriedades que o
 *     navegador resolve no compositor, sem recalcular layout nem repintar.
 */

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $$ = <T extends Element = Element>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

/* -------------------------------------------------------------------------- */
/*  1. Revelação na rolagem                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Anima elementos ao entrarem na viewport.
 *
 * A classe `js-reveal` no <html> é o contrato: só ela ativa o estado inicial
 * (opacity: 0) no CSS. Ela é adicionada aqui, depois de confirmar que
 * IntersectionObserver existe. Se o JS não rodar, a classe nunca entra e o
 * conteúdo simplesmente aparece — que é o comportamento correto.
 *
 * `unobserve` após revelar: o observer não fica vigiando elemento já animado.
 */
function initReveal(): void {
  if (!('IntersectionObserver' in window)) return;
  if (prefersReducedMotion()) return;

  document.documentElement.classList.add('js-reveal');

  const targets = $$('[data-reveal], [data-reveal-stagger]');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    {
      // Dispara um pouco antes de entrar de fato: a animação termina
      // quando o elemento chega ao campo de visão confortável, em vez de
      // começar só quando já está visível.
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.08,
    },
  );

  for (const el of targets) observer.observe(el);
}

/* -------------------------------------------------------------------------- */
/*  2. Cabeçalho                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Estado "rolou" do cabeçalho (fundo e borda aparecem).
 *
 * Usa uma sentinela de 1px no topo da página observada por
 * IntersectionObserver, em vez de ler `scrollY` no evento de scroll. A
 * diferença é real: ler scrollY a cada quadro força o navegador a recalcular
 * layout; a sentinela não custa nada na thread principal.
 */
function initHeader(): void {
  const header = document.getElementById('site-header');
  const sentinel = document.getElementById('scroll-sentinel');
  if (!header || !sentinel || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      const rolou = entry && entry.isIntersecting ? 'false' : 'true';
      header.dataset.scrolled = rolou;
      // Publica o mesmo estado no <html>: qualquer componente reage por CSS,
      // sem precisar do próprio JS. A dica de rolagem do hero usa isto.
      document.documentElement.dataset.scrolled = rolou;
    },
    { threshold: 0 },
  );

  observer.observe(sentinel);
}

/**
 * Barra de progresso da leitura.
 *
 * O caminho principal é CSS puro: `animation-timeline: scroll()` roda no
 * compositor, sem nenhum listener e sem custo por quadro. Este JS só existe
 * como reserva para navegador sem suporte — e ali usa `scaleX`, nunca
 * `width`, para não disparar layout durante a rolagem.
 */
function initScrollProgress(): void {
  const bar = document.querySelector<HTMLElement>('[data-scroll-progress]');
  if (!bar) return;

  // Suporte nativo: o CSS já cuida, não registramos nada.
  if (CSS.supports('animation-timeline', 'scroll()')) return;
  if (prefersReducedMotion()) return;

  let frame = 0;

  const update = (): void => {
    frame = 0;
    const doc = document.documentElement;
    const rolavel = doc.scrollHeight - doc.clientHeight;
    const p = rolavel > 0 ? Math.min(doc.scrollTop / rolavel, 1) : 0;
    bar.style.transform = `scaleX(${p})`;
  };

  addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );

  update();
}

/**
 * Menu mobile.
 *
 * Cuida do que um menu acessível exige e que quase todo site erra:
 *  - `aria-expanded` no botão, sincronizado com o estado real
 *  - Esc fecha e devolve o foco ao botão que abriu
 *  - foco preso dentro do painel enquanto ele está aberto
 *  - rolagem do fundo travada sem causar salto de layout
 */
function initMobileMenu(): void {
  const toggle = document.getElementById('menu-toggle');
  const panel = document.getElementById('mobile-menu');
  if (!toggle || !panel) return;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let open = false;

  const setOpen = (next: boolean): void => {
    open = next;
    toggle.setAttribute('aria-expanded', String(next));
    panel.dataset.open = String(next);
    // `inert` remove o painel fechado da ordem de foco e da árvore de
    // acessibilidade — mais confiável que apenas escondê-lo visualmente.
    if ('inert' in panel) (panel as HTMLElement & { inert: boolean }).inert = !next;

    // Trava a rolagem compensando a largura da barra, senão o conteúdo
    // salta lateralmente ao abrir o menu (CLS visível).
    if (next) {
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
      panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  // Navegar fecha o menu.
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (!open) return;

    if (e.key === 'Escape') {
      setOpen(false);
      toggle.focus();
      return;
    }

    // Prende o foco: Tab no último volta ao primeiro e vice-versa.
    if (e.key === 'Tab') {
      const items = $$<HTMLElement>(FOCUSABLE, panel).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Voltar ao desktop com o menu aberto deixaria o body travado.
  const mq = window.matchMedia('(min-width: 64rem)');
  mq.addEventListener('change', (e) => {
    if (e.matches && open) setOpen(false);
  });

  setOpen(false);
}

/* -------------------------------------------------------------------------- */
/*  3. Contadores                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Anima números de 0 até o valor final quando entram na tela.
 *
 * O HTML já contém o valor final como texto — a animação apenas o substitui
 * temporariamente. Quem não executa JS, ou pediu movimento reduzido, vê o
 * número correto na hora. O rastreador também.
 */
function initCounters(): void {
  const els = $$<HTMLElement>('[data-count]');
  if (els.length === 0 || !('IntersectionObserver' in window)) return;
  if (prefersReducedMotion()) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        animate(el);
      }
    },
    { threshold: 0.5 },
  );

  for (const el of els) observer.observe(el);

  function animate(el: HTMLElement): void {
    const final = el.textContent ?? '';
    // Separa o número dos caracteres em volta ("+180%" -> "+", 180, "%").
    const match = final.match(/^(\D*)([\d.,]+)(\D*)$/);
    if (!match) return;

    const [, prefix = '', rawNumber = '', suffix = ''] = match;
    const decimals = (rawNumber.split(',')[1] ?? '').length;
    const target = parseFloat(rawNumber.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(target)) return;

    const DURATION = 1400;
    const start = performance.now();

    // easeOutExpo: rápido no começo, desacelera no fim. O número "chega"
    // em vez de parar de repente.
    const ease = (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number): void => {
      const progress = Math.min((now - start) / DURATION, 1);
      const value = target * ease(progress);

      el.textContent =
        prefix +
        value.toLocaleString('pt-BR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) +
        suffix;

      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = final; // garante o valor exato no fim
    };

    requestAnimationFrame(tick);
  }
}

/* -------------------------------------------------------------------------- */
/*  4. Brilho sob o cursor                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Passa a posição do ponteiro para o CSS como custom property.
 *
 * Só em dispositivos com ponteiro fino (mouse). Em toque não existe hover,
 * então o listener nem é registrado — nada de código morto rodando no
 * celular, que é exatamente onde a performance é mais escassa.
 *
 * As coordenadas são escritas dentro de rAF para agrupar as escritas de
 * estilo num único quadro.
 */
function initSpotlight(): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (prefersReducedMotion()) return;

  const cards = $$<HTMLElement>('.spotlight');
  if (cards.length === 0) return;

  for (const card of cards) {
    let frame = 0;

    card.addEventListener(
      'pointermove',
      (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
          card.style.setProperty('--my', `${e.clientY - rect.top}px`);
          frame = 0;
        });
      },
      { passive: true },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  5. Acordeão do FAQ                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Usa <details>/<summary> nativos, que já vêm com teclado e leitor de tela
 * resolvidos. O único acréscimo é a animação de altura — e ela usa
 * `grid-template-rows: 0fr -> 1fr`, a única forma de animar "até o conteúdo"
 * sem medir altura em JS.
 *
 * O JS aqui existe só para segurar o fechamento até a animação terminar.
 */
function initAccordion(): void {
  if (prefersReducedMotion()) return;

  for (const details of $$<HTMLDetailsElement>('details[data-accordion]')) {
    const summary = details.querySelector('summary');
    if (!summary) return;

    summary.addEventListener('click', (e) => {
      if (!details.open) return; // abrir é instantâneo, o CSS anima

      e.preventDefault();
      details.dataset.closing = 'true';

      const done = (): void => {
        details.open = false;
        delete details.dataset.closing;
      };

      const content = details.querySelector<HTMLElement>('[data-accordion-body]');
      if (!content) return done();

      content.addEventListener('transitionend', done, { once: true });
      // Rede de segurança: se a transição não disparar, não trava aberto.
      setTimeout(done, 400);
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  6. Ano corrente no rodapé                                                  */
/* -------------------------------------------------------------------------- */

/** Evita rodapé com ano defasado em site estático que fica meses sem rebuild. */
function initYear(): void {
  const el = document.getElementById('current-year');
  if (el) el.textContent = String(new Date().getFullYear());
}

/* -------------------------------------------------------------------------- */
/*  Inicialização                                                              */
/* -------------------------------------------------------------------------- */

function init(): void {
  initReveal();
  initHeader();
  initScrollProgress();
  initMobileMenu();
  initCounters();
  initSpotlight();
  initAccordion();
  initYear();
}

// O script tem `defer`, então o DOM já existe quando ele executa. O teste de
// readyState cobre o caso de o módulo ser injetado depois por algum motivo.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
