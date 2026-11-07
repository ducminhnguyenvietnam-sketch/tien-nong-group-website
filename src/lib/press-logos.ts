/**
 * Newspaper logos for press coverage ("Báo chí nói về Tiến Nông"): the source name of an article → its
 * logo in /uploads. A news file can also set its own logo (source_logo in Pages CMS), which wins.
 * Logos are the publications' own marks, used only to identify where the article appeared.
 */
const LOGOS: [RegExp, string][] = [
  [/nhân dân/i, '/uploads/ts-press-0-mw0loz57.png'],
  [/tiền phong/i, '/uploads/ts-press-1-mw0lw1wf.png'],
  [/diễn đàn doanh nghiệp/i, '/uploads/ts-press-2-mw0lsghj.png'],
  [/^báo công thương$/i, '/uploads/ts-press-5-mw0m3gdj.png'],
  [/nông nghiệp (và|&) môi trường|vietnam agriculture/i, '/uploads/ts-press-6-mw0m4q3m.png'],
];

export function pressLogo(source?: string, own?: string): string {
  if (own) return own;
  const s = (source ?? '').trim();
  return LOGOS.find(([re]) => re.test(s))?.[1] ?? '';
}
