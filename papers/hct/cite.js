/* Copy buttons of the citation card (external file: the content security policy allows no inline scripts). */
(() => {
  'use strict';
  document.querySelectorAll('.copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = document.getElementById(btn.getAttribute('data-copy')).textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });
})();
