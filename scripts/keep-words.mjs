// Keeps Vietnamese two-syllable words on one line in every built page: after the build, the two
// syllables of each word in src/data/vi-words.txt ("tham gia", "Tiến Nông", "phân bón"…) are joined with
// a non-breaking space, so justified text never ends a line in "tham" with "gia" on the next one.
// A left-to-right pass pairs syllables at most two at a time, so no long unbreakable runs appear.
// Done once at build time — phones download no dictionary. scripts/build-vi-words.py makes the list.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NB = ' ';
const SKIP = /^<(script|style|textarea|code|pre|svg|title)\b/i;
const strip = (s) => s.toLowerCase().replace(/^[“"‘'(\[«]+|[”"’'),.:;!?\]»…]+$/g, '');

async function htmlFiles(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p))); else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

export function joinWords(text, words, phrases = new Set()) {
  // Spaces that were pasted in as non-breaking (copied from the website into the CMS) are reset first,
  // so the word list below decides the line breaks, not an accidental join such as "loại cây".
  const p = text.replace(/\u00A0/g, ' ').split(/( +)/);
  const ok = (j) => p[j + 1] === ' ' && p[j] && p[j + 2] && !/[,.:;!?)\]”»…]$/.test(p[j]) && !/^[(“"«]/.test(p[j + 2]);
  for (let i = 0; i + 2 < p.length; i += 2) {
    // Three- and four-syllable phrases ("phòng thí nghiệm") stay whole.
    let n = 0;
    for (const len of [4, 3]) {
      if (i + 2 * (len - 1) >= p.length) continue;
      const parts = [];
      let fine = true;
      for (let k = 0; k < len; k++) { parts.push(strip(p[i + 2 * k])); if (k < len - 1 && p[i + 2 * k + 1] !== ' ') fine = false; }
      if (fine && phrases.has(parts.join(' '))) { n = len; break; }
    }
    if (n) { for (let k = 0; k < n - 1; k++) p[i + 2 * k + 1] = NB; i += 2 * (n - 1); continue; }
    if (!ok(i)) continue;
    if (words.has(`${strip(p[i])} ${strip(p[i + 2])}`)) { p[i + 1] = NB; i += 2; }
  }
  return p.join('');
}

export function processHtml(html, words, phrases) {
  let skip = null;
  return html.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, text) => {
    if (tag) {
      const open = tag.match(SKIP);
      if (open && !tag.endsWith('/>')) skip = open[1].toLowerCase();
      else if (skip && new RegExp(`^</${skip}\\b`, 'i').test(tag)) skip = null;
      return tag;
    }
    return skip || !/[A-Za-zÀ-ỹ]/.test(text) ? text : joinWords(text, words, phrases);
  });
}

export default function keepWords() {
  return {
    name: 'keep-words',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const words = new Set((await fs.readFile('src/data/vi-words.txt', 'utf8')).split('\n').map((w) => w.trim()).filter(Boolean));
        const phrases = new Set((await fs.readFile('src/data/vi-phrases.txt', 'utf8')).split('\n').map((w) => w.trim().toLowerCase()).filter((w) => w && !w.startsWith('#')));
        const files = await htmlFiles(fileURLToPath(dir));
        await Promise.all(files.map(async (f) => {
          const html = await fs.readFile(f, 'utf8');
          const out = processHtml(html, words, phrases);
          if (out !== html) await fs.writeFile(f, out);
        }));
        logger.info(`giữ ${words.size} từ ghép cùng dòng trên ${files.length} trang`);
      },
    },
  };
}
