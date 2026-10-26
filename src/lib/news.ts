import { getCollection, type CollectionEntry } from 'astro:content';
import { url } from './routes';

export type NewsEntry = CollectionEntry<'news'>;

/** News categories (keys are stored in each article; labels shown on the site). */
export const CATEGORIES: Record<string, string> = {
  tn: 'Câu chuyện Tiến Nông',
  khcn: 'Khoa học & Công nghệ',
  kt: 'Kiến thức nông nghiệp',
  nd: 'Nông dân & Mô hình hiệu quả',
  cd: 'Tiến Nông vì cộng đồng & ESG',
  bc: 'Báo chí nói về Tiến Nông',
};

/** Category of press coverage: entries link to the original article on the newspaper's site. */
export const PRESS = 'bc';
export const isPress = (e: NewsEntry) => e.data.category === PRESS;
/** Entries that have their own article page on this site (press items link out instead). */
export const isArticle = (e: NewsEntry) => !(isPress(e) && e.data.external_url.trim());

/** All articles: featured first, then newest date first; undated articles last. */
export async function getNews(): Promise<NewsEntry[]> {
  const all = await getCollection('news');
  const time = (e: NewsEntry) => e.data.date?.getTime() ?? -Infinity;
  return all.sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || time(b) - time(a) || a.id.localeCompare(b.id));
}

/** Link for a news card: our own article page, or the original newspaper article for press items. */
export const newsUrl = (e: NewsEntry) => (isArticle(e) ? `${url('tin-tuc')}${e.id}/` : e.data.external_url.trim());

/** Extra attributes for a news card link: press items open the newspaper's site in a new tab. */
export const newsLinkAttrs = (e: NewsEntry) => (isArticle(e) ? {} : { target: '_blank', rel: 'noopener' });

/** Press items for the "Báo chí nói về Tiến Nông" block: highlighted ones first, then newest. */
export async function getPress(limit = 3): Promise<NewsEntry[]> {
  const press = (await getNews()).filter(isPress);
  return [...press.filter((e) => e.data.press_highlight), ...press.filter((e) => !e.data.press_highlight)].slice(0, limit);
}

export const formatDate = (d?: Date | null) =>
  d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) : '';

/** Rough reading time in minutes (about 200 words a minute). */
export const readingTime = (e: NewsEntry) => Math.max(1, Math.ceil((e.body ?? '').split(/\s+/).filter(Boolean).length / 200));

/** Articles per page in the news list. */
export const PER_PAGE = 12;

/** Address segment of each category's list page: /tin-tuc/chuyen-muc/<segment>/. */
export const CATEGORY_SLUGS: Record<string, string> = {
  tn: 'cau-chuyen-tien-nong',
  khcn: 'khoa-hoc-cong-nghe',
  kt: 'kien-thuc-nong-nghiep',
  nd: 'nong-dan-mo-hinh-hieu-qua',
  cd: 'vi-cong-dong-esg',
};

/** List page address: all articles ('all') or one category, page n (page 1 has no /trang/1/). */
export function listUrl(cat: string, page = 1): string {
  const root = cat === 'all' ? url('tin-tuc') : `${url('tin-tuc')}chuyen-muc/${CATEGORY_SLUGS[cat]}/`;
  return page > 1 ? `${root}trang/${page}/` : root;
}

/** Page numbers to show in a pager: first, last and the pages around the current one, with gaps (0). */
export function pageList(page: number, pages: number): number[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const out: number[] = [];
  [...keep].sort((a, b) => a - b).forEach((n, i, arr) => { if (i && n - arr[i - 1] > 1) out.push(0); out.push(n); });
  return out;
}
