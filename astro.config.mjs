// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL / BASE_PATH are set by the deploy workflow (e.g. GitHub Pages serves
// the site under /<repo>/). Locally the site lives at the root.
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH || '/',
  // Pages are emitted as /slug/index.html so links stay clean (/ve-tien-nong/).
  trailingSlash: 'always',
  build: { format: 'directory' },
});
