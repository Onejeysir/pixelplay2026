import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setStorage } from '../src/js/lib/sim/store.js';
import * as db from '../src/js/lib/sim/db.js';
import { DEMO_ADMIN, getSession, signIn, signOut } from '../src/js/lib/sim/auth.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const png = (n = 10) => new Blob([new Uint8Array(n)], { type: 'image/png' });
beforeEach(async () => { setStorage(mem()); await db.resetDemoData(); });
const base = { name: 'Manette DualSense', reference: 'MAN-001', category_id: 'cat-appareils', price: 35000, promotional_price: null, stock_quantity: 4, stock_alert_threshold: 2, condition: 'new', description: 'x' };

test('connexion de démonstration : bons identifiants, mauvais identifiants, session, déconnexion', () => {
  assert.equal(signIn('admin@pixelplay.cm', 'faux').ok, false);
  assert.equal(signIn('autre@pixelplay.cm', DEMO_ADMIN.password).ok, false);
  assert.equal(getSession(), null);
  assert.equal(signIn(' ADMIN@pixelplay.cm ', 'PixelPlay2026!').ok, true);
  assert.equal(getSession().role, 'admin');
  signOut(); assert.equal(getSession(), null);
});
test('session expirée refusée', () => {
  signIn(DEMO_ADMIN.email, DEMO_ADMIN.password);
  const s = { ...getSession(), exp: Date.now() - 1 };
  setStorage(mem()); assert.equal(getSession(), null); // stockage vide
  const m = mem(); m.setItem('pixelplay-sim-session', JSON.stringify(s)); setStorage(m); assert.equal(getSession(), null);
});
test('données de démonstration : catégories, produits, demandes', async () => {
  const cats = await db.listCategories(), prods = await db.listProducts(), reqs = await db.listRequests();
  assert.equal(cats.length, 4); assert.equal(prods.length, 23); assert.ok(reqs.length >= 2);
  const cat = await db.loadCatalog();
  assert.equal(cat.length, 23); assert.ok(cat.every((p) => p.demo));
  assert.equal(cat.find((p) => p.id === 'c-ps5-slim').stock, 0); // rupture
  assert.equal(cat.find((p) => p.id === 'c-ps5-std').type, 'console');
});
test('produit : ajout, lecture sur le site, modification, suppression', async () => {
  const p = await db.createProduct(base);
  let cat = await db.loadCatalog();
  const onSite = cat.find((x) => x.id === p.id);
  assert.equal(onSite.name, 'Manette DualSense'); assert.equal(onSite.type, 'appareil'); assert.equal(onSite.price, 35000); assert.equal(onSite.demo, false);
  await db.updateProduct(p.id, { price: 30000, description: 'nouvelle', availability_enabled: false });
  cat = await db.loadCatalog();
  const m = cat.find((x) => x.id === p.id);
  assert.equal(m.price, 30000); assert.equal(m.status, 'disabled'); assert.equal(m.stock, 0);
  await db.removeProduct(p.id);
  assert.ok(!(await db.loadCatalog()).some((x) => x.id === p.id));
});
test('produit : validations (référence unique, prix promo, catégorie, nombres)', async () => {
  await db.createProduct(base);
  await assert.rejects(db.createProduct({ ...base, name: 'Autre' }), /référence existe déjà/);
  await assert.rejects(db.createProduct({ ...base, reference: 'X-2', promotional_price: 40000 }), /promotionnel/);
  await assert.rejects(db.createProduct({ ...base, reference: 'X-3', category_id: 'inconnue' }), /Catégorie/);
  await assert.rejects(db.createProduct({ ...base, reference: 'X-4', price: -5 }), /Prix/);
  await assert.rejects(db.createProduct({ ...base, reference: 'X-5', name: ' ' }), /Nom/);
});
test('stock : ajustement, historique, rupture et stock faible', async () => {
  const p = await db.createProduct(base);
  assert.equal((await db.listMovements(p.id)).length, 1); // stock initial
  await db.adjustStock(p.id, 2, 'Vente confirmée (WhatsApp)');
  let cat = (await db.loadCatalog()).find((x) => x.id === p.id); assert.equal(cat.status, 'low'); assert.equal(cat.stock, 2);
  await db.adjustStock(p.id, 0, 'Casse / perte');
  cat = (await db.loadCatalog()).find((x) => x.id === p.id); assert.equal(cat.status, 'out');
  const mvs = await db.listMovements(p.id); assert.equal(mvs[0].changed_quantity, -2); assert.equal(mvs[0].previous_quantity, 2);
  await assert.rejects(db.adjustStock(p.id, -1, ''), /entier/);
  await assert.rejects(db.adjustStock(p.id, 1.5, ''), /entier/);
});
test('catégories : ajout, modification, suppression refusée si produits, base protégée', async () => {
  const c = await db.createCategory({ name: 'Accessoires', description: 'Manettes' });
  await assert.rejects(db.createCategory({ name: 'accessoires' }), /existe déjà/);
  await db.updateCategory(c.id, { name: 'Accessoires gaming' });
  assert.equal((await db.listCategories()).find((x) => x.id === c.id).name, 'Accessoires gaming');
  const p = await db.createProduct({ ...base, category_id: c.id });
  await assert.rejects(db.deleteCategory(c.id), /1 produit/);
  await assert.rejects(db.deleteCategory('cat-consoles'), /base/);
  await db.removeProduct(p.id); await db.deleteCategory(c.id);
  assert.ok(!(await db.listCategories()).some((x) => x.id === c.id));
});
test('images produit : ajout, image principale, suppression, format refusé', async () => {
  const p = await db.createProduct(base);
  const [a, b] = await db.addProductImages(p.id, [png(), png(20)]);
  let g = await db.getProduct(p.id);
  assert.equal(g.product_images.length, 2); assert.equal(g.product_images[0].id, a); assert.ok(g.product_images[0].url.startsWith('blob:'));
  assert.ok((await db.loadCatalog()).find((x) => x.id === p.id).image);
  await db.setPrimaryImage(p.id, b); g = await db.getProduct(p.id); assert.equal(g.product_images[0].id, b);
  await db.removeProductImage(p.id, b); g = await db.getProduct(p.id); assert.equal(g.product_images.length, 1); assert.ok(g.product_images[0].is_primary);
  await assert.rejects(db.addProductImages(p.id, [new Blob(['x'], { type: 'application/pdf' })]), /Format/);
});
test('demande de rachat : enregistrement, photos, statuts, notes, suppression', async () => {
  const r = await db.submitRequest({ customer_name: 'Paul', phone: '697692598', location: 'Douala', device_type: 'telephone', brand: 'Apple', model: 'iPhone', condition: 'Bon état', specifications: { 'Capacité de stockage': '128 Go' }, expected_price: 90000 }, [{ blob: png(), name: 'a.png' }, { blob: png(5), name: 'b.png' }]);
  assert.match(r.reference, /^PP-[A-Z2-9]{8}$/); assert.equal(r.photos, 2);
  const g = await db.getRequest(r.id);
  assert.equal(g.status, 'new'); assert.equal(g.photos.length, 2); assert.ok(g.photos[0].url.startsWith('blob:')); assert.equal(g.specifications['Capacité de stockage'], '128 Go');
  await db.updateRequest(r.id, { status: 'accepted' }); await db.updateRequest(r.id, { status: 'rejected', internal_notes: 'trop cher' });
  const u = await db.getRequest(r.id); assert.equal(u.status, 'rejected'); assert.equal(u.internal_notes, 'trop cher');
  await assert.rejects(db.updateRequest(r.id, { status: 'done' }), /Statut/);
  await db.deleteRequest(r.id); await assert.rejects(db.getRequest(r.id), /introuvable/);
});
test('demande : champs obligatoires, trop de photos, mauvais format', async () => {
  const ok = { customer_name: 'P', phone: '6', device_type: 'console', brand: 'S', model: 'M' };
  await assert.rejects(db.submitRequest({ ...ok, brand: '' }), /incomplète/);
  await assert.rejects(db.submitRequest(ok, Array.from({ length: 6 }, () => ({ blob: png() }))), /maximum/);
  await assert.rejects(db.submitRequest(ok, [{ blob: new Blob(['x'], { type: 'text/plain' }) }]), /Format/);
  assert.equal((await db.listRequests()).length, 2); // aucune demande partielle enregistrée
});
test('paramètres : validation et persistance ; réinitialisation', async () => {
  await assert.rejects(db.saveSettings({ whatsapp: '12 34' }), /WhatsApp/);
  await db.saveSettings({ phone: '+237 600 000 000', whatsapp: '237600000000' });
  assert.equal(db.readSettings().whatsapp, '237600000000');
  const p = await db.createProduct(base); await db.resetDemoData();
  assert.equal(db.readSettings().whatsapp, '237697692598');
  assert.ok(!(await db.listProducts()).some((x) => x.id === p.id)); assert.equal((await db.listProducts()).length, 23);
});
test('persistance : une nouvelle lecture retrouve les modifications (même stockage)', async () => {
  const p = await db.createProduct({ ...base, reference: 'PERSIST-1' });
  const all = await db.listProducts(); assert.ok(all.some((x) => x.id === p.id && x.reference === 'PERSIST-1'));
});
test('données corrompues : retour aux données de démonstration sans erreur', async () => {
  const m = mem(); m.setItem('pixelplay-sim-db', '{pas du json'); setStorage(m);
  assert.equal((await db.listProducts()).length, 23);
});
