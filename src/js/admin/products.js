import { SPEC_FIELDS, checkImages, fmtDate, validateProduct } from '../lib/admin.js';
import { compressImage } from '../lib/images.js';
import { categoryType, stockStatus } from '../lib/product.js';
import { addProductImages, adjustStock, createProduct, getProduct, listCategories, listProducts, removeProduct, removeProductImage, setPrimaryImage, updateProduct } from '../lib/sim/db.js';
import { area, check, empty, fld, head, formatPrice, html, mount, raw, run, sel, showErrors, stockPill, thumb, toast, $, $$ } from './ui.js';

const typesOf = (cats) => { const by = new Map(cats.map((c) => [c.id, c])); return new Map(cats.map((c) => [c.id, categoryType(c, by)])); };

export async function productList(view, go) {
  const [prods, cats] = await Promise.all([listProducts(), listCategories()]), types = typesOf(cats), cname = new Map(cats.map((c) => [c.id, c.name]));
  const f = { q: '', cat: '', st: '' };
  const status = (p) => stockStatus(p.stock_quantity, p.stock_alert_threshold, p.availability_enabled);
  mount(view, html`
    ${head('Produits', `${prods.length} produit(s) au catalogue. Prix et stock se modifient directement dans la liste.`, html`<a class="btn btn-sm" href="#/produits/nouveau">Ajouter un produit</a>`)}
    <form class="panel mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px_200px]" role="search" onsubmit="return false">
      <div><label class="label" for="q">Rechercher</label><input class="field" id="q" type="search" placeholder="Nom ou référence"></div>
      ${sel('cat', 'Catégorie', cats.map((c) => [c.id, c.name]), '', { blank: 'Toutes' })}
      ${sel('st', 'Statut', [['available', 'Disponible'], ['low', 'Derniers articles'], ['out', 'Rupture'], ['disabled', 'Indisponible']], '', { blank: 'Tous' })}
    </form>
    <p id="n" class="mb-3 text-sm font-semibold text-mute" role="status" aria-live="polite"></p>
    <div id="list"></div>`);
  const draw = () => {
    const q = f.q.toLowerCase(), rows = prods.filter((p) => (!q || `${p.name} ${p.reference}`.toLowerCase().includes(q)) && (!f.cat || p.category_id === f.cat) && (!f.st || status(p) === f.st));
    $('#n').textContent = `${rows.length} résultat${rows.length > 1 ? 's' : ''}`;
    mount($('#list'), rows.length ? html`<div class="panel overflow-hidden"><table class="tbl"><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix (FCFA)</th><th>Stock</th><th>Statut</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
      ${rows.map((p) => html`<tr>
        <td data-label=""><div class="flex min-w-0 items-center gap-3">${thumb(p, types)}<span class="min-w-0 text-left"><a class="block truncate font-semibold no-underline hover:underline" href="#/produits/${p.id}">${p.name}</a><span class="block truncate text-xs text-mute">${p.reference}${p.demo ? ' · démo' : ''}</span></span></div></td>
        <td data-label="Catégorie">${cname.get(p.category_id) || '—'}</td>
        <td data-label="Prix"><input class="field !w-32" type="number" min="0" step="500" inputmode="numeric" value="${p.price}" data-price="${p.id}" aria-label="Prix de ${p.name}"></td>
        <td data-label="Stock"><input class="field !w-24" type="number" min="0" inputmode="numeric" value="${p.stock_quantity}" data-stock="${p.id}" aria-label="Stock de ${p.name}"></td>
        <td data-label="Statut">${stockPill(status(p))}</td>
        <td data-label=""><span class="flex flex-wrap justify-end gap-x-4"><a class="linkbtn" href="#/produits/${p.id}">Modifier</a><button type="button" class="linkbtn danger" data-del="${p.id}">Supprimer</button></span></td></tr>`)}
    </tbody></table></div>` : empty('Aucun produit ne correspond.', 'Modifiez la recherche ou les filtres.', html`<a class="btn btn-sm" href="#/produits/nouveau">Ajouter un produit</a>`));
  };
  draw();
  view.oninput = (e) => { if (e.target.id === 'q') { f.q = e.target.value; draw(); } };
  view.onchange = async (e) => {
    const t = e.target;
    if (t.id === 'cat' || t.id === 'st') { f[t.id] = t.value; draw(); return; }
    const pid = t.dataset.price, sid = t.dataset.stock, id = pid || sid; if (!id) return;
    const p = prods.find((x) => x.id === id), v = t.value.trim();
    if (!/^\d+$/.test(v)) { toast('Saisissez un nombre entier.', 'error'); t.value = pid ? p.price : p.stock_quantity; return; }
    const r = await run(() => (pid ? updateProduct(id, { price: Number(v) }) : adjustStock(id, Number(v), 'Correction depuis la liste')), pid ? 'Prix mis à jour' : 'Stock mis à jour');
    if (!r.ok) { t.value = pid ? p.price : p.stock_quantity; return; }
    Object.assign(p, pid ? { price: Number(v) } : { stock_quantity: Number(v) }); draw();
  };
  view.onclick = async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const p = prods.find((x) => x.id === b.dataset.del);
    if (!window.confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`)) return;
    if ((await run(() => removeProduct(p.id), 'Produit supprimé')).ok) go('#/produits'), productList(view, go);
  };
}

export async function productForm(view, id, go) {
  const isNew = id === 'nouveau', cats = await listCategories(), types = typesOf(cats);
  let p;
  try { p = isNew ? { name: '', reference: '', category_id: cats[0]?.id, condition: 'new', price: '', promotional_price: '', stock_quantity: 0, stock_alert_threshold: 3, availability_enabled: true, featured: false, description: '', specifications: {}, product_images: [] } : await getProduct(id); }
  catch { mount(view, html`${head('Produit introuvable')}<p class="notice error">Ce produit n'existe plus.</p><p class="mt-4"><a class="btn" href="#/produits">Retour aux produits</a></p>`); return; }
  view.dataset.form = '1';
  let pending = [], keys = 0;
  const specs = (cat) => (SPEC_FIELDS[types.get(cat)] || []).map(([k, l, o]) => (o === 'textarea' ? area('spec_' + k, l, p.specifications[k] || '', { rows: 3, cls: 'sm:col-span-2' }) : Array.isArray(o) ? sel('spec_' + k, l, o.map((x) => [x, x]), p.specifications[k] || '', { blank: 'Choisir…' }) : fld('spec_' + k, l, p.specifications[k] || '')));
  mount(view, html`
    <p class="mb-3"><a class="link" href="#/produits">← Produits</a></p>
    ${head(isNew ? 'Nouveau produit' : 'Modifier le produit', isNew ? 'Les champs marqués * sont obligatoires.' : `${p.reference} · modifié le ${fmtDate(p.updated_at)}`)}
    <form id="pf" class="grid gap-6 xl:grid-cols-[1fr_380px]" novalidate>
      <div class="grid gap-6">
        <section class="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><h2 class="!text-2xl sm:col-span-2">Informations</h2>
          ${fld('name', 'Nom du produit', p.name, { req: true, cls: 'sm:col-span-2' })}
          ${fld('reference', 'Référence', p.reference, { req: true, hint: 'Lettres, chiffres, point, tiret. Unique.' })}
          ${sel('category_id', 'Catégorie', cats.map((c) => [c.id, c.name]), p.category_id, { req: true })}
          ${sel('condition', 'État', [['new', 'Neuf'], ['used', 'Occasion']], p.condition, { req: true })}
          ${area('description', 'Description', p.description, { rows: 4, cls: 'sm:col-span-2' })}
        </section>
        <section class="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><h2 class="!text-2xl sm:col-span-2">Prix et stock</h2>
          ${fld('price', 'Prix (FCFA)', p.price, { req: true, type: 'number', attrs: 'min="0" step="500" inputmode="numeric"' })}
          ${fld('promotional_price', 'Prix promotionnel (facultatif)', p.promotional_price ?? '', { type: 'number', attrs: 'min="0" step="500" inputmode="numeric"' })}
          ${fld('stock_quantity', isNew ? 'Quantité initiale' : 'Quantité en stock', p.stock_quantity, { req: true, type: 'number', attrs: 'min="0" inputmode="numeric"', hint: isNew ? '' : 'Une modification est enregistrée dans l\'historique des stocks.' })}
          ${fld('stock_alert_threshold', "Seuil d'alerte", p.stock_alert_threshold, { req: true, type: 'number', attrs: 'min="0" inputmode="numeric"', hint: 'En dessous : « Derniers articles ».' })}
        </section>
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Caractéristiques</h2><div id="specs" class="mt-4 grid gap-4 sm:grid-cols-2">${specs(p.category_id)}</div></section>
      </div>
      <div class="grid content-start gap-6">
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Visibilité</h2>
          ${check('availability_enabled', 'Disponible à la commande', p.availability_enabled)}${check('featured', 'Afficher « À la une » sur l\'accueil', p.featured)}</section>
        <section class="panel p-5 sm:p-6"><h2 class="!text-2xl">Images</h2>
          <ul id="imgs" class="mt-4 grid grid-cols-2 gap-3"></ul>
          <label class="label mt-4" for="files">Ajouter des images</label>
          <input id="files" class="field !p-2 file:mr-3 file:border-0 file:bg-violet-lav file:px-3 file:py-2 file:font-semibold file:text-violet-dark" type="file" accept="image/jpeg,image/png,image/webp" multiple>
          <p class="hint mt-1">JPEG, PNG ou WebP, 5 Mo maximum. Sans image, une illustration est affichée.</p><p id="e_files" class="err" role="alert"></p>
        </section>
        <div class="flex flex-wrap gap-3"><button class="btn" type="submit" id="save">Enregistrer</button><a class="btn btn-ghost" href="#/produits">Annuler</a></div>
      </div>
    </form>`);
  const imgs = () => mount($('#imgs'), html`${p.product_images.map((i, n) => html`<li class="grid gap-1"><img class="aspect-square w-full bg-mist object-cover" src="${i.url}" alt="Image ${n + 1} de ${p.name}">${i.is_primary ? html`<span class="pill pill-new justify-center">Principale</span>` : html`<button type="button" class="linkbtn !min-h-[32px] text-sm" data-primary="${i.id}">Définir principale</button>`}<button type="button" class="linkbtn danger !min-h-[32px] text-sm" data-rmimg="${i.id}">Supprimer</button></li>`)}${pending.map((f, n) => html`<li class="grid gap-1"><img class="aspect-square w-full bg-mist object-cover" src="${f.preview}" alt="Nouvelle image ${n + 1}"><span class="pill pill-off justify-center">À enregistrer</span><button type="button" class="linkbtn danger !min-h-[32px] text-sm" data-rmnew="${f.key}">Retirer</button></li>`)}`);
  imgs();
  const form = $('#pf');
  form.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'category_id') { p.category_id = t.value; Array.from($$('[name^=spec_]', form)).forEach((i) => { p.specifications[i.name.slice(5)] = i.value; }); mount($('#specs'), html`${specs(t.value)}`); }
    if (t.id === 'files') {
      const files = [...t.files], c = checkImages(files); t.value = '';
      $('#e_files').textContent = c.errors.join(' ');
      if (!c.ok) return;
      pending.push(...files.map((file) => ({ key: ++keys, file, preview: URL.createObjectURL(file) }))); imgs();
    }
  });
  form.addEventListener('input', (e) => { if (e.target.name === 'name' && isNew && !$('#reference', form).dataset.touched && !$('#reference', form).value) { /* suggestion à la sortie du champ */ } if (e.target.id === 'reference') e.target.dataset.touched = '1'; });
  form.addEventListener('focusout', (e) => { const r = $('#reference', form); if (isNew && e.target.id === 'name' && r && !r.dataset.touched && e.target.value.trim()) r.value = e.target.value.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24); });
  form.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.primary) { if ((await run(() => setPrimaryImage(id, t.dataset.primary))).ok) { p = await getProduct(id); imgs(); } }
    if (t.dataset.rmimg && window.confirm('Supprimer cette image ?')) { if ((await run(() => removeProductImage(id, t.dataset.rmimg), 'Image supprimée')).ok) { p = await getProduct(id); imgs(); } }
    if (t.dataset.rmnew) { const k = Number(t.dataset.rmnew), it = pending.find((x) => x.key === k); if (it) URL.revokeObjectURL(it.preview); pending = pending.filter((x) => x.key !== k); imgs(); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = (n) => form.elements[n]?.value?.trim() ?? '';
    const spec = {}; $$('[name^=spec_]', form).forEach((i) => { if (i.value.trim()) spec[i.name.slice(5)] = i.value.trim(); });
    const row = { name: g('name'), reference: g('reference'), category_id: g('category_id'), condition: g('condition'), description: g('description'), price: g('price'), promotional_price: g('promotional_price'), stock_quantity: g('stock_quantity'), stock_alert_threshold: g('stock_alert_threshold'),
      availability_enabled: form.elements.availability_enabled.checked, featured: form.elements.featured.checked, specifications: spec };
    const er = validateProduct(row); showErrors(form, er); if (Object.keys(er).length) return;
    const btn = $('#save'); btn.disabled = true; btn.textContent = 'Enregistrement…';
    const r = await run(async () => {
      const data = { ...row, price: Number(row.price), promotional_price: row.promotional_price === '' ? null : Number(row.promotional_price), stock_alert_threshold: Number(row.stock_alert_threshold) };
      let pid = id;
      if (isNew) pid = (await createProduct({ ...data, stock_quantity: Number(row.stock_quantity) })).id;
      else { await updateProduct(id, data); if (Number(row.stock_quantity) !== p.stock_quantity) await adjustStock(id, Number(row.stock_quantity), 'Correction depuis la fiche produit'); }
      if (pending.length) { const blobs = []; for (const f of pending) blobs.push(await compressImage(f.file)); await addProductImages(pid, blobs); }
    }, 'Produit enregistré');
    btn.disabled = false; btn.textContent = 'Enregistrer';
    if (r.ok) { pending.forEach((f) => URL.revokeObjectURL(f.preview)); go('#/produits'); }
  });
}
