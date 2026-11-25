import assert from 'node:assert/strict';
import { test } from 'node:test';
import { productMessage } from '../src/js/lib/messages.js';
import { waUrl } from '../src/js/lib/whatsapp.js';

const console5 = { id: 'c1', reference: 'C-1', type: 'console', name: 'PlayStation 5 Standard', platform: 'PS5', variant: 'PS5 Standard (lecteur)', condition: 'Neuf', price: 450000, stock: 3 };
const laptop = { id: 'a1', reference: 'A-1', type: 'appareil', name: 'Portable 15"', platform: 'Ordinateur', condition: 'Occasion', price: 180000, stock: 1 };

test('message console : produit, variante, prix, référence', () => {
  const m = productMessage(console5, 2);
  for (const s of ['PlayStation 5 Standard', 'Variante : PS5 Standard (lecteur)', 'Quantité : 2', '900 000 FCFA', 'Référence : C-1']) assert.ok(m.includes(s), s);
});
test('message appareil : demande d\'information, sans panier', () => {
  const m = productMessage(laptop);
  assert.ok(m.includes('informations sur cet appareil') && m.includes('180 000 FCFA') && m.includes('A-1') && !m.includes('RÉCAPITULATIF'));
});
test('URL WhatsApp : numéro international et texte encodé', () => {
  const u = waUrl(productMessage(laptop));
  assert.ok(u.startsWith('https://wa.me/237697692598?text=') && !/[ \n"]/.test(u));
  assert.equal(decodeURIComponent(u.split('?text=')[1]), productMessage(laptop));
});
