// Keeps links to the old WordPress site working once tiennong.vn points at the new site.
// After the build, every article and product with an `old_url` (set when it was imported from the old site) gets a
// small page at that old address which forwards to the article's new address (/tin-tuc/<slug>/), and
// the addresses in src/content/redirects.json (old pages and categories) forward to their new pages.
// GitHub Pages has no server-side redirects, so these are static pages with a meta refresh + canonical
// link, which search engines treat as a permanent move. Existing pages are never overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const page = (to) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Đang chuyển trang…</title>` +
  `<link rel="canonical" href="${esc(to)}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${esc(to)}">` +
  `<script>location.replace(${JSON.stringify(to)}+location.hash)</script></head><body><p>Trang đã chuyển: <a href="${esc(to)}">${esc(to)}</a></p></body></html>`;

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

export default function oldLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/$/, '');
  let site = '';
  return {
    name: 'old-links',
    hooks: {
      'astro:config:done': ({ config }) => { site = config.site ? String(config.site).replace(/\/$/, '') : ''; },
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const pairs = [];
        for (const [dirName, prefixPath] of [['src/content/news', '/tin-tuc/'], ['src/content/products', '/san-pham/']]) {
          for (const file of await walk(dirName)) {
            const fm = (await fs.readFile(file, 'utf8')).match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
            const old = fm.match(/^old_url:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
            if (old) pairs.push([old, `${prefixPath}${path.basename(file, '.md')}/`]);
          }
        }
        try { for (const [from, to] of Object.entries(JSON.parse(await fs.readFile('src/content/redirects.json', 'utf8')))) pairs.push([from, to]); } catch { /* no extra redirects */ }
        let made = 0;
        for (const [from, to] of pairs) {
          const rel = decodeURI(from).replace(/^\/+|\/+$/g, '');
          if (!rel || rel.includes('..')) continue;
          const target = path.join(out, rel, 'index.html');
          try { await fs.access(target); continue; } catch { /* free */ }
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, page(/^https?:/.test(to) ? to : site + prefix + to));
          made++;
        }
        logger.info(`${made} trang chuyển hướng từ địa chỉ cũ`);
      },
    },
  };
}
