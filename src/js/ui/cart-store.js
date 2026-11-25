import { CART_KEY, ackPrices, addItem, loadCart, removeItem, saveCart, setQty } from '../lib/cart.js';
import { state } from './state.js';

let items = loadCart();
const fns = new Set();
const commit = (n) => { items = n; saveCart(n); fns.forEach((f) => f()); };

export const cart = {
  get items() { return items; },
  get count() { return items.reduce((n, i) => n + i.qty, 0); },
  qtyOf: (id) => items.find((i) => i.id === id)?.qty || 0,
  add(p, qty = 1) { const r = addItem(items, p, qty); if (r.added) commit(r.items); return r.added; },
  setQty: (id, q) => commit(setQty(items, id, q, state.products)),
  remove: (id) => commit(removeItem(items, id)),
  clear: () => commit([]),
  ackPrices: () => commit(ackPrices(items, state.products)),
  on(f) { fns.add(f); return () => fns.delete(f); },
};
window.addEventListener('storage', (e) => { if (e.key === CART_KEY) { items = loadCart(); fns.forEach((f) => f()); } });
