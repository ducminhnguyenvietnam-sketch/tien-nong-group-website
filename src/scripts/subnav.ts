/**
 * Section menu (.st-subnav): stays pinned under the header; the link of the section being read is
 * highlighted, and on phones the menu slides sideways so that link is always in view.
 */
document.querySelectorAll<HTMLElement>('.st-subnav').forEach((nav) => {
  const bar = nav.querySelector<HTMLElement>(':scope > div') ?? nav;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean) as HTMLElement[];
  if (!targets.length) return;
  let current = -1;
  const mark = () => {
    const line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 64) + nav.offsetHeight + 24;
    let idx = -1;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top <= line) idx = i; });
    if (idx === current) return;
    current = idx;
    links.forEach((a, i) => { a.classList.toggle('is-active', i === idx); if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const a = links[idx];
    if (a && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
  };
  let raf = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, { passive: true });
  mark();
});
