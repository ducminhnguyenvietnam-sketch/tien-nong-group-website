/**
 * Tap to reveal (phones): inside a [data-reveal-group], each [data-reveal] item has a [data-reveal-btn];
 * tapping it toggles .is-open on the item (one open at a time). CSS decides where the text is
 * folded away (usually only on narrow screens) — see .rvl in v2.css.
 */
document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
  const items = [...group.querySelectorAll<HTMLElement>('[data-reveal]')];
  items.forEach((item) => item.querySelector<HTMLElement>('[data-reveal-btn]')?.addEventListener('click', () => {
    const opening = !item.classList.contains('is-open');
    items.forEach((it) => {
      const open = opening && it === item;
      it.classList.toggle('is-open', open);
      it.querySelector('[data-reveal-btn]')?.setAttribute('aria-expanded', String(open));
    });
  }));
});
