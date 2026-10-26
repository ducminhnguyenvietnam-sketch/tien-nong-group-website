// Search index for the news list: one short row per article (title, date, category, address, year).
// Fetched by NewsArchive the first time someone searches or picks a year.
import { formatDate, getNews, isArticle, isPress } from '../../lib/news';

export async function GET() {
  const rows = (await getNews()).filter((e) => !isPress(e) && isArticle(e)).map((e) => ({
    t: e.data.title, d: formatDate(e.data.date), c: e.data.category, u: `/tin-tuc/${e.id}/`, y: e.data.date?.getFullYear() ?? 0,
  }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
