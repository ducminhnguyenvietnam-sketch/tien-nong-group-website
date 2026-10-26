// Saves the old campaign page tiennong.vn/mamxanh/ ("Triệu lời chúc – Triệu mầm xanh") for the new
// "Xanh hoá Trường Sa" page: the raw HTML, its images, and the wishes table as JSON
// (migration/mamxanh/). Runs on GitHub Actions like the news import.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PAGE = 'https://tiennong.vn/mamxanh/';
const OUT = 'migration/mamxanh';
const UA = { 'User-Agent': 'TienNong-migration/1.0 (+github actions)' };
await mkdir(`${OUT}/img`, { recursive: true });

const html = await (await fetch(PAGE, { headers: UA })).text();
await writeFile(`${OUT}/page.html`, html);

// Scripts and styles the page loads (to see how wishes were sent and counted).
const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css|png|jpe?g|webp|svg|gif)(?:\?[^"']*)?)["']/gi)].map((m) => m[1]);
for (const a of [...new Set(assets)]) {
  try {
    const u = new URL(a, PAGE);
    if (!/tiennong\.vn$/.test(u.hostname)) continue;
    const r = await fetch(u, { headers: UA });
    if (!r.ok) continue;
    const name = decodeURIComponent(u.pathname).replace(/^\/+/, '').replace(/\//g, '__');
    const dir = /\.(js|css)$/i.test(u.pathname) ? `${OUT}/code` : `${OUT}/img`;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await r.arrayBuffer()));
    console.log('saved', name);
  } catch (e) { console.log('skip', a, e.message); }
}

// Wishes table: STT | Họ tên | Đơn vị | Nội dung
const text = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/[ \t]+/g, ' ').trim();
const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1])));
const wishes = rows.filter((r) => r.length >= 4 && /^\d+$/.test(r[0])).map(([stt, name, unit, msg]) => ({ stt: Number(stt), name, unit, msg }));
await writeFile(`${OUT}/wishes.json`, JSON.stringify(wishes, null, 1));
console.log(`${wishes.length} dòng lời chúc, ${wishes.filter((w) => w.msg).length} có nội dung`);
