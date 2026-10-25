/**
 * Light motion for the public pages (styles in src/styles/v2.css):
 * - sections and cards fade up once as they scroll into view (cards in a row are staggered);
 * - big statistic numbers count up once;
 * - photos fade in when loaded;
 * - a trailing "→" in links nudges on hover.
 * Nothing runs with prefers-reduced-motion or in photo-edit mode (?sua-anh), and nothing is hidden
 * unless this script runs, so content never depends on it.
 */
const root = document.documentElement;
const editing = (() => {
  if (new URLSearchParams(location.search).has('sua-anh')) return true;
  try { return localStorage.getItem('tn-edit-photos') === '1'; } catch { return false; }
})();
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Photos fade in once loaded (cheap, also fine with reduced motion: it's opacity only). */
if (!editing) {
  document.querySelectorAll<HTMLImageElement>('.img-slot__img').forEach((img) => {
    if (img.complete) return;
    img.classList.add('is-loading');
    const done = () => img.classList.remove('is-loading');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

/* Arrow nudge: wrap a trailing "→" so CSS can move it on hover. */
document.querySelectorAll<HTMLElement>('a, button').forEach((el) => {
  const last = el.lastChild;
  if (last?.nodeType === 3 && /\s→\s*$/.test(last.textContent || '')) {
    last.textContent = (last.textContent || '').replace(/\s→\s*$/, ' ');
    const s = document.createElement('span');
    s.className = 'arrow'; s.setAttribute('aria-hidden', 'true'); s.textContent = '→';
    el.append(s);
  }
});

if (!still && !editing && 'IntersectionObserver' in window) {
  const vh = innerHeight;
  const below = (el: Element) => el.getBoundingClientRect().top > vh * 0.92;

  /* Reveal targets: every block inside a section's content column, after the first section (the hero).
     A grid or flex row of cards reveals card by card instead of all at once. */
  const targets: HTMLElement[] = [];
  const sections = [...document.querySelectorAll<HTMLElement>('main section')].slice(1);
  for (const sec of sections) {
    const col = sec.firstElementChild as HTMLElement | null;
    if (!col) continue;
    const blocks = col.children.length > 1 ? [...col.children] : [col];
    for (const b of blocks as HTMLElement[]) {
      const cs = getComputedStyle(b);
      const kids = [...b.children] as HTMLElement[];
      const isRow = (cs.display === 'grid' || (cs.display === 'flex' && cs.flexDirection === 'row')) && kids.length >= 2 && kids.length <= 12;
      if (isRow) kids.forEach((k, i) => { k.style.setProperty('--rv-d', `${Math.min(i, 3) * 70}ms`); targets.push(k); });
      else targets.push(b);
    }
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('rv-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  for (const t of targets) {
    if (!below(t) || t.closest('[data-no-reveal]')) continue;
    t.classList.add('rv');
    io.observe(t);
  }

  /* Count-up for statistic numbers: "300.000+", "650.000", "+10.000", "50+", "10/ năm". Years are left alone. */
  const stats = [...document.querySelectorAll<HTMLElement>('[style*="--type-stat"]')];
  const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');
  const cio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      cio.unobserve(e.target);
      const el = e.target as HTMLElement;
      const text = el.textContent || '';
      const m = text.match(/^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(.*)$/s);
      if (!m) continue;
      const [, pre, num, post] = m;
      const target = Number(num.replace(/\./g, ''));
      if (!(target > 0) || /^(19|20)\d{2}$/.test(num)) continue;
      const t0 = performance.now(), dur = 1200;
      el.style.minWidth = `${el.offsetWidth}px`;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + (p < 1 ? fmt(target * eased) : num) + post;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  stats.forEach((s) => { if (below(s)) cio.observe(s); });
}

root.classList.add('motion-ready');
