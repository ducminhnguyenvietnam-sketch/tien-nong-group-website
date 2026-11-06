// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { readFileSync } from 'node:fs';
import oldLinks from './scripts/old-links.mjs';
import keepWords from './scripts/keep-words.mjs';

// SITE_URL / BASE_PATH are set by the deploy workflow (e.g. GitHub Pages serves
// the site under /<repo>/). Locally the site lives at the root.
const base = process.env.BASE_PATH || '/';

/** Resized copies made by scripts/optimize-images.mjs (src/generated/images.json), read when articles render. */
/** @type {Record<string, { w: number, h: number, variants: { w: number, path: string }[] }> | null} */
let manifest = null;
/** @returns {Record<string, { w: number, h: number, variants: { w: number, path: string }[] }>} */
const sized = () => {
  if (manifest) return manifest;
  try { manifest = JSON.parse(readFileSync('src/generated/images.json', 'utf8')); } catch { manifest = {}; }
  return manifest ?? {};
};

/**
 * A photo inserted in an article from the CMS (/uploads/x.jpg, often a 2–3 MB original) is served as its
 * compressed WebP copy at most 1600 px wide, with smaller copies for phones (srcset), so editors can
 * upload photos straight from the camera without slowing the page.
 */
function rehypeArticlePhotos() {
  /** @param {any} node */
  const walk = (node) => {
    if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
      const m = sized()[node.properties.src];
      if (m?.variants?.length) {
        const best = [...m.variants].filter((v) => v.w <= 1600).pop() || m.variants[0];
        node.properties.src = best.path;
        const pre = base.replace(/\/$/, '');
        node.properties.srcSet = m.variants.filter((v) => v.w <= 1600).map((v) => `${pre}${v.path} ${v.w}w`).join(', ') || undefined;
        node.properties.sizes = '(max-width: 767px) 92vw, 780px';
        node.properties.width = best.w;
        node.properties.height = Math.round((m.h / m.w) * best.w);
      }
    }
    node.children?.forEach(walk);
  };
  return walk;
}

/** Prefix root-relative image/link URLs written by the CMS (/uploads/…) with the deploy base path. */
function rehypeBasePath() {
  const prefix = base.replace(/\/$/, '');
  /** @param {unknown} v */
  const fix = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && prefix && !v.startsWith(prefix + '/') ? prefix + v : v);
  /** @param {any} node */
  const walk = (node) => {
    if (node.properties) {
      if ('src' in node.properties) node.properties.src = fix(node.properties.src);
      if ('href' in node.properties) node.properties.href = fix(node.properties.href);
      // Photos inside articles load as they scroll into view.
      if (node.tagName === 'img') { node.properties.loading = 'lazy'; node.properties.decoding = 'async'; }
    }
    node.children?.forEach(walk);
  };
  return walk;
}

/**
 * Drops placeholder text the design left in articles ("[Nội dung bài viết]", "[Trích dẫn …]") so it never
 * reaches the public page: a paragraph that is only a placeholder is removed, a "[Nội dung mẫu]" lead-in is cut,
 * and a blockquote left empty is removed.
 */
function rehypeDropPlaceholders() {
  const PH = /\[[^\]\n]{1,80}\]/;
  /** @param {any} n */
  const text = (n) => (n.type === 'text' ? n.value : (n.children || []).map(text).join(''));
  /** @param {any} n */
  const onlyPlaceholder = (n) => {
    const t = text(n).replace(/[“”"'—–\-\s]/g, ' ').trim();
    return t !== '' && t.replace(new RegExp(PH.source, 'g'), '').trim() === '';
  };
  /** @param {any} node */
  const walk = (node) => {
    if (!node.children) return;
    node.children = node.children.filter((/** @type {any} */ ch) => {
      if (ch.type === 'element' && ['p', 'li', 'figcaption'].includes(ch.tagName) && onlyPlaceholder(ch)) return false;
      if (ch.type === 'text') ch.value = ch.value.replace(/^\s*\[Nội dung mẫu\]\s*/, '');
      walk(ch);
      if (ch.type === 'element' && ch.tagName === 'blockquote' && !text(ch).trim()) return false;
      return true;
    });
  };
  return walk;
}

export default defineConfig({
  site: process.env.SITE_URL,
  // Sitemap only when the public URL is known (CI); internal tools stay out of it.
  integrations: [...(process.env.SITE_URL ? [sitemap({ filter: (page) => !/\/(quan-tri|admin)\//.test(page) })] : []), oldLinks({ base }), keepWords()],
  base,
  markdown: { processor: unified({ rehypePlugins: [rehypeArticlePhotos, rehypeBasePath, rehypeDropPlaceholders] }) },
  // Pages are emitted as /slug/index.html so links stay clean (/ve-tien-nong/).
  trailingSlash: 'always',
  build: { format: 'directory' },
});
