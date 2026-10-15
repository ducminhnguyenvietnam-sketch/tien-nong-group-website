/**
 * Single-select "picker": inside a [data-picker] root, clicking a [data-pick=k]
 * button marks it aria-selected and shows the matching [data-pick-panel=k].
 * Optional [data-pick-step=±1] buttons move to the previous/next item (wrapping).
 */
document.querySelectorAll<HTMLElement>('[data-picker]').forEach((root) => {
  const buttons = [...root.querySelectorAll<HTMLElement>('[data-pick]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-pick-panel]')];
  let current = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true'));
  const show = (k: number) => {
    current = (k + buttons.length) % buttons.length;
    const key = buttons[current].dataset.pick;
    buttons.forEach((b, i) => b.setAttribute('aria-selected', String(i === current)));
    panels.forEach((p) => { p.hidden = p.dataset.pickPanel !== key; });
    root.dispatchEvent(new CustomEvent('picker:change', { detail: key, bubbles: true }));
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => show(i)));
  root.querySelectorAll<HTMLElement>('[data-pick-step]').forEach((b) =>
    b.addEventListener('click', () => show(current + Number(b.dataset.pickStep))));
});
