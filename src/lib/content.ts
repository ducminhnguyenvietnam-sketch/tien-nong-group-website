/**
 * Pages CMS deletes empty values when it saves (empty strings, empty lists and objects
 * whose fields are all empty). Pages must not depend on those keys existing, so every
 * content file is read through `withDefaults`, which rebuilds the full shape from the
 * field definitions in .pages.yml: missing text becomes "", missing lists become [],
 * missing objects are filled field by field, and select fields fall back to their default.
 */
import { parse } from 'yaml';
import cmsConfig from '../../.pages.yml?raw';

interface Field {
  name: string;
  type?: string;
  component?: string;
  list?: unknown;
  fields?: Field[];
  default?: unknown;
}
interface Entry { type: string; path?: string; fields?: Field[]; items?: Entry[] }

const config = parse(cmsConfig) as { components?: Record<string, Omit<Field, 'name'>>; content: Entry[] };

function resolve(f: Field): Field {
  if (!f.component) return f;
  const c = config.components?.[f.component];
  if (!c) throw new Error(`.pages.yml: unknown component "${f.component}"`);
  return { ...c, ...f, type: c.type, fields: c.fields };
}

function fillField(value: unknown, field: Field): unknown {
  const f = resolve(field);
  if (f.list) {
    const items = Array.isArray(value) ? value : [];
    return f.type === 'object' ? items.map((item) => fillObject(item, f.fields ?? [])) : items;
  }
  if (f.type === 'object') return fillObject(value, f.fields ?? []);
  return value ?? f.default ?? '';
}

function fillObject(value: unknown, fields: Field[]): Record<string, unknown> {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...v };
  for (const f of fields) out[f.name] = fillField(v[f.name], f);
  return out;
}

function findEntry(entries: Entry[], path: string): Entry | undefined {
  for (const e of entries) {
    if (e.type === 'group') {
      const found = findEntry(e.items ?? [], path);
      if (found) return found;
    } else if (e.path === path) return e;
  }
}

/**
 * Content file with every field from .pages.yml present.
 * @param path the file's path as written in .pages.yml, e.g. "src/content/pages/trang-chu.json"
 */
/**
 * The JSON file's own type, loosened so keys the CMS has pruned (and withDefaults puts
 * back) still type-check: known keys keep their types, unknown keys are `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose<T> = T extends (infer E)[] ? Loose<E>[] : T extends object ? { [K in keyof T]: Loose<T[K]> } & Record<string, any> : T;

export function withDefaults<T>(raw: T, path: string): Loose<T> {
  const entry = findEntry(config.content, path);
  if (!entry?.fields) throw new Error(`.pages.yml has no file entry for ${path}`);
  return fillObject(raw, entry.fields) as Loose<T>;
}

/** Placeholder text left from the design ("[Họ và tên]", "[x]", "[dd/mm]"…). */
const PLACEHOLDER = /\[[^\]\n]{1,80}\]/;

/** True when a CMS value has real content: not empty and not a "[…]" placeholder. */
export function isFilled(v: unknown): boolean {
  if (typeof v === 'string') return v.trim() !== '' && !PLACEHOLDER.test(v);
  if (Array.isArray(v)) return v.some(isFilled);
  if (v && typeof v === 'object') return Object.values(v).some(isFilled);
  return v != null && v !== false;
}

/** Removes "[…]" placeholders (with a separator in front of them) from a CMS string. */
export function stripPlaceholders(v: string | null | undefined): string {
  return (v ?? '').replace(/\s*[·•\-–—:]?\s*\[[^\]\n]{1,80}\]/g, '').trim();
}
