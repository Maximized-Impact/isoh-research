/* Data notice: adds the OSF pre-registration link from study7/config.js (hidden while the address is empty) and, when
   ?lang= names another delivered language, swaps the text for that language's strings. English is in the HTML itself. */
(() => {
  'use strict';
  const cfg = window.STUDY7_CONFIG || {};
  if (cfg.OSF_PREREG_URL) { document.getElementById('preregLink').href = cfg.OSF_PREREG_URL; document.getElementById('preregLine').hidden = false; }
  const lang = new URLSearchParams(window.location.search).get('lang');
  if (!lang || lang === 'en') return;
  fetch('/assets/lang/study7/index.json').then((r) => r.json()).then((manifest) => {
    const entry = manifest.languages.find((l) => l.code === lang);
    if (!entry) return null;
    return fetch(`/assets/lang/study7/${entry.file}`).then((r) => r.json());
  }).then((S) => {
    if (!S) return;
    const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S);
    document.documentElement.lang = lang; document.documentElement.dir = S._meta.dir || 'ltr';
    document.querySelectorAll('[data-s]').forEach((el) => { const v = get(el.dataset.s); if (typeof v === 'string') el.textContent = v; });
    document.getElementById('turnstileLink').href = S.data_notice.p3_link.url;
    const c = document.getElementById('contact'); const parts = S.data_notice.contact.split('janne@maximized-impact.org');
    c.textContent = ''; c.append(parts[0]); const a = document.createElement('a'); a.href = 'mailto:janne@maximized-impact.org'; a.textContent = 'janne@maximized-impact.org'; c.append(a, parts[1] || '');
    document.title = `${S.data_notice.title} · ${S.institute.name}`;
  }).catch(() => {});
})();
