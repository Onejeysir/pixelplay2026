// Comportements communs à toutes les pages : menu mobile, recherche, badge du panier, liens liés aux réglages, notifications.
import { CONFIG } from '../lib/config.js';
import { deviceCat } from '../lib/devices.js';
import { filterProducts } from '../lib/filters.js';
import { GENERIC, waUrl } from '../lib/whatsapp.js';
import { mapUrl } from '../lib/messages.js';
import { $, $$ } from './html.js';
import { cart } from './cart-store.js';
import { state } from './state.js';

export function bindConfig() {
  $$('[data-cfg]').forEach((el) => { const v = CONFIG[el.dataset.cfg]; if (v != null) el.textContent = v; });
  const links = { tel: `tel:${CONFIG.phoneTel}`, wa: waUrl(GENERIC), map: mapUrl(), mail: `mailto:${CONFIG.email}` };
  $$('[data-link]').forEach((a) => { a.href = links[a.dataset.link]; });
}

export function updateBadge() {
  const n = cart.count, b = $('#cart-badge'), a = $('#cart-link');
  if (b) { b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0; }
  if (a) a.setAttribute('aria-label', `Panier, ${n} article${n > 1 ? 's' : ''}`);
}

let tt;
export function toast(text) {
  const el = $('#toast'); if (!el) return;
  clearTimeout(tt); el.textContent = text; el.classList.add('show');
  tt = setTimeout(() => { el.classList.remove('show'); }, 2600);
}

export function initLayout(whenReady) {
  const cur = document.body.dataset.nav;
  $$('#menu a[data-nav]').forEach((a) => { if (a.dataset.nav === cur) a.setAttribute('aria-current', 'page'); });

  const menu = $('#menu'), burger = $('#burger'), bar = $('#searchbar'), sbtn = $('#search-toggle');
  const setMenu = (o) => { menu.classList.toggle('open', o); burger.setAttribute('aria-expanded', String(o)); burger.querySelector('[data-i=open]').hidden = o; burger.querySelector('[data-i=close]').hidden = !o; };
  const setSearch = (o) => { bar.hidden = !o; sbtn.setAttribute('aria-expanded', String(o)); if (o) { setMenu(false); $('#q').focus(); } };
  burger.addEventListener('click', () => { setMenu(!menu.classList.contains('open')); if (menu.classList.contains('open')) bar.hidden = true, sbtn.setAttribute('aria-expanded', 'false'); });
  sbtn.addEventListener('click', () => setSearch(bar.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.classList.contains('open')) { setMenu(false); burger.focus(); } if (!bar.hidden) { setSearch(false); sbtn.focus(); } } });
  document.addEventListener('click', (e) => { if (menu.classList.contains('open') && !e.target.closest('#menu, #burger')) setMenu(false); });
  matchMedia('(min-width:1024px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  $('#search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#q').value.trim(); if (!q) { $('#q').focus(); return; }
    await whenReady;
    const hit = filterProducts(state.products, { q })[0];
    const dev = hit && deviceCat(hit), page = !hit ? 'jeux.html' : dev ? 'index.html' : hit.type === 'jeu-numerique' ? 'jeux-numeriques.html' : 'jeux-physiques.html';
    location.href = `${page}?${dev ? `cat=${dev}&` : ''}q=${encodeURIComponent(q)}${dev ? '#catalogue' : ''}`;
  });

  // Le bouton WhatsApp flottant s'efface pendant la saisie pour ne jamais couvrir un champ ou un bouton.
  const typing = (on) => document.body.classList.toggle('typing', on);
  document.addEventListener('focusin', (e) => { if (e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select')) typing(true); });
  document.addEventListener('focusout', () => typing(false));

  // Une photo qui ne charge pas est retirée : l'illustration placée dessous reste visible.
  document.addEventListener('error', (e) => { if (e.target.matches?.('img[data-photo]')) e.target.remove(); }, true);

  cart.on(updateBadge); updateBadge(); bindConfig();
}
