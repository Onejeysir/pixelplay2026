import { categoryLabel, orderMessage, resolve } from '../lib/cart.js';
import { formatPrice, waUrl } from '../lib/whatsapp.js';
import { $, html, mount } from '../ui/html.js';
import { tile } from '../ui/art.js';
import { productUrl } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { cart } from '../ui/cart-store.js';
import { onCatalog, state } from '../ui/state.js';

const ISSUE = {
  missing: () => "Ce produit n'est plus au catalogue : supprimez-le pour commander.",
  unavailable: () => 'Ce produit est actuellement indisponible : supprimez-le pour commander.',
  qty: (l) => `Seulement ${l.max} en stock : réduisez la quantité.`,
  price: (l) => `Le prix a changé : ${formatPrice(l.oldPrice)} → ${formatPrice(l.unit)}.`,
};

export function initCart() {
  const root = $('#app'); if (!root) return;

  function render() {
    if (!state.ready) { mount(root, html`<p role="status" class="py-10 text-mute">Chargement…</p>`); return; }
    const focus = document.activeElement?.dataset?.action ? { a: document.activeElement.dataset.action, id: document.activeElement.dataset.id } : null;
    const s = resolve(cart.items, state.products);
    if (!s.lines.length) {
      mount(root, html`<div class="border border-dashed border-edge bg-mist px-6 py-14 text-center"><p class="font-display text-3xl font-extrabold italic uppercase">Votre panier est vide</p><p class="mt-2 text-mute">Ajoutez des consoles ou des jeux, puis envoyez votre commande sur WhatsApp.</p><p class="mt-6 flex flex-wrap justify-center gap-3"><a class="btn" href="consoles.html">Voir les consoles</a><a class="btn btn-ghost" href="jeux.html">Voir les jeux</a></p></div>`);
      return;
    }
    mount(root, html`
      ${s.priceChanged ? html`<div class="notice warn mb-6" role="alert">Des prix ont changé depuis l'ajout au panier. Vérifiez-les avant de commander. <button type="button" class="linkbtn ml-1" data-action="ack">Accepter les nouveaux prix</button></div>` : ''}
      <div class="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <ul class="divide-y divide-line border-y border-line">
          ${s.lines.map((l) => html`
          <li class="grid grid-cols-[96px_1fr] gap-4 py-5 sm:grid-cols-[140px_1fr] sm:gap-6">
            <a href="${l.product ? productUrl(l.product) : '#'}" tabindex="-1" aria-hidden="true" class="block self-start">${l.product ? tile(l.product, '!aspect-square sm:!aspect-[4/3]') : ''}</a>
            <div class="min-w-0">
              <p class="tag">${l.product ? categoryLabel(l.product) + (l.product.type !== 'console' ? ' · ' + l.product.platform : l.product.variant ? ' · ' + l.product.variant : '') : 'Produit'}</p>
              <h2 class="!font-sans !text-base !font-semibold !not-italic !normal-case !leading-snug !tracking-normal">${l.name}</h2>
              <p class="text-sm text-mute">${formatPrice(l.unit)} l'unité</p>
              ${l.issues.map((k) => html`<p class="notice error mt-2" role="alert">${ISSUE[k](l)}</p>`)}
              <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div class="qty" role="group" aria-label="Quantité de ${l.name}">
                  <button type="button" data-action="dec" data-id="${l.id}" aria-label="Diminuer la quantité">−</button><output>${l.qty}</output>
                  <button type="button" data-action="inc" data-id="${l.id}" aria-label="Augmenter la quantité" ${l.qty >= l.max ? 'disabled' : ''}>+</button>
                </div>
                <button type="button" class="linkbtn danger" data-action="del" data-id="${l.id}">Supprimer</button>
                <p class="price ml-auto text-lg">${formatPrice(l.subtotal)}</p>
              </div>
            </div>
          </li>`)}
        </ul>
        <aside class="border border-line bg-mist p-5 sm:p-6 lg:sticky lg:top-28" aria-label="Récapitulatif">
          <h2 class="!text-3xl">Récapitulatif</h2>
          <dl class="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-[0.9375rem]">
            <dt class="text-mute">Articles</dt><dd class="text-right font-semibold tabular-nums">${s.count}</dd>
            <dt class="text-mute">Sous-total</dt><dd class="text-right font-semibold tabular-nums">${formatPrice(s.subtotal)}</dd>
            <dt class="text-mute">Livraison</dt><dd class="text-right font-semibold">${s.delivery == null ? 'À confirmer' : formatPrice(s.delivery)}</dd>
            <dt class="border-t border-line pt-3 text-lg font-bold">Total</dt><dd class="border-t border-line pt-3 text-right text-lg font-bold tabular-nums">${formatPrice(s.total)}</dd>
          </dl>
          <div class="mt-5">
            ${s.canOrder
              ? html`<a class="btn btn-wa w-full" href="${waUrl(orderMessage(s))}" target="_blank" rel="noopener noreferrer">${icon('wa')}<span>Passer ma commande sur WhatsApp</span></a>`
              : html`<button type="button" class="btn btn-wa w-full" disabled>${icon('wa')}<span>Passer ma commande sur WhatsApp</span></button><p class="hint mt-2">Corrigez les points signalés pour pouvoir commander.</p>`}
          </div>
          <p class="hint mt-4">Ouvrir WhatsApp ne valide pas la commande : envoyez le message, PIXEL PLAY confirme disponibilité, montant et modalités. <strong>Le stock n'est pas réservé</strong> avant cette confirmation. Votre panier est conservé sur cet appareil jusqu'à ce que vous le vidiez.</p>
          <p class="mt-4 flex flex-wrap items-center gap-x-5"><a class="link" href="jeux.html">Continuer mes achats</a><button type="button" class="linkbtn danger" data-action="clear">Vider le panier</button></p>
        </aside>
      </div>`);
    if (focus) (root.querySelector(`[data-action="${focus.a}"][data-id="${focus.id}"]:not([disabled])`) || root.querySelector(`[data-action="${focus.a}"]:not([disabled])`))?.focus();
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const { action, id } = b.dataset, cur = cart.qtyOf(id);
    if (action === 'inc') cart.setQty(id, cur + 1);
    else if (action === 'dec') cart.setQty(id, cur - 1);
    else if (action === 'del') cart.remove(id);
    else if (action === 'ack') cart.ackPrices();
    else if (action === 'clear' && window.confirm('Vider le panier ?')) cart.clear();
  });
  cart.on(render); onCatalog(render); render();
}
