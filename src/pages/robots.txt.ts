import type { APIRoute } from 'astro';

/** robots.txt with the sitemap's absolute address (known only when SITE_URL is set at build time). */
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  // GitHub Pages preview: nothing may be indexed (the real site lives on its own domain).
  if (import.meta.env.PUBLIC_PREVIEW === '1') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /quan-tri/', 'Disallow: /admin/'];
  if (site) lines.push('', `Sitemap: ${new URL(`${base}/sitemap-index.xml`, site).href}`);
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
