/* Study 7 Stage A: session, the four requests to the study7 function, and Cloudflare Turnstile at Send.
   Handoff v14: Architecture > Data sent by the page, Bot check, Languages. No inline scripts under /study7/. */
(() => {
  'use strict';
  const cfg = window.STUDY7_CONFIG || {};

  const uuid = () => {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
  const session = uuid();
  let language = 'en';
  let version = 'stage-a-v1';

  // From the production origin the tag is stage-a-v1-<language>; from any other origin (previews, local runs) it is stage-a-test.
  const isProduction = () => window.location.origin === cfg.PRODUCTION_ORIGIN;
  const tag = () => (isProduction() ? `${version}-${language}` : 'stage-a-test');
  const common = (kind) => ({ study: 'study7', kind, session, questionnaire_version: tag(), language });
  const setLanguage = (lang, questionnaireVersion) => { language = lang; if (questionnaireVersion) version = questionnaireVersion; };

  // POST JSON; resolves with the HTTP status (0 when no function is configured).
  async function post(kind, fields) {
    if (!cfg.FUNCTION_URL) return 0;
    const response = await fetch(cfg.FUNCTION_URL, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...common(kind), ...fields }), keepalive: true,
    });
    return response.status;
  }
  // The leave ping: a string beacon, which the browser labels text/plain, so no preflight is needed on pagehide.
  function beacon(kind, fields) {
    if (!cfg.FUNCTION_URL || !navigator.sendBeacon) return false;
    return navigator.sendBeacon(cfg.FUNCTION_URL, JSON.stringify({ ...common(kind), ...fields }));
  }

  // ---- Turnstile: injected when Send is pressed, never at page load ----
  const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let scriptPromise = null;
  let widgetId = null;
  let pending = null;

  function loadScript() {
    if (window.turnstile) return Promise.resolve();
    if (!scriptPromise) {
      scriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = TURNSTILE_SRC; s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { scriptPromise = null; reject(new Error('turnstile script did not load')); };
        document.head.appendChild(s);
      });
    }
    return scriptPromise;
  }
  function renderWidget(siteKey) {
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(container);
    widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      execution: 'execute',
      retry: 'never',
      callback: (token) => { if (pending) pending.resolve(token); },
      'error-callback': () => { if (pending) pending.reject(new Error('turnstile error')); return true; },
      'expired-callback': () => {},
      'timeout-callback': () => { if (pending) pending.reject(new Error('turnstile timeout')); },
    });
  }
  // Resolves with a fresh single-use token or rejects (script failed, widget error, or no token within timeoutMs).
  // Every call resets the widget and executes it again, so a retry never resends a spent token.
  function getTurnstileToken(siteKey, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = 0;
      const finish = (fn) => (value) => { if (settled) return; settled = true; clearTimeout(timer); pending = null; fn(value); };
      timer = setTimeout(finish(reject), timeoutMs, new Error('no token within the time limit'));
      pending = { resolve: finish(resolve), reject: finish(reject) };
      loadScript().then(() => {
        if (settled) return;
        if (!window.turnstile) throw new Error('turnstile missing');
        if (widgetId === null) renderWidget(siteKey); else window.turnstile.reset(widgetId);
        window.turnstile.execute(widgetId);
      }).catch(finish(reject));
    });
  }

  window.Study7Net = { session, setLanguage, tag, post, beacon, getTurnstileToken };
})();
