// Lists content that is not ready to publish: "[…]" placeholders, empty photos, empty links and
// articles without a date. Warnings only by default; STRICT=1 makes them fail the build (use it when
// the site goes live). Run: npm run check:content
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PH = /\[[^\]\n]{1,80}\]/;
const issues = [];
const note = (file, where, what) => issues.push(`${file}  ${where}  ${what}`);

function walk(file, v, where = '') {
  if (typeof v === 'string') {
    if (PH.test(v) && !/\]\(/.test(v)) note(file, where, `nội dung mẫu: ${v.slice(0, 60)}`);
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(file, x, `${where}[${i}]`));
  else if (v && typeof v === 'object') {
    if ('focus' in v && 'zoom' in v && !v.src) note(file, where, `chưa có ảnh (${v.alt || 'không mô tả'})`);
    for (const [k, x] of Object.entries(v)) walk(file, x, where ? `${where}.${k}` : k);
  }
}

const pagesDir = path.join(ROOT, 'src/content/pages');
for (const f of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
  walk(`pages/${f}`, JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf8')));
}
walk('site.json', JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/site.json'), 'utf8')));

const newsDir = path.join(ROOT, 'src/content/news');
for (const f of fs.readdirSync(newsDir).filter((f) => f.endsWith('.md'))) {
  const src = fs.readFileSync(path.join(newsDir, f), 'utf8');
  const [, fm = '', body = ''] = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) || [];
  if (!/^date:\s*\S/m.test(fm)) note(`news/${f}`, 'date', 'chưa có ngày đăng');
  if (PH.test(body.replace(/\[[^\]]*\]\([^)]*\)/g, ''))) note(`news/${f}`, 'body', 'thân bài còn nội dung mẫu');
  if (PH.test(fm.match(/^summary:.*$/m)?.[0] ?? '')) note(`news/${f}`, 'summary', 'tóm tắt còn nội dung mẫu');
}

const strict = process.env.STRICT === '1';
if (issues.length) {
  console.log(`[nội dung] ${issues.length} mục chưa sẵn sàng công bố${strict ? '' : ' (chỉ cảnh báo; STRICT=1 để chặn build)'}:`);
  for (const i of issues) console.log('  - ' + i);
} else console.log('[nội dung] Không còn nội dung mẫu.');
process.exit(strict && issues.length ? 1 : 0);
