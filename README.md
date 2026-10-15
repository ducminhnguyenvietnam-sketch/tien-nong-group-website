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
| `src/pages/` | One file per page (`index.astro` = Trang chủ, `ve-tien-nong.astro`, …) |
| `src/layouts/Layout.astro` | `<head>`, fonts, sticky header, footer, shared scripts |
| `src/components/` | `SiteHeader`, `SiteFooter`, `ImageSlot`, and the design-system `Button`, `Input`, `Select`, `Checkbox`, `Tabs` |
| `src/styles/` | Design tokens and base copied from the design system, plus `global.css` |
| `src/scripts/` | Small vanilla scripts: `picker` (timeline/tabs), `chipfilter`, `accordion`, `forms`, `nowrap` |
| `src/lib/routes.ts` | Page slugs, main navigation and the `url()` helper |

## Photos

Every photo position is an `<ImageSlot id="…">` that shows a labelled placeholder
describing the photo needed. To fill one, put a file named after the slot id in
`public/images/` — e.g. `public/images/hero-a.jpg` (`.webp`, `.avif`, `.jpg`, `.jpeg`
or `.png`) — and rebuild. The id is printed under each placeholder.

## Not wired up yet

- **Forms** (Nông dân, Liên hệ, Giải pháp cho dự án) validate and show the design's
  "sent" panel but post nowhere: add the endpoint in `src/scripts/forms.ts`.
- **Placeholder links (`href="#"`)**: social accounts, PDFs (catalogue, hồ sơ năng lực,
  SDS), press articles, privacy policy / terms, job detail pages, the EN switch.
- **Content in [ngoặc vuông]** and sample data (dealers, jobs, articles) still need real values,
  as listed in the design chat.
