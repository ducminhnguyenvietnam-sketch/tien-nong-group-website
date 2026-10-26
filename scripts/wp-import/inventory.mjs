// Inventory of the old WordPress site (tiennong.vn): posts per year and category, content
// features that need special handling, and an estimate of the image volume. Runs on GitHub
// Actions (the old site is reachable from there); writes migration/inventory.{json,md}.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.WP_BASE || 'https://tiennong.vn';
const API = `${BASE}/wp-json/wp/v2`;
const UA = { 'User-Agent': 'TienNong-migration/1.0 (+github actions)' };

async function get(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return r;
      if (r.status === 400 || r.status === 404) return r;
      throw new Error(`${r.status} ${url}`);
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((ok) => setTimeout(ok, 1500 * (i + 1)));
    }
  }
}
async function all(path, fields) {
  const out = []; let total = 0;
  for (let page = 1; ; page++) {
    const r = await get(`${API}/${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}${fields ? `&_fields=${fields}` : ''}`);
    if (!r.ok) break;
    total = Number(r.headers.get('x-wp-total')) || total;
    const rows = await r.json();
    out.push(...rows);
    const pages = Number(r.headers.get('x-wp-totalpages')) || 1;
    console.log(`${path} page ${page}/${pages}`);
    if (page >= pages) break;
  }
  return { rows: out, total };
}

const cats = (await all('categories', 'id,name,slug,count,parent')).rows;
const posts = (await all('posts', 'id,date,slug,link,title,categories,featured_media,content,excerpt')).rows;
const pages = (await all('pages', 'id,slug,link,title,parent')).rows;
const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));

// Featured images (media endpoint gives the original URL and, on recent WordPress, the file size).
const mediaIds = [...new Set(posts.map((p) => p.featured_media).filter(Boolean))];
const media = {};
for (let i = 0; i < mediaIds.length; i += 100) {
  const r = await get(`${API}/media?per_page=100&include=${mediaIds.slice(i, i + 100).join(',')}&_fields=id,source_url,media_details`);
  if (r.ok) for (const m of await r.json()) media[m.id] = { url: m.source_url, size: m.media_details?.filesize || 0, w: m.media_details?.width, h: m.media_details?.height };
}

const feat = { shortcode: /\[[a-z_]+[^\]]*\]/i, youtube: /youtube\.com|youtu\.be/i, iframe: /<iframe/i, table: /<table/i,
  gallery: /gallery|\[gallery/i, elementor: /elementor|vc_row|et_pb_/i, pdf: /\.pdf/i, video: /<video/i };
const byYear = {}, byCat = {}, features = Object.fromEntries(Object.keys(feat).map((k) => [k, 0]));
const bodyImgs = new Set(); let noFeatured = 0, totalChars = 0;
const list = posts.map((p) => {
  const y = p.date.slice(0, 4);
  byYear[y] = (byYear[y] || 0) + 1;
  for (const c of p.categories) byCat[catName[c] || c] = (byCat[catName[c] || c] || 0) + 1;
  const html = p.content?.rendered || '';
  totalChars += html.replace(/<[^>]+>/g, '').length;
  for (const [k, re] of Object.entries(feat)) if (re.test(html)) features[k]++;
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  imgs.forEach((u) => bodyImgs.add(u));
  if (!p.featured_media) noFeatured++;
  return { id: p.id, date: p.date, slug: p.slug, link: p.link, title: p.title?.rendered, cats: p.categories.map((c) => catName[c] || c), imgs: imgs.length, featured: media[p.featured_media]?.url || '' };
});

// Estimate the image volume from a sample of HEAD requests.
const pool = [...bodyImgs, ...Object.values(media).map((m) => m.url)];
const sample = pool.sort(() => Math.random() - 0.5).slice(0, 300);
let sBytes = 0, sOk = 0;
for (let i = 0; i < sample.length; i += 6) {
  await Promise.all(sample.slice(i, i + 6).map(async (u) => {
    try { const r = await fetch(new URL(u, BASE), { method: 'HEAD', headers: UA }); const n = Number(r.headers.get('content-length')); if (r.ok && n) { sBytes += n; sOk++; } } catch {}
  }));
}
const avg = sOk ? sBytes / sOk : 0;
const est = { images: pool.length, bodyImages: bodyImgs.size, featuredImages: Object.keys(media).length, sampled: sOk, avgKB: Math.round(avg / 1024), estTotalMB: Math.round((avg * pool.length) / 1048576) };

await mkdir('migration', { recursive: true });
await writeFile('migration/inventory.json', JSON.stringify({ base: BASE, totalPosts: posts.length, totalPages: pages.length, categories: cats, byYear, byCat, features, noFeatured, est, pages: pages.map((p) => ({ id: p.id, slug: p.slug, link: p.link, title: p.title?.rendered })), posts: list }, null, 1));
const md = [`# Thống kê web cũ ${BASE}`, '', `- Bài viết: **${posts.length}**, trang tĩnh: ${pages.length}`, `- Tổng chữ (ước): ${Math.round(totalChars / 1000)}k ký tự`, `- Bài không có ảnh đại diện: ${noFeatured}`,
  `- Ảnh: ${est.images} (trong bài ${est.bodyImages}, ảnh đại diện ${est.featuredImages}); trung bình ${est.avgKB} KB (mẫu ${est.sampled}); tổng ước ${est.estTotalMB} MB`, '',
  '## Theo năm', ...Object.entries(byYear).sort().map(([y, n]) => `- ${y}: ${n}`), '',
  '## Theo chuyên mục', ...Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}: ${n}`), '',
  '## Đặc điểm nội dung (số bài)', ...Object.entries(features).map(([k, n]) => `- ${k}: ${n}`), ''].join('\n');
await writeFile('migration/inventory.md', md);
console.log(md);
