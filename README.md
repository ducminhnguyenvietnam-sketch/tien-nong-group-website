# Tiến Nông Group — website

Static [Astro](https://astro.build) build of the Claude Design prototype
"14.10.2026. Bản publish". The 13 pages, shared
header/footer and design-system components are recreated from the prototype's markup
and inline styles, so the layout matches the design.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
npm run check    # type check
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

**Photo framing tool** — `/cong-cu/can-anh/` (not linked, `noindex`): pick a slot, drag/zoom a
photo inside the slot's exact frame with phone and other previews, download a cropped JPEG at 2×
the slot size, then upload it in the CMS. Slot frames live in `src/data/photo-slots.json`
(measured from the built site at 1440px and 390px); update them if a layout changes size.
Each photo field in `.pages.yml` links to the tool with `?o=<slot>`.

## Not wired up yet

- **Forms** (Nông dân, Liên hệ, Giải pháp cho dự án) validate and show the design's
  "sent" panel but post nowhere: add the endpoint in `src/scripts/forms.ts`.
- **Empty links** (they render as `#`): social accounts, PDFs, press articles, privacy policy /
  terms, job detail pages, the EN switch — fill them in the CMS.
- **Content in [ngoặc vuông]** and sample data (dealers, jobs, article bodies) still need real values.
