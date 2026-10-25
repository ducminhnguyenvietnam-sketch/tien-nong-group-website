// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL / BASE_PATH are set by the deploy workflow (e.g. GitHub Pages serves
// the site under /<repo>/). Locally the site lives at the root.
const base = process.env.BASE_PATH || '/';

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
  base,
  markdown: { rehypePlugins: [rehypeBasePath, rehypeDropPlaceholders] },
  // Pages are emitted as /slug/index.html so links stay clean (/ve-tien-nong/).
  trailingSlash: 'always',
  build: { format: 'directory' },
});
