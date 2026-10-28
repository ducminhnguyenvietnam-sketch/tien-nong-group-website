import { getCollection, type CollectionEntry } from 'astro:content';
import raw from '../content/pages/san-pham.json';
import { url } from './routes';

export type Product = CollectionEntry<'products'>;

/** Product lines (keys stored on each product; labels from the Sản phẩm page in the CMS). */
export const LINES: { key: string; label: string }[] = (raw as { lines?: { key: string; label: string }[] }).lines ?? [];
export const lineLabel = (key: string) => LINES.find((l) => l.key === key)?.label ?? '';

/** All products, in the order set in the CMS ("Thứ tự"), featured ones first. */
export async function getProducts(): Promise<Product[]> {
  const all = await getCollection('products');
  return all.sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'vi'));
}

export const productUrl = (p: Product) => `${url('san-pham')}${p.id}/`;

const words = (s: string) => new Set(s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
  .replace(/tien nong/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length > 0));

/** The product a free-text name refers to ("NPK cây dứa Tiến Nông" → NPK 16-6-18+1SiO₂hh Tiến Nông (Cây Dứa)), if any. */
export function findProduct(all: Product[], name: string): Product | undefined {
  const q = words(name);
  if (!q.size) return undefined;
  let best: Product | undefined, score = 0;
  for (const p of all) {
    const w = words(p.data.name);
    const hit = [...q].filter((x) => w.has(x)).length / q.size;
    if (hit > score) { score = hit; best = p; }
  }
  return score >= 0.75 ? best : undefined;
}
