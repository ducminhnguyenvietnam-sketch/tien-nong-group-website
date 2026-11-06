// Repairs news articles imported from the old site whose text was lost in the first import.
//
//   node scripts/wp-import/repair.mjs            report only (migration/repair-report.md)
//   node scripts/wp-import/repair.mjs --write    rewrite the damaged articles
//
// Also fixed here: articles that were already on the new site when the old posts were imported (sample
// articles retitled in the CMS) only received the old address, so their text stayed "[Nội dung bài viết]".
// Those are filled from the old post too. --new also imports old posts that are not on the new site yet.
//
// The first import moved an opening bold paragraph into the summary with a pattern that could run on to
// the end of the article: the whole text ended up in the summary (cut at 400 characters) and the body was
// left empty or short. This script fetches each old post again, converts it the same way (same photo
// numbering, so the photos already downloaded are reused; missing ones are downloaded), takes only a real
// one-paragraph bold lead as the summary, and rewrites the article when the new text is clearly longer.
// Frontmatter other than the summary (category, cover, tags, CMS edits) is kept as it is.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import YAML from 'yaml';

const BASE = process.env.WP_BASE || 'https://tiennong.vn';
const API = `${BASE}/wp-json/wp/v2`;
const NEWS_DIR = 'src/content/news';
const IMG_DIR = 'public/uploads/tin-cu';
const UA = { 'User-Agent': 'TienNong-migration/1.0 (+repair)' };
const WRITE = process.argv.includes('--write');

// ───────────── helpers ─────────────
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function fetchRetry(url, opts = {}, tries = 5) {
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
/** Candidate URLs for a WordPress photo, best first: the original upload (WordPress puts resized copies
 *  such as photo-300x235.jpg in the post): a large srcset entry, else the original upload, then the address in the post. */
function candidates(src, srcset = '') {
  const out = [];
  const best = srcset.split(',').map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0];
  if (best && parseInt(best[1]) >= 900) out.push(best[0]);
  if (isOldHost(src) && /-\d+x\d+(?=\.\w+(\?|$))/.test(src)) out.push(src.replace(/-\d+x\d+(?=\.\w+(\?|$))/, ''));
  if (best) out.push(best[0]);
  out.push(src);
  return [...new Set(out)];
}
async function saveImageAny(list, dest, width, quality, thumb) {
  let err;
  for (const u of list) { try { return await saveImage(u, dest, width, quality, thumb); } catch (e) { err = e; } }
  throw err;
}
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
      const imgs = [...node.querySelectorAll('img')].map((i) => ctx.image(i, capText)).filter(Boolean);
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


const textOf = (md) => md.replace(/!\[[^\]]*\]\([^)]*\)|<[^>]+>|[*_#>`]/g, ' ').replace(/\s+/g, ' ').trim();

// Local articles that came from the old site, by old address.
const local = new Map();
const allTitles = new Set();
const NEW = process.argv.includes('--new');
const dirs = [{ name: '', isDirectory: () => true }, ...(await readdir(NEWS_DIR, { withFileTypes: true }))];
for (const y of dirs) {
  if (!y.isDirectory()) continue;
  for (const f of await readdir(path.join(NEWS_DIR, y.name))) {
    if (!f.endsWith('.md')) continue;
    const file = path.join(NEWS_DIR, y.name, f);
    const text = await readFile(file, 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) continue;
    const fm = YAML.parse(m[1]) || {};
    if (fm.old_url) local.set(String(fm.old_url).replace(/\/$/, ''), { file, fm, fmText: m[1], body: m[2], year: y.name, slug: f.replace(/\.md$/, '') });
    allTitles.add(slugify(fm.title || '', 60));
  }
}
console.log(`[repair] ${local.size} bài có địa chỉ web cũ`);
const linkMap = new Map([...local].map(([k, v]) => [k, v.slug]));

const posts = await all('posts', 'id,date,slug,link,title,content,excerpt,featured_media');
console.log(`[repair] ${posts.length} bài trên web cũ`);
const mediaIds = [...new Set(posts.map((p) => p.featured_media).filter(Boolean))];
const media = {};
for (let i = 0; i < mediaIds.length; i += 100) {
  const r = await fetchRetry(`${API}/media?per_page=100&include=${mediaIds.slice(i, i + 100).join(',')}&_fields=id,source_url`);
  if (r.ok) for (const m of await r.json()) media[m.id] = { url: m.source_url };
}

const report = [];
for (const p of posts) {
  let a = local.get(oldPath(p.link).replace(/\/$/, ''));
  let created = false;
  if (!a) {
    // An old post not on the new site yet (published on the old site after the import).
    const t = plain(p.title?.rendered);
    if (!NEW || allTitles.has(slugify(t, 60))) continue;
    const year = p.date.slice(0, 4), slug = slugify(decodeURIComponent(p.slug || '') || t);
    a = { file: path.join(NEWS_DIR, year, `${slug}.md`), year, slug, body: '', created: true,
      fm: { title: t, category: category([], t).cat, date: p.date.slice(0, 10), author: 'Tiến Nông', featured: false, summary: '',
        cover: { src: '', focus: 'center', zoom: '100', alt: t }, cover_caption: '', album: [], album_link: '', tags: [], source: '', external_url: '', press_highlight: false, old_url: oldPath(p.link) } };
    created = true;
  }
  const html = preclean(p.content?.rendered || '');
  const title = a.fm.title || '';
  const imgBase = `${IMG_DIR}/${a.year || p.date.slice(0, 4)}/${a.slug}`;
  const srcsetOf = {};
  for (const m of html.matchAll(/<img[^>]*>/gi)) {
    const src = m[0].match(/\ssrc=["']([^"']+)["']/i)?.[1];
    if (src) srcsetOf[src] = decode(m[0].match(/\ssrcset=["']([^"']+)["']/i)?.[1] || '');
  }
  const firstImg = (html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1];
  const coverSrc = media[p.featured_media]?.url || firstImg;
  const coverStem = coverSrc ? stem(coverSrc) : '';
  if (created && coverSrc) {
    try { a.fm.cover.src = await saveImageAny(candidates(coverSrc, srcsetOf[coverSrc]), `${imgBase}.webp`, 1200, 72, `${imgBase}-480.webp`); } catch { /* no cover */ }
  }
  const hasCover = !!a.fm.cover?.src;
  const srcs = [...new Set([...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))];
  const plan = new Map();
  let n = 0;
  for (const s of srcs) {
    if (coverStem && stem(s) === coverStem && hasCover && !plan.size) { plan.set(s, null); continue; }
    plan.set(s, `${imgBase}-${++n}.webp`);
  }
  const ctx = {
    videos: 0, warn: [],
    image(node, caption = '') {
      const dest = plan.get(node.getAttribute('src'));
      if (!dest) return '';
      const alt = (plain(node.getAttribute('alt') || '') || caption || title).replace(/[[\]]/g, '');
      return `![${alt}](/${dest.replace(/^public\//, '')})`;
    },
    link(href) {
      if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return '';
      if (/^(mailto|tel):/i.test(href)) return href;
      if (isOldHost(href)) {
        const u = new URL(href, BASE);
        const hit = linkMap.get(decodeURI(u.pathname).replace(/\/$/, ''));
        if (hit) return `/tin-tuc/${hit}/`;
        if (/\.(jpe?g|png|gif|webp)$/i.test(u.pathname)) return '';
        return u.href;
      }
      return href;
    },
  };
  let body = tidy(makeTurndown(ctx).turndown(html));
  let summary = plain(p.excerpt?.rendered).replace(/\s*\[…\]\s*$|\s*\[\.\.\.\]\s*$|\s*Đọc tiếp.*$/i, '').trim();
  // A bold lead is taken as the summary only when it is the whole first paragraph and nothing else.
  const first = body.split(/\n{2,}/)[0].trim();
  const lead = first.match(/^\*\*([^*][\s\S]*?)\*\*$/);
  const norm = (t) => fold(t).replace(/[^a-z0-9]+/g, '');
  if (lead && !lead[1].includes('**') && summary && norm(lead[1]).startsWith(norm(summary).slice(0, 60))) {
    summary = lead[1].replace(/\s+/g, ' ').trim();
    body = body.slice(body.indexOf(first) + first.length).trimStart();
  } else if (summary && !/[.!?…”"]$/.test(summary)) summary += '…';
  if (summary.length > 420) summary = summary.slice(0, 400).replace(/\s+\S*$/, '') + '…';

  // Text still the "[…]" placeholder counts as no text.
  const placeholder = /^\s*\[[^\]]{2,}\]/.test(a.body.trim());
  const before = placeholder ? 0 : textOf(a.body).length, after = textOf(body).length;
  // Photos pasted from Word point at the writer's own computer (file:/C:/…) and never show on the site.
  const brokenImgs = /\]\(file:/i.test(a.body);
  const damaged = created || brokenImgs || (after > before + 150 && after > before * 1.3);
  if (!damaged) continue;
  const rec = { file: a.file, title, before, after, images: 0, downloaded: 0, failed: 0, created };
  if (WRITE) {
    for (const [s, dest] of plan) {
      if (!dest) continue;
      rec.images++;
      if (existsSync(dest)) continue;
      try { await saveImageAny(candidates(s, srcsetOf[s]), dest, 1080, 70); rec.downloaded++; }
      catch { rec.failed++; body = body.split(`(/${dest.replace(/^public\//, '')})`).join('(#)').replace(/!\[[^\]]*\]\(#\)\n*/g, ''); }
    }
    // Keep a summary written in the CMS; replace only an empty, placeholder or broken one.
    const keep = !created && a.fm.summary && !/\*\*|^\s*\[/.test(a.fm.summary) && (before > 0 || !placeholder) ? a.fm.summary : null;
    const fm = { ...a.fm, summary: placeholder && a.fm.summary && !/^\s*\[/.test(a.fm.summary) ? a.fm.summary : (keep ?? summary) };
    if (!fm.date) fm.date = p.date.slice(0, 10);
    await mkdir(path.dirname(a.file), { recursive: true });
    await writeFile(a.file, `---\n${YAML.stringify(fm, { lineWidth: 0 })}---\n\n${body}`);
  }
  report.push(rec);
}
await mkdir('migration', { recursive: true });
const md = [`# Sửa bài tin cũ bị mất nội dung (${WRITE ? 'đã ghi' : 'chỉ báo cáo'})`, '', `- Bài cần sửa: ${report.length}`, '',
  ...report.map((r) => `- ${r.created ? '(mới) ' : ''}${r.file.replace(NEWS_DIR + '/', '')}: ${r.before} → ${r.after} ký tự${WRITE ? `, ảnh ${r.images} (tải thêm ${r.downloaded}, lỗi ${r.failed})` : ''}`)].join('\n');
await writeFile('migration/repair-report.md', md + '\n');
console.log(md);
