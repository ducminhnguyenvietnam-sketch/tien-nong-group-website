// Imports the news archive of the old WordPress site (tiennong.vn) into the news collection.
//
//   node scripts/wp-import/import.mjs --sample 20     a spread of ~20 posts across the years (trial run)
//   node scripts/wp-import/import.mjs --all           every post
//
// For each post it writes src/content/news/<year>/<slug>.md (frontmatter in the same shape the CMS
// uses, body converted from HTML to Markdown) and its photos as WebP under public/uploads/tin-cu/<year>/:
// the cover at 1200px plus a 480px copy for cards, body photos at most 1080px wide. The old address is kept
// in `old_url` so the site can redirect old links. Posts that already exist on the new site (same title)
// are not duplicated; the existing article just gets the old address. A report is written to
// migration/import-report.{json,md}. Runs on GitHub Actions (.github/workflows/wp-import.yml).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import YAML from 'yaml';

const BASE = process.env.WP_BASE || 'https://tiennong.vn';
const API = `${BASE}/wp-json/wp/v2`;
const NEWS_DIR = 'src/content/news';
const IMG_DIR = 'public/uploads/tin-cu';
const UA = { 'User-Agent': 'TienNong-migration/1.0 (+github actions)' };
const args = process.argv.slice(2);
const SAMPLE = args.includes('--sample') ? Number(args[args.indexOf('--sample') + 1]) || 20 : 0;

// ───────────── helpers ─────────────
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function fetchRetry(url, opts = {}, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45000), ...opts });
      if (r.ok || r.status === 404 || r.status === 400 || r.status === 410) return r;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}
async function all(p, fields) {
  const out = [];
  for (let page = 1; ; page++) {
    const r = await fetchRetry(`${API}/${p}?per_page=100&page=${page}${fields ? `&_fields=${fields}` : ''}`);
    if (!r.ok) break;
    out.push(...(await r.json()));
    if (page >= (Number(r.headers.get('x-wp-totalpages')) || 1)) break;
  }
  return out;
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»' };
const decode = (s = '') => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
const plain = (html = '') => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const slugify = (s, max = 80) => {
  const out = fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (out.length > max ? out.slice(0, max).replace(/-[^-]*$/, '') : out) || 'bai-viet';
};
const stem = (u) => { try { return decodeURIComponent(new URL(u, BASE).pathname).split('/').pop().replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/\.\w+$/, '').toLowerCase(); } catch { return u; } };
const oldPath = (link) => { try { return decodeURI(new URL(link).pathname); } catch { return ''; } };
const isOldHost = (u) => { try { return /(^|\.)tiennong\.vn$/i.test(new URL(u, BASE).hostname); } catch { return false; } };

// ───────────── categories ─────────────
// Old category → new category (keys are stored in each article: tn, khcn, kt, nd, cd, bc).
const CAT_MAP = [
  ['hoat dong xa hoi', 'cd'],
  ['nguoi nong dan', 'nd'],
  ['kien thuc nong nghiep', 'kt'], ['cach thuc canh tac', 'kt'], ['kien thuc ve cay trong', 'kt'],
  ['gia dinh tien nong', 'tn'], ['can bo nhan vien', 'tn'], ['doi tac, ban hang', 'tn'], ['tuyen dung', 'tn'],
];
// Posts filed only under "Tin tức chung" (or uncategorised) are sorted by words in the title.
const TITLE_RULES = [
  ['cd', /trao tang|ung ho|tu thien|khuyen hoc|bien dao|truong sa|hoc bong|an sinh|nhan dao|kho khan|ngheo|lu lut|thien tai|mai am|nghia tinh|vi cong dong/],
  ['khcn', /khoa hoc|nghien cuu|cong nghe|vilas|phong thi nghiem|sang che|de tai|chuyen giao|phan tich dat/],
  ['nd', /hoi thao|mo hinh|dau bo|nong dan|ba con|tap huan|hoi nghi khach hang|trinh dien/],
  ['kt', /ky thuat|cach bon|phong tru|sau benh|thieu dinh duong|dau hieu|cham soc|bon phan cho|bon lot|bon thuc/],
];
function category(names, title) {
  const n = names.map(fold);
  for (const [k, v] of CAT_MAP) if (n.some((x) => x === k)) return { cat: v, how: 'chuyên mục cũ' };
  const t = fold(title);
  for (const [v, re] of TITLE_RULES) if (re.test(t)) return { cat: v, how: 'từ khoá tiêu đề' };
  return { cat: 'tn', how: 'mặc định' };
}

// ───────────── images ─────────────
const imageCache = new Map();
async function saveImage(src, dest, width, quality, thumb) {
  const abs = new URL(src, BASE).href;
  const key = `${abs}|${dest}`;
  if (imageCache.has(key)) return imageCache.get(key);
  const job = (async () => {
    const r = await fetchRetry(abs);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const img = sharp(buf, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    if (!meta.width || meta.width < 40) throw new Error('ảnh quá nhỏ / hỏng');
    await mkdir(path.dirname(dest), { recursive: true });
    await img.clone().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(dest);
    if (thumb) await img.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 70, effort: 5 }).toFile(thumb);
    return '/' + dest.replace(/^public\//, '');
  })();
  imageCache.set(key, job);
  return job;
}

// ───────────── HTML → Markdown ─────────────
function preclean(html) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // [caption]<img …> Text[/caption] → figure
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (m, inner) => {
      const img = (inner.match(/<a[^>]*>\s*<img[^>]*>\s*<\/a>|<img[^>]*>/i) || [''])[0];
      return `<figure>${img}<figcaption>${inner.replace(img, '').trim()}</figcaption></figure>`;
    })
    .replace(/\[\/?[a-z_]+(?:\s[^\]]*)?\]/gi, '')
    .replace(/&nbsp;/g, ' ');
}

function makeTurndown(ctx) {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**', hr: '---' });
  td.use(gfm);
  td.remove(['script', 'style', 'noscript', 'form', 'button', 'input', 'select', 'textarea']);
  td.addRule('h1', { filter: 'h1', replacement: (c) => `\n\n## ${c.trim()}\n\n` });
  td.addRule('figure', {
    filter: 'figure',
    replacement: (content, node) => {
      const cap = node.querySelector('figcaption');
      const capText = cap ? plain(cap.innerHTML) : '';
      const imgs = [...node.querySelectorAll('img')].map((i) => ctx.image(i)).filter(Boolean);
      return `\n\n${imgs.join('\n\n')}${capText ? `\n\n*${capText.replace(/\*/g, '')}*` : ''}\n\n`;
    },
  });
  td.addRule('img', { filter: 'img', replacement: (c, node) => { const md = ctx.image(node); return md ? `\n\n${md}\n\n` : ''; } });
  td.addRule('linkedImage', {
    filter: (node) => node.nodeName === 'A' && node.querySelector('img') && !plain(node.innerHTML.replace(/<img[^>]*>/gi, '')),
    replacement: (c) => c,
  });
  td.addRule('link', {
    filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
    replacement: (content, node) => {
      const text = content.trim();
      if (!text) return '';
      const href = ctx.link(node.getAttribute('href'));
      return href ? `[${text}](${href})` : text;
    },
  });
  td.addRule('iframe', {
    filter: 'iframe',
    replacement: (c, node) => {
      const src = node.getAttribute('src') || '';
      const yt = src.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/);
      if (yt) { ctx.videos++; return `\n\n<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>\n\n`; }
      if (src) { ctx.warn.push(`khung nhúng khác: ${src.slice(0, 80)}`); return `\n\n[Xem nội dung nhúng](${src})\n\n`; }
      return '';
    },
  });
  return td;
}

function tidy(md) {
  return md
    .replace(/^\s*(\*\*|__|\\)\s*$/gm, '')
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

// ───────────── existing articles (avoid duplicates) ─────────────
async function existingNews() {
  const out = [];
  for (const f of await readdir(NEWS_DIR, { withFileTypes: true })) {
    if (!f.isFile() || !f.name.endsWith('.md')) continue;
    const file = path.join(NEWS_DIR, f.name);
    const text = await readFile(file, 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    const data = m ? YAML.parse(m[1]) : {};
    out.push({ file, id: f.name.replace(/\.md$/, ''), title: data.title || '', key: slugify(data.title || '', 60), text });
  }
  return out;
}

// ───────────── main ─────────────
const cats = await all('categories', 'id,name');
const catName = Object.fromEntries(cats.map((c) => [c.id, decode(c.name)]));
let posts = await all('posts', 'id,date,slug,link,title,categories,featured_media,content,excerpt');
posts.sort((a, b) => a.date.localeCompare(b.date));
console.log(`[import] ${posts.length} bài trên web cũ`);

if (SAMPLE) {
  // Spread across the years, plus a few posts with videos and tables.
  const byYear = {};
  for (const p of posts) (byYear[p.date.slice(0, 4)] ||= []).push(p);
  const pick = new Set();
  const years = Object.keys(byYear).sort();
  for (let i = 0; pick.size < SAMPLE - 3 && i < 3; i++) for (const y of years) { const l = byYear[y]; const p = l[Math.floor((l.length * (i * 2 + 1)) / 6)]; if (p && pick.size < SAMPLE - 3) pick.add(p); }
  for (const re of [/youtube|youtu\.be/i, /<table/i, /\[caption/i]) { const p = posts.find((x) => re.test(x.content?.rendered || '') && !pick.has(x)); if (p) pick.add(p); }
  posts = [...pick];
}

const mediaIds = [...new Set(posts.map((p) => p.featured_media).filter(Boolean))];
const media = {};
for (let i = 0; i < mediaIds.length; i += 100) {
  const r = await fetchRetry(`${API}/media?per_page=100&include=${mediaIds.slice(i, i + 100).join(',')}&_fields=id,source_url,alt_text`);
  if (r.ok) for (const m of await r.json()) media[m.id] = { url: m.source_url, alt: decode(m.alt_text || '') };
}

const existing = await existingNews();
const byTitle = new Map(existing.map((e) => [e.key, e]));
// Old post address → new slug, so links between old posts point to the new pages.
const used = new Set(existing.map((e) => e.id));
const plan = posts.map((p) => {
  const title = plain(p.title?.rendered);
  const dup = byTitle.get(slugify(title, 60));
  let slug = slugify(decodeURIComponent(p.slug || '') || title);
  if (!dup) { let s = slug, n = 2; while (used.has(s)) s = `${slug}-${n++}`; slug = s; used.add(slug); }
  return { p, title, dup, slug: dup ? dup.id : slug, old: oldPath(p.link) };
});
const linkMap = new Map(plan.map((x) => [x.old.replace(/\/$/, ''), x.slug]));

// A full run replaces what an earlier run produced.
if (!SAMPLE) {
  for (const f of await readdir(NEWS_DIR, { withFileTypes: true })) if (f.isDirectory() && /^\d{4}$/.test(f.name)) await rm(path.join(NEWS_DIR, f.name), { recursive: true });
  await rm(IMG_DIR, { recursive: true, force: true });
}

const report = [];
let done = 0;
async function importOne(x) {
  const { p, title, dup, slug } = x;
  const year = p.date.slice(0, 4);
  const names = p.categories.map((c) => catName[c] || String(c));
  const rec = { id: p.id, date: p.date.slice(0, 10), title, slug, old_url: x.old, old_cats: names, images: 0, imgFailed: 0, videos: 0, warn: [] };
  if (dup) {
    // Already on the new site: keep that article, just remember the old address for the redirect.
    if (!/^old_url:/m.test(dup.text)) await writeFile(dup.file, dup.text.replace(/^---\n/, `---\nold_url: ${JSON.stringify(x.old)}\n`));
    report.push({ ...rec, cat: '(đã có)', how: 'trùng bài trên web mới' });
    return;
  }
  const { cat, how } = category(names, title);
  const imgBase = `${IMG_DIR}/${year}/${slug}`;

  // Cover: the featured image, else the first photo in the post.
  const html = preclean(p.content?.rendered || '');
  const firstImg = (html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1];
  const coverSrc = media[p.featured_media]?.url || firstImg;
  let cover = '';
  if (coverSrc) {
    try { cover = await saveImage(coverSrc, `${imgBase}.webp`, 1200, 72, `${imgBase}-480.webp`); }
    catch (e) { rec.warn.push(`ảnh đại diện lỗi: ${e.message}`); }
  }
  const coverStem = coverSrc ? stem(coverSrc) : '';

  // Download body photos first (Turndown is synchronous), then convert.
  const srcs = [...new Set([...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))];
  const local = new Map();
  let n = 0;
  for (const s of srcs) {
    if (coverStem && stem(s) === coverStem && cover && !local.size) { local.set(s, null); continue; } // same photo as the cover, shown above
    try { local.set(s, await saveImage(s, `${imgBase}-${++n}.webp`, 1080, 70)); rec.images++; }
    catch (e) { local.set(s, undefined); rec.imgFailed++; rec.warn.push(`ảnh lỗi (${e.message}): ${s.slice(0, 90)}`); }
  }
  const ctx = {
    videos: 0, warn: rec.warn,
    image(node) {
      const s = node.getAttribute('src');
      const l = local.get(s);
      if (!l) return '';
      const alt = plain(node.getAttribute('alt') || '').replace(/[[\]]/g, '') || title;
      return `![${alt}](${l})`;
    },
    link(href) {
      if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return '';
      if (/^(mailto|tel):/i.test(href)) return href;
      if (isOldHost(href)) {
        const u = new URL(href, BASE);
        const hit = linkMap.get(decodeURI(u.pathname).replace(/\/$/, ''));
        if (hit) return `/tin-tuc/${hit}/`;
        if (/\.(jpe?g|png|gif|webp)$/i.test(u.pathname)) return '';
        rec.warn.push(`liên kết về web cũ: ${u.pathname.slice(0, 80)}`);
        return u.href;
      }
      return href;
    },
  };
  let body = tidy(makeTurndown(ctx).turndown(html));
  rec.videos = ctx.videos;
  if (body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim().length < 40) rec.warn.push('nội dung chữ rất ngắn');

  let summary = plain(p.excerpt?.rendered).replace(/\s*\[…\]\s*$|\s*\[\.\.\.\]\s*$|\s*Đọc tiếp.*$/i, '').trim();
  if (summary.length > 260) summary = summary.slice(0, 260).replace(/\s+\S*$/, '') + '…';

  const fm = {
    title, category: cat, date: p.date.slice(0, 10), author: 'Tiến Nông', featured: false, summary,
    cover: { src: cover, focus: 'center', zoom: '100', alt: media[p.featured_media]?.alt || title },
    cover_caption: '', album: [], album_link: '', tags: [], source: '', external_url: '', press_highlight: false,
    old_url: x.old,
  };
  await mkdir(path.join(NEWS_DIR, year), { recursive: true });
  await writeFile(path.join(NEWS_DIR, year, `${slug}.md`), `---\n${YAML.stringify(fm, { lineWidth: 0 })}---\n\n${body}`);
  report.push({ ...rec, cat, how });
}

const queue = [...plan];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const x = queue.shift();
    try { await importOne(x); } catch (e) { report.push({ id: x.p.id, title: x.title, old_url: x.old, error: e.message }); }
    if (++done % 25 === 0) console.log(`[import] ${done}/${plan.length}`);
  }
}));

// ───────────── report ─────────────
report.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
await mkdir('migration', { recursive: true });
await writeFile('migration/import-report.json', JSON.stringify(report, null, 1));
const count = (f) => report.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const errors = report.filter((r) => r.error);
const md = [
  `# Kết quả nhập tin cũ (${SAMPLE ? `thử ${report.length} bài` : 'toàn bộ'})`, '',
  `- Bài đã nhập: ${report.filter((r) => r.cat && r.cat !== '(đã có)').length}; trùng bài đã có trên web mới: ${report.filter((r) => r.cat === '(đã có)').length}; lỗi: ${errors.length}`,
  `- Ảnh trong bài: ${report.reduce((s, r) => s + (r.images || 0), 0)} tải được, ${report.reduce((s, r) => s + (r.imgFailed || 0), 0)} lỗi; video YouTube: ${report.reduce((s, r) => s + (r.videos || 0), 0)}`, '',
  '## Chuyên mục mới', ...Object.entries(count((r) => r.cat || 'lỗi')).map(([k, v]) => `- ${k}: ${v}`), '',
  '## Cách xếp chuyên mục', ...Object.entries(count((r) => r.how || 'lỗi')).map(([k, v]) => `- ${k}: ${v}`), '',
  '## Bài có cảnh báo', ...report.filter((r) => r.warn?.length || r.error).map((r) => `- ${r.date} [${r.title}](${r.old_url}): ${r.error || r.warn.slice(0, 3).join('; ')}${r.warn?.length > 3 ? ` (+${r.warn.length - 3})` : ''}`), '',
].join('\n');
await writeFile('migration/import-report.md', md);
console.log(md.split('## Bài có cảnh báo')[0]);
