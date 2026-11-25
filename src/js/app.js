// Point d'entrée du site public : chaque page déclare son rôle via <body data-page="...">.
import { bindConfig, initLayout } from './ui/layout.js';
import { toast } from './ui/layout.js';
import { cart } from './ui/cart-store.js';
import { loadAll, startSync, state } from './ui/state.js';
import { initCatalog } from './pages/catalog.js';
import { initCart } from './pages/cart.js';
import { initHome } from './pages/home.js';
import { initProduct } from './pages/product.js';
import { initSell } from './pages/sell.js';

const PAGES = { home: () => { initHome(); initCatalog(); }, catalog: initCatalog, product: initProduct, cart: initCart, sell: initSell };

function onAdd(e) {
  const b = e.target.closest('[data-action="add"]'); if (!b) return;
  const p = state.products.find((x) => x.id === b.dataset.id); if (!p) return;
  const qty = Number(document.querySelector('.qty output')?.textContent) || 1;
  const n = cart.add(p, document.body.dataset.page === 'product' ? qty : 1);
  if (!n) { toast('Quantité maximale atteinte pour ce produit.'); return; }
  toast(`${p.name} ajouté au panier`);
  const labels = [...b.querySelectorAll('[data-label]')], old = labels.map((l) => l.textContent);
  labels.forEach((l) => { l.textContent = 'Ajouté ✓'; });
  setTimeout(() => labels.forEach((l, i) => { l.textContent = old[i]; }), 1500);
}

function start() {
  const ready = loadAll();
  initLayout(ready);
  startSync();
  document.addEventListener('click', onAdd);
  const init = PAGES[document.body.dataset.page]; if (init) init();
  ready.then(bindConfig);
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
