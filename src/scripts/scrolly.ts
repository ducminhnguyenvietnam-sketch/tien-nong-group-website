/**
 * Scroll-driven sections.
 *
 * [data-seq]: the direct children of the element appear one after another (1-2-3-4-5) the first time
 * it scrolls into view. Nothing is hidden unless this script runs.
 *
 * [data-scrolly] on a section holding a [data-picker]: on wide screens the section's content stays
 * pinned while the page scrolls, and scrolling moves through the picker's items (01 → 05) — tab and
 * photo change together; after the last item the page scrolls on. Clicking an item scrolls to its
 * place. Off on phones, short screens, with reduced motion, and when the content would not fit on
 * one screen (then the section works by clicking as before).
 */
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const editing = new URLSearchParams(location.search).has('sua-anh');

/* 1-2-3-4-5 reveal */
if (!still && !editing && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('seq-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0.15 });
  document.querySelectorAll<HTMLElement>('[data-seq]').forEach((el) => {
    [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--seq', String(i)));
    el.classList.add('seq-ready');
    io.observe(el);
  });
}

/* Pinned, scroll-driven pickers */
const STEP = 0.55; // viewport heights of scrolling per item
const wide = matchMedia('(min-width: 900px) and (min-height: 620px)');
document.querySelectorAll<HTMLElement>('[data-scrolly]').forEach((sec) => {
  const pin = sec.querySelector<HTMLElement>('.scrolly__pin');
  const picker = sec.querySelector<HTMLElement>('[data-picker]');
  if (!pin || !picker || still || editing) return;
  const buttons = [...picker.querySelectorAll<HTMLElement>('[data-pick]')].filter((b) => b.closest('[data-picker]') === picker);
  const n = buttons.length;
  if (n < 2) return;
  const hdr = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 72;
  let on = false, current = -1, auto = false;

  const setup = () => {
    sec.classList.remove('is-pinned');
    sec.style.removeProperty('height');
    on = false;
    if (!wide.matches) return;
    sec.style.setProperty('--n', String(n));
    sec.classList.add('is-pinned');
    // The tallest item decides whether the section fits on one screen.
    const sel = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    let tallest = 0;
    for (const b of buttons) { auto = true; b.click(); auto = false; tallest = Math.max(tallest, pin.scrollHeight); }
    auto = true; buttons[Math.max(0, sel)].click(); auto = false;
    if (tallest > innerHeight - hdr() + 2) { sec.classList.remove('is-pinned'); return; }
    sec.style.height = `${pin.offsetHeight + (n - 1) * STEP * innerHeight}px`;
    on = true; current = -1; update();
  };

  const update = () => {
    if (!on) return;
    const r = sec.getBoundingClientRect();
    const travel = sec.offsetHeight - pin.offsetHeight;
    const prog = Math.min(0.9999, Math.max(0, (hdr() - r.top) / travel));
    const idx = Math.floor(prog * n);
    if (idx !== current) {
      current = idx;
      auto = true; buttons[idx].click(); auto = false;
    }
  };

  // A real click on an item scrolls the page to that item's place, so scrolling stays in step.
  buttons.forEach((b, i) => b.addEventListener('click', (e) => {
    if (auto || !on || !e.isTrusted) return;
    const top = sec.getBoundingClientRect().top + scrollY - hdr();
    const travel = sec.offsetHeight - pin.offsetHeight;
    current = i;
    scrollTo({ top: top + ((i + 0.5) / n) * travel, behavior: 'smooth' });
  }));

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = window.setTimeout(setup, 150); });
  document.fonts?.ready.then(setup);
  setup();
});
