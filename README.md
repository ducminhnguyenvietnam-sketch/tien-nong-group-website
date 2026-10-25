# Tiến Nông Group — website

Static [Astro](https://astro.build) build of the Claude Design prototype
"14.10.2026. Bản publish". The 13 pages, shared
header/footer and design-system components are recreated from the prototype's markup
and inline styles, so the layout matches the design.

```sh
npm install
npm run dev            # http://localhost:4321 (makes the resized photos first)
npm run build          # static site in dist/ (makes the resized photos first)
npm run check          # type check
npm run check:content  # lists "[…]" placeholders, missing photos, undated articles (STRICT=1 to fail)
```

Pushing to `main` deploys the site to GitHub Pages (`.github/workflows/deploy.yml`).

## Structure

| Path | What |
| --- | --- |
| `src/pages/` | One file per page (`index.astro` = Trang chủ, …); `tin-tuc/[slug].astro` renders each article |
| `src/layouts/Layout.astro` | `<head>`, fonts, sticky header, footer, shared scripts |
| `src/components/` | `SiteHeader`, `SiteFooter`, `ImageSlot`, and the design-system `Button`, `Input`, `Select`, `Checkbox`, `Tabs` |
| `src/styles/` | Design tokens and base copied from the design system, plus `global.css` |
| `src/scripts/` | Small vanilla scripts: `picker` (timeline/tabs), `chipfilter`, `accordion`, `forms`, `nowrap` |
| `src/lib/` | `routes.ts` (slugs, nav, `url()`, `asset()`, `link()`), `news.ts` (article helpers) |

## Editing content (Pages CMS)

All text, photos, links and lists are edited in [Pages CMS](https://app.pagescms.org)
(configured by `.pages.yml`); each save commits to `main` and redeploys. Staff guide (Vietnamese):
[`HUONG-DAN-QUAN-TRI.md`](HUONG-DAN-QUAN-TRI.md).

| Content | File |
| --- | --- |
| Page text, photos, links and lists, per section | `src/content/pages/<page>.json` |
| News articles (one per file; pages at `/tin-tuc/<file>/`) | `src/content/news/*.md` |
| Company info, social links, menu and footer labels | `src/content/site.json` |
| Uploaded photos and documents | `public/uploads/` |

Pages read their text as `{c.<section>.<key>}`, always through `withDefaults()`
(`src/lib/content.ts`): Pages CMS deletes empty fields, lists and groups when it saves, and
`withDefaults` rebuilds the full shape from `.pages.yml`, so a save can never remove a key the
templates rely on. A photo is
`{ src, focus, zoom, alt }` and is rendered by `ImageSlot`; an empty `src` shows the
design's labelled placeholder. If you change a page's structure, update both its JSON
file and the matching entry in `.pages.yml`.

**On-site photo editor** — open any page with `?sua-anh` (stays on per browser until "Thoát"):
each `ImageSlot` (tagged with `cms="<file>#<path>"`) gets an edit button; editors upload,
drag and zoom inside the real frame and save. `src/scripts/photo-editor.ts` resizes the
upload (≤ 2400 px, JPEG) and makes one commit via the GitHub API with the file in
`public/uploads/` and `{ src, focus: "X% Y%", zoom }` in the content file, using a fine-grained
token (Contents: write, Actions: read) stored in the browser. It is only loaded in edit mode.

## Design system (giao diện v2)

- **Type scale** — tokens in `src/styles/tokens.css` (`--type-display`, `--type-h1/h2/h3`, `--type-stat`,
  `--type-num`, `--type-eyebrow`, `--type-quote`, `--fs-lead`, `--fs-body`), with a smaller set for phones.
  Pages use them as `font:var(--type-h2)`; never hard-code a heading size or weight 800, and never
  `text-align: justify`.
- **Layout helpers** — `src/styles/v2.css`: `g-stack` (two-column grid → one column under 480px),
  `m-scroll` (card row → swipe row on phones), `data-needs-photos` (block hidden until it has a photo,
  still visible in `?sua-anh`).
- **Missing content** — `isFilled()` / `stripPlaceholders()` in `src/lib/content.ts` keep "[…]" placeholders
  and empty items off the public pages; article paragraphs that are only a placeholder are dropped at
  build time (`astro.config.mjs`). Empty photo slots show a quiet brand tile.
- **Motion** — `src/scripts/motion.ts` (fade-up on scroll, count-up numbers, photo fade-in) and the motion
  block of `v2.css` (hero drift, hover, page cross-fade). Off with `prefers-reduced-motion` and in `?sua-anh`.
- **Photos** — `scripts/optimize-images.mjs` runs before dev/build and writes resized WebP copies to
  `public/_img/` plus `src/generated/images.json` (both generated, not committed); `ImageSlot` serves them
  with `srcset`. The deploy workflow caches `public/_img`.
- **Header / footer** — compact sticky header, full-screen menu on tablet/phone, a call/Zalo action bar on
  phones. "Gọi kỹ sư" uses *Hotline kỹ sư* (site settings) or else the company phone.

## Forms

The three lead forms POST JSON to `PUBLIC_FORM_ENDPOINT` (a Google Apps Script web app, Formspree, or a
CRM webhook). Set it as the repository variable **FORM_ENDPOINT** (Settings → Secrets and variables →
Actions → Variables); the workflow passes it to the build. "Đã gửi" only shows after a 2xx reply. Until the
variable is set, each form is replaced by call / Zalo / email buttons so nobody fills in a form that
goes nowhere.

## Still to fill in (content)

Run `npm run check:content` for the current list: "[…]" placeholders, sample dealers and jobs, article
bodies, missing photos and PDFs. They are hidden on the site until filled in.
