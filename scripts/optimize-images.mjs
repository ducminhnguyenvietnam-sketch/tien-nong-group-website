// Makes resized WebP copies of every photo in public/uploads and public/images, so pages can serve a
// right-sized image (srcset) instead of the 2–6 MB originals the CMS stores. Runs before `astro dev` and
// `astro build` (package.json pre-scripts). Output is generated, never committed:
//   public/_img/<name>-<hash>-<width>.webp   resized copies (re-used while the source file is unchanged)
//   src/generated/images.json                { "/uploads/x.jpg": { w, h, variants: [{ w, path }] } }
// ImageSlot reads the manifest; a photo missing from it is served as before.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCES = ['public/uploads', 'public/images'];
const OUT_DIR = path.join(ROOT, 'public', '_img');
const MANIFEST = path.join(ROOT, 'src', 'generated', 'images.json');
const WIDTHS = [480, 960, 1600];
const MAX_WIDTH = 2000;
const EXT = /\.(jpe?g|png|webp)$/i;

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'img';

async function list(dir) {
  try { return (await fs.readdir(path.join(ROOT, dir))).filter((f) => EXT.test(f)).map((f) => path.join(dir, f)); }
  catch { return []; }
}

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
const files = (await Promise.all(SOURCES.map(list))).flat();
const manifest = {};
const keep = new Set();
let made = 0, reused = 0, failed = 0;

async function processFile(rel) {
  const abs = path.join(ROOT, rel);
  const buf = await fs.readFile(abs);
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
  const meta = await sharp(buf, { failOn: 'none' }).rotate().metadata();
  // .rotate() honours EXIF orientation; report the displayed size.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;
  if (!width || !height) return;
  const targets = [...WIDTHS.filter((w) => w < width), Math.min(width, MAX_WIDTH)];
  const base = slug(path.basename(rel, path.extname(rel)));
  const variants = [];
  for (const w of [...new Set(targets)].sort((a, b) => a - b)) {
    const name = `${base}-${hash}-${w}.webp`;
    const out = path.join(OUT_DIR, name);
    keep.add(name);
    try { await fs.access(out); reused++; }
    catch {
      await sharp(buf, { failOn: 'none' }).rotate().resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 }).toFile(out);
      made++;
    }
    variants.push({ w, path: `/_img/${name}` });
  }
  const key = '/' + rel.replace(/^public\//, '').split(path.sep).join('/');
  manifest[key] = { w: width, h: height, variants };
}

const queue = [...files];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const rel = queue.shift();
    try { await processFile(rel); } catch (e) { failed++; console.warn(`[images] skipped ${rel}: ${e.message}`); }
  }
}));

// Articles imported from the old site (public/uploads/tin-cu/<year>/) arrive already compressed: the
// cover at ≤1200px plus a 480px copy next to it (<name>-480.webp). They are listed as-is instead of being
// copied again, which keeps ~5,000 archive photos from multiplying the size of the site.
async function archiveCovers() {
  const root = path.join(ROOT, 'public', 'uploads', 'tin-cu');
  let years = [];
  try { years = await fs.readdir(root); } catch { return; }
  for (const y of years) {
    let names = [];
    try { names = await fs.readdir(path.join(root, y)); } catch { continue; }
    const set = new Set(names);
    for (const f of names) {
      const thumb = f.replace(/\.webp$/, '-480.webp');
      if (!f.endsWith('.webp') || f === thumb || !set.has(thumb)) continue;
      try {
        const meta = await sharp(path.join(root, y, f)).metadata();
        const key = `/uploads/tin-cu/${y}/${f}`;
        manifest[key] = { w: meta.width, h: meta.height, variants: [...(meta.width > 480 ? [{ w: 480, path: `/uploads/tin-cu/${y}/${thumb}` }] : []), { w: meta.width, path: key }] };
      } catch { /* unreadable: served as a plain image */ }
    }
  }
}
await archiveCovers();

// Drop copies of photos that were replaced or deleted.
for (const f of await fs.readdir(OUT_DIR)) if (!keep.has(f)) await fs.rm(path.join(OUT_DIR, f));
await fs.writeFile(MANIFEST, JSON.stringify(manifest));
console.log(`[images] ${files.length} photos · ${made} new copies · ${reused} reused${failed ? ` · ${failed} skipped` : ''}`);
