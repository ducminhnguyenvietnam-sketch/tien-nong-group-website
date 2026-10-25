import type { APIRoute } from 'astro';

/** robots.txt with the sitemap's absolute address (known only when SITE_URL is set at build time). */
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const lines = ['User-agent: *', 'Allow: /'];
  if (site) lines.push('', `Sitemap: ${new URL(`${base}/sitemap-index.xml`, site).href}`);
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
