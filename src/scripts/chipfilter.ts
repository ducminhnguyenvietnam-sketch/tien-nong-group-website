/**
 * Chip filters: [data-filter-group=g] [data-filter=value] chips toggle
 * aria-pressed and show only [data-filter-item=g] elements whose
 * data-tags (|-separated) include the value. The value "*" shows everything.
 */
document.querySelectorAll<HTMLElement>('[data-filter-group]').forEach((group) => {
  const g = group.dataset.filterGroup!;
  const chips = [...group.querySelectorAll<HTMLElement>('[data-filter]')];
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const v = chip.dataset.filter!;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    document.querySelectorAll<HTMLElement>(`[data-filter-item="${g}"]`).forEach((item) => {
      item.hidden = v !== '*' && !item.dataset.tags!.split('|').includes(v);
    });
  }));
});
