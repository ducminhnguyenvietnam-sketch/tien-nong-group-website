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
 */
const ENDPOINT: string = (import.meta.env.PUBLIC_FORM_ENDPOINT ?? '').trim();

document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
  const consent = form.querySelector<HTMLInputElement>('input[data-consent]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const sent = form.dataset.sent ? document.getElementById(form.dataset.sent) : null;
  const fallback = form.parentElement?.querySelector<HTMLElement>('[data-form-fallback]');

  if (!ENDPOINT) {
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
    if (submit) { submit.disabled = true; submit.textContent = 'Đang gửi…'; }
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
        body: JSON.stringify({ form: form.dataset.leadForm || form.dataset.sent || 'form', page: location.href, sentAt: new Date().toISOString(), ...data }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.dispatchEvent(new CustomEvent('lead:sent', { detail: data, bubbles: true }));
      if (sent) { form.hidden = true; sent.hidden = false; sent.focus?.(); }
    } catch {
      const phone = document.documentElement.dataset.hotline;
      error.textContent = `Chưa gửi được yêu cầu. Vui lòng thử lại${phone ? ` hoặc gọi ${phone}` : ''}.`;
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
