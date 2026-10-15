import { getCollection, type CollectionEntry } from 'astro:content';
import { url } from './routes';

export type NewsEntry = CollectionEntry<'news'>;

/** News categories (keys are stored in each article; labels shown on the site). */
export const CATEGORIES: Record<string, string> = {
  tn: 'Tin Tiến Nông',
  khcn: 'Khoa học & Công nghệ',
  kt: 'Kiến thức nông nghiệp',
  nd: 'Nông dân & mô hình',
  cd: 'Vì cộng đồng',
};

/** All articles: featured first, then newest date first; undated articles last. */
export async function getNews(): Promise<NewsEntry[]> {
  const all = await getCollection('news');
  const time = (e: NewsEntry) => e.data.date?.getTime() ?? -Infinity;
  return all.sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || time(b) - time(a) || a.id.localeCompare(b.id));
}

export const newsUrl = (e: NewsEntry) => `${url('tin-tuc')}${e.id}/`;

export const formatDate = (d?: Date | null) =>
  d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) : '[dd/mm/2026]';

/** Rough reading time in minutes (about 200 words a minute). */
export const readingTime = (e: NewsEntry) => Math.max(1, Math.ceil((e.body ?? '').split(/\s+/).filter(Boolean).length / 200));
