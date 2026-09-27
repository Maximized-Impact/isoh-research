/* Institute for The Study Of Humanity: top bar behaviour, copied from yapperphone.app (src/App.jsx handleScroll and MobileNavDrawer).
   Identical in isoh-research and maximized-impact-site: edit both. */
(() => {
  'use strict';
  const bar = document.querySelector('.bar');
  if (!bar) return;

  // Glass state after 100 px of scroll (yapperphone.app: setNavScrolled(y > 100)); evaluated on load too.
  const onScroll = () => {
    const scrolled = window.scrollY > 100;
    bar.classList.toggle('scrolled', scrolled);
    bar.classList.toggle('transparent', !scrolled);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu: opens from the menu button, closes on the close button, Escape, a tap outside and a link tap.
  const button = bar.querySelector('.bar-menu');
  const drawer = document.getElementById('site-drawer');
  const backdrop = document.querySelector('.drawer-backdrop');
  if (!button || !drawer || !backdrop) return;
  const closeButton = drawer.querySelector('.drawer-close');
  let open = false;

  const setOpen = (next, moveFocus) => {
    open = next;
    drawer.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    drawer.inert = !open;
    button.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('drawer-open', open);
    if (open) closeButton.focus();
    else if (moveFocus) button.focus();
  };

  button.addEventListener('click', () => setOpen(!open, true));
  closeButton.addEventListener('click', () => setOpen(false, true));
  backdrop.addEventListener('click', () => setOpen(false, true));
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false, false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false, true); });
  const desktop = window.matchMedia('(min-width: 860px)');
  desktop.addEventListener('change', (e) => { if (e.matches && open) setOpen(false, false); });
})();
