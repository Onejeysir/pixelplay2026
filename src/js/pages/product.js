import { maxQty } from '../lib/cart.js';
import { SPEC_FIELDS } from '../lib/admin.js';
import { TYPE_LABEL } from '../lib/whatsapp.js';
import { $, html, mount } from '../ui/html.js';
import { tile } from '../ui/art.js';
import { deviceCat } from '../lib/devices.js';
import { actions, listUrl, priceHtml, stockLabel, subtitle } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { cart } from '../ui/cart-store.js';
import { onCatalog, state } from '../ui/state.js';

const LABELS = Object.fromEntries(Object.values(SPEC_FIELDS).flat().map(([k, l]) => [k, l]));

export function initProduct() {
  const root = $('#app'); if (!root) return;
  const id = new URLSearchParams(location.search).get('id');
  let qty = 1;

  const back = (p) => html`<a id="back" class="mb-6 inline-flex min-h-[44px] items-center gap-2 font-semibold text-violet-deep no-underline hover:text-violet-dark" href="${p ? listUrl(p) : 'jeux.html'}">${icon('back')}Retour</a>`;
  const specRows = (p) => {
    const rows = [['Catégorie', TYPE_LABEL[p.type]], ['Plateforme', p.platform], p.variant ? ['Variante', p.variant] : null, p.condition ? ['État', p.condition] : null]
      .filter(Boolean);
    for (const [k, v] of Object.entries(p.specs || {})) if (v && !['platform', 'generation', 'model', 'version'].includes(k)) rows.push([LABELS[k] || k, v]);
    rows.push(['Référence', p.reference || p.id]);
    return rows;
  };

  function render() {
    if (!state.ready) { mount(root, html`<p role="status" class="py-10 text-mute">Chargement…</p>`); return; }
    const p = state.products.find((x) => x.id === id);
    if (!p) { document.title = 'Produit introuvable | PIXEL PLAY'; mount(root, html`${back()}<h1>Produit introuvable</h1><p class="prose-p mt-4 text-mute">Ce produit n'existe plus ou a été retiré du catalogue.</p><p class="mt-6"><a class="btn" href="jeux.html">Voir le catalogue</a></p>`); return; }
    document.title = `${p.name} | PIXEL PLAY`;
    const nav = deviceCat(p) ? 'home' : 'jeux';
    document.querySelectorAll('#menu a[data-nav]').forEach((a) => (a.dataset.nav === nav ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.querySelector('meta[name=description]')?.setAttribute('content', `${p.name} chez PIXEL PLAY, Douala. ${subtitle(p)}. Commande sur WhatsApp.`);
    const max = maxQty(p), left = max - cart.qtyOf(p.id), shown = Math.min(qty, Math.max(left, 1)), inCart = cart.qtyOf(p.id);
    mount(root, html`
      ${back(p)}
      <div class="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div class="lg:sticky lg:top-28 lg:self-start">${tile(p, '!aspect-[4/3] lg:!aspect-square')}</div>
        <div>
          <p class="tag">${subtitle(p)}</p>
          <h1 class="mt-1 !text-[clamp(2.2rem,5.5vw,3.6rem)]">${p.name}</h1>
          <div class="mt-4 flex flex-wrap items-baseline gap-x-4">${priceHtml(p, 'text-3xl')}${stockLabel(p)}</div>
          ${p.description ? html`<p class="prose-p mt-5 text-mute">${p.description}</p>` : ''}
          ${p.demo ? html`<p class="notice mt-5">Produit de démonstration : prix, stock et description sont des exemples.</p>` : ''}
          ${p.type === 'jeu-numerique' ? html`<p class="notice mt-5">Produit numérique : les conditions d'accès, de restriction et de transfert sont précisées par PIXEL PLAY avant toute commande. Ne communiquez jamais de mot de passe ni de code de vérification.</p>` : ''}
          <div class="mt-6 border-t border-line pt-6">
            ${max > 0 && left > 0 && p.type !== 'appareil' ? html`<div class="mb-4 flex items-center gap-4"><span class="label !mb-0">Quantité</span>
              <div class="qty" role="group" aria-label="Quantité à ajouter"><button type="button" data-qty="-1" aria-label="Diminuer la quantité">−</button><output aria-live="polite">${shown}</output><button type="button" data-qty="1" aria-label="Augmenter la quantité">+</button></div></div>` : ''}
            <div class="flex flex-col gap-3 sm:flex-row" id="pa">${actions(p, { qty: shown, wide: true })}</div>
            ${inCart > 0 ? html`<p class="hint mt-3">${inCart} dans votre panier · <a class="link" href="panier.html">Voir le panier</a></p>` : ''}
            <p class="hint mt-4">Pas de paiement en ligne : la disponibilité, le prix actuel et les modalités sont confirmés avec PIXEL PLAY sur WhatsApp.</p>
          </div>
          <dl class="mt-8 divide-y divide-line border-y border-line text-[0.9375rem]">
            ${specRows(p).map(([k, v]) => html`<div class="flex justify-between gap-6 py-3"><dt class="text-mute">${k}</dt><dd class="text-right font-semibold">${v}</dd></div>`)}
          </dl>
        </div>
      </div>`);
    const b = $('#back'); if (b && history.length > 1 && document.referrer && new URL(document.referrer, location.href).host === location.host) b.onclick = (e) => { e.preventDefault(); history.back(); };
  }
  root.addEventListener('click', (e) => {
    const q = e.target.closest('[data-qty]'); if (!q) return;
    const p = state.products.find((x) => x.id === id), left = maxQty(p) - cart.qtyOf(id);
    qty = Math.max(1, Math.min(left, qty + Number(q.dataset.qty))); render();
    $('[data-qty="' + q.dataset.qty + '"]')?.focus();
  });
  cart.on(render); onCatalog(render); render();
}
