// Messages WhatsApp d'un produit isolé (fiche produit, carte catalogue).
import { isCartable, orderMessage, resolve } from './cart.js';
import { CONFIG } from './config.js';
import { formatPrice } from './whatsapp.js';

export function productMessage(p, qty = 1) {
  if (isCartable(p)) return orderMessage(resolve([{ id: p.id, qty, price: p.price, name: p.name }], [p]));
  return ['Bonjour PIXEL PLAY,', '', 'Je souhaite des informations sur cet appareil.', '',
    `- Produit : ${p.name}`, `- Type : ${p.platform || 'Appareil'}`, p.condition ? `- État : ${p.condition}` : null,
    `- Prix affiché : ${formatPrice(p.price)}`, `- Référence : ${p.reference || p.id}`, '',
    'Merci de me confirmer la disponibilité, le prix actuel et les modalités de retrait ou de livraison.'].filter((x) => x !== null).join('\n');
}
export const mapUrl = () => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.mapQuery);
