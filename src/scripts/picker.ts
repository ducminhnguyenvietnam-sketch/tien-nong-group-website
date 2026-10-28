/**
 * Single-select "picker": inside a [data-picker] root, clicking a [data-pick=k]
 * button marks it aria-selected and shows the matching [data-pick-panel=k].
 * Optional [data-pick-step=±1] buttons move to the previous/next item (wrapping).
 *
 * [data-pick-autoplay="ms"] on the root advances to the next item every ms (see below); a CSS
 * progress line on the selected button can run alongside (the root gets .is-paused while waiting
 * and .pick-reset for a moment whenever the count restarts). Buttons before the selected one get
 * .is-past.
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
  // Autoplay: move to the next item every N ms (data-pick-autoplay="5000"), driven by a timer so it
  // also runs when animations are turned off. It waits while the picker is off screen, the tab is hidden
  // or keyboard focus is inside it; any change (click, arrow, autoplay) starts the count again.
  const every = Number(root.dataset.pickAutoplay) || 5000;
  let timer = 0, focus = false, offscreen = true;
  const restartBar = () => { root.classList.add('pick-reset'); void root.offsetWidth; root.classList.remove('pick-reset'); };
  const arm = () => {
    clearTimeout(timer);
    const paused = focus || offscreen || document.hidden;
    root.classList.toggle('is-paused', paused);
    if (!paused) timer = window.setTimeout(() => show(current + 1), every);
  };
  root.addEventListener('picker:change', () => { restartBar(); arm(); });
  root.addEventListener('focusin', (e) => { if ((e.target as HTMLElement).matches(':focus-visible')) { focus = true; arm(); } });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget as Node)) { focus = false; restartBar(); arm(); } });
  document.addEventListener('visibilitychange', () => { restartBar(); arm(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { offscreen = !e.isIntersecting; restartBar(); arm(); }, { threshold: 0.2 }).observe(root);
  } else { offscreen = false; arm(); }
});
