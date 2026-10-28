// Saves the product catalogue of the old WordPress/WooCommerce site for the new product pages:
// migration/products/products.json (WordPress + WooCommerce Store API data per product),
// migration/products/categories.json, and every product photo under migration/products/img/<id>/.
// Runs on GitHub Actions (.github/workflows/wp-import.yml).
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://tiennong.vn';
const OUT = 'migration/products';
const UA = { 'User-Agent': 'TienNong-migration/1.0 (+github actions)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return r; };
async function all(path) {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const r = await get(`${BASE}${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!r.ok) { console.log(path, 'HTTP', r.status); break; }
    const rows = await r.json();
    out.push(...rows);
    const pages = Number(r.headers.get('x-wp-totalpages')) || (rows.length < 100 ? page : page + 1);
    if (page >= pages || !rows.length) break;
  }
  return out;
}
await mkdir(`${OUT}/img`, { recursive: true });
const wp = await all('/wp-json/wp/v2/product');
const store = await all('/wp-json/wc/store/v1/products');
const cats = await all('/wp-json/wp/v2/product_cat');
console.log(`wp/v2/product: ${wp.length}, store: ${store.length}, categories: ${cats.length}`);

const media = {};
const ids = [...new Set(wp.map((p) => p.featured_media).filter(Boolean))];
for (let i = 0; i < ids.length; i += 100) {
  const r = await get(`${BASE}/wp-json/wp/v2/media?per_page=100&include=${ids.slice(i, i + 100).join(',')}`);
  if (r.ok) for (const m of await r.json()) media[m.id] = m.source_url;
}
const byId = Object.fromEntries(store.map((s) => [s.id, s]));
const products = wp.map((p) => ({ id: p.id, slug: decodeURIComponent(p.slug), link: p.link, title: p.title?.rendered, date: p.date,
  content: p.content?.rendered, excerpt: p.excerpt?.rendered, product_cat: p.product_cat, featured: media[p.featured_media] || '',
  meta: p.meta, acf: p.acf, store: byId[p.id] || null }));
// Products only in the Store API (unlikely) are kept too.
for (const s of store) if (!products.find((p) => p.id === s.id)) products.push({ id: s.id, slug: s.slug, link: s.permalink, title: s.name, store: s });

// Photos: featured + gallery + images inside the description.
let n = 0;
for (const p of products) {
  const urls = new Set([p.featured, ...(p.store?.images || []).map((i) => i.src), ...[...String(p.content || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])].filter(Boolean));
  p.photos = [];
  let k = 0;
  for (const u of urls) {
    try {
      const orig = u.replace(/-\d+x\d+(?=\.\w+$)/, '');
      let r = await get(orig);
      if (!r.ok) r = await get(u);
      if (!r.ok) continue;
      const ext = (new URL(r.url).pathname.match(/\.(\w+)$/) || [, 'jpg'])[1].toLowerCase();
      const file = `${OUT}/img/${p.id}/${++k}.${ext}`;
      await mkdir(`${OUT}/img/${p.id}`, { recursive: true });
      await writeFile(file, Buffer.from(await r.arrayBuffer()));
      p.photos.push({ url: u, file });
      n++;
    } catch (e) { console.log('skip', u, e.message); }
  }
}
await writeFile(`${OUT}/products.json`, JSON.stringify(products, null, 1));
await writeFile(`${OUT}/categories.json`, JSON.stringify(cats, null, 1));
console.log(`${products.length} sản phẩm, ${n} ảnh`);
