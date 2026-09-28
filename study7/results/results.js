/* Results page: the data notice's language mechanism. ?lang= picks the text; English when it is missing or unknown.
   Both texts are in the HTML; this shows the one asked for, sets the document language and swaps the meta description.
   The title, the bar, the Institute block and the footer stay as they are. */
(() => {
  'use strict';
  const lang = new URLSearchParams(window.location.search).get('lang');
  if (!lang || lang === 'en') return;
  const blocks = [...document.querySelectorAll('[data-lang]')]; const block = blocks.find((b) => b.dataset.lang === lang);
  if (!block) return;
  blocks.forEach((b) => { b.hidden = b !== block; });
  document.documentElement.lang = lang;
  const meta = document.querySelector('meta[name="description"]'); if (meta && meta.dataset[lang]) meta.content = meta.dataset[lang];
})();
