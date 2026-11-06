/**
 * English (British) and Simplified Chinese versions of the site.
 *
 * - Vietnamese stays at the root (/ve-tien-nong/); the other languages live under /en/ and /zh/ with
 *   English addresses (/en/about/, /zh/about/). Every page of the Vietnamese site has a counterpart,
 *   except the news archive and articles (Vietnamese only).
 * - Text is translated through phrase banks in src/content/i18n/<lang>/*.json: each item pairs a
 *   Vietnamese text exactly as it appears in the CMS with its translation. Page content is translated
 *   field by field when it is read (`withDefaults(raw, path, L)`); text written into the templates is
 *   translated in the rendered page by src/middleware.ts. Photos, links and the page structure are
 *   shared, so a photo changed in the CMS changes on all three sites.
 * - A Vietnamese text with no translation yet is shown in Vietnamese; `npm run i18n` lists them.
 */
import type { PageSlug } from './routes';

export const LOCALES = ['vi', 'en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const OTHER_LOCALES = ['en', 'zh'] as const;

/** <html lang>, Open Graph locale and the hreflang code of each version. */
export const LOCALE_META: Record<Locale, { html: string; og: string; hreflang: string; label: string }> = {
  vi: { html: 'vi', og: 'vi_VN', hreflang: 'vi', label: 'Tiếng Việt' },
  en: { html: 'en-GB', og: 'en_GB', hreflang: 'en', label: 'English' },
  zh: { html: 'zh-Hans', og: 'zh_CN', hreflang: 'zh-Hans', label: '中文' },
};

/** Address of each page in the English and Chinese versions (same path for both). */
export const SLUGS: Record<PageSlug, string | null> = {
  'trang-chu': '',
  've-tien-nong': 'about',
  've-tien-nong/van-hoa-doanh-nghiep': 'about/corporate-culture',
  'khoa-hoc-cong-nghe': 'science-technology',
  'san-pham': 'products',
  'chi-tiet-san-pham': null,
  'giai-phap': 'solutions',
  'giai-phap-du-an': 'solutions/projects',
  'phat-trien-ben-vung': 'sustainability',
  'phat-trien-ben-vung/xanh-hoa-truong-sa': 'sustainability/greening-truong-sa',
  'nong-dan': 'farmers',
  'tuyen-dung': 'careers',
  'tin-tuc': null,
  'lien-he': 'contact',
  'tro-thanh-doi-tac': 'become-a-partner',
};

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, '');

/** Language of a page from its address (/en/…, /zh/…, otherwise Vietnamese). */
export function localeOf(url: URL | string): Locale {
  const p = (typeof url === 'string' ? url : url.pathname).slice(BASE().length);
  const m = p.match(/^\/(en|zh)(\/|$)/);
  return (m ? m[1] : 'vi') as Locale;
}

/** Vietnamese path (without base) → the same page in language L, or null when it has no counterpart. */
export function localizePath(viPath: string, L: Locale): string | null {
  if (L === 'vi') return viPath;
  const [, path = '/', hash = ''] = viPath.match(/^([^#?]*)(.*)$/) ?? [];
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (clean === '') return `/${L}/${hash}`;
  const prod = clean.match(/^san-pham\/([^/]+)$/);
  if (prod) return `/${L}/products/${prod[1]}/${hash}`;
  const slug = SLUGS[clean as PageSlug];
  if (slug == null || (L === 'zh' && ZH_EXCLUDED.test(clean))) return null;
  return `/${L}/${slug ? `${slug}/` : ''}${hash}`;
}

/** Path in any language (without base) → the Vietnamese path of the same page. */
export function viPathOf(path: string): string {
  const m = path.match(/^\/(en|zh)(\/.*)?$/);
  if (!m) return path;
  const rest = (m[2] ?? '/').replace(/^\/+|\/+$/g, '');
  if (rest === '') return '/';
  const prod = rest.match(/^products\/([^/]+)$/);
  if (prod) return `/san-pham/${prod[1]}/`;
  const hit = Object.entries(SLUGS).find(([, s]) => s === rest);
  return hit ? (hit[0] === 'trang-chu' ? '/' : `/${hit[0]}/`) : '/';
}

/** The page being viewed in each language, for the language switcher and hreflang links. */
export function alternates(url: URL): { locale: Locale; href: string; exists: boolean }[] {
  const base = BASE();
  const vi = viPathOf(url.pathname.slice(base.length) || '/');
  return LOCALES.map((L) => {
    const p = localizePath(vi, L);
    return { locale: L, href: `${base}${p ?? (L === 'vi' ? '/' : `/${L}/`)}`, exists: p != null };
  });
}

/* ---------------------------------------------------------------- phrase banks */

type Bank = { items?: { vi?: string; text?: string }[] };
const files = {
  en: import.meta.glob<Bank>('../content/i18n/en/*.json', { eager: true, import: 'default' }),
  zh: import.meta.glob<Bank>('../content/i18n/zh/*.json', { eager: true, import: 'default' }),
};

/** Comparison key: Unicode NFC, non-breaking spaces and runs of spaces made one plain space, trimmed. */
export const norm = (s: string) => s.normalize('NFC').replace(/[ \s]+/g, ' ').trim();

const banks = new Map<Locale, Map<string, string>>();
export function bank(L: Locale): Map<string, string> {
  if (L === 'vi') return new Map();
  let m = banks.get(L);
  if (!m) {
    m = new Map();
    for (const file of Object.values(files[L])) {
      for (const it of file?.items ?? []) {
        if (typeof it?.vi === 'string' && typeof it?.text === 'string' && it.text.trim()) m.set(norm(it.vi), it.text);
      }
    }
    banks.set(L, m);
  }
  return m;
}

/** One text in language L (unchanged when it has no translation yet). */
export function tr(text: string, L: Locale): string {
  if (L === 'vi' || typeof text !== 'string' || !text.trim()) return text;
  const hit = bank(L).get(norm(text));
  return hit ?? text;
}

/**
 * Chinese site: content about the Hoàng Sa / Trường Sa archipelagos (and the "Xanh hoá Trường Sa" page) is left out
 * altogether rather than translated (decision of 6/11/2026). Matched on the Vietnamese text and on links.
 */
export const ZH_EXCLUDED = /Trường Sa|Truong Sa|Hoàng Sa|Hoang Sa|biển đảo|xanh-hoa-truong-sa/i;
const mentions = (v: unknown): boolean => (typeof v === 'string' ? ZH_EXCLUDED.test(v.normalize('NFC'))
  : Array.isArray(v) ? v.some(mentions) : v && typeof v === 'object' ? Object.values(v).some(mentions) : false);
/** True when this content (Vietnamese) must not appear on the page in language L. */
export const excluded = (L: Locale, ...values: unknown[]) => L === 'zh' && values.some(mentions);
/** Fields that name a list item (its heading, label or link); running text is handled by the translation. */
const HEADLINE = /^(title|tag|name|label|link|href|year_label|eyebrow)$/;
const headedBy = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.entries(v as Record<string, unknown>).some(([k, x]) => HEADLINE.test(k) && mentions(x));
/** Chinese: list items whose heading or link is about the excluded subjects are removed (cards, programmes…). */
function prune<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((v) => !headedBy(v) && !(typeof v === 'string' && mentions(v))).map(prune) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = prune(v);
    return out as T;
  }
  return value;
}

/** Fields that are never words on the page. */
const KEEP = new Set(['src', 'focus', 'zoom', 'key', 'anchor', 'mac_dinh', 'kieu', 'muc', 'line']);

/** A whole content object in language L: every text field that has a translation is replaced. */
export function localize<T>(value: T, L: Locale, key = ''): T {
  if (L === 'vi') return value;
  if (L === 'zh' && key === '') value = prune(value);
  if (typeof value === 'string') return (KEEP.has(key) ? value : tr(value, L)) as T;
  if (Array.isArray(value)) return value.map((v) => localize(v, L, key)) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = localize(v, L, k);
    return out as T;
  }
  return value;
}
