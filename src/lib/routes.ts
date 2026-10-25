/** Page slugs, mirroring the 13 pages of the design's publish file. */
export const PAGES = [
  'trang-chu', 've-tien-nong', 've-tien-nong/van-hoa-doanh-nghiep', 'khoa-hoc-cong-nghe', 'san-pham', 'chi-tiet-san-pham', 'giai-phap',
  'giai-phap-du-an', 'phat-trien-ben-vung', 'nong-dan', 'tuyen-dung', 'tin-tuc', 'lien-he', 'tro-thanh-doi-tac',
] as const;
export type PageSlug = (typeof PAGES)[number];

/** A sub-page shown under a main navigation item: [built-in label, slug, label key in site.json header.subnav]. */
export type SubNav = [string, PageSlug, string];

/**
 * Main navigation: [label, slug, sub-pages?]. The label doubles as the header's `active` key;
 * shown labels come from site.json (header.nav / header.subnav).
 */
export const NAV: [string, PageSlug, SubNav[]?][] = [
  ['Về Tiến Nông', 've-tien-nong', [
    ['Giới thiệu chung', 've-tien-nong', 'gioi_thieu'],
    ['Văn hóa doanh nghiệp', 've-tien-nong/van-hoa-doanh-nghiep', 'van_hoa_doanh_nghiep'],
  ]],
  ['Tin tức', 'tin-tuc'],
  ['Khoa học & Công nghệ', 'khoa-hoc-cong-nghe'],
  ['Sản phẩm', 'san-pham'],
  ['Giải pháp', 'giai-phap'],
  ['Phát triển bền vững', 'phat-trien-ben-vung'],
  ['Nông dân Tiến Nông', 'nong-dan'],
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

/** YouTube video id from any common link form (watch?v=, youtu.be/, shorts/, embed/), or null. */
export function youtubeId(value?: string | null): string | null {
  const v = (value ?? '').trim();
  const m = v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
