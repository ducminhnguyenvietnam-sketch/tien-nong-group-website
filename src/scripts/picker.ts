/**
 * Single-select "picker": inside a [data-picker] root, clicking a [data-pick=k]
 * button marks it aria-selected and shows the matching [data-pick-panel=k].
 * Optional [data-pick-step=±1] buttons move to the previous/next item (wrapping).
 *
 * [data-pick-autoplay] on the root advances to the next item when the selected button's
 * CSS progress animation (on ::after) ends — the timeline draws its own 6 s progress line,
 * so the line and the switch stay in step. Autoplay pauses while the pointer or keyboard
 * focus is inside, while the root is off screen and while the tab is hidden (the root gets
 * .is-paused, which CSS uses to pause the animation). Buttons before the selected one get
 * .is-past. With reduced motion there is no animation, hence no autoplay.
 */
document.querySelectorAll<HTMLElement>('[data-picker]').forEach((root) => {
  // Only this picker's own buttons/panels (a picker may sit inside another one).
  const own = <T extends HTMLElement>(sel: string) =>
    [...root.querySelectorAll<T>(sel)].filter((el) => el.closest('[data-picker]') === root);
  const buttons = own<HTMLElement>('[data-pick]');
  const panels = own<HTMLElement>('[data-pick-panel]');
  if (!buttons.length) return;
  let current = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true'));
  const show = (k: number, user = false) => {
    current = (k + buttons.length) % buttons.length;
    const key = buttons[current].dataset.pick;
    buttons.forEach((b, i) => {
      b.setAttribute('aria-selected', String(i === current));
      b.classList.toggle('is-past', i < current);
    });
    panels.forEach((p) => { p.hidden = p.dataset.pickPanel !== key; });
    // Keep the selected stop visible in a horizontally scrolling rail, without moving the page.
    const rail = buttons[current].parentElement;
    rail?.classList.toggle('is-scrollable', !!rail && rail.scrollWidth > rail.clientWidth + 2);
    if (rail && rail.scrollWidth > rail.clientWidth + 2) {
      const b = buttons[current];
      rail.scrollTo({ left: b.offsetLeft - rail.clientWidth / 2 + b.offsetWidth / 2, behavior: user ? 'smooth' : 'auto' });
    }
    root.dispatchEvent(new CustomEvent('picker:change', { detail: key, bubbles: true }));
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => show(i, true)));
  own<HTMLElement>('[data-pick-step]').forEach((b) =>
    b.addEventListener('click', () => show(current + Number(b.dataset.pickStep), true)));
  show(current);

  if (!root.hasAttribute('data-pick-autoplay')) return;
  let hover = false, focus = false, offscreen = true;
  const sync = () => root.classList.toggle('is-paused', hover || focus || offscreen || document.hidden);
  root.addEventListener('pointerenter', () => { hover = true; sync(); });
  root.addEventListener('pointerleave', () => { hover = false; sync(); });
  root.addEventListener('focusin', () => { focus = true; sync(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget as Node)) { focus = false; sync(); } });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { offscreen = !e.isIntersecting; sync(); }, { threshold: 0.25 }).observe(root);
  } else offscreen = false;
  sync();
  buttons.forEach((b, i) => b.addEventListener('animationend', (e) => {
    if (e.pseudoElement === '::after' && i === current && !root.classList.contains('is-paused')) show(current + 1);
  }));
});
