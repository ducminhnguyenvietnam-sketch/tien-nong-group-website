/**
 * Single-select "picker": inside a [data-picker] root, clicking a [data-pick=k]
 * button marks it aria-selected and shows the matching [data-pick-panel=k].
 * Optional [data-pick-step=±1] buttons move to the previous/next item (wrapping).
 *
 * Several panels may share one key (two milestones in the same year): the button shows them one
 * after another. Step buttons and autoplay go through them in turn before moving to the next key.
 *
 * [data-pick-autoplay="ms"] on the root advances to the next item every ms (see below); a CSS
 * progress line on the selected button can run alongside (the root gets .is-paused while waiting
 * and .pick-reset for a moment whenever the count restarts). A button whose key holds n panels gets
 * --pick-n: n, and the root gets --pick-sub (the panel being shown), so its progress line can run
 * for n periods. Buttons before the selected one get .is-past.
 */
document.querySelectorAll<HTMLElement>('[data-picker]').forEach((root) => {
  // Only this picker's own buttons/panels (a picker may sit inside another one).
  const own = <T extends HTMLElement>(sel: string) =>
    [...root.querySelectorAll<T>(sel)].filter((el) => el.closest('[data-picker]') === root);
  const buttons = own<HTMLElement>('[data-pick]');
  const panels = own<HTMLElement>('[data-pick-panel]');
  if (!buttons.length) return;
  /** A key's panels, split by the box that holds them: a text panel and a photo panel with the same key
   *  (in two different columns) show together; several panels in one box show one after another. */
  const sets = (k: number) => {
    const by = new Map<Element | null, HTMLElement[]>();
    panels.filter((p) => p.dataset.pickPanel === buttons[k].dataset.pick).forEach((p) => {
      const list = by.get(p.parentElement) ?? []; list.push(p); by.set(p.parentElement, list);
    });
    return [...by.values()];
  };
  const group = (k: number) => Array.from({ length: Math.max(0, ...sets(k).map((l) => l.length)) });
  buttons.forEach((b, i) => { const n = group(i).length; if (n > 1) b.style.setProperty('--pick-n', String(n)); });
  let current = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true'));
  let sub = 0;
  const showPanel = () => {
    const shown = new Set(sets(current).map((l) => l[Math.min(sub, l.length - 1)]));
    panels.forEach((p) => { p.hidden = !shown.has(p); });
  };
  // Only set when the progress line restarts: changing it mid-run would make the line jump.
  const markSub = () => root.style.setProperty('--pick-sub', String(sub));
  const show = (k: number, user = false, at = 0) => {
    current = (k + buttons.length) % buttons.length;
    sub = Math.max(0, Math.min(at < 0 ? group(current).length - 1 : at, group(current).length - 1));
    const key = buttons[current].dataset.pick;
    buttons.forEach((b, i) => {
      b.setAttribute('aria-selected', String(i === current));
      b.classList.toggle('is-past', i < current);
    });
    showPanel();
    markSub();
    // Keep the selected stop visible in a horizontally scrolling rail, without moving the page.
    const rail = buttons[current].parentElement;
    rail?.classList.toggle('is-scrollable', !!rail && rail.scrollWidth > rail.clientWidth + 2);
    if (rail && rail.scrollWidth > rail.clientWidth + 2) {
      const b = buttons[current];
      rail.scrollTo({ left: b.offsetLeft - rail.clientWidth / 2 + b.offsetWidth / 2, behavior: user ? 'smooth' : 'auto' });
    }
    root.dispatchEvent(new CustomEvent('picker:change', { detail: key, bubbles: true }));
  };
  /** One step forward/back: through the panels of the current key first, then on to the next key. */
  const step = (d: number) => {
    const n = group(current).length;
    if (sub + d >= 0 && sub + d < n) { sub += d; showPanel(); root.dispatchEvent(new CustomEvent('picker:sub', { detail: sub })); return; }
    show(current + d, true, d < 0 ? -1 : 0);
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => show(i, true)));
  own<HTMLElement>('[data-pick-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.pickStep))));
  show(current);

  // [data-pick-swipe]: a sideways swipe over the panels moves to the next/previous item (phones).
  if (root.hasAttribute('data-pick-swipe')) {
    let x0 = 0, y0 = 0;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (!(e.target as HTMLElement).closest('[data-pick-panel]')) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1), true);
    }, { passive: true });
  }

  if (!root.hasAttribute('data-pick-autoplay')) return;
  // Autoplay: move to the next item every N ms (data-pick-autoplay="5000"), driven by a timer so it
  // also runs when animations are turned off. It waits while the picker is off screen, the tab is hidden
  // or keyboard focus is inside it; any change (click, arrow, autoplay) starts the count again.
  const every = Number(root.dataset.pickAutoplay) || 5000;
  let timer = 0, focus = false, offscreen = true;
  const restartBar = () => { markSub(); root.classList.add('pick-reset'); void root.offsetWidth; root.classList.remove('pick-reset'); };
  const arm = () => {
    clearTimeout(timer);
    const paused = focus || offscreen || document.hidden;
    root.classList.toggle('is-paused', paused);
    if (!paused) timer = window.setTimeout(() => step(1), every);
  };
  root.addEventListener('picker:change', () => { restartBar(); arm(); });
  // Moving to the next panel of the same key keeps the progress line running, only the timer restarts.
  root.addEventListener('picker:sub', () => arm());
  root.addEventListener('focusin', (e) => { if ((e.target as HTMLElement).matches(':focus-visible')) { focus = true; arm(); } });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget as Node)) { focus = false; restartBar(); arm(); } });
  document.addEventListener('visibilitychange', () => { restartBar(); arm(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { offscreen = !e.isIntersecting; restartBar(); arm(); }, { threshold: 0.2 }).observe(root);
  } else { offscreen = false; arm(); }
});
