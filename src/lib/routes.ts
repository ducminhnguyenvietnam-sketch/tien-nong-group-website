/** Page slugs, mirroring the 13 pages of the design's publish file. */
export const PAGES = [
  'trang-chu', 've-tien-nong', 'khoa-hoc-cong-nghe', 'san-pham', 'chi-tiet-san-pham', 'giai-phap',
  'giai-phap-du-an', 'phat-trien-ben-vung', 'nong-dan', 'tuyen-dung', 'tin-tuc', 'lien-he',
] as const;
export type PageSlug = (typeof PAGES)[number];

/** Main navigation: [label, slug]. The label doubles as the header's `active` key. */
export const NAV: [string, PageSlug][] = [
  ['Về Tiến Nông', 've-tien-nong'],
  ['Khoa học & Công nghệ', 'khoa-hoc-cong-nghe'],
  ['Sản phẩm', 'san-pham'],
  ['Giải pháp', 'giai-phap'],
  ['Phát triển bền vững', 'phat-trien-ben-vung'],
  ['Nông dân Tiến Nông', 'nong-dan'],
  ['Tin tức', 'tin-tuc'],
];

/** URL for a page, optionally with an in-page anchor. The home page lives at the site root. */
export function url(slug: PageSlug, hash?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = slug === 'trang-chu' ? '/' : `/${slug}/`;
  return `${base}${path}${hash ? `#${hash}` : ''}`;
}

/** URL for a file in public/, prefixed with the deploy base path. */
export function asset(path: string): string {
  // encodeURI: uploaded file names may contain spaces (e.g. "truong fpt.jpg").
  return encodeURI(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
}

/**
 * href for a link edited in the CMS: empty stays "#", uploaded files (/uploads/…)
 * get the deploy base path, anything else (https://…, mailto:, #anchor) is kept.
 */
export function link(value?: string | null): string {
  const v = (value ?? '').trim();
  if (!v) return '#';
  return v.startsWith('/') && !v.startsWith('//') ? asset(v) : v;
}
