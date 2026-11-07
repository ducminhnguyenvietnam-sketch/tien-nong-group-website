/**
 * Tap to reveal (phones): inside a [data-reveal-group], each [data-reveal] item has a [data-reveal-btn];
 * tapping it toggles .is-open on the item (one open at a time). CSS decides where the text is
 * folded away (usually only on narrow screens) — see .rvl in v2.css.
 *
 * [data-reveal-scroll] on the group: on phones and tablets the item that scrolls into the middle of the
 * screen opens by itself (and the one before closes), so the reader sees each text as they reach it.
 */
const narrow = matchMedia('(max-width: 899.98px)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
  const items = [...group.querySelectorAll<HTMLElement>('[data-reveal]')];
  const open = (item: HTMLElement | null) => items.forEach((it) => {
    const on = it === item;
    it.classList.toggle('is-open', on);
    it.querySelector('[data-reveal-btn]')?.setAttribute('aria-expanded', String(on));
  });
  items.forEach((item) => item.querySelector<HTMLElement>('[data-reveal-btn]')?.addEventListener('click', () => {
    open(item.classList.contains('is-open') ? null : item);
  }));

  if (group.hasAttribute('data-reveal-scroll') && 'IntersectionObserver' in window) {
    // A thin band across the middle of the screen: the item crossing it is the one being read.
    const io = new IntersectionObserver((entries) => {
      if (!narrow.matches) return;
      const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement).pop();
      if (hit) open(hit);
    }, { rootMargin: '-45% 0px -45% 0px' });
    items.forEach((it) => io.observe(it));
    if (reduce.matches) items.forEach((it) => it.classList.add('is-open'));
  }
});
