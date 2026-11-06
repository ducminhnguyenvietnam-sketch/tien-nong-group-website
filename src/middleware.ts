/**
 * English and Chinese pages (/en/…, /zh/…), after they are rendered:
 *  1. links to Vietnamese pages are pointed at the same page in that language (/ve-tien-nong/ → /en/about/);
 *     news articles and uploaded files keep their address;
 *  2. text written into the templates (button labels, captions, aria-labels, form placeholders…) is
 *     translated from the phrase banks — page content is already translated when it is read (content.ts).
 * Vietnamese pages pass through untouched.
 */
import { defineMiddleware } from 'astro:middleware';
import { bank, localeOf, localizePath, norm, type Locale } from './lib/i18n';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Template texts built with a number or a name in them. */
const PATTERNS: Record<Exclude<Locale, 'vi'>, [RegExp, string][]> = {
  en: [
    [/^Trụ cột (\d+)$/, 'Pillar $1'],
    [/^Gọi (.+)$/, 'Call $1'],
    [/^Số lượng: (.+)$/, 'Openings: $1'],
    [/^Hạn nộp (.+)$/, 'Apply by $1'],
    [/^Xem video: (.+)$/, 'Watch video: $1'],
    [/^Trang (\d+)$/, 'Page $1'],
    [/^Tiêu chuẩn cơ sở (.+)$/, 'Company standard $1'],
    [/^Phát video (.+)$/, 'Play video: $1'],
  ],
  zh: [
    [/^Trụ cột (\d+)$/, '支柱 $1'],
    [/^Gọi (.+)$/, '致电 $1'],
    [/^Số lượng: (.+)$/, '招聘人数：$1'],
    [/^Hạn nộp (.+)$/, '截止日期 $1'],
    [/^Xem video: (.+)$/, '观看视频：$1'],
    [/^Trang (\d+)$/, '第 $1 页'],
    [/^Tiêu chuẩn cơ sở (.+)$/, '企业标准 $1'],
    [/^Phát video (.+)$/, '播放视频：$1'],
  ],
};

/** Numbers written the Vietnamese way (10.000 · 1,5) in the English / Chinese style (10,000 · 1.5). Phone numbers
 *  (02373.729.729) are left alone: a thousands group starts with at most three digits. */
export const numbers = (s: string) => s
  .replace(/(?<![\d.,])(\d{1,3})((?:\.\d{3})+)(?![\d.])/g, (_, a: string, b: string) => a + b.replace(/\./g, ','))
  .replace(/(?<![\d.,])(\d+),(\d{1,2})(?![\d,])/g, '$1.$2');

const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: ' ' })[e as string] ?? _);
const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => escText(s).replace(/"/g, '&quot;');

function translator(L: Exclude<Locale, 'vi'>) {
  const words = bank(L);
  const pats = PATTERNS[L];
  return (raw: string): string | null => {
    const key = norm(raw);
    if (!key || !/\p{L}/u.test(key)) return null;
    const hit = words.get(key);
    if (hit != null) return hit;
    for (const [re, to] of pats) {
      const m = key.match(re);
      if (m) return key.replace(re, (_, ...g) => to.replace(/\$(\d)/g, (__, i) => words.get(norm(String(g[Number(i) - 1]))) ?? String(g[Number(i) - 1])));
    }
    return null;
  };
}

/** Attributes whose value is read or heard by visitors. */
const ATTRS = /(\s(?:aria-label|aria-roledescription|alt|title|placeholder|label|data-open|data-closed|data-topic|data-subject|data-label|data-empty|data-next|data-prev|data-more)=")([^"]*)"/g;

export function translateHtml(html: string, L: Exclude<Locale, 'vi'>): string {
  const t = translator(L);
  // Links: Vietnamese page addresses → the same page in this language.
  html = html.replace(/(\shref=")([^"]*)"/g, (all, pre, value) => {
    const v = decode(value);
    if (!v.startsWith(`${BASE}/`) || v.startsWith('//')) return all;
    const path = v.slice(BASE.length);
    if (/^\/(en|zh)(\/|$)/.test(path) || /\.[a-z0-9]{2,5}([?#]|$)/i.test(path.split('#')[0])) return all;
    const to = localizePath(path, L);
    return to ? `${pre}${escAttr(BASE + to)}"` : all;
  });
  // Text between tags, outside <script> and <style>.
  const parts = html.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/i);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i]
      .replace(/>([^<>]+)</g, (all, text: string) => {
        const raw = decode(text);
        const out = t(raw) ?? (numbers(raw.trim()) !== raw.trim() ? numbers(raw.trim()) : null);
        if (out == null) return all;
        const lead = text.match(/^\s*/)![0], tail = text.match(/\s*$/)![0];
        return `>${lead}${escText(out)}${tail}<`;
      })
      .replace(ATTRS, (all, pre, value) => {
        const out = t(decode(value));
        return out == null ? all : `${pre}${escAttr(out)}"`;
      })
      .replace(/(<meta\s+(?:name|property)="(?:description|og:description|og:title|twitter:title)"\s+content=")([^"]*)"/g, (all, pre, value) => {
        const out = t(decode(value));
        return out == null ? all : `${pre}${escAttr(out)}"`;
      });
  }
  return parts.join('');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const L = localeOf(context.url);
  const response = await next();
  if (L === 'vi' || !response.headers.get('content-type')?.includes('text/html')) return response;
  const html = translateHtml(await response.text(), L);
  return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
});
