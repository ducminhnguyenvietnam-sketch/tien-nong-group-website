/**
 * Lead measurement for Google Tag Manager (only when PUBLIC_GTM_ID is set, see Layout.astro).
 *
 * Pushes one dataLayer event per contact action so GA4 and Google Ads can count them as conversions:
 *   generate_lead   a lead form was sent successfully (forms.ts fires "lead:sent")
 *   click_call      a tel: link (hotline, sales director, engineer)
 *   click_zalo      a Zalo link
 *   click_messenger a Messenger link
 *   click_email     a mailto: link
 *   file_download   a PDF (catalogue, company profile, TCCS)
 *
 * No name, phone number or email is ever sent: only the form, its topic and the province, which marketing
 * needs to see which region and which need the leads come from.
 */
type Layer = Record<string, unknown>[];
const w = window as unknown as { dataLayer?: Layer };

if (w.dataLayer) {
  const push = (o: Record<string, unknown>) => w.dataLayer!.push({ page_language: document.documentElement.lang, ...o });

  document.addEventListener('lead:sent', (e) => {
    const form = e.target as HTMLFormElement;
    const d = ((e as CustomEvent).detail ?? {}) as Record<string, string>;
    push({ event: 'generate_lead', lead_form: form.dataset.leadForm || form.id || 'form', lead_topic: d.need || d.chu_de || '', lead_province: d.province || '' });
  });

  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const where = a.closest('[id]')?.id || '';
    const label = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    let event = '';
    if (href.startsWith('tel:')) event = 'click_call';
    else if (/zalo\.me|zalo\.vn|oa\.zalo/i.test(href)) event = 'click_zalo';
    else if (/m\.me\/|messenger\.com/i.test(href)) event = 'click_messenger';
    else if (href.startsWith('mailto:')) event = 'click_email';
    else if (/\.pdf([?#]|$)/i.test(href)) event = 'file_download';
    if (event) push({ event, link_url: href.replace(/^tel:|^mailto:/, ''), link_text: label, link_section: where });
  });
}
