/**
 * Lead forms (form[data-lead-form]). The submit button stays disabled until the
 * consent checkbox ([data-consent]) is ticked, as in the design. On a valid
 * submit the form is swapped for its "sent" panel (id in data-sent).
 *
 * TODO: no backend exists yet — post the FormData to the CRM/email endpoint
 * here once one is chosen; for now submissions are not sent anywhere.
 */
document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
  const consent = form.querySelector<HTMLInputElement>('input[data-consent]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const sent = form.dataset.sent ? document.getElementById(form.dataset.sent) : null;
  const sync = () => { if (consent && submit) submit.disabled = !consent.checked; };
  consent?.addEventListener('change', sync);
  sync();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    form.dispatchEvent(new CustomEvent('lead:sent', { detail: new FormData(form), bubbles: true }));
    if (sent) { form.hidden = true; sent.hidden = false; }
  });
  sent?.querySelector('[data-form-again]')?.addEventListener('click', () => {
    form.reset();
    sync();
    sent.hidden = true;
    form.hidden = false;
  });
});
