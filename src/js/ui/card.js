import { isCartable, maxQty } from '../lib/cart.js';
import { deviceCat } from '../lib/devices.js';
import { productMessage } from '../lib/messages.js';
import { STATUS_LABEL } from '../lib/product.js';
import { formatPrice, waUrl } from '../lib/whatsapp.js';
import { html, raw } from './html.js';
import { icon } from './icons.js';
import { tile } from './art.js';

export const subtitle = (p) => ({
  console: [p.variant || p.platform, p.condition], appareil: [p.brand, p.platform, p.condition],
  'jeu-physique': [p.platform, p.condition], 'jeu-numerique': [p.platform, 'Numérique'],
}[p.type] || [p.platform]).filter(Boolean).join(' · ');

export const productUrl = (p) => `produit.html?id=${encodeURIComponent(p.id)}`;
// Page « liste » d'un produit (lien de retour) : les appareils et consoles sont sur l'accueil, par catégorie.
export const listUrl = (p) => deviceCat(p) ? `index.html?cat=${deviceCat(p)}#catalogue` : ({ 'jeu-numerique': 'jeux-numeriques.html', 'jeu-physique': 'jeux-physiques.html' }[p.type] || 'jeux.html');

export function stockLabel(p) {
  const st = p.status || (p.stock ? 'available' : 'out');
  return html`<p class="status ${st === 'available' ? 'ok' : st === 'low' ? 'low' : 'ko'}">${STATUS_LABEL[st] || 'Indisponible'}</p>`;
}
export const priceHtml = (p, cls = 'text-lg') => html`<p class="price ${cls}">${formatPrice(p.price)}${p.oldPrice ? html` <s class="ml-1 text-sm font-medium text-mute">${formatPrice(p.oldPrice)}</s>` : ''}</p>`;

// Boutons d'action : ajout au panier (produits vendables) + commande directe WhatsApp.
export function actions(p, { qty = 1, wide = false } = {}) {
  const out = !maxQty(p);
  const label = wide ? '' : `aria-label="Commander ${p.name.replace(/"/g, '&quot;')} sur WhatsApp" title="Commander sur WhatsApp"`;
  const wa = out ? '' : html`<a class="btn btn-wa ${wide ? 'grow' : '!px-0 w-12 flex-none'}" href="${waUrl(productMessage(p, qty))}" target="_blank" rel="noopener noreferrer" ${raw(label)}>${icon('wa')}${wide ? html`<span>${isCartable(p) ? 'Commander sur WhatsApp' : 'Demander sur WhatsApp'}</span>` : ''}</a>`;
  if (!isCartable(p)) return out ? html`<button class="btn grow" disabled>${STATUS_LABEL[p.status] || 'Indisponible'}</button>` : wa;
  const add = out
    ? html`<button type="button" class="btn grow" disabled>${STATUS_LABEL[p.status] || 'Indisponible'}</button>`
    : html`<button type="button" class="btn ${wide ? 'btn-ghost' : '!px-3 min-[480px]:!px-6'} grow" data-action="add" data-id="${p.id}">${icon('cart')}<span data-label class="max-[479px]:hidden">Ajouter au panier</span><span data-label class="min-[480px]:hidden">Ajouter</span></button>`;
  return html`${add}${wa}`;
}

// Actions d'une carte de l'accueil : consulter la fiche (bouton principal) + question WhatsApp.
function viewActions(p) {
  const wa = maxQty(p) ? html`<a class="btn btn-wa !px-0 w-12 flex-none" href="${waUrl(productMessage(p, 1))}" target="_blank" rel="noopener noreferrer" aria-label="Demander ${p.name.replace(/"/g, '&quot;')} sur WhatsApp" title="Demander sur WhatsApp">${icon('wa')}</a>` : '';
  return html`<a class="btn grow !px-4" href="${productUrl(p)}" aria-label="Voir le produit : ${p.name.replace(/"/g, '&quot;')}"><span class="max-[479px]:hidden">Voir le produit</span><span class="min-[480px]:hidden">Détails</span>${icon('arrow')}</a>${wa}`;
}

export const card = (p, { view = false } = {}) => html`
<article class="card max-[479px]:flex-row" data-card>
  <a href="${productUrl(p)}" tabindex="-1" aria-hidden="true" class="block max-[479px]:w-[38%] max-[479px]:flex-none">${tile(p, 'max-[479px]:!aspect-auto max-[479px]:h-full max-[479px]:min-h-[140px]')}</a>
  <div class="flex min-w-0 flex-1 flex-col gap-1 p-4 max-[479px]:p-3">
    <p class="tag">${subtitle(p)}</p>
    <h3 class="text-[1.0625rem] font-semibold leading-snug"><a class="no-underline hover:text-violet-deep hover:underline" href="${productUrl(p)}">${p.name}</a></h3>
    ${priceHtml(p)}
    ${stockLabel(p)}
    <div class="mt-auto flex gap-2 pt-4">${view ? viewActions(p) : actions(p)}</div>
  </div>
</article>`;
