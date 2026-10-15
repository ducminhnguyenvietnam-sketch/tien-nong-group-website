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

export default defineConfig({
  site: process.env.SITE_URL,
  base,
  markdown: { rehypePlugins: [rehypeBasePath] },
  // Pages are emitted as /slug/index.html so links stay clean (/ve-tien-nong/).
  trailingSlash: 'always',
  build: { format: 'directory' },
});
