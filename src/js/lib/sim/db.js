// Base de données SIMULÉE (localStorage + IndexedDB). Mêmes formes de lignes que l'ancienne base SQL,
// donc le site et l'administration lisent des objets identiques. Fonctions asynchrones : le jour où un vrai
// serveur existera, seul ce fichier sera remplacé.
import { ALLOWED_MIME, LIMITS } from '../constants.js';
import { buildCatalog } from '../product.js';
import { CONFIG } from '../config.js';
import { PRODUCTS } from '../data.js';
import { REQUEST_STATUS, newSlug, slugify } from '../admin.js';
import { DB_KEY, clearBlobs, delBlob, emit, loadUrls, putBlob, storage, urlOf } from './store.js';

const VERSION = 2; // v2 : nouveaux appareils de démonstration (marque, RAM, stockage) et e-mail officiel
const DEFAULTS = Object.freeze({ business_name: CONFIG.brand, whatsapp: CONFIG.whatsapp, phone: CONFIG.phoneDisplay, email: CONFIG.email, address: CONFIG.address, city: CONFIG.city, map_query: CONFIG.mapQuery, latitude: null, longitude: null, stock_alert_default: 3, contact_info: null });
export const CORE_SLUGS = ['consoles', 'jeux-physiques', 'jeux-numeriques', 'appareils']; // pilotent les types d'affichage du site
const CATS = [['consoles', 'Consoles', 'PlayStation 4 et PlayStation 5'], ['jeux-physiques', 'Jeux physiques', 'Jeux sur disque PS4 et PS5'], ['jeux-numeriques', 'Jeux numériques', 'Offres numériques autorisées'], ['appareils', 'Appareils', "Ordinateurs, téléphones et consoles d'occasion"]];
const CAT_OF = { console: 'cat-consoles', 'jeu-physique': 'cat-jeux-physiques', 'jeu-numerique': 'cat-jeux-numeriques', appareil: 'cat-appareils' };

const now = () => new Date().toISOString();
const uid = (p) => p + (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
const fail = (m) => { throw new Error(m); };
const isInt = (v) => Number.isInteger(v) && v >= 0;

// --- données de démonstration -------------------------------------------------------------------
export function seed() {
  const t0 = Date.now(), at = (h) => new Date(t0 - h * 3600e3).toISOString();
  const categories = CATS.map(([slug, name, description]) => ({ id: `cat-${slug}`, name, slug, parent_id: null, description }));
  const products = PRODUCTS.map((p, i) => {
    const specifications = p.type === 'console' ? { generation: p.platform, ...(p.variant ? { model: p.variant } : {}) } : { platform: p.platform, ...(p.brand ? { brand: p.brand } : {}), ...(p.ram ? { ram: p.ram } : {}), ...(p.storage ? { storage: p.storage } : {}) };
    const qty = typeof p.stock === 'number' ? p.stock : p.stock ? 5 : 0;
    return { id: p.id, reference: p.id.toUpperCase(), slug: p.id, name: p.name, description: p.description, category_id: CAT_OF[p.type], price: p.price, promotional_price: null,
      stock_quantity: qty, stock_alert_threshold: DEFAULTS.stock_alert_default, availability_enabled: true, featured: i < 4, condition: p.condition === 'Neuf' ? 'new' : 'used',
      specifications, product_images: [], demo: true, created_at: at(i + 1), updated_at: at(i + 1) };
  });
  const requests = [
    { id: 'r-demo-1', reference: 'PP-DEMO0001', customer_name: 'Client de démonstration', phone: '690000001', location: 'Bonamoussadi, Douala', device_type: 'telephone', brand: 'Samsung', model: 'Galaxy A54', condition: 'Bon état',
      specifications: { 'Capacité de stockage': '128 Go', "État de l'écran": 'Intact', 'Accessoires fournis': 'Chargeur' }, expected_price: 120000, description: 'Exemple de démonstration.', status: 'new', internal_notes: '', photos: [], demo: true, created_at: at(5) },
    { id: 'r-demo-2', reference: 'PP-DEMO0002', customer_name: 'Autre client (démo)', phone: '690000002', location: 'Akwa, Douala', device_type: 'console', brand: 'Sony', model: 'PlayStation 4 Slim', condition: 'Comme neuf',
      specifications: { 'Capacité de stockage': '500 Go', 'Nombre de manettes': '2' }, expected_price: null, description: 'Exemple de démonstration.', status: 'accepted', internal_notes: 'Exemple : rachat accepté.', photos: [], demo: true, created_at: at(30) },
  ];
  const movements = products.filter((p) => p.stock_quantity > 0).map((p) => mv(p, 0, p.stock_quantity, 'Stock initial (démonstration)', p.created_at));
  return { v: VERSION, categories, products, movements, requests, settings: { ...DEFAULTS } };
}
const mv = (p, prev, next, reason, at = now()) => ({ id: uid('m-'), product_id: p.id, product_name: p.name, reference: p.reference, previous_quantity: prev, changed_quantity: next - prev, new_quantity: next, reason, created_at: at, by: 'Administrateur (démo)' });

// --- accès brut ----------------------------------------------------------------------------------
function write(doc, notify = true) {
  try { storage().setItem(DB_KEY, JSON.stringify(doc)); } catch { fail('Espace de stockage du navigateur plein ou indisponible : enregistrement impossible.'); }
  if (notify) emit();
}
function read() {
  let doc = null;
  try { doc = JSON.parse(storage().getItem(DB_KEY)); } catch { doc = null; }
  if (!doc || doc.v !== VERSION) { doc = seed(); write(doc, false); }
  return doc;
}
// Lecture-modification-écriture synchrone : rien n'est enregistré si `fn` lève une erreur.
function mutate(fn) { const d = read(), r = fn(d); write(d); return r; }
const find = (d, id) => d.products.find((p) => p.id === id) || fail('Produit introuvable.');
const sorted = (imgs) => [...imgs].sort((a, b) => (b.is_primary - a.is_primary) || (a.display_order - b.display_order));
const withUrls = async (rows) => { await loadUrls(rows.flatMap((p) => p.product_images.map((i) => i.id))); return rows.map((p) => ({ ...p, product_images: sorted(p.product_images).map((i) => ({ ...i, url: urlOf(i.id) })) })); };

export const readSettings = () => ({ ...read().settings });
export const hasDemoData = () => read().products.some((p) => p.demo);

// --- site public ----------------------------------------------------------------------------------
export async function loadCatalog() {
  const d = read();
  await loadUrls(d.products.flatMap((p) => p.product_images.map((i) => i.id)));
  const rows = d.products.map((p) => ({ ...p, product_images: p.product_images.filter((i) => urlOf(i.id)) }));
  return buildCatalog(rows, d.categories, urlOf);
}

// --- catégories ------------------------------------------------------------------------------------
export async function listCategories() {
  const d = read();
  return [...d.categories].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((c) => ({ ...c, core: CORE_SLUGS.includes(c.slug), products: d.products.filter((p) => p.category_id === c.id).length }));
}
export async function createCategory({ name, parent_id = null, description = '' }) {
  return mutate((d) => {
    const n = String(name || '').trim(), slug = slugify(n);
    if (!slug) fail('Nom de catégorie invalide.');
    if (d.categories.some((c) => c.slug === slug || c.name.toLowerCase() === n.toLowerCase())) fail('Une catégorie portant ce nom existe déjà.');
    if (parent_id && !d.categories.some((c) => c.id === parent_id)) fail('Catégorie parente introuvable.');
    const c = { id: uid('cat-'), name: n, slug, parent_id: parent_id || null, description: String(description || '').trim() || null };
    d.categories.push(c); return c;
  });
}
export async function updateCategory(id, { name, description }) {
  return mutate((d) => {
    const c = d.categories.find((x) => x.id === id) || fail('Catégorie introuvable.'), n = String(name ?? c.name).trim();
    if (!n) fail('Nom de catégorie invalide.');
    if (d.categories.some((x) => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) fail('Une catégorie portant ce nom existe déjà.');
    c.name = n; if (description !== undefined) c.description = String(description).trim() || null; return c; // le slug (donc le type d'affichage) ne change jamais
  });
}
export async function deleteCategory(id) {
  return mutate((d) => {
    const c = d.categories.find((x) => x.id === id) || fail('Catégorie introuvable.');
    if (CORE_SLUGS.includes(c.slug)) fail("Catégorie de base : elle pilote l'affichage du site et ne peut pas être supprimée.");
    const n = d.products.filter((p) => p.category_id === id).length;
    if (n) fail(`Suppression impossible : ${n} produit(s) sont rattachés à « ${c.name} ». Déplacez-les ou supprimez-les d'abord.`);
    if (d.categories.some((x) => x.parent_id === id)) fail(`Suppression impossible : « ${c.name} » contient des sous-catégories.`);
    d.categories = d.categories.filter((x) => x.id !== id);
  });
}

// --- produits ----------------------------------------------------------------------------------------
function check(d, r, selfId) {
  const name = String(r.name ?? '').trim(), reference = String(r.reference ?? '').trim();
  if (!name) fail('Nom obligatoire.');
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(reference)) fail('Référence : 2 à 40 caractères (lettres, chiffres, . _ -).');
  if (d.products.some((p) => p.id !== selfId && p.reference.toLowerCase() === reference.toLowerCase())) fail('Cette référence existe déjà.');
  if (!d.categories.some((c) => c.id === r.category_id)) fail('Catégorie introuvable.');
  const price = Number(r.price), promo = r.promotional_price == null || r.promotional_price === '' ? null : Number(r.promotional_price);
  if (!isInt(price)) fail('Prix en FCFA : nombre entier.');
  if (promo != null && (!isInt(promo) || promo >= price)) fail('Le prix promotionnel doit être inférieur au prix.');
  const thr = Number(r.stock_alert_threshold ?? d.settings.stock_alert_default);
  if (!isInt(thr)) fail("Seuil d'alerte : nombre entier (0 ou plus).");
  if (!['new', 'used'].includes(r.condition)) fail('État invalide.');
  return { name, reference, description: String(r.description ?? '').trim(), category_id: r.category_id, price, promotional_price: promo, stock_alert_threshold: thr, condition: r.condition, availability_enabled: r.availability_enabled !== false, featured: !!r.featured, specifications: r.specifications || {} };
}
export async function listProducts() { const d = read(); return withUrls([...d.products].sort((a, b) => b.created_at.localeCompare(a.created_at))); }
export async function getProduct(id) { const d = read(); return (await withUrls([find(d, id)]))[0]; }
export async function createProduct(row) {
  return mutate((d) => {
    const p = check(d, row, null), qty = Number(row.stock_quantity ?? 0);
    if (!isInt(qty)) fail('Quantité en stock : nombre entier (0 ou plus).');
    const t = now(), rec = { id: uid('p-'), slug: newSlug(p.name), product_images: [], demo: false, created_at: t, updated_at: t, ...p, stock_quantity: qty };
    d.products.unshift(rec);
    if (qty > 0) d.movements.unshift(mv(rec, 0, qty, 'Stock initial'));
    return rec;
  });
}
export async function updateProduct(id, patch) { // le stock ne change que par adjustStock (historique des mouvements)
  return mutate((d) => { const cur = find(d, id); Object.assign(cur, check(d, { ...cur, ...patch }, id), { updated_at: now() }); return cur; });
}
export async function adjustStock(id, newQty, reason) {
  return mutate((d) => {
    const p = find(d, id), n = Number(newQty);
    if (!isInt(n)) fail('Quantité : nombre entier (0 ou plus).');
    if (n === p.stock_quantity) return p;
    d.movements.unshift(mv(p, p.stock_quantity, n, String(reason || '').trim() || 'Ajustement'));
    d.movements.length = Math.min(d.movements.length, 500);
    p.stock_quantity = n; p.updated_at = now(); return p;
  });
}
export async function removeProduct(id) {
  let ids = [];
  mutate((d) => { const p = find(d, id); ids = p.product_images.map((i) => i.id); d.products = d.products.filter((x) => x.id !== id); });
  await Promise.all(ids.map((i) => delBlob(i).catch(() => {})));
}
function checkBlobs(blobs, max) {
  if (blobs.length > max) fail(`${max} photo(s) maximum.`);
  for (const b of blobs) { if (!ALLOWED_MIME.includes(b.type)) fail('Format non autorisé (JPEG, PNG ou WebP).'); if (b.size > LIMITS.maxMB * 1048576) fail(`Image trop lourde (${LIMITS.maxMB} Mo maximum).`); }
}
export async function addProductImages(id, blobs) {
  if (!blobs.length) return [];
  checkBlobs(blobs, 12); find(read(), id);
  const ids = [];
  try { for (const b of blobs) { const i = uid('img-'); await putBlob(i, b); ids.push(i); } } catch { await Promise.all(ids.map((i) => delBlob(i).catch(() => {}))); fail("Impossible d'enregistrer l'image dans ce navigateur (stockage indisponible ou plein)."); }
  try {
    mutate((d) => {
      const p = find(d, id); let order = Math.max(-1, ...p.product_images.map((i) => i.display_order)) + 1, primary = p.product_images.some((i) => i.is_primary);
      for (const i of ids) { p.product_images.push({ id: i, storage_path: i, is_primary: !primary, display_order: order++ }); primary = true; }
      p.updated_at = now();
    });
  } catch (e) { await Promise.all(ids.map((i) => delBlob(i).catch(() => {}))); throw e; }
  return ids;
}
export async function setPrimaryImage(id, imageId) { mutate((d) => { const p = find(d, id); if (!p.product_images.some((i) => i.id === imageId)) fail('Image introuvable.'); p.product_images.forEach((i) => { i.is_primary = i.id === imageId; }); p.updated_at = now(); }); }
export async function removeProductImage(id, imageId) {
  mutate((d) => { const p = find(d, id), was = p.product_images.find((i) => i.id === imageId) || fail('Image introuvable.'); p.product_images = p.product_images.filter((i) => i.id !== imageId); if (was.is_primary && p.product_images[0]) p.product_images[0].is_primary = true; p.updated_at = now(); });
  await delBlob(imageId).catch(() => {});
}
export async function listMovements(productId) { const d = read(); return d.movements.filter((m) => !productId || m.product_id === productId).slice(0, 100); }

// --- demandes de rachat ------------------------------------------------------------------------------
const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const refCode = () => `PP-${Array.from({ length: 8 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join('')}`;
export async function submitRequest(p, photos = []) {
  for (const k of ['customer_name', 'phone', 'device_type', 'brand', 'model']) if (!String(p[k] ?? '').trim()) fail('Demande incomplète.');
  checkBlobs(photos.map((x) => x.blob), LIMITS.maxPhotos);
  const metas = [];
  try { for (const x of photos) { const id = uid('ph-'); await putBlob(id, x.blob); metas.push({ id, mime_type: x.blob.type, file_size: x.blob.size, original_filename: x.name || null }); } } catch { await Promise.all(metas.map((m) => delBlob(m.id).catch(() => {}))); fail("Impossible d'enregistrer les photos dans ce navigateur (stockage indisponible ou plein)."); }
  try {
    return mutate((d) => {
      const r = { id: uid('r-'), reference: refCode(), customer_name: p.customer_name.trim(), phone: p.phone.trim(), location: String(p.location || '').trim(), device_type: p.device_type, brand: p.brand.trim(), model: p.model.trim(), condition: p.condition || '',
        specifications: p.specifications || {}, expected_price: p.expected_price ?? null, description: p.description || '', status: 'new', internal_notes: '', photos: metas, demo: false, created_at: now() };
      d.requests.unshift(r); return { id: r.id, reference: r.reference, photos: metas.length };
    });
  } catch (e) { await Promise.all(metas.map((m) => delBlob(m.id).catch(() => {}))); throw e; }
}
export async function listRequests() { return [...read().requests]; }
export async function getRequest(id) {
  const r = read().requests.find((x) => x.id === id) || fail('Demande introuvable.');
  await loadUrls(r.photos.map((p) => p.id));
  return { ...r, photos: r.photos.map((p) => ({ ...p, url: urlOf(p.id) })) };
}
export async function updateRequest(id, patch) {
  return mutate((d) => {
    const r = d.requests.find((x) => x.id === id) || fail('Demande introuvable.');
    if (patch.status !== undefined) { if (!REQUEST_STATUS[patch.status]) fail('Statut invalide.'); r.status = patch.status; }
    if (patch.internal_notes !== undefined) r.internal_notes = String(patch.internal_notes).slice(0, 2000);
    return r;
  });
}
export async function deleteRequest(id) {
  let ids = [];
  mutate((d) => { const r = d.requests.find((x) => x.id === id) || fail('Demande introuvable.'); ids = r.photos.map((p) => p.id); d.requests = d.requests.filter((x) => x.id !== id); });
  await Promise.all(ids.map((i) => delBlob(i).catch(() => {})));
}

// --- paramètres et réinitialisation -------------------------------------------------------------------
export async function getSettings() { return readSettings(); }
export async function saveSettings(s) {
  return mutate((d) => {
    const n = { ...d.settings, ...s };
    for (const k of ['business_name', 'phone', 'address', 'city', 'map_query']) if (!String(n[k] ?? '').trim()) fail('Nom, téléphone, adresse, ville et recherche cartographique sont obligatoires.');
    if (n.email && !/^\S+@\S+\.\S+$/.test(String(n.email))) fail('Adresse e-mail invalide.');
    if (!/^\d{8,15}$/.test(String(n.whatsapp))) fail('Numéro WhatsApp : 8 à 15 chiffres, sans espace ni « + ».');
    n.stock_alert_default = Number(n.stock_alert_default);
    if (!isInt(n.stock_alert_default)) fail("Seuil d'alerte : nombre entier (0 ou plus).");
    d.settings = n; return n;
  });
}
export async function counts() { const d = read(); return { products: d.products.length, categories: d.categories.length, requests: d.requests.length }; }
export async function resetDemoData() { await clearBlobs(); write(seed()); }
