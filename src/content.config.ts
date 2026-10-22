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
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
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
    // Press coverage ("bc") only: newspaper name, its logo, link to the original article,
    // and whether to show it in the "Báo chí nói về Tiến Nông" block on the news page.
    source: z.string().default(''),
    source_logo: image,
    external_url: z.string().default(''),
    press_highlight: z.boolean().default(false),
  }),
});

export const collections = { news };
