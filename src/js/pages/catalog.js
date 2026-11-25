// Catalogue filtrable (accueil : appareils par catégorie ; jeux : numériques et physiques) avec pagination.
// Les types affichés viennent de <body data-types="console,appareil">. Avec data-cats="1", les boutons #cats choisissent la catégorie.
import { CONFIG } from '../lib/config.js';
import { CAT_KEYS, chipFilters, deviceCat, distinct } from '../lib/devices.js';
import { filterProducts } from '../lib/filters.js';
import { pageItems, paginate } from '../lib/paginate.js';
import { $, $$, html, mount, raw } from '../ui/html.js';
import { card } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { onCatalog, state } from '../ui/state.js';

const EMPTY = { cat: '', platform: '', brand: '', ram: '', storage: '', variant: '', condition: '', minPrice: '', maxPrice: '', sort: '', inStock: false, page: 1 };
const GAME_CHIPS = [['platform', 'Plateforme'], ['condition', 'État']];
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

export function initCatalog() {
  const root = $('#app'); if (!root) return;
  const types = (document.body.dataset.types || '').split(',');
  const withCats = document.body.dataset.cats === '1';
  const params = new URLSearchParams(location.search);
  const f = { ...EMPTY, q: params.get('q') || '', cat: CAT_KEYS.includes(params.get('cat')) ? params.get('cat') : '', page: Number(params.get('page')) || 1 };
  const mine = () => state.products.filter((p) => types.includes(p.type));
  let built = false;

  const syncUrl = () => {
    const u = new URL(location.href);
    for (const [k, v] of [['cat', f.cat], ['page', f.page > 1 ? f.page : '']]) v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
    history.replaceState(null, '', u);
  };

  const chips = (name, label, values) => values.length < 2 ? '' : html`
    <fieldset class="min-w-0"><legend class="label">${label}</legend>
      <div class="flex flex-wrap gap-2">${values.map((v) => html`<button type="button" class="chip" data-chip="${name}" data-value="${v}" aria-pressed="${String(f[name] === v)}">${v}</button>`)}</div>
    </fieldset>`;

  // Les valeurs proposées viennent des produits de la catégorie choisie : un filtre sans vrai choix n'est pas affiché.
  const scope = () => (withCats && f.cat ? mine().filter((p) => deviceCat(p) === f.cat) : mine());

  function build() {
    const list = scope(), demo = mine().some((p) => p.demo);
    const spec = withCats ? chipFilters(f.cat || 'all') : GAME_CHIPS;
    mount(root, html`
      ${demo ? html`<p class="notice mb-6">Données de démonstration : produits, prix et stocks sont des exemples. Ils se modifient dans <a class="link" href="admin.html">l'espace admin</a> (simulation propre à ce navigateur).</p>` : ''}
      <details id="filters-box" class="mb-6 border border-line bg-white">
        <summary class="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold md:hidden">
          <span class="flex items-center gap-2">${icon('sliders')}Filtres <span id="fcount" class="text-sm font-medium text-mute"></span></span><span aria-hidden="true" class="text-xl text-violet-deep">+</span>
        </summary>
        <form id="filters" role="search" aria-label="Filtrer les produits" class="grid gap-5 p-4 md:p-6" autocomplete="off">
          <div class="grid gap-4 md:grid-cols-[1fr_220px]">
            <div><label class="label" for="f-q">Rechercher un produit</label><input class="field" id="f-q" type="search" name="q" value="${f.q}" placeholder="Nom, marque…" enterkeyhint="search"></div>
            <div><label class="label" for="f-sort">Trier par</label><select class="field" id="f-sort" name="sort"><option value="">Pertinence</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select></div>
          </div>
          <div class="flex flex-wrap gap-x-10 gap-y-4">${spec.map(([k, l]) => chips(k, l, distinct(list, k)))}</div>
          <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div class="w-[calc(50%-8px)] sm:w-40"><label class="label" for="f-min">Prix min (FCFA)</label><input class="field" id="f-min" name="minPrice" type="number" min="0" step="1000" inputmode="numeric" value="${f.minPrice}"></div>
            <div class="w-[calc(50%-8px)] sm:w-40"><label class="label" for="f-max">Prix max (FCFA)</label><input class="field" id="f-max" name="maxPrice" type="number" min="0" step="1000" inputmode="numeric" value="${f.maxPrice}"></div>
            <label class="flex min-h-[48px] cursor-pointer items-center gap-2 font-medium"><input type="checkbox" name="inStock" class="h-5 w-5 accent-violet" ${f.inStock ? raw('checked') : ''}>Disponibles seulement</label>
            <button type="button" class="linkbtn" data-reset>Réinitialiser les filtres</button>
          </div>
        </form>
      </details>
      <p id="count" tabindex="-1" class="mb-4 text-sm font-semibold text-mute outline-none" role="status" aria-live="polite"></p>
      <div id="results" class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"></div>
      <nav id="pager" aria-label="Pagination" class="mt-8 flex flex-wrap items-center justify-center gap-2" hidden></nav>`);
    $('#f-sort').value = f.sort;
    if (matchMedia('(min-width:768px)').matches) $('#filters-box').open = true;
    built = true;
  }

  const pager = (pg) => html`
    <button type="button" class="pg" data-goto="${pg.page - 1}" aria-label="Page précédente" ${pg.page <= 1 ? 'disabled' : ''}><span aria-hidden="true">‹</span><span class="ml-1 max-[479px]:hidden">Précédent</span></button>
    ${pageItems(pg.page, pg.pages).map((n) => n === '…' ? html`<span class="pg-gap" aria-hidden="true">…</span>`
      : html`<button type="button" class="pg" data-goto="${n}" aria-label="Page ${n}" ${n === pg.page ? raw('aria-current="page"') : ''}>${n}</button>`)}
    <button type="button" class="pg" data-goto="${pg.page + 1}" aria-label="Page suivante" ${pg.page >= pg.pages ? 'disabled' : ''}><span class="mr-1 max-[479px]:hidden">Suivant</span><span aria-hidden="true">›</span></button>`;

  function results() {
    const res = filterProducts(scope(), f), pg = paginate(res, f.page, CONFIG.pageSize);
    f.page = pg.page;
    const active = ['q', 'platform', 'brand', 'ram', 'storage', 'variant', 'condition', 'minPrice', 'maxPrice', 'sort'].filter((k) => f[k]).length + (f.inStock ? 1 : 0);
    $('#count').textContent = `${res.length} produit${res.length > 1 ? 's' : ''}${active ? ' correspondant à vos filtres' : ''}${pg.pages > 1 ? ` · affichés : ${pg.from} à ${pg.to} · page ${pg.page} sur ${pg.pages}` : ''}`;
    const fc = $('#fcount'); if (fc) fc.textContent = active ? `(${active} actif${active > 1 ? 's' : ''})` : '';
    mount($('#results'), res.length ? pg.items.map((p) => card(p, { view: withCats })) : html`<div class="col-span-full border border-dashed border-edge bg-white p-8 text-center"><p class="font-semibold">Aucun produit ne correspond à votre recherche.</p><p class="mt-1 text-mute">Modifiez ou réinitialisez les filtres.</p><button type="button" class="btn btn-ghost btn-sm mt-4" data-reset>Réinitialiser les filtres</button></div>`);
    const nav = $('#pager'); nav.hidden = pg.pages < 2; if (pg.pages > 1) mount(nav, pager(pg));
    if (withCats) {
      const base = mine();
      $$('[data-count]').forEach((el) => { const n = base.filter((p) => !el.dataset.count || deviceCat(p) === el.dataset.count).length; el.textContent = `${n} produit${n > 1 ? 's' : ''}`; });
      $$('#cats [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === f.cat)));
    }
    syncUrl();
  }

  function render() {
    if (!state.ready) { mount(root, html`<p role="status" class="py-10 text-mute">Chargement du catalogue…</p>`); return; }
    if (state.error) { mount(root, html`<div class="notice error" role="alert">${state.error} <button type="button" class="linkbtn" data-reload>Réessayer</button></div>`); built = false; return; }
    if (!built) build();
    results();
  }

  function resetFilters({ keepQuery = true } = {}) {
    const { cat, q } = f; Object.assign(f, EMPTY, { cat, q: keepQuery ? q : '' }); built = false; render();
  }

  // Changer de catégorie remet les filtres à zéro (les valeurs proposées dépendent de la catégorie) et revient à la page 1.
  function setCat(cat) { if (cat === f.cat) return; Object.assign(f, EMPTY, { q: f.q, cat }); built = false; render(); }

  root.addEventListener('input', (e) => {
    const t = e.target; if (!t.name) return;
    f[t.name] = t.type === 'checkbox' ? t.checked : t.value; f.page = 1; results();
  });
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const { chip: k, value } = chip.dataset; f[k] = f[k] === value ? '' : value; f.page = 1;
      $$(`[data-chip="${k}"]`, root).forEach((c) => c.setAttribute('aria-pressed', String(f[k] === c.dataset.value))); results(); return;
    }
    const pgBtn = e.target.closest('[data-goto]');
    if (pgBtn && !pgBtn.disabled) {
      f.page = Number(pgBtn.dataset.goto); results();
      $('#count').scrollIntoView({ block: 'center', behavior: smooth() }); $('#count').focus({ preventScroll: true }); return;
    }
    if (e.target.closest('[data-reset]')) { resetFilters({ keepQuery: false }); $('#f-q')?.focus(); return; }
    if (e.target.closest('[data-reload]')) location.reload();
  });
  $('#cats')?.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) setCat(b.dataset.cat); });
  root.addEventListener('submit', (e) => e.preventDefault());
  onCatalog(render); render();
}
