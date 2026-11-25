import { MOVEMENT_REASONS, fmtDate } from '../lib/admin.js';
import { categoryType, stockStatus } from '../lib/product.js';
import { adjustStock, listCategories, listMovements, listProducts } from '../lib/sim/db.js';
import { empty, head, html, mount, run, sel, stockPill, thumb, $ } from './ui.js';

export async function inventory(view) {
  const [prods, cats, mov] = await Promise.all([listProducts(), listCategories(), listMovements()]);
  const by = new Map(cats.map((c) => [c.id, c])), types = new Map(cats.map((c) => [c.id, categoryType(c, by)]));
  const st = (p) => stockStatus(p.stock_quantity, p.stock_alert_threshold, p.availability_enabled);
  let flt = '';
  const n = (s) => prods.filter((p) => st(p) === s).length;
  mount(view, html`
    ${head('Stocks', 'Ajustez les quantités ; chaque modification est enregistrée dans l\'historique.')}
    <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par état du stock" id="chips"></div>
    <div id="rows"></div>
    <section class="mt-10"><h2 class="mb-4 !text-3xl">Historique des mouvements</h2>
      ${mov.length ? html`<div class="panel overflow-hidden"><table class="tbl"><thead><tr><th>Date</th><th>Produit</th><th>Mouvement</th><th>Nouveau stock</th><th>Motif</th></tr></thead><tbody>
        ${mov.slice(0, 40).map((m) => html`<tr><td data-label="Date" class="whitespace-nowrap">${fmtDate(m.created_at)}</td><td data-label="Produit" class="font-semibold">${m.product_name}</td><td data-label="Mouvement" class="font-bold tabular-nums ${m.changed_quantity >= 0 ? 'text-ok' : 'text-bad'}">${m.changed_quantity > 0 ? '+' : ''}${m.changed_quantity}</td><td data-label="Nouveau stock" class="tabular-nums">${m.new_quantity}</td><td data-label="Motif">${m.reason}</td></tr>`)}</tbody></table></div>` : empty('Aucun mouvement enregistré.')}
    </section>`);
  const chips = () => mount($('#chips'), html`${[['', `Tous (${prods.length})`], ['out', `Ruptures (${n('out')})`], ['low', `Bientôt épuisés (${n('low')})`], ['available', `Disponibles (${n('available')})`]].map(([k, l]) => html`<button type="button" class="chip" data-f="${k}" aria-pressed="${String(flt === k)}">${l}</button>`)}`);
  const rows = () => {
    const list = prods.filter((p) => !flt || st(p) === flt);
    mount($('#rows'), list.length ? html`<div class="panel overflow-hidden"><table class="tbl"><thead><tr><th>Produit</th><th>Stock</th><th>Seuil</th><th>Statut</th><th>Ajuster</th></tr></thead><tbody>
      ${list.map((p) => html`<tr data-id="${p.id}"><td data-label=""><div class="flex min-w-0 items-center gap-3">${thumb(p, types, 'h-10 w-10')}<span class="min-w-0 truncate text-left font-semibold">${p.name}</span></div></td>
        <td data-label="Stock" class="font-bold tabular-nums">${p.stock_quantity}</td><td data-label="Seuil" class="tabular-nums">${p.stock_alert_threshold}</td><td data-label="Statut">${stockPill(st(p))}</td>
        <td data-label="Ajuster"><form class="flex flex-wrap items-center justify-end gap-2" data-adjust="${p.id}"><input class="field !w-20" type="number" min="0" inputmode="numeric" value="${p.stock_quantity}" name="qty" aria-label="Nouvelle quantité de ${p.name}"><select class="field !w-44" name="reason" aria-label="Motif">${MOVEMENT_REASONS.map((r) => html`<option>${r}</option>`)}</select><button class="btn btn-sm" type="submit">Appliquer</button></form></td></tr>`)}
    </tbody></table></div>` : empty('Aucun produit dans cet état.'));
  };
  chips(); rows();
  view.onclick = (e) => { const c = e.target.closest('[data-f]'); if (c) { flt = c.dataset.f; chips(); rows(); } };
  view.onsubmit = async (e) => {
    const f = e.target.closest('[data-adjust]'); if (!f) return; e.preventDefault();
    const v = f.elements.qty.value.trim();
    if (!/^\d+$/.test(v)) { f.elements.qty.focus(); return run(() => { throw new Error('Quantité : nombre entier (0 ou plus).'); }); }
    if ((await run(() => adjustStock(f.dataset.adjust, Number(v), f.elements.reason.value), 'Stock mis à jour')).ok) inventory(view);
  };
}
