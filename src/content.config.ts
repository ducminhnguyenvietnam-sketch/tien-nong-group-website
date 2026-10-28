import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Photo as stored by the CMS: uploaded file, focus point, zoom and alt text. */
const image = z.object({
  src: z.string().default(''),
  focus: z.string().default('center'),
  zoom: z.coerce.string().default('100'),
  alt: z.string().default(''),
}).default({});

const news = defineCollection({
  // Articles imported from the old site live in year folders (news/2015/…); the address is the file
  // name alone, so /tin-tuc/<file-name>/ whichever folder the file is in.
  loader: glob({ pattern: '**/*.md', base: './src/content/news', generateId: ({ entry }) => entry.replace(/\.md$/, '').split('/').pop()! }),
  schema: z.object({
    title: z.string(),
    category: z.enum(['tn', 'khcn', 'kt', 'nd', 'cd', 'bc']),
    // The CMS saves an empty date as ""; treat that as "no date yet".
    date: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional()),
    author: z.string().default('Phòng Truyền thông'),
    featured: z.boolean().default(false),
    summary: z.string().default(''),
    cover: image,
    cover_caption: z.string().default(''),
    album: z.array(image).default([]),
    album_link: z.string().default(''),
    tags: z.array(z.string()).default([]),
    // Press coverage ("bc") only: newspaper name, link to the original article,
    // and whether to show it in the "Báo chí nói về Tiến Nông" block on the news page.
    source: z.string().default(''),
    external_url: z.string().default(''),
    press_highlight: z.boolean().default(false),
    // Address of the article on the old WordPress site (tiennong.vn/…), redirected to the new page.
    old_url: z.string().default(''),
  }),
});

/** Products (src/content/products/*.md): one file per product, from the old site's catalogue and the CMS. */
const products = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    // cd = chuyên dùng, dd = đa dụng, hc = hữu cơ, cnc = công nghệ cao
    line: z.string().default('dd'),
    order: z.coerce.number().default(999),
    featured: z.boolean().default(false),
    crops: z.array(z.string()).default([]),
    summary: z.string().default(''),
    type: z.string().default(''),
    code: z.coerce.string().default(''),
    tccs: z.coerce.string().default(''),
    method: z.string().default(''),
    pack: z.string().default(''),
    shelf_life: z.string().default(''),
    production: z.string().default(''),
    standards: z.string().default(''),
    npk: z.array(z.object({ value: z.coerce.string().default(''), unit: z.string().default('') })).default([]),
    composition: z.array(z.object({ name: z.string().default(''), value: z.coerce.string().default(''), method: z.string().default('') })).default([]),
    benefits: z.array(z.string()).default([]),
    usage: z.array(z.object({ title: z.string().default(''), rate: z.string().default(''), timing: z.string().default(''), method: z.string().default(''), note: z.string().default('') })).default([]),
    safety: z.array(z.string()).default([]),
    front: image, back: image, granule: image, field: image,
    certificate: z.string().default(''),
    old_url: z.string().default(''),
  }),
});

export const collections = { news, products };
