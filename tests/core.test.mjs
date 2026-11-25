import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/js/lib/data.js';
import { waUrl, sellMessage, sellMailto, formatPrice } from '../src/js/lib/whatsapp.js';
import { validateEmail, validatePhone, validatePhotos, validateSell } from '../src/js/lib/validation.js';
import { filterProducts } from '../src/js/lib/filters.js';
import { deviceCat, distinct } from '../src/js/lib/devices.js';
import { pageItems, paginate } from '../src/js/lib/paginate.js';

const msgOf = (u) => decodeURIComponent(new URL(u).searchParams.get('text'));

test('URL WhatsApp : bon numéro et encodage', () => {
  const u = waUrl('a&b é\nc');
  assert.ok(u.startsWith('https://wa.me/237697692598?text='));
  assert.equal(msgOf(u), 'a&b é\nc');
});
test('message de vente WhatsApp : sections, photos, pas de lien public', () => {
  const base = { name: 'Paul', phone: '697692598', email: 'paul@exemple.com', product: 'HP 15', condition: 'Bon état', price: '150000', description: 'Écran OK' };
  const m = sellMessage({ ...base, photoCount: 3 });
  for (const x of ['INFORMATIONS DU VENDEUR', '- Nom : Paul', '- E-mail : paul@exemple.com', "INFORMATIONS DE L'APPAREIL", '- Appareil : HP 15', '- État : Bon état', '150 000 FCFA', '- Description : Écran OK', "Nombre d'images sélectionnées : 3", 'cette conversation WhatsApp']) assert.ok(m.includes(x), x);
  assert.ok(!/https?:\/\//.test(m));
  const none = sellMessage({ name: 'P', phone: '6', product: 'X', condition: 'Y', photoCount: 0 });
  assert.ok(none.includes('non renseigné') && none.includes("images sélectionnées : 0") && !none.includes('Je les joins') && !none.includes('E-mail'));
});
test('e-mail de vente : destinataire officiel, sujet et corps encodés', () => {
  const d = { name: 'Paul & fils', phone: '697692598', product: 'PS4 Slim', condition: 'Bon état', photoCount: 2 };
  const u = sellMailto(d), q = new URLSearchParams(u.split('?')[1]);
  assert.ok(u.startsWith('mailto:jeysonudalric150@gmail.com?subject='));
  assert.equal(q.get('subject'), 'Proposition de vente : PS4 Slim');
  const body = q.get('body');
  assert.ok(body.includes('Paul & fils') && body.includes('\r\n') && body.includes('cet e-mail') && !body.includes('WhatsApp'));
  assert.ok(u.length < 2000);
});
test('téléphone', () => {
  for (const ok of ['697692598', '+237 697 69 25 98', '237697692598']) assert.ok(validatePhone(ok), ok);
  for (const ko of ['', '12', 'abc', '5976925']) assert.ok(!validatePhone(ko), ko);
});
test('formulaire vide refusé, formulaire valide accepté', () => {
  const e = validateSell({});
  for (const k of ['product', 'condition', 'name', 'phone']) assert.ok(e[k], k);
  assert.equal(Object.keys(e).length, 4);
  assert.deepEqual(validateSell({ name: 'Paul', phone: '697692598', product: 'PS5', condition: 'Bon état' }), {});
  assert.ok(validateSell({ name: 'Paul', phone: '697692598', product: 'PS5', condition: 'Bon état', email: 'pas-un-email' }).email);
  assert.ok(validateSell({ name: 'Paul', phone: '12', product: 'PS5', condition: 'Bon état' }).phone);
  assert.ok(validateSell({ name: 'Paul', phone: '697692598', product: 'PS5', condition: 'Bon état', price: '12abc' }).price);
  assert.ok(validateEmail('a@b.cm') && !validateEmail('a@b') && !validateEmail('a b@c.cm'));
});
test('photos : format, taille, nombre', () => {
  const f = (type, size = 1000) => ({ name: 'x', type, size });
  assert.equal(validatePhotos([f('image/gif')]).errors.length, 1);
  assert.equal(validatePhotos([f('image/png', 6 * 1048576)]).errors.length, 1);
  assert.equal(validatePhotos([f('image/webp')], 6).ok.length, 0);
  assert.equal(validatePhotos([f('image/jpeg'), f('image/png')]).ok.length, 2);
});
test('filtres et tri', () => {
  const cs = PRODUCTS.filter((p) => p.type === 'console');
  assert.ok(filterProducts(cs, { platform: 'PS4' }).every((p) => p.platform === 'PS4'));
  assert.ok(filterProducts(cs, { condition: 'Neuf' }).every((p) => p.condition === 'Neuf'));
  assert.ok(filterProducts(cs, { inStock: true }).every((p) => p.stock));
  assert.ok(filterProducts(cs, { maxPrice: '130000' }).every((p) => p.price <= 130000));
  const a = filterProducts(cs, { sort: 'asc' }).map((p) => p.price); assert.deepEqual(a, [...a].sort((x, y) => x - y));
  assert.equal(filterProducts(cs, { q: 'slimm' }).length, 0);
  assert.ok(filterProducts(cs, { q: 'playstation 5' }).length >= 2);
});

test('catégories d\'appareils', () => {
  const by = (k) => PRODUCTS.filter((p) => deviceCat(p) === k);
  assert.equal(by('ordinateur').length, 5); assert.equal(by('telephone').length, 6); assert.equal(by('console').length, 6);
  assert.ok(PRODUCTS.filter((p) => p.type.startsWith('jeu')).every((p) => deviceCat(p) === null));
  assert.equal(deviceCat({ type: 'appareil', platform: 'Console' }), 'console');
  assert.equal(deviceCat({ type: 'appareil', platform: 'Autre' }), null);
});
test('filtres par catégorie, marque, stockage, RAM', () => {
  assert.ok(filterProducts(PRODUCTS, { cat: 'telephone' }).every((p) => deviceCat(p) === 'telephone'));
  const phones = filterProducts(PRODUCTS, { cat: 'telephone', brand: 'Samsung' });
  assert.equal(phones.length, 2); assert.ok(phones.every((p) => p.brand === 'Samsung'));
  assert.ok(filterProducts(PRODUCTS, { cat: 'telephone', storage: '128 Go' }).every((p) => p.storage === '128 Go'));
  assert.ok(filterProducts(PRODUCTS, { cat: 'ordinateur', ram: '16 Go' }).length === 2);
  assert.equal(filterProducts(PRODUCTS, { cat: 'console', brand: 'Sony' }).length, 6);
  assert.deepEqual(distinct(filterProducts(PRODUCTS, { cat: 'console' }), 'platform'), ['PS4', 'PS5']);
  assert.equal(filterProducts(PRODUCTS, { cat: 'ordinateur', brand: 'Apple' }).length, 0);
});
test('pagination : découpe, bornes, numéros affichés', () => {
  const l = Array.from({ length: 17 }, (_, i) => i + 1);
  const p1 = paginate(l, 1, 8), p3 = paginate(l, 3, 8);
  assert.deepEqual([p1.pages, p1.items.length, p1.from, p1.to], [3, 8, 1, 8]);
  assert.deepEqual([p3.items.length, p3.from, p3.to], [1, 17, 17]);
  assert.equal(paginate(l, 99, 8).page, 3); assert.equal(paginate(l, 0, 8).page, 1); assert.equal(paginate(l, 'x', 8).page, 1);
  assert.deepEqual(paginate([], 1, 8), { items: [], page: 1, pages: 1, total: 0, from: 0, to: 0 });
  assert.deepEqual(pageItems(1, 3), [1, 2, 3]);
  assert.deepEqual(pageItems(5, 12), [1, '…', 4, 5, 6, '…', 12]);
  assert.deepEqual(pageItems(1, 12), [1, 2, 3, 4, '…', 12]);
  assert.deepEqual(pageItems(12, 12), [1, '…', 9, 10, 11, 12]);
});
