import { stockStatus } from '../lib/product.js';
import { REQUEST_STATUS, fmtDate } from '../lib/admin.js';
import { listCategories, listMovements, listProducts, listRequests } from '../lib/sim/db.js';
import { head, formatPrice, html, mount, stockPill } from './ui.js';

const kpi = (label, value, note = '', tone = '') => html`<div class="kpi"><p class="text-sm font-semibold text-mute">${label}</p><p class="mt-1 font-display text-5xl font-extrabold italic leading-none ${tone}">${value}</p>${note ? html`<p class="mt-2 text-sm text-mute">${note}</p>` : ''}</div>`;

export async function dashboard(view) {
  const [prods, reqs, mov, cats] = await Promise.all([listProducts(), listRequests(), listMovements(), listCategories()]);
  const st = (p) => stockStatus(p.stock_quantity, p.stock_alert_threshold, p.availability_enabled);
  const out = prods.filter((p) => st(p) === 'out'), low = prods.filter((p) => st(p) === 'low');
  const value = prods.reduce((n, p) => n + (p.promotional_price ?? p.price) * p.stock_quantity, 0);
  const pending = reqs.filter((r) => r.status === 'new');
  const max = Math.max(1, ...cats.map((c) => c.products));
  mount(view, html`
    ${head('Tableau de bord', 'Vue d\'ensemble du catalogue et des demandes. Données de démonstration.', html`<a class="btn btn-sm" href="#/produits/nouveau">Ajouter un produit</a><a class="btn btn-ghost btn-sm" href="index.html">Voir le site</a>`)}
    <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      ${kpi('Produits', prods.length, `${cats.length} catégories`)}
      ${kpi('Ruptures de stock', out.length, 'à réapprovisionner', out.length ? 'text-bad' : '')}
      ${kpi('Bientôt épuisés', low.length, 'sous le seuil d\'alerte', low.length ? 'text-warn' : '')}
      ${kpi('Demandes en attente', pending.length, `${reqs.length} demandes au total`, pending.length ? 'text-violet-deep' : '')}
    </div>
    <p class="hint mt-3">Valeur du stock aux prix affichés : <strong class="text-ink">${formatPrice(value)}</strong> (somme prix × quantité, exemple de démonstration).</p>
    <div class="mt-8 grid gap-6 xl:grid-cols-2">
      <section class="panel"><div class="flex items-center justify-between border-b border-line p-4"><h2 class="!text-2xl">À réapprovisionner</h2><a class="link text-sm" href="#/stocks">Gérer les stocks</a></div>
        ${out.length + low.length ? html`<ul class="divide-y divide-line">${[...out, ...low].slice(0, 6).map((p) => html`<li class="flex items-center justify-between gap-3 px-4 py-3"><a class="min-w-0 truncate font-semibold no-underline hover:underline" href="#/produits/${p.id}">${p.name}</a><span class="flex flex-none items-center gap-3"><span class="text-sm tabular-nums text-mute">${p.stock_quantity} en stock</span>${stockPill(st(p))}</span></li>`)}</ul>` : html`<p class="p-4 text-mute">Aucun produit à réapprovisionner.</p>`}
      </section>
      <section class="panel"><div class="flex items-center justify-between border-b border-line p-4"><h2 class="!text-2xl">Dernières demandes de rachat</h2><a class="link text-sm" href="#/demandes">Tout voir</a></div>
        ${reqs.length ? html`<ul class="divide-y divide-line">${reqs.slice(0, 5).map((r) => html`<li class="flex items-center justify-between gap-3 px-4 py-3"><a class="min-w-0 no-underline hover:underline" href="#/demandes/${r.id}"><span class="block truncate font-semibold">${r.brand} ${r.model}</span><span class="block truncate text-sm text-mute">${r.customer_name} · ${fmtDate(r.created_at)}</span></a><span class="pill ${r.status === 'new' ? 'pill-new' : r.status === 'accepted' ? 'pill-ok' : 'pill-ko'}">${REQUEST_STATUS[r.status]}</span></li>`)}</ul>` : html`<p class="p-4 text-mute">Aucune demande pour le moment.</p>`}
      </section>
      <section class="panel"><div class="border-b border-line p-4"><h2 class="!text-2xl">Catalogue par catégorie</h2></div>
        <ul class="grid gap-3 p-4">${cats.map((c) => html`<li><div class="flex justify-between text-sm"><span class="font-semibold">${c.name}</span><span class="tabular-nums text-mute">${c.products}</span></div><div class="mt-1 h-2 bg-mist"><div class="h-2 bg-violet" style="width:${Math.round((c.products / max) * 100)}%"></div></div></li>`)}</ul>
      </section>
      <section class="panel"><div class="flex items-center justify-between border-b border-line p-4"><h2 class="!text-2xl">Derniers mouvements de stock</h2><a class="link text-sm" href="#/stocks">Historique</a></div>
        ${mov.length ? html`<ul class="divide-y divide-line">${mov.slice(0, 5).map((m) => html`<li class="flex items-center justify-between gap-3 px-4 py-3"><span class="min-w-0"><span class="block truncate font-semibold">${m.product_name}</span><span class="block truncate text-sm text-mute">${m.reason} · ${fmtDate(m.created_at)}</span></span><span class="flex-none font-bold tabular-nums ${m.changed_quantity >= 0 ? 'text-ok' : 'text-bad'}">${m.changed_quantity > 0 ? '+' : ''}${m.changed_quantity}</span></li>`)}</ul>` : html`<p class="p-4 text-mute">Aucun mouvement enregistré.</p>`}
      </section>
    </div>`);
}
