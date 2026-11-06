// Phrase banks for the English and Chinese sites (src/content/i18n/<en|zh>/*.json).
//
//   npm run i18n          updates the banks from the Vietnamese content and lists texts still untranslated
//   npm run i18n -- --ui  also collects the Vietnamese still left in the built English pages (dist/en),
//                         i.e. text written in the templates (run after `npm run build`)
//
// Each bank file holds { items: [{ vi, text }] }: `vi` is the Vietnamese text exactly as in the CMS,
// `text` its translation (empty = not translated yet, the page then shows the Vietnamese).
// When a Vietnamese text changes in the CMS, its old item stays (unused) and the new text is added empty.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LOCALES = ['en', 'zh'];
// The Chinese site leaves out Hoàng Sa / Trường Sa content (src/lib/i18n.ts, ZH_EXCLUDED): not translated, not counted.
const ZH_SKIP = (vi, group) => group === 'xanh-hoa-truong-sa' || /Trường Sa|Truong Sa|Hoàng Sa|Hoang Sa/i.test(vi) || /^biển đảo$/i.test(norm(vi));
const KEEP = new Set(['src', 'focus', 'zoom', 'key', 'anchor', 'mac_dinh', 'kieu', 'muc', 'line', 'code', 'tccs', 'order', 'featured',
  'certificate', 'tccs_pdf', 'old_url', 'email', 'phone', 'report_phone', 'value_link']);
const norm = (s) => s.normalize('NFC').replace(/[ \s]+/g, ' ').trim();
const wanted = (s) => {
  const v = norm(s);
  if (!v || /^(https?:|\/|#|mailto:|tel:|www\.)/i.test(v)) return false;
  if (/^\[[^\]]{1,80}\]$/.test(v)) return false; // "[…]" placeholder, never shown
  return /\p{L}/u.test(v) || /^\d{1,3}(\.\d{3})+\+?$/.test(v); // words, or numbers written the Vietnamese way (300.000+)
};

function collect(value, key, out) {
  // Kept as written (line breaks included, so translators see them); compared by norm().
  if (typeof value === 'string') { if (!KEEP.has(key) && wanted(value) && ![...out].some((x) => norm(x) === norm(value))) out.add(value.normalize('NFC').trim()); }
  else if (Array.isArray(value)) value.forEach((v) => collect(v, key, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) collect(v, k, out);
}

/** Group name → Vietnamese texts, in the order they appear. */
function sources() {
  const groups = new Map();
  const dir = path.join(ROOT, 'src/content/pages');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const set = new Set(); collect(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), '', set); groups.set(f.replace(/\.json$/, ''), set);
  }
  const site = new Set(); collect(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/site.json'), 'utf8')), '', site); groups.set('site', site);
  const prod = new Set();
  const pdir = path.join(ROOT, 'src/content/products');
  for (const f of fs.readdirSync(pdir).filter((f) => f.endsWith('.md')).sort()) {
    const m = fs.readFileSync(path.join(pdir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (m) collect(parse(m[1]), '', prod);
  }
  groups.set('san-pham-danh-muc', prod);
  return groups;
}

/** Vietnamese left in the built English pages (text written in the templates). */
function fromBuild() {
  const out = new Set();
  const VI = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    if (!p.endsWith('.html')) return;
    const html = fs.readFileSync(p, 'utf8').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '');
    const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    for (const m of html.matchAll(/>([^<>]+)</g)) { const v = norm(dec(m[1])); if (VI.test(v)) out.add(v); }
    for (const m of html.matchAll(/\s(?:aria-label|alt|title|placeholder|label|data-open|data-closed|data-topic|data-subject)="([^"]*)"/g)) { const v = norm(dec(m[1])); if (VI.test(v)) out.add(v); }
  });
  const dist = path.join(ROOT, 'dist/en');
  if (fs.existsSync(dist)) walk(dist);
  // Already English: a translation from a bank, or a sentence where Vietnamese only appears in names (Tiến Nông, Thanh Hóa…).
  const done = new Set();
  const dir = path.join(ROOT, 'src/content/i18n/en');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    for (const it of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items ?? []) if (it.text) done.add(norm(it.text));
  }
  const viWords = (s) => s.split(/[\s·,.;:()–—\-/]+/).filter(Boolean);
  const looksVi = (s) => { const w = viWords(s); const v = w.filter((x) => VI.test(x)).length; return v >= 1 && v / w.length > 0.45; };
  return new Set([...out].filter((v) => !done.has(v) && ![...done].some((d) => v.includes(d) && looksVi(v.replace(d, '')) === false) && looksVi(v)));
}

const groups = sources();
const known = new Set([...groups.values()].flatMap((s) => [...s].map(norm)));
if (process.argv.includes('--ui')) {
  const ui = new Set([...fromBuild()].filter((v) => !known.has(v)));
  const file = path.join(ROOT, 'src/content/i18n/en/giao-dien.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).items.map((x) => norm(x.vi)) : [];
  groups.set('giao-dien', new Set([...old, ...ui]));
}

let missing = 0;
const report = [];
for (const L of LOCALES) {
  const dir = path.join(ROOT, 'src/content/i18n', L);
  fs.mkdirSync(dir, { recursive: true });
  // Translations already made anywhere in this language are reused for the same Vietnamese text.
  const all = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    for (const it of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items ?? []) if (it.text?.trim()) all.set(norm(it.vi), it.text);
  }
  for (const [name, set0] of groups) {
    const set = L === 'zh' ? new Set([...set0].filter((vi) => !ZH_SKIP(vi, name))) : set0;
    if (L === 'zh' && name === 'xanh-hoa-truong-sa') { fs.rmSync(path.join(dir, `${name}.json`), { force: true }); continue; }
    const file = path.join(dir, `${name}.json`);
    const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).items ?? [] : [];
    const items = [...set].map((vi) => ({ vi, text: all.get(norm(vi)) ?? '' }));
    // Keep translations of texts no longer in the CMS at the end (they may come back).
    const now = new Set([...set].map(norm));
    for (const it of prev) if (!now.has(norm(it.vi)) && it.text?.trim() && !(L === 'zh' && ZH_SKIP(it.vi, name))) items.push(it);
    fs.writeFileSync(file, JSON.stringify({ items }, null, 2) + '\n');
    const todo = items.filter((x) => now.has(norm(x.vi)) && !x.text.trim()).length;
    missing += todo;
    if (todo) report.push(`${L}/${name}.json: ${todo} chưa dịch`);
  }
}
console.log(report.length ? report.join('\n') : 'Mọi nội dung đã có bản dịch EN và ZH.');
if (process.env.STRICT && missing) process.exit(1);
