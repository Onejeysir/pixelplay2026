// Accueil : carrousel des appareils en stock (le catalogue filtrable est géré par catalog.js).
import { isDevice } from '../lib/devices.js';
import { formatPrice } from '../lib/whatsapp.js';
import { $, $$, html, mount } from '../ui/html.js';
import { productUrl, subtitle } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { tile } from '../ui/art.js';
import { onCatalog, state } from '../ui/state.js';

const SLIDES = 6, DELAY = 5000;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const slide = (p, i, n) => html`
  <div class="car-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} sur ${n}">
    <article class="grid items-center gap-5 bg-violet-lav p-5 pb-6 sm:p-7 md:grid-cols-2 md:gap-10 md:p-10">
      <a href="${productUrl(p)}" tabindex="-1" aria-hidden="true">${tile(p, '!bg-white')}</a>
      <div class="min-w-0 md:pr-10">
        <p class="tag">${subtitle(p)}</p>
        <h3 class="mt-1 font-display text-4xl font-extrabold italic uppercase leading-[.95] md:text-5xl">${p.name}</h3>
        <p class="price mt-3 text-2xl">${formatPrice(p.price)}</p>
        <a class="btn mt-5" href="${productUrl(p)}">Voir le produit ${icon('arrow')}</a>
      </div>
    </article>
  </div>`;

// Défilement natif (scroll-snap) : le glisser au doigt marche sans code ; boutons, points et lecture automatique par-dessus.
function carousel(root, items) {
  const n = items.length;
  mount(root, html`
    <div class="relative" role="region" aria-roledescription="carrousel" aria-label="Appareils à la une">
      <div class="car-track" id="car-track" tabindex="-1">${items.map((p, i) => slide(p, i, n))}</div>
      ${n > 1 ? html`
        <button type="button" class="car-btn left-2 md:left-3" data-go="-1" aria-label="Appareil précédent" aria-controls="car-track"><span class="rotate-180">${icon('arrow')}</span></button>
        <button type="button" class="car-btn right-2 md:right-3" data-go="1" aria-label="Appareil suivant" aria-controls="car-track">${icon('arrow')}</button>` : ''}
    </div>
    ${n > 1 ? html`<div class="mt-2 flex items-center justify-center gap-1">
      ${items.map((p, i) => html`<button type="button" class="car-dot" data-dot="${i}" aria-label="Aller à l'appareil ${i + 1}" aria-current="${String(i === 0)}"></button>`)}
      <button type="button" class="chip ml-3 !px-3 !text-xs" id="car-play" aria-pressed="false">Pause</button>
    </div>` : ''}`);
  if (n < 2) return () => {};

  const track = $('#car-track', root), play = $('#car-play', root);
  let i = 0, paused = reduceMotion(), hover = false, focus = false, touchedAt = 0, timer;
  const dots = () => $$('[data-dot]', root).forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  const label = () => { play.textContent = paused ? 'Lecture' : 'Pause'; play.setAttribute('aria-pressed', String(paused)); };
  const go = (k, smooth = true) => { i = (k + n) % n; track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduceMotion() ? 'smooth' : 'auto' }); dots(); };

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'), d = e.target.closest('[data-dot]');
    if (b) go(i + Number(b.dataset.go)); else if (d) go(Number(d.dataset.dot));
    else if (e.target.closest('#car-play')) { paused = !paused; label(); }
  });
  let t; track.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { const k = Math.round(track.scrollLeft / track.clientWidth); if (k !== i) { i = k; dots(); } }, 80); }, { passive: true });
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  root.addEventListener('pointerleave', () => { hover = false; });
  root.addEventListener('pointerdown', () => { touchedAt = Date.now(); });
  root.addEventListener('focusin', (e) => { focus = e.target.matches(':focus-visible'); }); // clavier seulement : un clic souris n'arrête pas la lecture
  root.addEventListener('focusout', () => { focus = false; });
  const onResize = () => go(i, false);
  addEventListener('resize', onResize);
  label();
  timer = setInterval(() => { if (!paused && !hover && !focus && !document.hidden && Date.now() - touchedAt > 8000) go(i + 1); }, DELAY);
  return () => { clearInterval(timer); removeEventListener('resize', onResize); };
}

export function initHome() {
  const box = $('#carousel-box'), root = $('#carousel'); if (!root) return;
  let stop = () => {}, sig = '';
  const render = () => {
    if (!state.ready || state.error) return;
    const top = state.products.filter((p) => isDevice(p) && p.stock).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, SLIDES);
    const key = top.map((p) => `${p.id}:${p.price}:${p.image || ''}`).join('|');
    if (key === sig) return;          // rien n'a changé : on ne relance pas le carrousel (évite un saut d'image)
    sig = key; stop(); box.hidden = top.length === 0; stop = top.length ? carousel(root, top) : () => {};
  };
  onCatalog(render); render();
}
