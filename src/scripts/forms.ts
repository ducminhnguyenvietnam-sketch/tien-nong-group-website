/**
 * Lead forms (form[data-lead-form]): Nông dân Tiến Nông, Giải pháp cho dự án, Liên hệ.
 *
 * The submit button stays disabled until the consent box ([data-consent]) is ticked. On submit the
 * fields are POSTed as JSON to PUBLIC_FORM_ENDPOINT (set at build time — a Google Apps Script web app,
 * Formspree, or the CRM's webhook). The "sent" panel (id in data-sent) only shows after a 2xx reply;
 * on failure the form stays filled in and an error with the hotline is shown.
 *
 * Without an endpoint the form cannot deliver anything, so it is replaced by call/Zalo buttons
 * (rendered by the page inside [data-form-fallback]) instead of pretending to send.
 *
 * A form with data-mailto="name@domain" (Liên hệ) is also forwarded to that mailbox through FormSubmit
 * (formsubmit.co), so it works with or without PUBLIC_FORM_ENDPOINT. FormSubmit asks the mailbox owner to
 * confirm once, on the first message it receives. data-subject sets the email subject prefix.
 */
/** Messages shown to the visitor, in the page's language (English / Chinese sites under /en/, /zh/). */
const LANG = document.documentElement.lang.slice(0, 2);
const MSG = LANG === 'en'
  ? { sending: 'Sending…', failed: (phone: string) => `Your request could not be sent. Please try again${phone ? ` or call ${phone}` : ''}.` }
  : LANG === 'zh'
    ? { sending: '正在发送…', failed: (phone: string) => `请求未能发送，请重试${phone ? `或致电 ${phone}` : ''}。` }
    : { sending: 'Đang gửi…', failed: (phone: string) => `Chưa gửi được yêu cầu. Vui lòng thử lại${phone ? ` hoặc gọi ${phone}` : ''}.` };
/** Field names as they read in the forwarded email (Vietnamese labels, consent box left out). */
const EMAIL_LABELS: Record<string, string> = {
  need: 'Chủ đề', name: 'Họ và tên', phone: 'Điện thoại', email: 'Email', province: 'Tỉnh / thành phố',
  message: 'Nội dung', company: 'Đơn vị', page: 'Gửi từ trang', sentAt: 'Thời gian gửi',
};
const forEmail = (d: Record<string, string>) => Object.fromEntries(Object.entries(d)
  .filter(([k, v]) => k !== 'consent' && k !== 'form' && v !== '')
  .map(([k, v]) => [EMAIL_LABELS[k] ?? k, k === 'sentAt' ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : v]));

const ENDPOINT: string = (import.meta.env.PUBLIC_FORM_ENDPOINT ?? '').trim();

document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
  const consent = form.querySelector<HTMLInputElement>('input[data-consent]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const sent = form.dataset.sent ? document.getElementById(form.dataset.sent) : null;
  const fallback = form.parentElement?.querySelector<HTMLElement>('[data-form-fallback]');

  const mailto = (form.dataset.mailto ?? '').trim();
  if (!ENDPOINT && !mailto) {
    if (fallback) { form.hidden = true; fallback.hidden = false; }
    return;
  }

  // Honeypot: real people never see or fill this field; bots usually do.
  const trap = document.createElement('input');
  Object.assign(trap, { type: 'text', name: '_website', tabIndex: -1, autocomplete: 'off' });
  trap.setAttribute('aria-hidden', 'true');
  trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  form.append(trap);

  const error = document.createElement('p');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  error.style.cssText = 'margin:0;padding:12px 14px;border-radius:var(--radius-md);background:var(--color-error-bg);color:var(--red-600);font-size:15px';
  submit?.insertAdjacentElement('beforebegin', error);

  const sync = () => { if (consent && submit) submit.disabled = !consent.checked; };
  consent?.addEventListener('change', sync);
  sync();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity() || submit?.disabled) return;
    error.hidden = true;
    const data: Record<string, string> = {};
    new FormData(form).forEach((v, k) => { if (typeof v === 'string') data[k] = v; });
    if (data._website) return; // bot
    delete data._website;
    // Fields without a name are sent under their visible label.
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((el, i) => {
      if (el.name || el === trap || el.type === 'checkbox') return;
      const label = el.closest('label')?.querySelector('span')?.textContent?.replace(/\s*\*$/, '').trim() || `field_${i}`;
      if (el.value) data[label] = el.value;
    });
    const label = submit?.textContent ?? '';
    if (submit) { submit.disabled = true; submit.textContent = MSG.sending; }
    try {
      const payload = { form: form.dataset.leadForm || form.dataset.sent || 'form', page: location.href, sentAt: new Date().toISOString(), ...data };
      const jobs: Promise<Response>[] = [];
      if (ENDPOINT) jobs.push(fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
        body: JSON.stringify(payload),
      }));
      if (mailto) {
        const topic = data.need || data.chu_de || '';
        const who = data.name || data.ho_ten || '';
        jobs.push(fetch(`https://formsubmit.co/ajax/${encodeURIComponent(mailto)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: [form.dataset.subject || 'Website Tiến Nông', topic, who].filter(Boolean).join(' – '),
            _template: 'table', _captcha: 'false', ...(data.email ? { _replyto: data.email } : {}),
            ...forEmail(payload),
          }),
        }));
      }
      // Sent when at least one destination accepted it.
      const results = await Promise.allSettled(jobs);
      if (!results.some((r) => r.status === 'fulfilled' && r.value.ok)) throw new Error('not sent');
      form.dispatchEvent(new CustomEvent('lead:sent', { detail: data, bubbles: true }));
      if (sent) { form.hidden = true; sent.hidden = false; sent.focus?.(); }
    } catch {
      const phone = document.documentElement.dataset.hotline;
      error.textContent = MSG.failed(phone);
      error.hidden = false;
    } finally {
      if (submit) { submit.textContent = label; sync(); }
    }
  });

  sent?.querySelector('[data-form-again]')?.addEventListener('click', () => {
    form.reset();
    sync();
    sent.hidden = true;
    form.hidden = false;
  });
});
