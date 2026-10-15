/**
 * Single-open accordion: inside a [data-accordion] root, each [data-acc] button
 * toggles the panel named by its aria-controls; opening one closes the others.
 * An optional [data-acc-sign] child shows "−" when open and "+" when closed.
 */
document.querySelectorAll<HTMLElement>('[data-accordion]').forEach((root) => {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-acc]')];
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    const opening = btn.getAttribute('aria-expanded') !== 'true';
    buttons.forEach((b) => {
      const open = opening && b === btn;
      b.setAttribute('aria-expanded', String(open));
      const sign = b.querySelector('[data-acc-sign]');
      if (sign) sign.textContent = open ? '−' : '+';
      const panel = document.getElementById(b.getAttribute('aria-controls')!);
      if (panel) panel.hidden = !open;
    });
  }));
});
